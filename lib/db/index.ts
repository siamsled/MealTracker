import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import os from 'os';

const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://mealtracker-siamsled.aws-ap-south-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODY5Njc2MDgsImlkIjoiMDFhMDBmOTEtNTIwMS03NGFlLTk2MGQtYTgxOTc5NzE4ZTQ2Iiwia2lkIjoiRjFhek5MOExvSE42RHZKbWZ4b29mdlVuaGJmRFEtU3JhMjcwNWRVZnhVRSIsInJpZCI6ImY4NWNiYTFmLTZjMWEtNDg4MC1iN2Q3LWZkZWYwODBlMGQ0OCJ9.J3rsLjI0cww1RY9GagkLyLWaX7iUmGhXFdCQE9PxDYcaptkizpOn2XDSVM_jG6Mar9Bn8hE_Ikxc5gKRa-uwCQ';

// Synchronous bridge wrapper for universal queries
class TursoUniversalBridge {
  private client: any;
  private localDb: any;

  constructor() {
    if (TURSO_URL && TURSO_TOKEN) {
      this.client = createClient({
        url: TURSO_URL,
        authToken: TURSO_TOKEN
      });
    }

    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
    const DB_DIR = isVercel ? os.tmpdir() : path.join(process.cwd(), 'data');
    if (!fs.existsSync(DB_DIR)) {
      try { fs.mkdirSync(DB_DIR, { recursive: true }); } catch (_) {}
    }
    const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'mealtracker.db');
    this.localDb = new DatabaseSync(DB_PATH);
    initDatabase(this.localDb);
  }

  prepare(sql: string) {
    const localStmt = this.localDb.prepare(sql);
    const client = this.client;

    return {
      get: (...args: any[]) => {
        // Sync execution on local cache
        const res = localStmt.get(...args);
        // Async mirror to Turso cloud
        if (client && (sql.trim().toUpperCase().startsWith('INSERT') || sql.trim().toUpperCase().startsWith('UPDATE') || sql.trim().toUpperCase().startsWith('DELETE'))) {
          client.execute({ sql, args }).catch((e: any) => console.error('Cloud sync err:', e));
        }
        return res;
      },
      all: (...args: any[]) => {
        return localStmt.all(...args);
      },
      run: (...args: any[]) => {
        const res = localStmt.run(...args);
        if (client) {
          client.execute({ sql, args }).catch((e: any) => console.error('Cloud sync err:', e));
        }
        return res;
      }
    };
  }

  exec(sql: string) {
    const res = this.localDb.exec(sql);
    if (this.client) {
      this.client.execute(sql).catch(() => {});
    }
    return res;
  }
}

let dbInstance: any = null;

export function getDatabase(): any {
  if (!dbInstance) {
    dbInstance = new TursoUniversalBridge();
  }
  return dbInstance;
}

function initDatabase(db: any) {
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }
  try { db.exec(`ALTER TABLE expenses ADD COLUMN receipt_images TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN password TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT;`); } catch (_) {}

  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const expenseCount = db.prepare('SELECT COUNT(*) as count FROM expenses').get() as { count: number };
    if (!userCount || userCount.count === 0 || !expenseCount || expenseCount.count === 0) {
      autoSeed(db);
    }
  } catch (_) {}
}

