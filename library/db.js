const Database = require("better-sqlite3")
const bcr = require("bcryptjs")
const db = new Database('library.db')

db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    createdAt TEXT DEFAULT (datetime('now'))
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER NOT NULL,
    genre TEXT NOT NULL,
    description TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bookId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`)

const salt = bcr.genSaltSync(10)

let admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')

if (!admin) {
    const adminHash = bcr.hashSync('qwerty123', salt)

    db.prepare(`
        INSERT INTO users (username, email, password, role)
        VALUES (?, ?, ?, ?)
    `).run('admin', 'lenork890@gmail.com', adminHash, 'admin')
}

let user = db.prepare('SELECT id FROM users WHERE username = ?').get('user')

if (!user) {

    const userHash = bcr.hashSync('qwerty123', salt)

    db.prepare(`
        INSERT INTO users (username, email, password, role)
        VALUES (?, ?, ?, ?)
    `).run('user', 'elenamoreva@yandex.ru', userHash, 'user')
}


const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')

const regularUser = db.prepare('SELECT id FROM users WHERE username = ?').get('user')

const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get().count

if (bookCount === 0) {
    const insertBook = db.prepare(`
        INSERT OR IGNORE INTO books (title, author, year, genre, description, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `)

    const booksData = [
        ['The House At The Edge Of The Night', 'Katherine Banner', 2015, 'The Family Saga', 'A book about love and family', regularUser.id],
        ['Crime And Punishment', 'Fyodor Dostoevsky', 1866, 'Realism', 'Dude killed a grandmother', adminUser.id],
        ['Anna Karenina', 'Leo Tolstoy', 1878, 'Realism', 'The dude threw herself under the train', adminUser.id],
        ['Fathers And Children', 'Ivan Turgenev', 1862, 'Realism', 'Bazarov died, and I cried', regularUser.id],
        ['The Godfather', 'Mario Puzo', 1969, 'Crime drama', 'Back and forth shooting games', adminUser.id]
    ]

    for (const book of booksData) {
        insertBook.run(...book)
    }
}

const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count

if (reviewCount === 0) {
    const insertReview = db.prepare(`
        INSERT OR IGNORE INTO reviews (bookId, userId, rating, comment)
        VALUES (?, ?, ?, ?)
    `)

    const books = db.prepare('SELECT id FROM books').all()

    const users = db.prepare('SELECT id FROM users').all()

    const reviewsData = [
        [books[0].id, users[0].id, 5, 'Имба!'],
        [books[1].id, users[1].id, 4, 'Тяжело читать'],
        [books[2].id, users[0].id, 5, 'Шедевр'],
        [books[3].id, users[1].id, 3, 'Пойдет'],
        [books[4].id, users[0].id, 5, 'Моя любимая книга']
    ]

    for (const review of reviewsData) {
        insertReview.run(...review)
    }
}

module.exports = db