import { getDb } from '../index';
import {
  decryptEncryptedJson,
  decryptEncryptedJsonWithPassword,
  serializeEncryptedJson,
  wrapSessionMasterKeyWithPassword,
} from '@/services/master-key.service';
import { z } from 'zod';

const ENCRYPTED_BACKUP_VERSION = 1;
const ENCRYPTED_BACKUP_ALGORITHM = 'AES-256-GCM';
const ALLOW_LEGACY_IMPORT_IN_PRODUCTION = false;
const LEGACY_IMPORT_BLOCK_MESSAGE =
  'Importación legacy (JSON/CSV) deshabilitada en producción. Usa respaldo cifrado .nbb.';

const BACKUP_TABLES = [
  'users',
  'tills',
  'categories',
  'entities',
  'transactions',
  'scheduled_plans',
  'scheduled_occurrences',
  'scheduled_payments_mapping',
];

const TABLE_COLUMNS = {
  users: [
    'id',
    'password',
    'password_salt',
    'password_iterations',
    'password_algorithm',
    'failed_attempts',
    'locked_until',
  ],
  tills: ['id', 'name', 'account_number'],
  categories: ['id', 'name', 'type'],
  entities: ['id', 'name', 'type', 'contact'],
  transactions: [
    'id',
    'till_id',
    'amount',
    'type',
    'description',
    'transfer_id',
    'transaction_date',
    'category_id',
  ],
  scheduled_plans: [
    'id',
    'category_id',
    'entity_id',
    'till_id',
    'title',
    'base_amount',
    'total_installments',
    'start_date',
  ],
  scheduled_occurrences: [
    'id',
    'plan_id',
    'installment_number',
    'due_date',
    'type',
    'amount',
    'remaining_amount',
    'status',
    'transaction_id',
  ],
  scheduled_payments_mapping: [
    'id',
    'occurrence_id',
    'transaction_id',
    'amount_paid',
    'payment_date',
  ],
};

const REQUIRED_COLUMNS = {
  users: ['id', 'password'],
  tills: ['id'],
  categories: ['id'],
  entities: ['id'],
  transactions: ['id'],
  scheduled_plans: ['id'],
  scheduled_occurrences: ['id'],
  scheduled_payments_mapping: ['id'],
};

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

const UsersRowSchema = z.object({
  id: z.string(),
  password: z.string(),
  password_salt: nullableString.optional(),
  password_iterations: nullableNumber.optional(),
  password_algorithm: nullableString.optional(),
  failed_attempts: nullableNumber.optional(),
  locked_until: nullableNumber.optional(),
}).strict();

const TillsRowSchema = z.object({
  id: z.number(),
  name: nullableString.optional(),
  account_number: nullableString.optional(),
}).strict();

const CategoriesRowSchema = z.object({
  id: z.number(),
  name: nullableString.optional(),
  type: nullableString.optional(),
}).strict();

const EntitiesRowSchema = z.object({
  id: z.number(),
  name: nullableString.optional(),
  type: nullableString.optional(),
  contact: nullableString.optional(),
}).strict();

const TransactionsRowSchema = z.object({
  id: z.number(),
  till_id: nullableNumber.optional(),
  amount: nullableNumber.optional(),
  type: nullableString.optional(),
  description: nullableString.optional(),
  transfer_id: nullableString.optional(),
  transaction_date: nullableString.optional(),
  category_id: nullableNumber.optional(),
}).strict();

const ScheduledPlansRowSchema = z.object({
  id: z.number(),
  category_id: nullableNumber.optional(),
  entity_id: nullableNumber.optional(),
  till_id: nullableNumber.optional(),
  title: nullableString.optional(),
  base_amount: nullableNumber.optional(),
  total_installments: nullableNumber.optional(),
  start_date: nullableString.optional(),
}).strict();

const ScheduledOccurrencesRowSchema = z.object({
  id: z.number(),
  plan_id: nullableNumber.optional(),
  installment_number: nullableNumber.optional(),
  due_date: nullableString.optional(),
  type: nullableString.optional(),
  amount: nullableNumber.optional(),
  remaining_amount: nullableNumber.optional(),
  status: nullableString.optional(),
  transaction_id: nullableNumber.optional(),
}).strict();

const ScheduledPaymentsMappingRowSchema = z.object({
  id: z.number(),
  occurrence_id: nullableNumber.optional(),
  transaction_id: nullableNumber.optional(),
  amount_paid: nullableNumber.optional(),
  payment_date: nullableString.optional(),
}).strict();

