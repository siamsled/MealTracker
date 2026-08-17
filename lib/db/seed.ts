import { getDatabase } from './index';

export function seedDatabase() {
  const db = getDatabase();

  console.log('🌱 Seeding MealTracker with realistic flat data...');

  // Clear existing tables
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM daily_cooking_instructions;
    DELETE FROM food_inventory_snapshots;
    DELETE FROM continuous_ledger;
    DELETE FROM expenses;
    DELETE FROM special_requests;
    DELETE FROM milk_records;
    DELETE FROM daily_meals;
    DELETE FROM bazaar_commitments;
    DELETE FROM expense_categories;
    DELETE FROM users;
    DELETE FROM households;
  `);

  const householdId = 'hh-flat-4b';

  // 1. Insert Household
  db.prepare(`
    INSERT INTO households (
      id, name, currency_symbol, currency_code, timezone, cutoff_hour, cutoff_minute, tolerance_amount, default_meal_qty, default_milk_qty, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    householdId,
    'Siam, Raiyan & Jubayer Household',
    '৳',
    'BDT',
    'Asia/Dhaka',
    6,
    0,
    150.0,
    1,
    '2026-08-01T00:00:00Z'
  );

  // 2. Profiles
  const users = [
    { id: 'usr-siam', name: 'Siam', username: 'siam', password: '111', email: 'siam@household.local', role: 'flatmate', pin: '1111' },
    { id: 'usr-raiyan', name: 'Raiyan', username: 'raiyan', password: '222', email: 'raiyan@household.local', role: 'flatmate', pin: '2222' },
    { id: 'usr-jubayer', name: 'Jubayer', username: 'jubayer', password: '333', email: 'jubayer@household.local', role: 'flatmate', pin: '3333' },
    { id: 'usr-admin', name: 'Admin', username: 'admin', password: '999', email: 'admin@household.local', role: 'admin', pin: '9999' },
    { id: 'usr-khala', name: 'Khala (Cook)', username: 'khala', password: '000', email: 'khala@household.local', role: 'cook', pin: '0000' }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, household_id, name, username, password, email, role, pin, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, householdId, u.name, u.username, u.password, u.email, u.role, u.pin, '2026-08-01T00:00:00Z');
  }

  // 3. Category
  db.prepare(`
    INSERT INTO expense_categories (id, household_id, name, type, icon, is_default)
    VALUES (?, ?, ?, 'food_pool', '🛒', 1)
  `).run('cat-bazaar', householdId, 'Bazaar Food Purchase');

  // 4. Seed Daily Meals (August 1 to 20, 2026)
  // Siam eats regularly (25 meals)
  // Raiyan eats slightly more (30 meals)
  // Jubayer eats fewer meals (15 meals - out of home frequently)
  const insertMeal = db.prepare(`
    INSERT INTO daily_meals (id, household_id, user_id, date, quantity, is_locked, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSpecial = db.prepare(`
    INSERT INTO special_requests (id, household_id, user_id, date, item_name, quantity, notes, estimated_unit_cost, is_locked, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInstruction = db.prepare(`
    INSERT INTO daily_cooking_instructions (id, household_id, date, total_meals, breakdown_json, special_requests_json, bengali_text, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'generated', ?)
  `);

  for (let day = 1; day <= 22; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `2026-08-${dayStr}`;
    const createdTime = `${dateStr}T06:00:00Z`;

    const mealSiam = day <= 17 ? (day % 4 === 0 ? 2 : 1) : 1;
    const mealRaiyan = day <= 17 ? (day % 2 === 0 ? 2 : 1) : 1;
    const mealJubayer = day <= 17 ? ((day % 2 === 1 && day <= 15) ? 1 : (day === 17 ? 1 : 0)) : 1;
    const totalMeals = mealSiam + mealRaiyan + mealJubayer;

    insertMeal.run(`meal-${dateStr}-siam`, householdId, 'usr-siam', dateStr, mealSiam, day < 17 ? 1 : 0, createdTime, createdTime);
    insertMeal.run(`meal-${dateStr}-raiyan`, householdId, 'usr-raiyan', dateStr, mealRaiyan, day < 17 ? 1 : 0, createdTime, createdTime);
    insertMeal.run(`meal-${dateStr}-jubayer`, householdId, 'usr-jubayer', dateStr, mealJubayer, day < 17 ? 1 : 0, createdTime, createdTime);

    const specials: any[] = [];
    if (day === 10 || day === 17) {
      insertSpecial.run(`spec-${dateStr}-egg`, householdId, 'usr-raiyan', dateStr, 'Egg', 2, 'Boiled eggs for breakfast', 15.0, 1, createdTime);
      specials.push({ itemName: 'Egg', quantity: 2 });
    }

    const breakdown = [
      { name: 'Siam', quantity: mealSiam },
      { name: 'Raiyan', quantity: mealRaiyan },
      { name: 'Jubayer', quantity: mealJubayer }
    ];

    const instructionBengali = `শুভ সকাল খালা। আজকে মোট ${totalMeals === 3 ? 'তিনটি' : totalMeals === 4 ? 'চারটি' : `${totalMeals}টি`} মিল রান্না করতে হবে।` + (specials.length > 0 ? ' দুইটি ডিমের বিশেষ অনুরোধ আছে।' : '') + ' ধন্যবাদ।';

    insertInstruction.run(
      `instr-${dateStr}`,
      householdId,
      dateStr,
      totalMeals,
      JSON.stringify(breakdown),
      JSON.stringify(specials),
      instructionBengali,
      createdTime
    );
  }

  // 5. Seed Bazaar Purchases
  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, household_id, paid_by_user_id, date, amount, category_id, description, is_food_pool, is_correction, original_expense_id, created_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, 'cat-bazaar', ?, 1, 0, NULL, ?, ?)
  `);

  const insertLedger = db.prepare(`
    INSERT INTO continuous_ledger (id, household_id, timestamp, date, user_id, entry_type, amount, description, ref_table, ref_id, audit_reason, created_at)
    VALUES (?, ?, ?, ?, ?, 'bazaar_contribution', ?, ?, 'expenses', ?, NULL, ?)
  `);

  const bazaarList = [
    { id: 'exp-01', user: 'usr-siam', date: '2026-08-02', amount: 3000.0, desc: '25kg Miniket rice, 5L soybean oil, spices' },
    { id: 'exp-02', user: 'usr-jubayer', date: '2026-08-07', amount: 3000.0, desc: 'Rui fish, vegetables, potatoes, onions, lentils' },
    { id: 'exp-03', user: 'usr-raiyan', date: '2026-08-12', amount: 4500.0, desc: '2kg Fresh beef, 2 broiler chickens, eggs & ginger' }
  ];

  for (const b of bazaarList) {
    const timeISO = `${b.date}T10:30:00Z`;
    insertExpense.run(b.id, householdId, b.user, b.date, b.amount, b.desc, b.user, timeISO);
    insertLedger.run(`ledg-${b.id}`, householdId, timeISO, b.date, b.user, b.amount, `Bazaar purchase: ${b.desc}`, b.id, timeISO);
  }

  // 6. Audit Log
  db.prepare(`
    INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
    VALUES (?, ?, ?, 'CREATE_HOUSEHOLD', 'households', ?, NULL, 'Setup household system for Siam, Raiyan, and Jubayer', 'Household setup', '2026-08-01T00:00:00Z')
  `).run('aud-init', householdId, 'usr-admin', householdId);

  console.log('✅ Realistic seed data generated successfully!');
}

if (require.main === module) {
  seedDatabase();
}
