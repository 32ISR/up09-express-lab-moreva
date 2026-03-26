const Database = require("better-sqlite3")
const bcr = require("bcryptjs")
const db = new Database('library.db')

db.pragma('foreign_keys = ON')

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

const salt = bcr.genSaltSync(10)
const adminHash = bcr.hashSync('qwerty123', salt)
const userHash = bcr.hashSync('qwerty123', salt)

const insertUser = db.prepare('INSERT IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)')

const resultUser = insertUser.run('morelllin', 'lenork890@gmail.com', 'qwerty123', 'admin').lastInsertRowid
const resulAdmin = insertUser.run('morevaelena', 'elenamoreva@mail.ru', 'qwerty123', 'user').lastInsertRowid

const insertBook = db.prepare('INSERT IGNORE INTO books (title, author, year, genre, description, user_id) VALUES (?, ?, ?, ?, ?, ?)');
insertBook.run('The house at the edge of the night', 'Katherine Banner', '2000', 'The family saga', 'A book about love and family', resultUser.lastInsertRowid);

const booksWithUsers = db
    .prepare(
        ` SELECT books.id, books.title, books.author, users.username AS added_by FROM books JOIN users ON books.user_id = users.id `,
    )
    .all()
console.log(booksWithUsers)

module.exports = db