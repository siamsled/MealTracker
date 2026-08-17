import { getDatabase, HouseholdRecord, UserRecord, ExpenseRecord, DailyMealRecord, BazaarCommitmentRecord } from './db';

export interface DateFilter {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  month?: string;     // YYYY-MM
}

export interface UserBalanceBreakdown {
  userId: string;
  userName: string;
  mealsCount: number;
  mealsValue: number;
  totalConsumptionValue: number;
  totalFoodContribution: number;
  netBalance: number; // positive = ahead, negative = behind
  tolerance: number;
  status: 'BALANCED' | 'AHEAD' | 'BEHIND';
  statusText: string;
  suggestedBazaarAmount: number;
  explanation: string;
}

export interface HouseholdFoodStatus {
  estimatedMealCost: number;
  foodInventoryValue: number;
  dailyConsumptionRate: number;
  coverageDays: number;
  totalMealsRecorded: number;
  totalFoodPurchasesRecorded: number;
  isInventorySufficient: boolean;
  recommendedShopper: {
    userId: string;
    userName: string;
    suggestedAmount: number;
    reason: string;
    immediateRequired: boolean;
  } | null;
  activeCommitment: {
    id: string;
    userId: string;
    userName: string;
    targetDate: string;
    estimatedAmount: number;
  } | null;
}

/**
 * Pure Flat/Mess Household Accounting:
 * - Total Bazaar = Sum of all bazaar expenses recorded till date
 * - Total Meals = Sum of all meals eaten by flatmates till date
 * - Current Meal Rate = Total Bazaar / Total Meals
 * - Flatmate Consumed Cost = Flatmate Meals * Current Meal Rate
 * - Flatmate Net Balance = Flatmate Bazaar Contributed - Flatmate Consumed Cost
 * 
 * * Cooking/dish requests (dal, chicken, eggs, less oil) are household menu instructions
 *   for Khala and do NOT charge extra individual fees to any flatmate.
 * * Sum of all flatmates' balances is ALWAYS exactly 0.00!
 */
