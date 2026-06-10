const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const rootDir = path.join(__dirname, "..", "..");
const dataDir = path.join(rootDir, "data");
const dbPath = path.join(dataDir, "betel-media.db");
const schemaPath = path.join(__dirname, "schema.sql");

function getDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  return db;
}

function ensureDatabase(options = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = getDb();
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);
  migrateDatabase(db);
  seedDatabase(db, options);
  db.close();
}

function migrateDatabase(db) {
  const programColumns = db.prepare("PRAGMA table_info(programs)").all().map((column) => column.name);
  if (!programColumns.includes("service_type")) {
    db.exec("ALTER TABLE programs ADD COLUMN service_type TEXT NOT NULL DEFAULT 'custom';");
  }

  const programItemColumns = db.prepare("PRAGMA table_info(program_items)").all().map((column) => column.name);
  if (!programItemColumns.includes("audio_file_path")) {
    db.exec("ALTER TABLE program_items ADD COLUMN audio_file_path TEXT;");
  }
  if (!programItemColumns.includes("background_file_path")) {
    db.exec("ALTER TABLE program_items ADD COLUMN background_file_path TEXT;");
  }

  db.exec(`
    UPDATE program_items
    SET audio_file_path = file_path,
        file_path = NULL
    WHERE item_type = 'song'
      AND audio_file_path IS NULL
      AND file_path IS NOT NULL
      AND (
        LOWER(file_path) LIKE '%.mp3'
        OR LOWER(file_path) LIKE '%.wav'
        OR LOWER(file_path) LIKE '%.ogg'
        OR LOWER(file_path) LIKE '%.m4a'
        OR LOWER(file_path) LIKE '%.aac'
        OR LOWER(file_path) LIKE '%.flac'
      );
  `);
}

function seedDatabase(db, options = {}) {
  const songCount = db.prepare("SELECT COUNT(*) as count FROM songs").get().count;
  if (songCount > 0 && !options.forceSeed) return;

  const insertSong = db.prepare(`
    INSERT INTO songs (title, author, sections_json, display_order_json)
    VALUES (@title, @author, @sections_json, @display_order_json)
  `);
  const insertProgram = db.prepare(`
    INSERT INTO programs (title, service_date, service_type, status)
    VALUES (@title, @service_date, @service_type, 'active')
  `);
  const insertItem = db.prepare(`
    INSERT INTO program_items (program_id, item_type, title, song_id, file_path, audio_file_path, background_file_path, notes, sort_order)
    VALUES (@program_id, @item_type, @title, @song_id, @file_path, @audio_file_path, @background_file_path, @notes, @sort_order)
  `);
  const insertScreen = db.prepare(`
    INSERT OR IGNORE INTO screens (screen_key, title, route, role)
    VALUES (@screen_key, @title, @route, @role)
  `);

  const tx = db.transaction(() => {
    if (options.forceSeed) {
      db.exec("DELETE FROM program_items; DELETE FROM programs; DELETE FROM slides; DELETE FROM songs; DELETE FROM screens;");
    }

    const songA = insertSong.run({
      title: "Mare esti Tu, Doamne",
      author: "Betel",
      sections_json: JSON.stringify({
        v1: "Mare esti Tu, Doamne\\nSi vrednic de lauda\\nInima mea Iti canta\\nCu bucurie sfanta",
        chorus: "Aleluia, aleluia\\nSlava Tie, Imparat\\nAleluia, aleluia\\nTu esti vesnic minunat",
        v2: "Tu esti lumina noastra\\nSperanta in incercari\\nNe conduci prin harul Tau\\nSpre vesnice cantari"
      }),
      display_order_json: JSON.stringify(["v1", "chorus", "v2", "chorus"])
    }).lastInsertRowid;

    const songB = insertSong.run({
      title: "Isus, centrul vietii mele",
      author: "Betel",
      sections_json: JSON.stringify({
        v1: "Isus, centrul vietii mele\\nTu esti pacea inimii\\nIn prezenta Ta cea sfanta\\nGasesc har in orice zi",
        chorus: "Te laudam, Te laudam\\nCu tot ce suntem azi\\nTe laudam, Te laudam\\nTu esti Domn peste veac"
      }),
      display_order_json: JSON.stringify(["v1", "chorus", "chorus"])
    }).lastInsertRowid;

    const programId = insertProgram.run({
      title: "Program Sabat",
      service_date: new Date().toISOString().slice(0, 10),
      service_type: "serviciul_divin"
    }).lastInsertRowid;

    insertItem.run({ program_id: programId, item_type: "song", title: "Cantare deschidere", song_id: songA, file_path: null, audio_file_path: null, background_file_path: null, notes: "Tempo moderat", sort_order: 1 });
    insertItem.run({ program_id: programId, item_type: "prayer", title: "Rugaciune", song_id: null, file_path: null, audio_file_path: null, background_file_path: null, notes: "Microfon pastor", sort_order: 2 });
    insertItem.run({ program_id: programId, item_type: "song", title: "Cantare speciala", song_id: songB, file_path: null, audio_file_path: null, background_file_path: null, notes: "Repeta refrenul", sort_order: 3 });
    insertItem.run({ program_id: programId, item_type: "sermon", title: "Predica", song_id: null, file_path: null, audio_file_path: null, background_file_path: null, notes: "Timer 35 min", sort_order: 4 });
    insertItem.run({ program_id: programId, item_type: "announcements", title: "Anunturi", song_id: null, file_path: null, audio_file_path: null, background_file_path: null, notes: "Afisare pe ecran principal", sort_order: 5 });

    insertScreen.run({ screen_key: "main", title: "Ecran principal", route: "/main-screen", role: "audience" });
    insertScreen.run({ screen_key: "stage", title: "Ecran scena", route: "/stage-screen", role: "confidence" });
    insertScreen.run({ screen_key: "control", title: "Panou operator", route: "/control", role: "operator" });
  });

  tx();
}

module.exports = {
  dbPath,
  ensureDatabase,
  getDb
};
