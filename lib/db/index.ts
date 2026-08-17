import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import os from 'os';

// In Vercel serverless functions, only /tmp (or os.tmpdir()) is writable
const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
const DB_DIR = isVercel ? os.tmpdir() : path.join(process.cwd(), 'data');

if (!fs.existsSync(DB_DIR)) {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
  } catch (_) {}
}

const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'mealtracker.db');

let dbInstance: any = null;

export function getDatabase(): any {
  if (!dbInstance) {
    const isNew = !fs.existsSync(DB_PATH);
    dbInstance = new DatabaseSync(DB_PATH);
    initDatabase(dbInstance, isNew);
  }
  return dbInstance;
}

function initDatabase(db: any, isNew: boolean) {
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }
  try {
    db.exec(`ALTER TABLE expenses ADD COLUMN receipt_images TEXT;`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT;`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN password TEXT;`);
  } catch (_) {}

  // Automatically seed on initial creation if empty
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (!userCount || userCount.count === 0) {
      autoSeed(db);
    }
  } catch (_) {}
}

function autoSeed(db: any) {
  const householdId = 'hh-flat-4b';
  try {
    db.prepare(`
      INSERT INTO households (
        id, name, currency_symbol, currency_code, timezone, cutoff_hour, cutoff_minute, tolerance_amount, default_meal_qty, default_milk_qty, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(householdId, 'Siam, Raiyan & Jubayer Household', '৳', 'BDT', 'Asia/Dhaka', 6, 0, 150.0, 1, '2026-08-01T00:00:00Z');

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

    const catStmt = db.prepare(`
      INSERT INTO expense_categories (id, household_id, name, type, icon, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    catStmt.run('cat-food-1', householdId, 'Daily Bazaar', 'food_pool', '🛒', 1);
    catStmt.run('cat-food-2', householdId, 'Spices & Groceries', 'food_pool', '🌶️', 1);
    catStmt.run('cat-food-3', householdId, 'Oil & Condiments', 'food_pool', '🫒', 1);
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
