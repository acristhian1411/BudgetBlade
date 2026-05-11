import { getDb } from './index';

const CATEGORIES_SEEDER = [
  // Egresos
  { name: 'Alimentación', type: 'expense' },
  { name: 'Salud', type: 'expense' },
  { name: 'Combustible', type: 'expense' },
  { name: 'Mantenimiento', type: 'expense' },
  { name: 'Vestimenta', type: 'expense' },
  { name: 'Servicios', type: 'expense' },
  { name: 'Subscripciones', type: 'expense' },
  { name: 'Alquiler', type: 'expense' },
  { name: 'Ajustes', type: 'expense' },
  { name: 'Préstamos', type: 'expense' },
  { name: 'Ocio', type: 'expense' },
  { name: 'Educación', type: 'expense' },
  // Ingresos
  { name: 'Salario', type: 'income' },
  { name: 'Ventas', type: 'income' },
  { name: 'Alquileres Cobrados', type: 'income' },
  { name: 'Intereses', type: 'income' },
];

/** Creates all tables if they don't already exist. Call once at app startup. */
export const initDB = async () => {
  const db = await getDb();
  
  // Create base tables (v0 schema)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS tills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      account_number TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      till_id INTEGER,
      amount REAL,
      type TEXT,
      description TEXT,
      transfer_id TEXT,
      transaction_date TEXT
    );
  `);

  // Get current schema version
  const versionRow = await db.getFirstAsync('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  // Migrate to v1 if needed
  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('income', 'expense'))
      );

      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('client', 'provider', 'both')),
        contact TEXT
      );

      CREATE TABLE IF NOT EXISTS scheduled_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        entity_id INTEGER,
        till_id INTEGER,
        title TEXT NOT NULL,
        base_amount REAL,
        total_installments INTEGER,
        start_date TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id),
        FOREIGN KEY(entity_id) REFERENCES entities(id),
        FOREIGN KEY(till_id) REFERENCES tills(id)
      );

      CREATE TABLE IF NOT EXISTS scheduled_occurrences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        installment_number INTEGER,
        due_date TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'overdue')),
        transaction_id INTEGER,
        FOREIGN KEY(plan_id) REFERENCES scheduled_plans(id),
        FOREIGN KEY(transaction_id) REFERENCES transactions(id)
      );
    `);

    // Add category_id to transactions (idempotent)
    try {
      await db.execAsync(`ALTER TABLE transactions ADD COLUMN category_id INTEGER;`);
    } catch (err) {
      // Column already exists, ignore
    }

    // Seed categories
    for (const cat of CATEGORIES_SEEDER) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)',
        [cat.name, cat.type]
      );
    }

    // Update schema version
    await db.execAsync('PRAGMA user_version = 1');
  }
};