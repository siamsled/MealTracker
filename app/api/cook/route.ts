import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, HouseholdRecord, UserRecord } from '@/lib/db';
import { getHouseholdDateString, getCutoffStatus } from '@/lib/cutoff';
import { generateBengaliCookingInstruction, toBengaliNumeral } from '@/lib/tts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const url = new URL(req.url);
    
    // Support ?user= query param
    const requestedUserId = url.searchParams.get('user') || url.searchParams.get('userId');
    const date = url.searchParams.get('date') || getHouseholdDateString();

    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const cutoff = getCutoffStatus(household);

    // Fetch the 3 meal-eating flatmates
    const users = db.prepare(
      "SELECT id, name FROM users WHERE household_id = ? AND role IN ('admin', 'flatmate') AND id != 'usr-admin' ORDER BY name ASC"
    ).all(household.id) as { id: string; name: string }[];

    // Fetch meals
    let totalMeals = 0;
    const flatmateMeals: { name: string; quantity: number }[] = [];
    for (const u of users) {
      const m = db.prepare('SELECT quantity FROM daily_meals WHERE household_id = ? AND user_id = ? AND date = ?').get(household.id, u.id, date) as { quantity: number } | undefined;
      const qty = m ? m.quantity : (household.default_meal_qty || 1);
      totalMeals += qty;
      flatmateMeals.push({ name: u.name, quantity: qty });
    }

    // Fetch special requests
    const specials = db.prepare(`
      SELECT sr.*, u.name as user_name
      FROM special_requests sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.household_id = ? AND sr.date = ?
    `).all(household.id, date) as any[];

    // Separate specials into cooking instructions and cleaning tasks
    const cookingInstructions: { name: string; user: string }[] = [];
    const cleaningTasks: { name: string; user: string }[] = [];

    for (const sr of specials) {
      const lower = sr.item_name.toLowerCase();
      if (lower.includes('clean') || lower.includes('পরিষ্কার')) {
        cleaningTasks.push({ name: sr.item_name, user: sr.user_name });
      } else {
        cookingInstructions.push({ name: sr.item_name, user: sr.user_name });
      }
    }

    // Format Bengali instruction with day of week & date
    const bengaliText = generateBengaliCookingInstruction(
      date,
      totalMeals,
      flatmateMeals,
      specials.map(s => ({ itemName: s.item_name, quantity: s.quantity, notes: s.notes }))
    );

    const response = NextResponse.json({
      success: true,
      date,
      cutoff,
      instruction: {
        bengaliText,
        totalMeals,
        totalMealsBengali: toBengaliNumeral(totalMeals),
        flatmateMeals,
        cookingInstructions,
        cleaningTasks
      }
    });

    // If a user was passed via URL, set cookie
    if (requestedUserId) {
      response.cookies.set('mt_user_id', requestedUserId, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
