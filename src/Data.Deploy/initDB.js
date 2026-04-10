const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const settings = require("../settings.json").settings;
const { Tables } = require("../constants");

class DBInitializer {
  static #db = null;

  static async init() {
    if (!fs.existsSync(settings.dbPath)) {
      this.#db = new sqlite3.Database(settings.dbPath);

      await this.#runQuery("PRAGMA foreign_keys = ON");

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.CONTRACTVERSION} (
        Id INTEGER,
        Version FLOAT NOT NULL,
        Description TEXT,
        CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        LastUpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.SQLSCRIPTMIGRATIONS} (
        Id INTEGER,
        Sprint TEXT NOT NULL,
        ScriptName TEXT NOT NULL,
        ExecutedTimestamp TEXT,
        ConcurrencyKey TEXT CHECK (ConcurrencyKey LIKE '0x%' AND length(ConcurrencyKey) = 18),
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.ACTIVITYLOG} (
        Id INTEGER,
        ActivityType TEXT,
        User TEXT,
        Service TEXT,
        Action TEXT,
        Message TEXT,
        ExceptionMessage TEXT,
        TimeStamp TEXT,
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      await this.#runQuery(`CREATE TABLE IF NOT EXISTS ${Tables.NFTS} (
        Id INTEGER,
        TokenId TEXT UNIQUE NOT NULL,
        Name TEXT NOT NULL,
        Metadata TEXT,
        OwnerPubKey TEXT NOT NULL,
        CreatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedOn DATETIME DEFAULT CURRENT_TIMESTAMP,
        ConcurrencyKey TEXT CHECK (ConcurrencyKey LIKE '0x%' AND length(ConcurrencyKey) = 18),
        PRIMARY KEY("Id" AUTOINCREMENT)
      )`);

      this.#db.close();
    }

    if (fs.existsSync(settings.dbPath)) {
      this.#db = new sqlite3.Database(settings.dbPath);
      const scriptsFolder = path.resolve(process.cwd(), "src", "Data.Deploy", "Scripts");
      if (fs.existsSync(scriptsFolder)) {
        const sqlFiles = fs.readdirSync(scriptsFolder).filter(f => f.endsWith(".sql"));
        for (const sqlFile of sqlFiles) {
          const scriptPath = path.join(scriptsFolder, sqlFile);
          const rc = await this.#getRecord(
            `SELECT * FROM ${Tables.SQLSCRIPTMIGRATIONS} WHERE Sprint = ? AND ScriptName = ?`,
            ["Default", sqlFile]
          );
          if (!rc) {
            const sqlText = fs.readFileSync(scriptPath, "utf8");
            const statements = sqlText
              .split(";")
              .map(s => s.split(/\?\
/).map(line => (line.trim().startsWith("--") ? "" : line)).join("\
"))
              .filter(s => s.trim() !== "");
            for (const st of statements) {
              try { await this.#runQuery(st); } catch (e) { console.error("[MIGRATION]", e.message); }
            }
            await this.#runQuery(
              `INSERT INTO ${Tables.SQLSCRIPTMIGRATIONS} (Sprint, ScriptName, ExecutedTimestamp) VALUES (?, ?, ?)`,
              ["Default", sqlFile, new Date().toISOString()]
            );
          }
        }
      }
      this.#db.close();
    }
  }

  static #runQuery(query, params = null) {
    return new Promise((resolve, reject) => {
      this.#db.run(query, params ? params : [], function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  static #getRecord(query, filters = []) {
    return new Promise((resolve, reject) => {
      if (filters.length > 0) {
        this.#db.get(query, filters, (err, row) => {
          if (err) return reject(err.message);
          resolve(row);
        });
      } else {
        this.#db.get(query, (err, row) => {
          if (err) return reject(err.message);
          resolve(row);
        });
      }
    });
  }
}

module.exports = { DBInitializer };