const BackupTablesSchema = z.object({
  users: z.array(UsersRowSchema).optional(),
  tills: z.array(TillsRowSchema).optional(),
  categories: z.array(CategoriesRowSchema).optional(),
  entities: z.array(EntitiesRowSchema).optional(),
  transactions: z.array(TransactionsRowSchema).optional(),
  scheduled_plans: z.array(ScheduledPlansRowSchema).optional(),
  scheduled_occurrences: z.array(ScheduledOccurrencesRowSchema).optional(),
  scheduled_payments_mapping: z.array(ScheduledPaymentsMappingRowSchema).optional(),
}).strict();

const EncryptedBackupEnvelopeSchema = z.object({
  version: z.literal(ENCRYPTED_BACKUP_VERSION),
  algorithm: z.literal(ENCRYPTED_BACKUP_ALGORITHM),
  nonce: z.string(),
  ciphertext: z.string(),
  authTag: z.string(),
  exported_at: z.string().optional(),
  db_schema_version: z.number().optional(),
  wrappedMasterKey: z
    .object({
      version: z.number(),
      algorithm: z.string(),
      kdf: z.string(),
      iterations: z.number(),
      salt: z.string(),
      nonce: z.string(),
      ciphertext: z.string(),
      authTag: z.string(),
    })
    .optional(),
}).strict();

const AUTOINCREMENT_TABLES = [
  'tills',
  'categories',
  'entities',
  'transactions',
  'scheduled_plans',
  'scheduled_occurrences',
  'scheduled_payments_mapping',
];

const DELETE_ORDER = [
  'scheduled_payments_mapping',
  'scheduled_occurrences',
  'scheduled_plans',
  'transactions',
  'entities',
  'categories',
  'tills',
  'users',
];

const INSERT_ORDER = [
  'users',
  'tills',
  'categories',
  'entities',
  'transactions',
  'scheduled_plans',
  'scheduled_occurrences',
  'scheduled_payments_mapping',
];

const getTableColumns = async (db, table) => {
  const rows = await db.getAllAsync(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  return `"${String(value).replace(/"/g, '""')}"`;
};

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let i = 0;
  let inQuotes = false;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }

      current += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      result.push(current);
      current = '';
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  result.push(current);
  return result;
};

const parseCsvValue = (value) => {
  if (value === '') return null;

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && value.trim() !== '') {
    return asNumber;
  }

  return value;
};

const buildTablesCsv = (tables, exportedAt, schemaVersion) => {
  const lines = [
    '# NativeBudgetBlade backup',
    `# exported_at:${exportedAt}`,
    `# schema_version:${schemaVersion}`,
    '# format:multi-table-csv',
    '',
  ];

  for (const tableName of BACKUP_TABLES) {
    const rows = Array.isArray(tables?.[tableName]) ? tables[tableName] : [];
    const discoveredColumns = new Set();
    rows.forEach((row) => {
      Object.keys(row ?? {}).forEach((k) => discoveredColumns.add(k));
    });
    const columns = Array.from(discoveredColumns);

    lines.push(`## table:${tableName}`);

    if (columns.length === 0) {
      lines.push('');
      lines.push('## endtable');
      lines.push('');
      continue;
    }

    lines.push(columns.join(','));

    for (const row of rows) {
      const line = columns.map((col) => escapeCsvValue(row?.[col])).join(',');
      lines.push(line);
    }

    lines.push('## endtable');
    lines.push('');
  }

  return lines.join('\n');
};

const parseTablesCsv = (content) => {
  const tables = {};
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  let currentTable = null;
  let headers = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('# ')) {
      continue;
    }

    if (line.startsWith('## table:')) {
      currentTable = line.replace('## table:', '').trim();
      tables[currentTable] = [];
      headers = null;
      continue;
    }

    if (line === '## endtable') {
      currentTable = null;
      headers = null;
      continue;
    }

    if (!currentTable) {
      continue;
    }

    if (!headers) {
      headers = parseCsvLine(rawLine);
      continue;
    }

    const values = parseCsvLine(rawLine);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = parseCsvValue(values[idx] ?? '');
    });
    tables[currentTable].push(row);
  }

  return tables;
};

const normalizeBackupTables = (payload) => {
  if (payload?.tables && typeof payload.tables === 'object') {
    return payload.tables;
  }

  return payload ?? {};
};

const isEncryptedBackupEnvelope = (payload) => {
  return EncryptedBackupEnvelopeSchema.safeParse(payload).success;
};

/**
 * @param {unknown} envelope
 * @param {string | null | undefined} [password]
 */
