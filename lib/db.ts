import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "family.db");

// Dùng biến global để tránh mở nhiều connection khi Next.js hot-reload trong dev
declare global {
  // eslint-disable-next-line no-var
  var __familyDb: Database.Database | undefined;
}

const db = global.__familyDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") global.__familyDb = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT DEFAULT '',
    gender TEXT CHECK(gender IN ('M','F')) NOT NULL DEFAULT 'M',
    birth_date TEXT,
    death_date TEXT,
    avatar TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person1_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    person2_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    -- type = 'parent'  => person1 là CHA/MẸ của person2
    -- type = 'spouse'  => person1 và person2 là vợ chồng (lưu 1 dòng, đối xứng)
    type TEXT CHECK(type IN ('parent','spouse')) NOT NULL,
    UNIQUE(person1_id, person2_id, type)
  );
`);

export default db;