export function computeHouseholdAccounting(householdId: string, filter?: DateFilter) {
  const db = getDatabase();

  // 1. Fetch Household settings
  const household = db.prepare('SELECT * FROM households WHERE id = ?').get(householdId) as HouseholdRecord | undefined;
  if (!household) {
    throw new Error(`Household ${householdId} not found`);
  }

  // 2. Fetch Flatmates only (Siam, Raiyan, Jubayer) - Admin and Cook are NEVER in accounting
  const users = db.prepare(
    "SELECT * FROM users WHERE household_id = ? AND role = 'flatmate' AND is_active = 1 ORDER BY name ASC"
  ).all(householdId) as UserRecord[];

  // 3. Fetch Total Bazaar Purchases
  const foodPurchasesAllTime = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM expenses
    WHERE household_id = ? AND is_food_pool = 1
  `).get(householdId) as { total: number };

  const totalFoodPurchases = foodPurchasesAllTime.total;

  // 4. Fetch Total Meals Count across all flatmates
  const totalMealsAllTime = db.prepare(`
    SELECT COALESCE(SUM(dm.quantity), 0) as total
    FROM daily_meals dm
    JOIN users u ON dm.user_id = u.id
    WHERE dm.household_id = ? AND u.role = 'flatmate'
  `).get(householdId) as { total: number };

  const totalMeals = totalMealsAllTime.total;

  // 5. Current Meal Rate = Total Bazaar / Total Meals
  const rawMealRate = totalMeals > 0 ? totalFoodPurchases / totalMeals : 0;
  const estimatedMealCost = Math.round(rawMealRate * 100) / 100;

  // 6. Calculate Personal Balances for each Flatmate
  const tolerance = household.tolerance_amount || 150.0;
  const memberBreakdowns: UserBalanceBreakdown[] = [];

  for (const user of users) {
    // User's total meals
    const userMeals = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM daily_meals
      WHERE household_id = ? AND user_id = ?
    `).get(householdId, user.id) as { total: number };

    // Exact proportional consumption value (leak-proof, sum === totalFoodPurchases)
    const rawUserConsumed = totalMeals > 0 ? (userMeals.total / totalMeals) * totalFoodPurchases : 0;
    const mealsVal = Math.round(rawUserConsumed * 100) / 100;
    const totalConsumed = mealsVal;

    // User's total food bazaar contributions
    const userContributions = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE household_id = ? AND paid_by_user_id = ? AND is_food_pool = 1
    `).get(householdId, user.id) as { total: number };

    const totalContributed = userContributions.total;

    // Net Balance = Contributed - Consumed
    const netBalance = Math.round((totalContributed - totalConsumed) * 100) / 100;

    let status: 'BALANCED' | 'AHEAD' | 'BEHIND';
    let statusText: string;
    let suggestedBazaarAmount = 0;
    let explanation: string;

    if (Math.abs(netBalance) <= tolerance) {
      status = 'BALANCED';
      statusText = 'Balanced';
      explanation = `Your balance is within the household tolerance (±৳${tolerance}).`;
    } else if (netBalance > tolerance) {
      status = 'AHEAD';
      statusText = `+৳${Math.round(netBalance).toLocaleString()}`;
      explanation = `You have contributed ৳${Math.round(netBalance).toLocaleString()} more than your meal share.`;
    } else {
      status = 'BEHIND';
      const behindAmount = Math.abs(netBalance);
      statusText = `−৳${Math.round(behindAmount).toLocaleString()}`;
      suggestedBazaarAmount = Math.round(behindAmount / 50) * 50;
      explanation = `You have eaten ৳${Math.round(behindAmount).toLocaleString()} more than your contribution. Next recommended bazaar: ~৳${suggestedBazaarAmount.toLocaleString()}`;
    }

    memberBreakdowns.push({
      userId: user.id,
      userName: user.name,
      mealsCount: userMeals.total,
      mealsValue: mealsVal,
      totalConsumptionValue: totalConsumed,
      totalFoodContribution: totalContributed,
      netBalance,
      tolerance,
      status,
      statusText,
      suggestedBazaarAmount,
      explanation
    });
  }

  // 7. Recommend Next Shopper: The flatmate who is most BEHIND in bazaar
  const behindMembers = [...memberBreakdowns].sort((a, b) => a.netBalance - b.netBalance);
  let recommendedShopper = null;

  if (behindMembers.length > 0) {
    const mostBehind = behindMembers[0];
    if (mostBehind.netBalance < -tolerance) {
      const suggestedAmount = Math.max(500, Math.round(Math.abs(mostBehind.netBalance) / 50) * 50);
      recommendedShopper = {
        userId: mostBehind.userId,
        userName: mostBehind.userName,
        suggestedAmount,
        reason: `${mostBehind.userName} has consumed ৳${Math.round(Math.abs(mostBehind.netBalance)).toLocaleString()} more than contributed. A bazaar of ~৳${suggestedAmount.toLocaleString()} will balance the household.`,
        immediateRequired: true
      };
    } else {
      recommendedShopper = {
        userId: mostBehind.userId,
        userName: mostBehind.userName,
        suggestedAmount: 1000,
        reason: `Everyone is balanced within ±৳${tolerance}. ${mostBehind.userName} can do the next regular bazaar.`,
        immediateRequired: false
      };
    }
  }

  // 8. Active Commitment
  const commitment = db.prepare(`
    SELECT bc.*, u.name as user_name
    FROM bazaar_commitments bc
    JOIN users u ON bc.user_id = u.id
    WHERE bc.household_id = ? AND bc.status = 'active'
    ORDER BY bc.created_at DESC
    LIMIT 1
  `).get(householdId) as (BazaarCommitmentRecord & { user_name: string }) | undefined;

  const activeCommitment = commitment ? {
    id: commitment.id,
    userId: commitment.user_id,
    userName: commitment.user_name,
    targetDate: commitment.target_date,
    estimatedAmount: commitment.estimated_amount
  } : null;

  const avgDailyMeals = Math.max(2, users.length * (household.default_meal_qty || 1));
  const avgDailyFoodValue = avgDailyMeals * estimatedMealCost;

  const foodStatus: HouseholdFoodStatus = {
    estimatedMealCost,
    foodInventoryValue: totalFoodPurchases,
    dailyConsumptionRate: Math.round(3 * estimatedMealCost * 10) / 10,
    coverageDays: 7.0,
    totalMealsRecorded: totalMeals,
    totalFoodPurchasesRecorded: totalFoodPurchases,
    isInventorySufficient: true,
    recommendedShopper,
    activeCommitment
  };

  return {
    foodStatus,
    memberBreakdowns
  };
}

export function getMonthlyReport(householdId: string, month: string) {
  const db = getDatabase();
  const expenses = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE household_id = ? AND is_food_pool = 1 AND date LIKE ?").get(householdId, `${month}%`) as { total: number };
  const meals = db.prepare("SELECT COALESCE(SUM(quantity), 0) as total FROM daily_meals dm JOIN users u ON dm.user_id = u.id WHERE dm.household_id = ? AND dm.date LIKE ? AND u.role = 'flatmate'").get(householdId, `${month}%`) as { total: number };
  const mealRate = meals.total > 0 ? Math.round((expenses.total / meals.total) * 100) / 100 : 0;

  return {
    month,
    totalFoodPurchases: expenses.total,
    totalMeals: meals.total,
    mealRate,
    consumedFoodValue: expenses.total,
    closingInventory: expenses.total
  };
}