const decryptEnvelopeToPayload = async (envelope, password = null) => {
  const envelopeParsed = EncryptedBackupEnvelopeSchema.safeParse(envelope);
  if (!envelopeParsed.success) {
    throw new Error('Formato de respaldo cifrado inválido.');
  }

  const encryptedPayload = {
    nonce: envelopeParsed.data.nonce,
    ciphertext: envelopeParsed.data.ciphertext,
    authTag: envelopeParsed.data.authTag,
  };

  let payload;

  if (password && envelopeParsed.data.wrappedMasterKey) {
    // Import with password: use the wrapped key from the backup
    payload = await decryptEncryptedJsonWithPassword(password, encryptedPayload, envelopeParsed.data.wrappedMasterKey);
  } else if (password) {
    // Import with password but no wrapped key: derive MEK from password
    payload = await decryptEncryptedJsonWithPassword(password, encryptedPayload);
  } else {
    // Import without password: use current session MEK (requires active login)
    payload = decryptEncryptedJson(encryptedPayload);
  }

  if (!payload || typeof payload !== 'object' || typeof payload.tables !== 'object') {
    throw new Error('Contenido de respaldo inválido.');
  }

  return payload;
};

const validateRowShape = (tableName, row, index) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error(`Fila inválida en ${tableName} (índice ${index}).`);
  }

  const allowedColumns = TABLE_COLUMNS[tableName] ?? [];
  const keys = Object.keys(row);
  const unknownColumns = keys.filter((k) => !allowedColumns.includes(k));
  if (unknownColumns.length > 0) {
    throw new Error(`Columnas no permitidas en ${tableName}: ${unknownColumns.join(', ')}.`);
  }

  const required = REQUIRED_COLUMNS[tableName] ?? [];
  const missingRequired = required.filter((k) => !Object.prototype.hasOwnProperty.call(row, k));
  if (missingRequired.length > 0) {
    throw new Error(`Faltan columnas obligatorias en ${tableName}: ${missingRequired.join(', ')}.`);
  }

  for (const [col, value] of Object.entries(row)) {
    const type = typeof value;
    if (value !== null && type !== 'string' && type !== 'number') {
      throw new Error(`Tipo inválido en ${tableName}.${col} (índice ${index}).`);
    }
  }
};

const validateIncomingTables = (tables) => {
  const parsedTables = BackupTablesSchema.safeParse(tables);
  if (!parsedTables.success) {
    const issue = parsedTables.error.issues[0];
    throw new Error(`Formato de respaldo inválido: ${issue?.message ?? 'schema inválido'}.`);
  }

  const validatedTables = parsedTables.data;

  if (!tables || typeof tables !== 'object' || Array.isArray(tables)) {
    throw new Error('Formato de respaldo inválido.');
  }

  const unknownTables = Object.keys(validatedTables).filter((name) => !BACKUP_TABLES.includes(name));
  if (unknownTables.length > 0) {
    throw new Error(`Tablas no permitidas en respaldo: ${unknownTables.join(', ')}.`);
  }

  for (const tableName of BACKUP_TABLES) {
    const rows = validatedTables?.[tableName];
    if (rows === undefined || rows === null) {
      continue;
    }

    if (!Array.isArray(rows)) {
      throw new Error(`El contenido de ${tableName} debe ser una lista.`);
    }

    rows.forEach((row, index) => validateRowShape(tableName, row, index));
  }

  return validatedTables;
};

const isLegacyImportEnabled = () => __DEV__ || ALLOW_LEGACY_IMPORT_IN_PRODUCTION;

export const getBackupImportPolicy = () => ({
  allowLegacyImport: isLegacyImportEnabled(),
  legacyBlockedMessage: LEGACY_IMPORT_BLOCK_MESSAGE,
});

/**
 * @param {'nbb' | 'csv' | 'json'} [format]
 * @param {string | null | undefined} [password]
 */
