import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, HouseholdRecord, UserRecord } from '@/lib/db';
import { computeHouseholdAccounting } from '@/lib/accounting';

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

    const month = url.searchParams.get('month'); // YYYY-MM
    const date = url.searchParams.get('date');   // YYYY-MM-DD
    const userId = url.searchParams.get('userId');

    const { foodStatus, memberBreakdowns } = computeHouseholdAccounting(household.id);
    const users = db.prepare("SELECT id, name FROM users WHERE household_id = ? AND role = 'flatmate' ORDER BY name ASC").all(household.id) as { id: string; name: string }[];

    // 1. Fetch Bazaar Purchases
    let bazaarQuery = `
      SELECT 
        e.*,
        u.name as paid_by_user_name
      FROM expenses e
      JOIN users u ON e.paid_by_user_id = u.id
      WHERE e.household_id = ? AND e.is_food_pool = 1
    `;
    const bazaarParams: any[] = [household.id];

    if (month) {
      bazaarQuery += ` AND e.date LIKE ?`;
      bazaarParams.push(`${month}%`);
    }
    if (userId) {
      bazaarQuery += ` AND e.paid_by_user_id = ?`;
      bazaarParams.push(userId);
    }
    bazaarQuery += ` ORDER BY e.date DESC, e.created_at DESC`;
    const bazaarEntries = db.prepare(bazaarQuery).all(...bazaarParams) as any[];

    // 2. Fetch Daily Meal Records (Day-by-Day Matrix)
    let datesQuery = `
      SELECT DISTINCT date 
      FROM daily_meals 
      WHERE household_id = ?
    `;
    const datesParams: any[] = [household.id];
    if (month) {
      datesQuery += ` AND date LIKE ?`;
      datesParams.push(`${month}%`);
    }
    datesQuery += ` ORDER BY date DESC`;

    const distinctDates = db.prepare(datesQuery).all(...datesParams) as { date: string }[];

    const dailyMealRecords: any[] = [];
    for (const d of distinctDates) {
      const mealsForDate = db.prepare(`
        SELECT dm.id, dm.user_id, dm.quantity, u.name as user_name
        FROM daily_meals dm
        JOIN users u ON dm.user_id = u.id
        WHERE dm.household_id = ? AND dm.date = ? AND u.role = 'flatmate'
      `).all(household.id, d.date) as { id: string; user_id: string; quantity: number; user_name: string }[];

      const specialsForDate = db.prepare(`
        SELECT sr.item_name, sr.quantity, u.name as user_name
        FROM special_requests sr
        JOIN users u ON sr.user_id = u.id
        WHERE sr.household_id = ? AND sr.date = ?
      `).all(household.id, d.date) as { item_name: string; quantity: number; user_name: string }[];

      const userMealMap: Record<string, number> = {};
      let dayTotalMeals = 0;
      for (const m of mealsForDate) {
        userMealMap[m.user_id] = m.quantity;
        dayTotalMeals += m.quantity;
      }

      if (!userId || userMealMap[userId] !== undefined) {
        dailyMealRecords.push({
          date: d.date,
          userMealMap,
          totalMeals: dayTotalMeals,
          specials: specialsForDate
        });
      }
    }

    // 3. Fetch Activity Log / Alterations Audit Trail
    let activityQuery = `
      SELECT 
        a.*,
        COALESCE(u.name, 'Flatmate') as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.household_id = ?
    `;
    const activityParams: any[] = [household.id];

    if (month) {
      activityQuery += ` AND a.timestamp LIKE ?`;
      activityParams.push(`${month}%`);
    }
    if (userId) {
      const targetUser = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;
      const targetName = targetUser?.name || '';
      activityQuery += ` AND (a.user_id = ? OR a.reason LIKE ? OR a.after_value LIKE ?)`;
      activityParams.push(userId, `%${targetName}%`, `%${targetName}%`);
    }
    activityQuery += ` ORDER BY a.timestamp DESC, a.id DESC`;
    const activityLogs = db.prepare(activityQuery).all(...activityParams);

    const parsedBazaarEntries = bazaarEntries.map(b => {
      let parsedImages: string[] = [];
      if (b.receipt_images) {
        try {
          parsedImages = typeof b.receipt_images === 'string' ? JSON.parse(b.receipt_images) : b.receipt_images;
        } catch (_) {
          parsedImages = [];
        }
      }
      return {
        ...b,
        receipt_images: parsedImages
      };
    });

    const totalBazaar = bazaarEntries.reduce((sum, b) => sum + b.amount, 0);
    const totalMealsConsumed = dailyMealRecords.reduce((sum, d) => sum + d.totalMeals, 0);

    return NextResponse.json({
      success: true,
      filter: { month, date, userId },
      summary: {
        totalBazaar,
        totalMealsConsumed,
        estimatedMealCost: foodStatus.estimatedMealCost
      },
      bazaarEntries: parsedBazaarEntries,
      dailyMealRecords,
      activityLogs,
      users,
      memberBreakdowns
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
