import { createClient } from '@libsql/client';

const TURSO_URL = 'libsql://mealtracker-siamsled.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODY5Njc2MDgsImlkIjoiMDFhMDBmOTEtNTIwMS03NGFlLTk2MGQtYTgxOTc5NzE4ZTQ2Iiwia2lkIjoiRjFhek5MOExvSE42RHZKbWZ4b29mdlVuaGJmRFEtU3JhMjcwNWRVZnhVRSIsInJpZCI6ImY4NWNiYTFmLTZjMWEtNDg4MC1iN2Q3LWZkZWYwODBlMGQ0OCJ9.J3rsLjI0cww1RY9GagkLyLWaX7iUmGhXFdCQE9PxDYcaptkizpOn2XDSVM_jG6Mar9Bn8hE_Ikxc5gKRa-uwCQ';

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN
});

interface RowData {
  date: string;
  siamMeals: number;
  siamBazar: number;
  siamDesc: string;
  raiyanMeals: number;
  raiyanBazar: number;
  raiyanDesc: string;
  jubayerMeals: number;
  jubayerBazar: number;
  jubayerDesc: string;
}

const RAW_DATA: RowData[] = [
  { date: '2026-06-07', siamMeals: 0, siamBazar: 1100, siamDesc: 'Bazar', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-09', siamMeals: 2, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 1320, raiyanDesc: 'Bazar; oil', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-10', siamMeals: 2, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-11', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-12', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-14', siamMeals: 2, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-17', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-18', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-19', siamMeals: 2, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-21', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 210, jubayerDesc: 'Egg,oil' },
  { date: '2026-06-22', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 2, jubayerBazar: 370, jubayerDesc: 'Bazar' },
  { date: '2026-06-23', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-26', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-30', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 510, jubayerDesc: 'Chicken, Oil, Veg' },
  { date: '2026-07-01', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-02', siamMeals: 2, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 164, jubayerDesc: 'Peyaj, Eggs ,Lentil' },
  { date: '2026-07-03', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-04', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 758, raiyanDesc: 'Bazar', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-05', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-06', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 425, jubayerDesc: 'chicken, Oil....' },
  { date: '2026-07-07', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-08', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-09', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-11', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 220, jubayerDesc: 'Oil; Peyaj,zeera,moric' },
  { date: '2026-07-12', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 105, jubayerDesc: 'Polao chal, mugdal' },
  { date: '2026-07-13', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-14', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-15', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 816, raiyanDesc: 'Final Bazar for July Hopefully', jubayerMeals: 1, jubayerBazar: 360, jubayerDesc: 'Chicken, Polao Chal' },
  { date: '2026-07-16', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-17', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-18', siamMeals: 2, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-19', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-20', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-21', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-23', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-24', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 200, raiyanDesc: 'Bazar', jubayerMeals: 0, jubayerBazar: 295, jubayerDesc: 'Cal, Dal, Egg, Peyaj' },
  { date: '2026-07-25', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-26', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-27', siamMeals: 0, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-01', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 0, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 42, jubayerDesc: 'Salt' },
  { date: '2026-08-02', siamMeals: 0, siamBazar: 1500, siamDesc: 'Bazar', raiyanMeals: 0, raiyanBazar: 500, raiyanDesc: 'Bazar', jubayerMeals: 0, jubayerBazar: 380, jubayerDesc: 'Bazar' },
  { date: '2026-08-03', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-04', siamMeals: 2, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-05', siamMeals: 2, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-10', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-11', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-12', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 80, jubayerDesc: 'Egg 6' },
  { date: '2026-08-13', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-14', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 2, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-16', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 0, raiyanDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-17', siamMeals: 1, siamBazar: 0, siamDesc: '', raiyanMeals: 1, raiyanBazar: 500, raiyanDesc: 'bazar', jubayerMeals: 1, jubayerBazar: 80, jubayerDesc: 'bazar' }
];

async function runSeed() {
  const householdId = 'hh-flat-4b';

  console.log('Clearing old records from Turso Cloud...');
  await client.execute('DELETE FROM audit_logs');
  await client.execute('DELETE FROM continuous_ledger');
  await client.execute('DELETE FROM expenses');
  await client.execute('DELETE FROM daily_meals');
  await client.execute('DELETE FROM special_requests');
  await client.execute('DELETE FROM milk_records');
  await client.execute('DELETE FROM bazaar_commitments');
  await client.execute('DELETE FROM expense_categories');
  await client.execute('DELETE FROM users');
  await client.execute('DELETE FROM households');

  console.log('Inserting Household & Users...');
  await client.execute({
    sql: 'INSERT INTO households (id, name, currency_symbol, currency_code, timezone, cutoff_hour, cutoff_minute, tolerance_amount, default_meal_qty, default_milk_qty, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
    args: [householdId, 'Siam, Raiyan & Jubayer Household', '৳', 'BDT', 'Asia/Dhaka', 6, 0, 150.0, 1, '2026-06-01T00:00:00Z']
  });

  const users = [
    { id: 'usr-siam', name: 'Siam', username: 'siam', password: '111', email: 'siam@household.local', role: 'flatmate', pin: '1111' },
    { id: 'usr-raiyan', name: 'Raiyan', username: 'raiyan', password: '222', email: 'raiyan@household.local', role: 'flatmate', pin: '2222' },
    { id: 'usr-jubayer', name: 'Jubayer', username: 'jubayer', password: '333', email: 'jubayer@household.local', role: 'flatmate', pin: '3333' },
    { id: 'usr-admin', name: 'Admin', username: 'admin', password: '999', email: 'admin@household.local', role: 'admin', pin: '9999' },
    { id: 'usr-khala', name: 'Khala (Cook)', username: 'khala', password: '000', email: 'khala@household.local', role: 'cook', pin: '0000' }
  ];

  for (const u of users) {
    await client.execute({
      sql: 'INSERT INTO users (id, household_id, name, username, password, email, role, pin, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)',
      args: [u.id, householdId, u.name, u.username, u.password, u.email, u.role, u.pin, '2026-06-01T00:00:00Z']
    });
  }

  for (const c of [
    { id: 'cat-food-1', name: 'Daily Bazaar', type: 'food_pool', icon: '🛒' },
    { id: 'cat-food-2', name: 'Spices & Groceries', type: 'food_pool', icon: '🌶️' },
    { id: 'cat-food-3', name: 'Oil & Condiments', type: 'food_pool', icon: '🫒' }
  ]) {
    await client.execute({
      sql: 'INSERT INTO expense_categories (id, household_id, name, type, icon, is_default) VALUES (?, ?, ?, ?, ?, 1)',
      args: [c.id, householdId, c.name, c.type, c.icon]
    });
  }

  console.log(`Inserting ${RAW_DATA.length} days of meals and bazaar records...`);
  for (const row of RAW_DATA) {
    const d = row.date;

    await client.execute({
      sql: 'INSERT INTO daily_meals (id, household_id, user_id, date, quantity, is_locked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: ['dm-siam-' + d, householdId, 'usr-siam', d, row.siamMeals, 1, d + 'T06:00:00Z', d + 'T06:00:00Z']
    });
    await client.execute({
      sql: 'INSERT INTO daily_meals (id, household_id, user_id, date, quantity, is_locked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: ['dm-raiyan-' + d, householdId, 'usr-raiyan', d, row.raiyanMeals, 1, d + 'T06:00:00Z', d + 'T06:00:00Z']
    });
    await client.execute({
      sql: 'INSERT INTO daily_meals (id, household_id, user_id, date, quantity, is_locked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: ['dm-jubayer-' + d, householdId, 'usr-jubayer', d, row.jubayerMeals, 1, d + 'T06:00:00Z', d + 'T06:00:00Z']
    });

    if (row.siamBazar > 0) {
      const expId = 'exp-siam-' + d;
      await client.execute({
        sql: 'INSERT INTO expenses (id, household_id, paid_by_user_id, date, amount, category_id, description, receipt_images, is_food_pool, is_correction, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)',
        args: [expId, householdId, 'usr-siam', d, row.siamBazar, 'cat-food-1', row.siamDesc || 'Bazaar', '[]', 'usr-siam', d + 'T10:00:00Z']
      });
      await client.execute({
        sql: 'INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['aud-' + expId, householdId, 'usr-siam', 'RECORD_BAZAAR', 'expenses', expId, null, '+৳' + row.siamBazar, 'Recorded: ' + (row.siamDesc || 'Bazaar'), d + 'T10:00:00Z']
      });
    }

    if (row.raiyanBazar > 0) {
      const expId = 'exp-raiyan-' + d;
      await client.execute({
        sql: 'INSERT INTO expenses (id, household_id, paid_by_user_id, date, amount, category_id, description, receipt_images, is_food_pool, is_correction, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)',
        args: [expId, householdId, 'usr-raiyan', d, row.raiyanBazar, 'cat-food-1', row.raiyanDesc || 'Bazaar', '[]', 'usr-raiyan', d + 'T10:00:00Z']
      });
      await client.execute({
        sql: 'INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['aud-' + expId, householdId, 'usr-raiyan', 'RECORD_BAZAAR', 'expenses', expId, null, '+৳' + row.raiyanBazar, 'Recorded: ' + (row.raiyanDesc || 'Bazaar'), d + 'T10:00:00Z']
      });
    }

    if (row.jubayerBazar > 0) {
      const expId = 'exp-jubayer-' + d;
      await client.execute({
        sql: 'INSERT INTO expenses (id, household_id, paid_by_user_id, date, amount, category_id, description, receipt_images, is_food_pool, is_correction, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)',
        args: [expId, householdId, 'usr-jubayer', d, row.jubayerBazar, 'cat-food-1', row.jubayerDesc || 'Bazaar', '[]', 'usr-jubayer', d + 'T10:00:00Z']
      });
      await client.execute({
        sql: 'INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: ['aud-' + expId, householdId, 'usr-jubayer', 'RECORD_BAZAAR', 'expenses', expId, null, '+৳' + row.jubayerBazar, 'Recorded: ' + (row.jubayerDesc || 'Bazaar'), d + 'T10:00:00Z']
      });
    }
  }

  const mealCount = await client.execute('SELECT COUNT(*) as c FROM daily_meals');
  const expCount = await client.execute('SELECT COUNT(*) as c FROM expenses');
  console.log(`🎉 SUCCESS: Turso cloud loaded with ${mealCount.rows[0].c} meal records and ${expCount.rows[0].c} bazaar purchases across June, July, and August 2026!`);
}

runSeed().catch(console.error);