export const exportDatabaseBackup = async (format = 'nbb', password = null) => {
  const db = await getDb();
  const versionRow = await db.getFirstAsync('PRAGMA user_version');
  const schemaVersion = versionRow?.user_version ?? 0;
  const exportedAt = new Date().toISOString();

  const tables = {};
  const rowCountByTable = {};

  for (const tableName of BACKUP_TABLES) {
    const columns = await getTableColumns(db, tableName);
    const rows = await db.getAllAsync(`SELECT * FROM ${tableName}`);

    tables[tableName] = rows.map((row) => {
      const orderedRow = {};
      for (const col of columns) {
        orderedRow[col] = row?.[col] ?? null;
      }
      return orderedRow;
    });

    rowCountByTable[tableName] = rows.length;
  }

  const payload = {
    app: 'NativeBudgetBlade',
    version: 1,
    schema_version: schemaVersion,
    exported_at: exportedAt,
    tables,
  };

  if (format === 'nbb') {
    const normalizedPassword = String(password ?? '').trim();
    if (!normalizedPassword) {
      throw new Error('Se requiere contraseña para exportar respaldo cifrado portátil (.nbb).');
    }

    const encrypted = serializeEncryptedJson(payload);
    const wrappedKeyInfo = await wrapSessionMasterKeyWithPassword(normalizedPassword);

    return {
      format: 'nbb',
      content: JSON.stringify({
        version: ENCRYPTED_BACKUP_VERSION,
        algorithm: ENCRYPTED_BACKUP_ALGORITHM,
        nonce: encrypted.nonce,
        ciphertext: encrypted.ciphertext,
        authTag: encrypted.authTag,
        exported_at: exportedAt,
        db_schema_version: schemaVersion,
        wrappedMasterKey: wrappedKeyInfo,
      }, null, 2),
      rowCountByTable,
    };
  }

  if (format === 'csv') {
    return {
      format,
      content: buildTablesCsv(tables, exportedAt, schemaVersion),
      rowCountByTable,
    };
  }

  return {
    format: 'json',
    content: JSON.stringify(payload, null, 2),
    rowCountByTable,
  };
};

/**
 * @param {string} content
 * @param {'nbb' | 'json' | 'csv'} formatHint
 * @param {string | null | undefined} [password]
 */
export const importDatabaseBackup = async (content, formatHint, password = null) => {
  const trimmed = String(content ?? '').trim();
  if (!trimmed) {
    throw new Error('El archivo de respaldo está vacío.');
  }

  const isEncrypted = formatHint === 'nbb';
  const isJson = !isEncrypted && (formatHint === 'json' || trimmed.startsWith('{'));

  let incomingTables;
  let isLegacyPayload = false;

  if (isEncrypted) {
    const envelope = JSON.parse(trimmed);
    const decryptedPayload = await decryptEnvelopeToPayload(envelope, password);
    incomingTables = normalizeBackupTables(decryptedPayload);
  } else {
    const parsed = isJson ? JSON.parse(trimmed) : parseTablesCsv(trimmed);

    if (isEncryptedBackupEnvelope(parsed)) {
      const decryptedPayload = await decryptEnvelopeToPayload(parsed, password);
      incomingTables = normalizeBackupTables(decryptedPayload);
    } else {
      isLegacyPayload = true;
      incomingTables = normalizeBackupTables(parsed);
    }
  }

  if (isLegacyPayload && !isLegacyImportEnabled()) {
    throw new Error(LEGACY_IMPORT_BLOCK_MESSAGE);
  }

  const validatedIncomingTables = validateIncomingTables(incomingTables);

  const db = await getDb();
  const rowCountByTable = {};

  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.execAsync('BEGIN TRANSACTION');

    for (const tableName of DELETE_ORDER) {
      await db.runAsync(`DELETE FROM ${tableName}`);
    }

    for (const tableName of INSERT_ORDER) {
      const rows = Array.isArray(validatedIncomingTables?.[tableName]) ? validatedIncomingTables[tableName] : [];
      const allowedColumns = TABLE_COLUMNS[tableName] ?? [];
      let inserted = 0;

      for (const row of rows) {
        const validColumns = allowedColumns.filter((c) => Object.prototype.hasOwnProperty.call(row, c));
        if (validColumns.length === 0) continue;

        const placeholders = validColumns.map(() => '?').join(', ');
        const values = validColumns.map((c) => row[c]);

        await db.runAsync(
          `INSERT INTO ${tableName} (${validColumns.join(', ')}) VALUES (${placeholders})`,
          values
        );
        inserted += 1;
      }

      rowCountByTable[tableName] = inserted;
    }

    for (const tableName of AUTOINCREMENT_TABLES) {
      const maxRow = await db.getFirstAsync(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${tableName}`);
      const maxId = maxRow?.max_id ?? 0;
      await db.runAsync('INSERT OR IGNORE INTO sqlite_sequence (name, seq) VALUES (?, 0)', [tableName]);
      await db.runAsync('UPDATE sqlite_sequence SET seq = ? WHERE name = ?', [maxId, tableName]);
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }

  return rowCountByTable;
};
