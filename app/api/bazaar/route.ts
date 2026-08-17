import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, HouseholdRecord, ExpenseRecord, UserRecord } from '@/lib/db';
import { getHouseholdDateString } from '@/lib/cutoff';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const url = new URL(req.url);
    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const sessionUserId = req.cookies.get('mt_user_id')?.value || req.headers.get('x-user-id');
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const actorUser = db.prepare('SELECT * FROM users WHERE id = ?').get(sessionUserId) as UserRecord | undefined;
    if (!actorUser || actorUser.role === 'cook') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const actorUserId = actorUser.id;

    const month = url.searchParams.get('month'); // YYYY-MM
    const date = url.searchParams.get('date');   // YYYY-MM-DD
    const userId = url.searchParams.get('userId');
    const isFoodPool = url.searchParams.get('isFoodPool');

    let query = `
      SELECT 
        e.*,
        u.name as paid_by_user_name,
        c.name as category_name,
        c.icon as category_icon,
        c.type as category_type
      FROM expenses e
      JOIN users u ON e.paid_by_user_id = u.id
      JOIN expense_categories c ON e.category_id = c.id
      WHERE e.household_id = ?
    `;
    const params: any[] = [household.id];

    if (month) {
      query += ` AND e.date LIKE ?`;
      params.push(`${month}%`);
    }

    if (date) {
      query += ` AND e.date = ?`;
      params.push(date);
    }

    if (userId) {
      query += ` AND e.paid_by_user_id = ?`;
      params.push(userId);
    }

    if (isFoodPool !== null && isFoodPool !== undefined && isFoodPool !== '') {
      query += ` AND e.is_food_pool = ?`;
      params.push(isFoodPool === 'true' || isFoodPool === '1' ? 1 : 0);
    }

    query += ` ORDER BY e.date DESC, e.created_at DESC`;

    const rawExpenses = db.prepare(query).all(...params) as any[];

    // Add canEdit flag, parse receipt images & attach correction history
    const expenses = rawExpenses.map(e => {
      let parsedImages: string[] = [];
      if (e.receipt_images) {
        try {
          parsedImages = JSON.parse(e.receipt_images);
        } catch (_) {
          parsedImages = [];
        }
      }

      let corrections: any[] = [];
      if (e.is_correction === 1) {
        corrections = db.prepare(`
          SELECT a.*, COALESCE(u.name, 'Ghost Admin') as user_name
          FROM audit_logs a
          LEFT JOIN users u ON a.user_id = u.id
          WHERE a.target_table = 'expenses' AND a.target_id = ?
          ORDER BY a.timestamp DESC
        `).all(e.id);
      }

      return {
        ...e,
        receipt_images: parsedImages,
        corrections,
        canEdit: actorUser?.role === 'admin' || e.paid_by_user_id === actorUser?.id
      };
    });

    const categories = db.prepare('SELECT * FROM expense_categories WHERE household_id = ? ORDER BY name ASC').all(household.id);
    
    // Flatmates only (Siam, Raiyan, Jubayer)
    const users = db.prepare("SELECT id, name FROM users WHERE household_id = ? AND role = 'flatmate' ORDER BY name ASC").all(household.id);

    return NextResponse.json({
      success: true,
      currentUserId: actorUser?.id || 'usr-siam',
      isAdmin: actorUser?.role === 'admin',
      expenses,
      categories,
      users
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDatabase();
    const body = await req.json();
    const {
      amount,
      paidByUserId,
      categoryId,
      description,
      date,
      isFoodPool,
      receiptImages
    } = body;

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount is required' }, { status: 400 });
    }

    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    
    // Find default category
    const defaultCat = db.prepare("SELECT id FROM expense_categories WHERE household_id = ? LIMIT 1").get(household.id) as { id: string } | undefined;
    const resolvedCatId = categoryId || defaultCat?.id || 'cat-bazaar';

    // Find default flatmate if paidByUserId was not selected
    let resolvedPayer = paidByUserId;
    if (!resolvedPayer) {
      const firstFlatmate = db.prepare("SELECT id FROM users WHERE household_id = ? AND role = 'flatmate' LIMIT 1").get(household.id) as { id: string } | undefined;
      resolvedPayer = firstFlatmate?.id || 'usr-siam';
    }

    const actorUserId = req.cookies.get('mt_user_id')?.value || resolvedPayer;
    const actorUser = db.prepare('SELECT name, role FROM users WHERE id = ?').get(actorUserId) as { name: string; role: string } | undefined;
    const payerUser = db.prepare('SELECT name FROM users WHERE id = ?').get(resolvedPayer) as { name: string } | undefined;

    const expenseDate = date || getHouseholdDateString();
    const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const nowISO = new Date().toISOString();

    const numAmount = Math.round(parseFloat(amount) * 100) / 100;
    const isFood = isFoodPool === false || isFoodPool === 0 ? 0 : 1;
    const receiptImagesJson = Array.isArray(receiptImages) && receiptImages.length > 0 ? JSON.stringify(receiptImages.slice(0, 3)) : null;

    // 1. Insert expense record
    db.prepare(`
      INSERT INTO expenses (
        id, household_id, paid_by_user_id, date, amount, category_id, description, receipt_images, is_food_pool, is_correction, original_expense_id, created_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
    `).run(
      expenseId,
      household.id,
      resolvedPayer,
      expenseDate,
      numAmount,
      resolvedCatId,
      description || 'Bazaar food purchase',
      receiptImagesJson,
      isFood,
      actorUserId,
      nowISO
    );

    // 2. Insert into Continuous Ledger if affecting food pool
    if (isFood === 1) {
      const ledgerId = `ledg-${expenseId}`;
      db.prepare(`
        INSERT INTO continuous_ledger (
          id, household_id, timestamp, date, user_id, entry_type, amount, description, ref_table, ref_id, audit_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, 'bazaar_contribution', ?, ?, 'expenses', ?, NULL, ?)
      `).run(
        ledgerId,
        household.id,
        nowISO,
        expenseDate,
        resolvedPayer,
        numAmount,
        `Bazaar purchase: ${description || 'Food purchase'}`,
        expenseId,
        nowISO
      );
    }

    // 3. Insert transparent audit log
    const payerName = payerUser?.name || 'Flatmate';
    const actorName = actorUser?.name || payerName;
    const receiptNote = Array.isArray(receiptImages) && receiptImages.length > 0 ? ` (${receiptImages.length} receipts attached)` : '';

    db.prepare(`
      INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
      VALUES (?, ?, ?, 'RECORD_BAZAAR', 'expenses', ?, NULL, ?, ?, ?)
    `).run(
      `aud-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      household.id,
      actorUserId,
      expenseId,
      `+৳${numAmount.toLocaleString()} (${description || 'Food items'})${receiptNote}`,
      `${actorName} recorded ৳${numAmount.toLocaleString()} bazaar for ${payerName}${receiptNote}`,
      nowISO
    );

    return NextResponse.json({
      success: true,
      expenseId,
      message: 'Bazaar purchase successfully recorded with compressed receipt storage'
    });
  } catch (error: any) {
    console.error('Bazaar POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDatabase();
    const body = await req.json();
    const {
      expenseId,
      newAmount,
      correctionReason,
      newDescription,
      newCategoryId,
      receiptImages
    } = body;

    if (!expenseId || !correctionReason) {
      return NextResponse.json({ success: false, error: 'expenseId and correctionReason are required' }, { status: 400 });
    }

    const orig = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId) as ExpenseRecord | undefined;
    if (!orig) {
      return NextResponse.json({ success: false, error: 'Original expense not found' }, { status: 404 });
    }

    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const actorUserId = req.cookies.get('mt_user_id')?.value || orig.paid_by_user_id;
    const actorUser = db.prepare('SELECT name, role FROM users WHERE id = ?').get(actorUserId) as { name: string; role: string } | undefined;

    // Security Check: Users can ONLY edit their own bazaar, unless Ghost Admin
    if (actorUser?.role !== 'admin' && orig.paid_by_user_id !== actorUserId) {
      return NextResponse.json({ success: false, error: 'Permission denied: You can only edit your own bazaar records.' }, { status: 403 });
    }

    const nowISO = new Date().toISOString();
    const finalAmount = newAmount !== undefined ? Math.round(parseFloat(newAmount) * 100) / 100 : orig.amount;
    const finalDesc = newDescription !== undefined ? newDescription : orig.description;
    const finalCat = newCategoryId !== undefined ? newCategoryId : orig.category_id;
    const receiptImagesJson = Array.isArray(receiptImages) ? JSON.stringify(receiptImages.slice(0, 3)) : orig.receipt_images;

    // Update expense record
    db.prepare(`
      UPDATE expenses
      SET amount = ?, description = ?, category_id = ?, receipt_images = ?, is_correction = 1
      WHERE id = ?
    `).run(finalAmount, finalDesc, finalCat, receiptImagesJson, expenseId);

    // Update continuous ledger if needed
    if (orig.is_food_pool === 1) {
      db.prepare(`
        UPDATE continuous_ledger
        SET amount = ?, description = ?, audit_reason = ?
        WHERE ref_table = 'expenses' AND ref_id = ?
      `).run(
        finalAmount,
        `Bazaar purchase (Edited): ${finalDesc}`,
        correctionReason,
        expenseId
      );
    }

    // Insert transparent audit log
    const actorName = actorUser?.name || 'Flatmate';
    db.prepare(`
      INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
      VALUES (?, ?, ?, 'CORRECT_BAZAAR', 'expenses', ?, ?, ?, ?, ?)
    `).run(
      `aud-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      household.id,
      actorUserId,
      expenseId,
      `৳${orig.amount} (${orig.description})`,
      `৳${finalAmount} (${finalDesc})`,
      `${actorName} edited bazaar from ৳${orig.amount} to ৳${finalAmount}. Note: "${correctionReason}"`,
      nowISO
    );

    return NextResponse.json({
      success: true,
      message: 'Bazaar correction saved and logged in activity trail'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
