import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, HouseholdRecord, UserRecord } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const url = new URL(req.url);
    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const format = url.searchParams.get('format');

    if (format === 'csv') {
      const type = url.searchParams.get('type') || 'ledger';
      if (type === 'ledger') {
        const ledger = db.prepare(`
          SELECT l.date, l.timestamp, u.name as flatmate, l.entry_type, l.amount, l.description, l.audit_reason
          FROM continuous_ledger l
          JOIN users u ON l.user_id = u.id
          WHERE l.household_id = ?
          ORDER BY l.timestamp DESC
        `).all(household.id) as any[];

        const headers = ['Date', 'Timestamp', 'Flatmate', 'Entry Type', 'Amount (BDT)', 'Description', 'Audit Reason'];
        const rows = ledger.map(r => [
          `"${r.date}"`,
          `"${r.timestamp}"`,
          `"${r.flatmate}"`,
          `"${r.entry_type}"`,
          r.amount,
          `"${(r.description || '').replace(/"/g, '""')}"`,
          `"${(r.audit_reason || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="household_ledger_${new Date().toISOString().slice(0, 10)}.csv"`
          }
        });
      }

      if (type === 'meals') {
        const meals = db.prepare(`
          SELECT dm.date, u.name as flatmate, dm.quantity as meals, mr.quantity as milk
          FROM daily_meals dm
          JOIN users u ON dm.user_id = u.id
          LEFT JOIN milk_records mr ON mr.user_id = u.id AND mr.date = dm.date
          WHERE dm.household_id = ?
          ORDER BY dm.date DESC, u.name ASC
        `).all(household.id) as any[];

        const headers = ['Date', 'Flatmate', 'Meals', 'Milk'];
        const rows = meals.map(r => [`"${r.date}"`, `"${r.flatmate}"`, r.meals, r.milk ?? 0]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="household_meals_${new Date().toISOString().slice(0, 10)}.csv"`
          }
        });
      }
    }

    // Default JSON response
    const users = db.prepare('SELECT * FROM users WHERE household_id = ? ORDER BY role ASC, name ASC').all(household.id) as UserRecord[];
    const categories = db.prepare('SELECT * FROM expense_categories WHERE household_id = ? ORDER BY name ASC').all(household.id);
    const auditLogs = db.prepare(`
      SELECT a.*, u.name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.household_id = ?
      ORDER BY a.timestamp DESC
      LIMIT 100
    `).all(household.id);

    return NextResponse.json({
      success: true,
      household,
      users,
      categories,
      auditLogs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDatabase();
    const body = await req.json();
    const {
      name,
      tolerance_amount,
      cutoff_hour,
      cutoff_minute,
      timezone,
      default_meal_qty,
      default_milk_qty
    } = body;

    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const actorUserId = req.cookies.get('mt_user_id')?.value || 'usr-shah';
    const actorUser = db.prepare('SELECT * FROM users WHERE id = ?').get(actorUserId) as UserRecord | undefined;

    if (actorUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only household administrator can modify settings' }, { status: 403 });
    }

    const nowISO = new Date().toISOString();

    db.prepare(`
      UPDATE households
      SET name = COALESCE(?, name),
          tolerance_amount = COALESCE(?, tolerance_amount),
          cutoff_hour = COALESCE(?, cutoff_hour),
          cutoff_minute = COALESCE(?, cutoff_minute),
          timezone = COALESCE(?, timezone),
          default_meal_qty = COALESCE(?, default_meal_qty),
          default_milk_qty = COALESCE(?, default_milk_qty)
      WHERE id = ?
    `).run(
      name || null,
      tolerance_amount !== undefined ? parseFloat(tolerance_amount) : null,
      cutoff_hour !== undefined ? parseInt(cutoff_hour, 10) : null,
      cutoff_minute !== undefined ? parseInt(cutoff_minute, 10) : null,
      timezone || null,
      default_meal_qty !== undefined ? parseInt(default_meal_qty, 10) : null,
      default_milk_qty !== undefined ? parseInt(default_milk_qty, 10) : null,
      household.id
    );

    // Audit
    db.prepare(`
      INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
      VALUES (?, ?, ?, 'UPDATE_SETTINGS', 'households', ?, ?, ?, 'Administrator updated household parameters', ?)
    `).run(
      `aud-${Date.now()}`,
      household.id,
      actorUserId,
      household.id,
      `Tolerance: ৳${household.tolerance_amount}, Cutoff: ${household.cutoff_hour}:${household.cutoff_minute}`,
      `Tolerance: ৳${tolerance_amount}, Cutoff: ${cutoff_hour}:${cutoff_minute}`,
      nowISO
    );

    return NextResponse.json({ success: true, message: 'Household settings updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDatabase();
    const body = await req.json();
    const { action, targetUserId, date, quantity, amount, description, expenseId, reason } = body;
    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const nowISO = new Date().toISOString();

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as UserRecord | undefined;

    if (action === 'OVERRIDE_MEAL') {
      if (!targetUserId || !date || quantity === undefined) {
        return NextResponse.json({ success: false, error: 'targetUserId, date, and quantity are required' }, { status: 400 });
      }

      const existing = db.prepare('SELECT * FROM daily_meals WHERE user_id = ? AND date = ?').get(targetUserId, date) as any;
      const prevQty = existing ? existing.quantity : 0;

      if (existing) {
        db.prepare('UPDATE daily_meals SET quantity = ?, is_locked = 1, updated_at = ? WHERE id = ?')
          .run(quantity, nowISO, existing.id);
      } else {
        db.prepare(`
          INSERT INTO daily_meals (id, household_id, user_id, date, quantity, is_locked, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `).run(`meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, household.id, targetUserId, date, quantity, nowISO, nowISO);
      }

      // Record audit log as the target user
      db.prepare(`
        INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
        VALUES (?, ?, ?, 'CORRECT_MEAL', 'daily_meals', ?, ?, ?, ?, ?)
      `).run(
        `aud-${Date.now()}`,
        household.id,
        targetUserId,
        targetUserId,
        `${prevQty} meals on ${date}`,
        `${quantity} meals on ${date}`,
        reason || `Meal adjusted for ${targetUser?.name || targetUserId} on ${date} from ${prevQty} to ${quantity}`,
        nowISO
      );

      return NextResponse.json({ success: true, message: `Successfully set ${targetUser?.name}'s meals on ${date} to ${quantity}` });
    }

    if (action === 'RECORD_BAZAAR') {
      if (!targetUserId || !date || !amount) {
        return NextResponse.json({ success: false, error: 'targetUserId, date, and amount are required' }, { status: 400 });
      }

      const expenseIdNew = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO expenses (id, household_id, paid_by_user_id, date, amount, category_id, description, is_food_pool, created_by_user_id, created_at)
        VALUES (?, ?, ?, ?, ?, 'cat-bazaar', ?, 1, ?, ?)
      `).run(
        expenseIdNew,
        household.id,
        targetUserId,
        date,
        parseFloat(amount),
        description || 'Bazaar purchase',
        targetUserId,
        nowISO
      );

      // Audit log as the target user
      db.prepare(`
        INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
        VALUES (?, ?, ?, 'RECORD_BAZAAR', 'expenses', ?, NULL, ?, ?, ?)
      `).run(
        `aud-${Date.now()}`,
        household.id,
        targetUserId,
        expenseIdNew,
        `৳${amount} for ${description}`,
        reason || `Recorded ৳${amount} bazaar on behalf of ${targetUser?.name || targetUserId}`,
        nowISO
      );

      return NextResponse.json({ success: true, message: `Recorded ৳${amount} bazaar for ${targetUser?.name}` });
    }

    return NextResponse.json({ success: false, error: 'Unknown ghost action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
