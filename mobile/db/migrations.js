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
  { name: 'Impuestos', type: 'expense' },
  { name: 'Pago de tarjetas', type: 'expense' },
  { name: 'Intereses de tarjeta', type: 'expense' },
  { name: 'Intereses', type: 'expense' },
  { name: 'Otros', type: 'expense' },
  // Ingresos
  { name: 'Salario', type: 'income' },
  { name: 'Ajustes', type: 'income' },
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
      password TEXT,
      password_salt TEXT,
      password_iterations INTEGER,
      password_algorithm TEXT,
      failed_attempts INTEGER DEFAULT 0,
      locked_until INTEGER
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
    } catch (_err) {
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

  // Migrate to v2 if needed (auth hardening fields)
  if (currentVersion < 2) {
    try {
      await db.execAsync('ALTER TABLE users ADD COLUMN password_salt TEXT;');
    } catch (_err) {
      // Column already exists, ignore
    }

    try {
      await db.execAsync('ALTER TABLE users ADD COLUMN password_iterations INTEGER;');
    } catch (_err) {
      // Column already exists, ignore
    }

    try {
      await db.execAsync('ALTER TABLE users ADD COLUMN password_algorithm TEXT;');
    } catch (_err) {
      // Column already exists, ignore
    }

    try {
      await db.execAsync('ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;');
    } catch (_err) {
      // Column already exists, ignore
    }

    try {
      await db.execAsync('ALTER TABLE users ADD COLUMN locked_until INTEGER;');
    } catch (_err) {
      // Column already exists, ignore
    }

    await db.runAsync(
      `UPDATE users
       SET password_algorithm = 'legacy-sha256'
       WHERE password IS NOT NULL
         AND (password_algorithm IS NULL OR password_algorithm = '')`
    );

    await db.runAsync(
      `UPDATE users
       SET failed_attempts = 0
       WHERE failed_attempts IS NULL`
    );

    await db.execAsync('PRAGMA user_version = 2');
  }

  // Migrate to v3 if needed (partial payments support)
  if (currentVersion < 3) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS scheduled_payments_mapping (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        occurrence_id INTEGER NOT NULL,
        transaction_id INTEGER NOT NULL,
        amount_paid REAL NOT NULL,
        payment_date TEXT NOT NULL,
        FOREIGN KEY(occurrence_id) REFERENCES scheduled_occurrences(id),
        FOREIGN KEY(transaction_id) REFERENCES transactions(id)
      );`
    );

    try {
      await db.execAsync('ALTER TABLE scheduled_occurrences ADD COLUMN remaining_amount REAL;');
    } catch (_err) {
      // Column already exists, ignore
    }

    await db.runAsync(
      `UPDATE scheduled_occurrences
       SET remaining_amount = CASE
         WHEN status = 'processed' THEN 0
         ELSE COALESCE(amount, 0)
       END
       WHERE remaining_amount IS NULL`
    );

    await db.runAsync(
      `INSERT INTO scheduled_payments_mapping (occurrence_id, transaction_id, amount_paid, payment_date)
       SELECT so.id, so.transaction_id, COALESCE(so.amount, 0), so.due_date
       FROM scheduled_occurrences so
       WHERE so.transaction_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM scheduled_payments_mapping spm
           WHERE spm.occurrence_id = so.id AND spm.transaction_id = so.transaction_id
         )`
    );

    // Rebuild scheduled_occurrences to allow partially_paid in CHECK constraint.
    await db.execAsync('PRAGMA foreign_keys = OFF');
    try {
      await db.execAsync('BEGIN TRANSACTION');
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS scheduled_occurrences_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plan_id INTEGER,
          installment_number INTEGER,
          due_date TEXT NOT NULL,
          type TEXT NOT NULL,
          amount REAL,
          remaining_amount REAL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partially_paid', 'processed', 'overdue')),
          transaction_id INTEGER,
          FOREIGN KEY(plan_id) REFERENCES scheduled_plans(id),
          FOREIGN KEY(transaction_id) REFERENCES transactions(id)
        );`
      );

      await db.execAsync(
        `INSERT INTO scheduled_occurrences_new (
          id,
          plan_id,
          installment_number,
          due_date,
          type,
          amount,
          remaining_amount,
          status,
          transaction_id
        )
        SELECT
          id,
          plan_id,
          installment_number,
          due_date,
          type,
          amount,
          COALESCE(remaining_amount, CASE WHEN status = 'processed' THEN 0 ELSE COALESCE(amount, 0) END),
          status,
          transaction_id
        FROM scheduled_occurrences`
      );

      await db.execAsync('DROP TABLE scheduled_occurrences');
      await db.execAsync('ALTER TABLE scheduled_occurrences_new RENAME TO scheduled_occurrences');
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON');
    }

    await db.execAsync('PRAGMA user_version = 3');
  }

  // Migrate to v4 if needed (credit cards support)
  if (currentVersion < 4) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS credit_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        till_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        credit_limit REAL NOT NULL DEFAULT 0,
        FOREIGN KEY(till_id) REFERENCES tills(id)
      );`
    );

    try {
      await db.execAsync('ALTER TABLE transactions ADD COLUMN payment_method TEXT;');
    } catch (_err) {
      // Column already exists, ignore
    }

    try {
      await db.execAsync('ALTER TABLE transactions ADD COLUMN credit_card_id INTEGER;');
    } catch (_err) {
      // Column already exists, ignore
    }

    try {
      await db.execAsync('ALTER TABLE transactions ADD COLUMN affects_balance INTEGER DEFAULT 1;');
    } catch (_err) {
      // Column already exists, ignore
    }

    try {
      await db.execAsync('ALTER TABLE transactions ADD COLUMN parent_transaction_id INTEGER;');
    } catch (_err) {
      // Column already exists, ignore
    }

    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS credit_card_payment_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        credit_card_id INTEGER NOT NULL,
        purchase_transaction_id INTEGER NOT NULL,
        payment_transaction_id INTEGER NOT NULL,
        amount_paid REAL NOT NULL,
        FOREIGN KEY(credit_card_id) REFERENCES credit_cards(id),
        FOREIGN KEY(purchase_transaction_id) REFERENCES transactions(id),
        FOREIGN KEY(payment_transaction_id) REFERENCES transactions(id)
      );`
    );

    await db.runAsync(
      `UPDATE transactions
       SET affects_balance = 1
       WHERE affects_balance IS NULL`
    );

    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_transactions_affects_balance ON transactions(affects_balance);'
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_transactions_credit_card ON transactions(credit_card_id);'
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);'
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_credit_card_payment_items_card ON credit_card_payment_items(credit_card_id);'
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_credit_card_payment_items_purchase ON credit_card_payment_items(purchase_transaction_id);'
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_credit_card_payment_items_payment ON credit_card_payment_items(payment_transaction_id);'
    );

    await db.execAsync('PRAGMA user_version = 4');
  }

  // Migrate to v5 if needed (add type to scheduled_plans)
  if (currentVersion < 5) {
    try {
      await db.execAsync(`ALTER TABLE scheduled_plans ADD COLUMN type TEXT;`);
    } catch (_err) {
      // Column already exists, ignore
    }

    // Backfill type from the first occurrence of each plan
    await db.runAsync(
      `UPDATE scheduled_plans
       SET type = (
         SELECT so.type
         FROM scheduled_occurrences so
         WHERE so.plan_id = scheduled_plans.id
         LIMIT 1
       )
       WHERE type IS NULL`
    );

    await db.execAsync('PRAGMA user_version = 5');
  }

  // Migrate to v6 if needed (ensure scheduled_plans.type is never null)
  if (currentVersion < 6) {
    // Fill from category when possible.
    await db.runAsync(
      `UPDATE scheduled_plans
       SET type = CASE
         WHEN (
           SELECT c.type
           FROM categories c
           WHERE c.id = scheduled_plans.category_id
         ) = 'income' THEN 'ingreso'
         ELSE 'egreso'
       END
       WHERE type IS NULL`
    );

    // Final safeguard for any remaining nulls.
    await db.runAsync(
      `UPDATE scheduled_plans
       SET type = 'egreso'
       WHERE type IS NULL`
    );

    await db.execAsync('PRAGMA user_version = 6');
  }
};