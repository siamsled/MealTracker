-- Household Food & Contribution Management Schema (SQLite)

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_symbol TEXT DEFAULT '৳',
  currency_code TEXT DEFAULT 'BDT',
  timezone TEXT DEFAULT 'Asia/Dhaka',
  cutoff_hour INTEGER DEFAULT 6,
  cutoff_minute INTEGER DEFAULT 0,
  tolerance_amount REAL DEFAULT 200,
  default_meal_qty INTEGER DEFAULT 1,
  default_milk_qty INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  password TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'flatmate', 'cook')),
  pin TEXT DEFAULT '1234',
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('food_pool', 'household_non_food', 'personal')),
  icon TEXT,
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_meals (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(household_id, user_id, date)
);

CREATE TABLE IF NOT EXISTS milk_records (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(household_id, user_id, date)
);

CREATE TABLE IF NOT EXISTS special_requests (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  estimated_unit_cost REAL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  paid_by_user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT NOT NULL REFERENCES expense_categories(id),
  description TEXT NOT NULL,
  receipt_images TEXT,
  is_food_pool INTEGER NOT NULL DEFAULT 1,
  is_correction INTEGER NOT NULL DEFAULT 0,
  original_expense_id TEXT REFERENCES expenses(id),
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS continuous_ledger (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  timestamp TEXT NOT NULL,
  date TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  entry_type TEXT NOT NULL CHECK(entry_type IN ('bazaar_contribution', 'meal_consumption', 'milk_consumption', 'special_request', 'correction_adjustment')),
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  ref_table TEXT,
  ref_id TEXT,
  audit_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS food_inventory_snapshots (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  date TEXT NOT NULL,
  opening_inventory REAL NOT NULL,
  purchases_added REAL NOT NULL,
  consumed_value REAL NOT NULL,
  closing_inventory REAL NOT NULL,
  estimated_meal_cost REAL NOT NULL,
  coverage_days REAL NOT NULL,
  calculated_at TEXT NOT NULL,
  UNIQUE(household_id, date)
);

CREATE TABLE IF NOT EXISTS daily_cooking_instructions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  date TEXT NOT NULL UNIQUE,
  total_meals INTEGER NOT NULL,
  breakdown_json TEXT NOT NULL,
  special_requests_json TEXT NOT NULL,
  bengali_text TEXT NOT NULL,
  status TEXT DEFAULT 'generated',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_value TEXT,
  after_value TEXT,
  reason TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bazaar_commitments (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  target_date TEXT NOT NULL,
  estimated_amount REAL NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
  created_at TEXT NOT NULL
);

-- Indexes for lightning fast chronological reporting
CREATE INDEX IF NOT EXISTS idx_meals_date ON daily_meals(household_id, date);
CREATE INDEX IF NOT EXISTS idx_milk_date ON milk_records(household_id, date);
CREATE INDEX IF NOT EXISTS idx_special_date ON special_requests(household_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(household_id, date);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON continuous_ledger(household_id, date);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON continuous_ledger(household_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(household_id, timestamp);
