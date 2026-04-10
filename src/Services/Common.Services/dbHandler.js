const sqlite3 = require("sqlite3").verbose();

const DataTypes = {
  TEXT: "TEXT",
  INTEGER: "INTEGER",
  NULL: "NULL"
};

class SqliteDatabase {
  constructor(dbFile) {
    this.dbFile = dbFile;
    this.openConnections = 0;
    this.db = null;
  }

  open() {
    if (this.openConnections <= 0) {
      this.db = new sqlite3.Database(this.dbFile);
      this.openConnections = 1;
    } else this.openConnections++;
  }

  close() {
    if (this.openConnections <= 1) {
      if (this.db) this.db.close();
      this.db = null;
      this.openConnections = 0;
    } else this.openConnections--;
  }

  async getLastRecord(tableName) {
    const query = `SELECT * FROM ${tableName} ORDER BY Id DESC LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.get(query, (err, row) => {
        if (err) return reject(err.message);
        resolve(row);
      });
    });
  }

  runQuery(query, params = null) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params ? params : [], function (err) {
        if (err) return reject(err);
        resolve({ lastId: this.lastID, changes: this.changes });
      });
    });
  }

  async insertValue(tableName, value) {
    return await this.insertValues(tableName, [value]);
  }

  async insertValues(tableName, values) {
    if (!values.length) return { lastId: 0, changes: 0 };
    const columnNames = Object.keys(values[0]);
    let rowValueStr = "";
    let rowValues = [];
    for (const val of values) {
      rowValueStr += "(";
      for (const columnName of columnNames) {
        rowValueStr += "?,";
        rowValues.push(val[columnName] ?? null);
      }
      rowValueStr = rowValueStr.slice(0, -1) + "),";
    }
    rowValueStr = rowValueStr.slice(0, -1);
    const query = `INSERT INTO ${tableName}(${columnNames.join(", ")}) VALUES ${rowValueStr}`;
    return await this.runQuery(query, rowValues);
  }

  async updateValue(tableName, value, filter = null) {
    const cols = Object.keys(value);
    let valueStr = cols.map(c => `${c} = ?`).join(",");
    let values = cols.map(c => value[c] ?? null);
    let filterStr = "1";
    if (filter) {
      const fcols = Object.keys(filter);
      if (fcols.length > 0) {
        filterStr = fcols.map(fc => `${fc} = ?`).join(" AND ");
        values = values.concat(fcols.map(fc => filter[fc] ?? null));
      }
    }
    const query = `UPDATE ${tableName} SET ${valueStr} WHERE ${filterStr};`;
    return await this.runQuery(query, values);
  }

  async deleteValues(tableName, filter = null) {
    let values = [];
    let filterStr = "1";
    if (filter) {
      const fcols = Object.keys(filter);
      if (fcols.length > 0) {
        filterStr = fcols.map(fc => `${fc} = ?`).join(" AND ");
        values = fcols.map(fc => filter[fc] ?? null);
      }
    }
    const query = `DELETE FROM ${tableName} WHERE ${filterStr};`;
    return await this.runQuery(query, values);
  }

  async getValues(tableName, filter = null) {
    let values = [];
    let filterStr = "1";
    if (filter) {
      const fcols = Object.keys(filter);
      if (fcols.length > 0) {
        filterStr = fcols.map(fc => `${fc} = ?`).join(" AND ");
        values = fcols.map(fc => filter[fc] ?? null);
      }
    }
    const query = `SELECT * FROM ${tableName} WHERE ${filterStr};`;
    return new Promise((resolve, reject) => {
      const rows = [];
      this.db.each(
        query,
        values,
        function (err, row) {
          if (err) return reject(err);
          rows.push(row);
        },
        function (err) {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  async findBy(tableName, column, value) {
    const query = `SELECT * FROM ${tableName} WHERE ${column} = ? LIMIT 1`;
    return new Promise((resolve, reject) => {
      this.db.get(query, [value], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }
}

module.exports = { default: { SqliteDatabase, DataTypes }, SqliteDatabase, DataTypes };
