import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseFromCloud, HouseholdRecord } from '@/lib/db';
import { computeHouseholdAccounting } from '@/lib/accounting';
import { getCutoffStatus } from '@/lib/cutoff';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await syncDatabaseFromCloud();
    const db = getDatabase();
    const url = new URL(req.url);

    // Fetch primary household
    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord | undefined;
    if (!household) {
      return NextResponse.json({ success: false, error: 'No household initialized' }, { status: 404 });
    }

    // Determine requesting user via authenticated session cookie or header
    const sessionUserId = req.cookies.get('mt_user_id')?.value || req.headers.get('x-user-id');
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const requestingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(sessionUserId) as any;
    if (!requestingUser || requestingUser.role === 'cook') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const userId = requestingUser.id;

    // 1. Accounting calculations
    const { foodStatus, memberBreakdowns } = computeHouseholdAccounting(household.id);

    // 2. Cutoff calculation
    const cutoff = getCutoffStatus(household);

    // 3. User balance breakdown
    const userBalance = memberBreakdowns.find(m => m.userId === userId) || memberBreakdowns[0] || null;

    // 4. Today's meal plan summary for quick glance
    const todayStr = cutoff.serverToday;
    const todayMeals = db.prepare(`
      SELECT dm.quantity as meals, u.id as user_id, u.name as user_name
      FROM users u
      LEFT JOIN daily_meals dm ON dm.user_id = u.id AND dm.date = ?
      WHERE u.household_id = ? AND u.role = 'flatmate' AND u.id != 'usr-admin'
      ORDER BY u.name ASC
    `).all(todayStr, household.id) as { meals: number | null; user_id: string; user_name: string }[];

    const todaySpecials = db.prepare(`
      SELECT sr.*, u.name as user_name
      FROM special_requests sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.household_id = ? AND sr.date = ?
    `).all(household.id, todayStr);

    return NextResponse.json({
      success: true,
      household: {
        id: household.id,
        name: household.name,
        currencySymbol: household.currency_symbol || '৳',
        currencyCode: household.currency_code || 'BDT',
        tolerance: household.tolerance_amount || 200,
        cutoffHour: household.cutoff_hour,
        cutoffMinute: household.cutoff_minute
      },
      cutoff,
      foodStatus,
      userBalance,
      allMembers: memberBreakdowns,
      todaySummary: {
        date: todayStr,
        members: todayMeals.map(m => ({
          userId: m.user_id,
          userName: m.user_name,
          meals: m.meals ?? (household.default_meal_qty || 1)
        })),
        specials: todaySpecials
      }
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
