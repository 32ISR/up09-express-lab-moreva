const Database = require("better-sqlite3")

const db = new Database('library.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
    password TEXT NOT NULL,
    role TEXT DEFAULT "user",
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER NOT NULL, 
    genre TEXT NOT NULL,
    description TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    rating INTEGER, 
    comment TEXT, 
    createdAt TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db