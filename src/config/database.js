const path = require('path');
const Database = require('better-sqlite3');

let db;

function getDatabase() {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'spa.sqlite');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  return db;
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS spas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      work_start_hour INTEGER NOT NULL DEFAULT 9,
      work_end_hour INTEGER NOT NULL DEFAULT 18,
      catalog_json TEXT NOT NULL DEFAULT '[]',
      phone_number_id TEXT,
      whatsapp_token TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spa_id INTEGER,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT,
      service_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled','completed','no_show')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spa_id INTEGER,
      client_phone TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS processed_messages (
      message_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

  `);

  ensureColumn(db, 'appointments', 'spa_id', 'INTEGER');
  ensureColumn(db, 'conversations', 'spa_id', 'INTEGER');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time);
    CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(client_phone);
    CREATE INDEX IF NOT EXISTS idx_appointments_spa ON appointments(spa_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_phone_created ON conversations(client_phone, created_at);
    CREATE INDEX IF NOT EXISTS idx_conversations_spa_phone ON conversations(spa_id, client_phone);
    CREATE INDEX IF NOT EXISTS idx_processed_messages_created ON processed_messages(created_at);
  `);

  seedDefaultSpa(db);
}

function ensureColumn(db, table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

function seedDefaultSpa(db) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM spas').get().c;
  if (count > 0) return;

  const catalog = require('../data/catalog.json');
  db.prepare(`
    INSERT INTO spas (name, work_start_hour, work_end_hour, catalog_json)
    VALUES (?, ?, ?, ?)
  `).run('Serenity Spa & Wellness', 9, 18, JSON.stringify(catalog));
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDatabase, closeDatabase };