import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, HouseholdRecord, UserRecord } from '@/lib/db';
import { isDateLockedForUser, getCutoffStatus, getHouseholdDateString } from '@/lib/cutoff';
import { generateBengaliCookingInstruction } from '@/lib/tts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || getHouseholdDateString();

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

    // Fetch the 3 meal-eating flatmates
    const users = db.prepare(
      "SELECT id, name, role FROM users WHERE household_id = ? AND role IN ('admin', 'flatmate') AND id != 'usr-admin' ORDER BY name ASC"
    ).all(household.id) as { id: string; name: string; role: string }[];

    // Fetch meals for date
    const meals = db.prepare(`
      SELECT * FROM daily_meals WHERE household_id = ? AND date = ?
    `).all(household.id, date) as { user_id: string; quantity: number; is_locked: number }[];

    // Fetch milk for date
    const milk = db.prepare(`
      SELECT * FROM milk_records WHERE household_id = ? AND date = ?
    `).all(household.id, date) as { user_id: string; quantity: number; is_locked: number }[];

    // Fetch special requests for date
    const specials = db.prepare(`
      SELECT sr.*, u.name as user_name
      FROM special_requests sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.household_id = ? AND sr.date = ?
    `).all(household.id, date);

    const cutoff = getCutoffStatus(household);
    const lockCheck = isDateLockedForUser(date, household, false);

    const mealMap = new Map(meals.map(m => [m.user_id, m.quantity]));
    const milkMap = new Map(milk.map(m => [m.user_id, m.quantity]));

    const memberData = users.map(u => ({
      userId: u.id,
      userName: u.name,
      role: u.role,
      mealQuantity: mealMap.get(u.id) ?? household.default_meal_qty,
      milkQuantity: milkMap.get(u.id) ?? household.default_milk_qty,
      canEdit: actorUser?.role === 'admin' || actorUser?.id === u.id
    }));

    return NextResponse.json({
      success: true,
      date,
      isLocked: lockCheck.locked,
      lockReason: lockCheck.reason || null,
      cutoff,
      currentUserId: actorUser?.id || 'usr-shah',
      isAdmin: actorUser?.role === 'admin',
      members: memberData,
      specialRequests: specials
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
      date,
      userId,
      mealQuantity,
      milkQuantity,
      specialRequest,
      adminOverrideReason
    } = body;

    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const actorUserId = req.cookies.get('mt_user_id')?.value || userId;
    const actorUser = db.prepare('SELECT * FROM users WHERE id = ?').get(actorUserId) as UserRecord | undefined;

    const isAdmin = actorUser?.role === 'admin';

    // Flatmate permission check: can ONLY edit their own meals
    if (!isAdmin && userId !== actorUserId) {
      return NextResponse.json({
        success: false,
        error: 'You can only modify your own meal plan.'
      }, { status: 403 });
    }

    const lockCheck = isDateLockedForUser(date, household, isAdmin && !!adminOverrideReason);
    if (lockCheck.locked) {
      return NextResponse.json({
        success: false,
        error: lockCheck.reason || 'This date is locked for modifications.'
      }, { status: 403 });
    }

    const nowISO = new Date().toISOString();

    // 1. Update Meal Quantity
    if (mealQuantity !== undefined) {
      const existingMeal = db.prepare(
        'SELECT * FROM daily_meals WHERE household_id = ? AND user_id = ? AND date = ?'
      ).get(household.id, userId, date) as { id: string; quantity: number } | undefined;

      const qty = Math.max(0, parseInt(mealQuantity, 10));

      if (existingMeal) {
        db.prepare(`
          UPDATE daily_meals
          SET quantity = ?, updated_at = ?
          WHERE id = ?
        `).run(qty, nowISO, existingMeal.id);

        if (isAdmin && adminOverrideReason && existingMeal.quantity !== qty) {
          db.prepare(`
            INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
            VALUES (?, ?, ?, 'CORRECT_MEAL', 'daily_meals', ?, ?, ?, ?, ?)
          `).run(
            `aud-${Date.now()}`,
            household.id,
            actorUserId,
            existingMeal.id,
            `Qty: ${existingMeal.quantity}`,
            `Qty: ${qty}`,
            adminOverrideReason,
            nowISO
          );
        }
      } else {
        const newId = `meal-${date}-${userId}`;
        db.prepare(`
          INSERT INTO daily_meals (id, household_id, user_id, date, quantity, is_locked, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `).run(newId, household.id, userId, date, qty, nowISO, nowISO);
      }
    }

    // 2. Update Milk Quantity
    if (milkQuantity !== undefined) {
      const existingMilk = db.prepare(
        'SELECT * FROM milk_records WHERE household_id = ? AND user_id = ? AND date = ?'
      ).get(household.id, userId, date) as { id: string; quantity: number } | undefined;

      const qty = Math.max(0, parseInt(milkQuantity, 10));

      if (existingMilk) {
        db.prepare(`
          UPDATE milk_records
          SET quantity = ?, updated_at = ?
          WHERE id = ?
        `).run(qty, nowISO, existingMilk.id);
      } else {
        const newId = `milk-${date}-${userId}`;
        db.prepare(`
          INSERT INTO milk_records (id, household_id, user_id, date, quantity, is_locked, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `).run(newId, household.id, userId, date, qty, nowISO, nowISO);
      }
    }

    // 3. Add or Synchronize Special Request(s) - Cooking & Room Cleaning
    if (body.replaceSpecialRequests === true && Array.isArray(body.specialRequests)) {
      db.prepare('DELETE FROM special_requests WHERE household_id = ? AND date = ?').run(household.id, date);
      for (const item of body.specialRequests) {
        if (!item || !item.itemName) continue;
        const sId = `spec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        db.prepare(`
          INSERT INTO special_requests (id, household_id, user_id, date, item_name, quantity, notes, estimated_unit_cost, is_locked, created_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, 0, 0, ?)
        `).run(
          sId,
          household.id,
          userId,
          date,
          item.itemName,
          item.notes || null,
          nowISO
        );
      }
    } else if (Array.isArray(body.specialRequests) && body.specialRequests.length > 0) {
      for (const item of body.specialRequests) {
        if (!item || !item.itemName) continue;
        const sId = `spec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        db.prepare(`
          INSERT INTO special_requests (id, household_id, user_id, date, item_name, quantity, notes, estimated_unit_cost, is_locked, created_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, 0, 0, ?)
        `).run(
          sId,
          household.id,
          userId,
          date,
          item.itemName,
          item.notes || null,
          nowISO
        );
      }
    } else if (specialRequest && specialRequest.itemName) {
      const sId = `spec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const sQty = Math.max(1, parseInt(specialRequest.quantity || 1, 10));

      db.prepare(`
        INSERT INTO special_requests (id, household_id, user_id, date, item_name, quantity, notes, estimated_unit_cost, is_locked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
      `).run(
        sId,
        household.id,
        userId,
        date,
        specialRequest.itemName,
        sQty,
        specialRequest.notes || null,
        nowISO
      );
    }

    // Synchronize cooking instruction
    syncCookingInstruction(household.id, date);

    return NextResponse.json({
      success: true,
      message: 'Meal record saved successfully'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDatabase();
    const url = new URL(req.url);
    const specialRequestId = url.searchParams.get('specialRequestId');

    if (!specialRequestId) {
      return NextResponse.json({ success: false, error: 'specialRequestId is required' }, { status: 400 });
    }

    const sr = db.prepare('SELECT * FROM special_requests WHERE id = ?').get(specialRequestId) as { household_id: string; date: string } | undefined;
    if (!sr) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM special_requests WHERE id = ?').run(specialRequestId);
    syncCookingInstruction(sr.household_id, sr.date);

    return NextResponse.json({ success: true, message: 'Special request removed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function syncCookingInstruction(householdId: string, date: string) {
  const db = getDatabase();
  const users = db.prepare("SELECT id, name FROM users WHERE household_id = ? AND role IN ('admin', 'flatmate') AND id != 'usr-admin'").all(householdId) as { id: string; name: string }[];
  
  let totalMeals = 0;
  const flatmateMeals: { name: string; quantity: number }[] = [];
  let totalMilk = 0;
  const flatmateMilk: { name: string; quantity: number }[] = [];

  for (const u of users) {
    const m = db.prepare('SELECT quantity FROM daily_meals WHERE household_id = ? AND user_id = ? AND date = ?').get(householdId, u.id, date) as { quantity: number } | undefined;
    const qty = m ? m.quantity : 1;
    totalMeals += qty;
    flatmateMeals.push({ name: u.name, quantity: qty });

    const milk = db.prepare('SELECT quantity FROM milk_records WHERE household_id = ? AND user_id = ? AND date = ?').get(householdId, u.id, date) as { quantity: number } | undefined;
    const milkQty = milk ? milk.quantity : 1;
    totalMilk += milkQty;
    flatmateMilk.push({ name: u.name, quantity: milkQty });
  }

  const specials = db.prepare('SELECT item_name as itemName, quantity, notes FROM special_requests WHERE household_id = ? AND date = ?').all(householdId, date) as { itemName: string; quantity: number; notes?: string | null }[];

  const bengaliText = generateBengaliCookingInstruction(date, totalMeals, flatmateMeals, specials);

  const existing = db.prepare('SELECT id FROM daily_cooking_instructions WHERE household_id = ? AND date = ?').get(householdId, date) as { id: string } | undefined;
  const nowISO = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE daily_cooking_instructions
      SET total_meals = ?, breakdown_json = ?, special_requests_json = ?, bengali_text = ?
      WHERE id = ?
    `).run(totalMeals, JSON.stringify(flatmateMeals), JSON.stringify(specials), bengaliText, existing.id);
  } else {
    db.prepare(`
      INSERT INTO daily_cooking_instructions (id, household_id, date, total_meals, breakdown_json, special_requests_json, bengali_text, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'generated', ?)
    `).run(`instr-${date}`, householdId, date, totalMeals, JSON.stringify(flatmateMeals), JSON.stringify(specials), bengaliText, nowISO);
  }
}
