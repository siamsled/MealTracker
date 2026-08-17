import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, HouseholdRecord } from '@/lib/db';
import { computeHouseholdAccounting, getMonthlyReport } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = getDatabase();
    const url = new URL(req.url);
    const household = db.prepare('SELECT * FROM households LIMIT 1').get() as HouseholdRecord;
    const requestedMonth = url.searchParams.get('month') || '2026-08';

    // 1. Compute global continuous accounting state
    const { foodStatus, memberBreakdowns } = computeHouseholdAccounting(household.id);

    // 2. Compute monthly report over continuous ledger
    const monthlyReport = getMonthlyReport(household.id, requestedMonth);

    // 3. Category breakdown
    const categoryStats = db.prepare(`
      SELECT 
        c.name as category_name,
        c.icon as category_icon,
        c.type as category_type,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COUNT(e.id) as transaction_count
      FROM expense_categories c
      LEFT JOIN expenses e ON e.category_id = c.id AND e.household_id = ?
      GROUP BY c.id
      ORDER BY total_amount DESC
    `).all(household.id);

    // 4. Meal distribution by flatmate
    const mealDistribution = memberBreakdowns.map(m => ({
      userId: m.userId,
      userName: m.userName,
      meals: m.mealsCount,
      totalConsumption: m.totalConsumptionValue,
      totalContribution: m.totalFoodContribution,
      netBalance: m.netBalance
    }));

    return NextResponse.json({
      success: true,
      month: requestedMonth,
      foodStatus,
      monthlyReport,
      categoryStats,
      mealDistribution
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