const SEED_DATA = [
  { date: '2026-06-07', siamMeals: 0, siamBazar: 1100, siamDesc: 'Bazar', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-09', siamMeals: 2, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 1320, raianDesc: 'Bazar; oil', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-10', siamMeals: 2, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-11', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-12', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-14', siamMeals: 2, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-17', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-18', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-19', siamMeals: 2, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-21', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 210, jubayerDesc: 'Egg,oil' },
  { date: '2026-06-22', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 2, jubayerBazar: 370, jubayerDesc: 'Bazar' },
  { date: '2026-06-23', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-26', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-06-30', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 510, jubayerDesc: 'Chicken, Oil, Veg' },
  { date: '2026-07-01', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-02', siamMeals: 2, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 164, jubayerDesc: 'Peyaj, Eggs ,Lentil' },
  { date: '2026-07-03', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-04', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 758, raianDesc: 'Bazar', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-05', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-06', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 425, jubayerDesc: 'chicken, Oil....' },
  { date: '2026-07-07', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-08', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-09', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-11', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 220, jubayerDesc: 'Oil; Peyaj,zeera,moric' },
  { date: '2026-07-12', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 105, jubayerDesc: 'Polao chal, mugdal' },
  { date: '2026-07-13', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-14', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-15', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 816, raianDesc: 'Final Bazar for July Hopefully', jubayerMeals: 1, jubayerBazar: 360, jubayerDesc: 'Chicken, Polao Chal' },
  { date: '2026-07-16', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-17', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-18', siamMeals: 2, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 2, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-19', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-20', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-21', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-23', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-24', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 200, raianDesc: 'Bazar', jubayerMeals: 0, jubayerBazar: 295, jubayerDesc: 'Cal, Dal, Egg, Peyaj' },
  { date: '2026-07-25', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-26', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-07-27', siamMeals: 0, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 0, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-01', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 0, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 42, jubayerDesc: 'Salt' },
  { date: '2026-08-02', siamMeals: 0, siamBazar: 1500, siamDesc: 'Bazar', raianMeals: 0, raianBazar: 500, raianDesc: 'Bazar', jubayerMeals: 0, jubayerBazar: 380, jubayerDesc: 'Bazar' },
  { date: '2026-08-03', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-04', siamMeals: 2, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-05', siamMeals: 2, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-10', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-11', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-12', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 80, jubayerDesc: 'Egg 6' },
  { date: '2026-08-13', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-14', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 2, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-16', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 0, raianDesc: '', jubayerMeals: 1, jubayerBazar: 0, jubayerDesc: '' },
  { date: '2026-08-17', siamMeals: 1, siamBazar: 0, siamDesc: '', raianMeals: 1, raianBazar: 500, raianDesc: 'bazar', jubayerMeals: 1, jubayerBazar: 80, jubayerDesc: 'bazar' }
];

function autoSeed(db: any) {
  const householdId = 'hh-flat-4b';
  try {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM continuous_ledger;
      DELETE FROM expenses;
      DELETE FROM daily_meals;
      DELETE FROM expense_categories;
      DELETE FROM users;
      DELETE FROM households;
    `);

    db.prepare(`
      INSERT INTO households (
        id, name, currency_symbol, currency_code, timezone, cutoff_hour, cutoff_minute, tolerance_amount, default_meal_qty, default_milk_qty, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(householdId, 'Siam, Raiyan & Jubayer Household', '৳', 'BDT', 'Asia/Dhaka', 6, 0, 150.0, 1, '2026-06-01T00:00:00Z');

    const users = [
      { id: 'usr-siam', name: 'Siam', username: 'siam', password: '111', email: 'siam@household.local', role: 'flatmate', pin: '1111' },
      { id: 'usr-raian', name: 'Raian', username: 'raian', password: '222', email: 'raian@household.local', role: 'flatmate', pin: '2222' },
      { id: 'usr-jubayer', name: 'Jubayer', username: 'jubayer', password: '333', email: 'jubayer@household.local', role: 'flatmate', pin: '3333' },
      { id: 'usr-admin', name: 'Admin', username: 'admin', password: '999', email: 'admin@household.local', role: 'admin', pin: '9999' },
      { id: 'usr-khala', name: 'Khala (Cook)', username: 'khala', password: '000', email: 'khala@household.local', role: 'cook', pin: '0000' }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, household_id, name, username, password, email, role, pin, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    for (const u of users) {
      insertUser.run(u.id, householdId, u.name, u.username, u.password, u.email, u.role, u.pin, '2026-06-01T00:00:00Z');
    }

    const catStmt = db.prepare(`
      INSERT INTO expense_categories (id, household_id, name, type, icon, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    catStmt.run('cat-food-1', householdId, 'Daily Bazaar', 'food_pool', '🛒', 1);
    catStmt.run('cat-food-2', householdId, 'Spices & Groceries', 'food_pool', '🌶️', 1);
    catStmt.run('cat-food-3', householdId, 'Oil & Condiments', 'food_pool', '🫒', 1);

    const insertMeal = db.prepare(`
      INSERT INTO daily_meals (id, household_id, user_id, date, quantity, is_locked, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertExpense = db.prepare(`
      INSERT INTO expenses (id, household_id, paid_by_user_id, date, amount, category_id, description, receipt_images, is_food_pool, is_correction, created_by_user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    `);

    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, household_id, user_id, action, target_table, target_id, before_value, after_value, reason, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of SEED_DATA) {
      const d = row.date;
      insertMeal.run('dm-siam-' + d, householdId, 'usr-siam', d, row.siamMeals, 1, d + 'T06:00:00Z', d + 'T06:00:00Z');
      insertMeal.run('dm-raian-' + d, householdId, 'usr-raian', d, row.raianMeals, 1, d + 'T06:00:00Z', d + 'T06:00:00Z');
      insertMeal.run('dm-jubayer-' + d, householdId, 'usr-jubayer', d, row.jubayerMeals, 1, d + 'T06:00:00Z', d + 'T06:00:00Z');

      if (row.siamBazar > 0) {
        const expId = 'exp-siam-' + d;
        insertExpense.run(expId, householdId, 'usr-siam', d, row.siamBazar, 'cat-food-1', row.siamDesc || 'Bazaar', '[]', 'usr-siam', d + 'T10:00:00Z');
        insertAudit.run('aud-' + expId, householdId, 'usr-siam', 'RECORD_BAZAAR', 'expenses', expId, null, '+৳' + row.siamBazar, 'Recorded: ' + (row.siamDesc || 'Bazaar'), d + 'T10:00:00Z');
      }

      if (row.raianBazar > 0) {
        const expId = 'exp-raian-' + d;
        insertExpense.run(expId, householdId, 'usr-raian', d, row.raianBazar, 'cat-food-1', row.raianDesc || 'Bazaar', '[]', 'usr-raian', d + 'T10:00:00Z');
        insertAudit.run('aud-' + expId, householdId, 'usr-raian', 'RECORD_BAZAAR', 'expenses', expId, null, '+৳' + row.raianBazar, 'Recorded: ' + (row.raianDesc || 'Bazaar'), d + 'T10:00:00Z');
      }

      if (row.jubayerBazar > 0) {
        const expId = 'exp-jubayer-' + d;
        insertExpense.run(expId, householdId, 'usr-jubayer', d, row.jubayerBazar, 'cat-food-1', row.jubayerDesc || 'Bazaar', '[]', 'usr-jubayer', d + 'T10:00:00Z');
        insertAudit.run('aud-' + expId, householdId, 'usr-jubayer', 'RECORD_BAZAAR', 'expenses', expId, null, '+৳' + row.jubayerBazar, 'Recorded: ' + (row.jubayerDesc || 'Bazaar'), d + 'T10:00:00Z');
      }
    }
  } catch (err) {
    console.error('Auto seed error:', err);
  }
}

// Database helper utilities
export interface UserRecord {
  id: string;
  household_id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  avatar?: string;
  role: 'admin' | 'flatmate' | 'cook';
  pin: string;
  is_active: number;
  created_at: string;
}

export interface HouseholdRecord {
  id: string;
  name: string;
  currency_symbol: string;
  currency_code: string;
  timezone: string;
  cutoff_hour: number;
  cutoff_minute: number;
  tolerance_amount: number;
  default_meal_qty: number;
  default_milk_qty: number;
  created_at: string;
}

export interface DailyMealRecord {
  id: string;
  household_id: string;
  user_id: string;
  date: string;
  quantity: number;
  is_locked: number;
  created_at: string;
  updated_at: string;
}

export interface MilkRecord {
  id: string;
  household_id: string;
  user_id: string;
  date: string;
  quantity: number;
  is_locked: number;
  created_at: string;
  updated_at: string;
}

export interface SpecialRequestRecord {
  id: string;
  household_id: string;
  user_id: string;
  date: string;
  item_name: string;
  quantity: number;
  notes: string | null;
  estimated_unit_cost: number;
  is_locked: number;
  created_at: string;
}

export interface ExpenseRecord {
  id: string;
  household_id: string;
  paid_by_user_id: string;
  date: string;
  amount: number;
  category_id: string;
  description: string;
  receipt_images?: string | null;
  is_food_pool: number;
  is_correction: number;
  original_expense_id: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface ExpenseCategoryRecord {
  id: string;
  household_id: string;
  name: string;
  type: 'food_pool' | 'household_non_food' | 'personal';
  icon: string | null;
  is_default: number;
}

export interface ContinuousLedgerRecord {
  id: string;
  household_id: string;
  timestamp: string;
  date: string;
  user_id: string;
  entry_type: 'bazaar_contribution' | 'meal_consumption' | 'milk_consumption' | 'special_request' | 'correction_adjustment';
  amount: number;
  description: string;
  ref_table: string | null;
  ref_id: string | null;
  audit_reason: string | null;
  created_at: string;
}

export interface FoodInventorySnapshotRecord {
  id: string;
  household_id: string;
  date: string;
  opening_inventory: number;
  purchases_added: number;
  consumed_value: number;
  closing_inventory: number;
  estimated_meal_cost: number;
  coverage_days: number;
  calculated_at: string;
}

export interface DailyCookingInstructionRecord {
  id: string;
  household_id: string;
  date: string;
  total_meals: number;
  breakdown_json: string;
  special_requests_json: string;
  bengali_text: string;
  status: string;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  household_id: string;
  user_id: string;
  action: string;
  target_table: string;
  target_id: string;
  before_value: string | null;
  after_value: string | null;
  reason: string;
  timestamp: string;
}

export interface BazaarCommitmentRecord {
  id: string;
  household_id: string;
  user_id: string;
  target_date: string;
  estimated_amount: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}
