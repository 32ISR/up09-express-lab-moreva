const express = require('express')
const cors = require('cors')
const db = require('./db')
const jwt = require('jsonwebtoken')
const bcr = require('bcryptjs')

const app = express()
const PORT = 3000
const SECRET = 'your-dirty-secret' 

app.use(cors())
app.use(express.json())


const auth = (req, res, next) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ error: "No token given" })
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
        return res.status(401).json({ error: "Invalid token form" })
    }

    try {
        const decoded = jwt.verify(token, SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token" })
    }
}


function checkRole(...allowedRoles) {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({ message: 'Пользователь не авторизован' })
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'У вас нет прав' })
        }
        next()
    }
}

app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password, email } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: "Нужно ввести логин или пароль" })
        }
        if (username.length < 3) {
            return res.status(400).json({ error: "Имя пользователя должно быть больше 3" })
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Пароль должен быть не меньше 6 символов" })
        }

        const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username)
        if (existing) return res.status(409).json({ error: "Такой пользователь уже существует" })

        const salt = bcr.genSaltSync(10)
        const hash = bcr.hashSync(password, salt)
        const role = "user"

        const info = db.prepare(`
            INSERT INTO users (username, email, password, role) 
            VALUES (?, ?, ?, ?)
        `).run(username.trim(), email ? email.trim() : null, hash, role)

        const newUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(info.lastInsertRowid)

        const { password: _, ...safeUser } = newUser

        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
            res.status(201).json({ success: true, token, user: safeUser })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Server failed" })
    }
})

app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: "Missing data" })
        }

        const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username)

        if (!user) 
            return res.status(401).json({ error: "Неправильный логин или пароль" })

        const valid = bcr.compareSync(password, user.password)

        if (!valid) 
            return res.status(401).json({ error: "Неправильный логин или пароль" })

        const { password: _, ...safeUser } = user

        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })

        res.json({ success: true, token, user: safeUser })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Something went wrong" })
    }
})

app.get('/api/auth/profile', auth, (req, res) => {
    res.json(req.user)
})

app.get('/api/books', (req, res) => {
    try {
        let sql = 'SELECT * FROM books'
        const params = []

        if (req.query.genre) {
            sql += ' WHERE genre = ?'
            params.push(req.query.genre)
        }
        if (req.query.author) {
            sql += params.length ? ' AND author = ?' : ' WHERE author = ?'
            params.push(req.query.author)
        }
        sql += ' ORDER BY createdAt DESC'

        const books = db.prepare(sql).all(...params)
        res.json(books)

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Не удалось получить список книг" })
    }
})

app.get('/api/books/:id', (req, res) => {
    try {
        const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)

        if (!book) {
            return res.status(404).json({ error: "Книга не найдена" })
        }
        const reviews = db.prepare('SELECT * FROM reviews WHERE bookId = ? ORDER BY createdAt DESC').all(req.params.id)

        res.json({ ...book, reviews })

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Книга не получена" })
    }
})

app.post('/api/books', auth, (req, res) => {
    try {
        const { title, author, year, genre, description } = req.body

        if (!title || !author || !year || !genre || !description) {
            return res.status(400).json({ error: "Все поля обязательны" })
        }

        const info = db.prepare(`
            INSERT INTO books (title, author, year, genre, description, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(title.trim(), author.trim(), year, genre.trim(), description.trim(), req.user.id)

        const newBook = db.prepare('SELECT * FROM books WHERE id = ?').get(info.lastInsertRowid)
        res.status(201).json(newBook)

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Не удалось создать книгу" })
    }
})

app.put('/api/books/:id', auth, (req, res) => {
    try {
        const { id } = req.params

        const { title, author, year, genre, description } = req.body

        const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id)
        if (!book) {
            return res.status(404).json({ error: "Не удалось найти книгу" })
        }
        if (req.user.role !== 'admin' && book.user_id !== req.user.id) {
            return res.status(403).json({ error: "Вы можете менять только свою книгу" })
        }

        const updates = []

        const params = []

        if (title !== undefined) {
            updates.push('title = ?')
            params.push(title.trim())
        }
        if (author !== undefined) {
            updates.push('author = ?')
            params.push(author.trim())
        }
        if (year !== undefined) {
            updates.push('year = ?')
            params.push(year)
        }
        if (genre !== undefined) {
            updates.push('genre = ?')
            params.push(genre.trim())
        }
        if (description !== undefined) {
            updates.push('description = ?')
            params.push(description.trim())
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: "Не обновляется" })
        }

        params.push(id)
        const query = `UPDATE books SET ${updates.join(', ')} WHERE id = ?`
        db.prepare(query).run(params)

        const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id)
        res.json(updatedBook)

    } catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Ошибка обновления" })
    }
})

app.delete('/api/books/:id', auth, (req, res) => {
    try {
        const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id)
        if (!book) {
            return res.status(404).json({ error: "Книга не найдена" })
        }
        if (req.user.role !== 'admin' && book.user_id !== req.user.id) {
            return res.status(403).json({ error: "Вы можете удалять только свои книги" })
        }
        db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id)
        res.status(204).send()
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Книжка не удалилась" })
    }
})

app.post('/api/books/:id/reviews', auth, (req, res) => {
    try {
        const { id: bookId } = req.params

        const { rating, comment } = req.body

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Рейтинг должен быть от 1 до 5" })
        }

        const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId)

        if (!book) {
            return res.status(404).json({ error: "Книга не найдена" })
        }

        const info = db.prepare(`
            INSERT INTO reviews (bookId, userId, rating, comment)
            VALUES (?, ?, ?, ?)
        `).run(bookId, req.user.id, rating, comment || null)

        const newReview = db.prepare(`
            SELECT r.*, u.username 
            FROM reviews r 
            JOIN users u ON r.userId = u.id 
            WHERE r.id = ?
        `).get(info.lastInsertRowid)

        res.status(201).json(newReview)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Отзыв не добавился" })
    }
})

app.get('/api/books/:id/reviews', (req, res) => {
    try {
        const { id } = req.params

        const reviews = db.prepare(`
            SELECT r.id, r.rating, r.comment, r.createdAt, u.username  
            FROM reviews r 
            JOIN users u ON r.userId = u.id 
            WHERE r.bookId = ? 
            ORDER BY r.createdAt DESC
        `).all(id)

        res.json(reviews)

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Отзыв не получен" })
    }
})

app.delete('/api/reviews/:id', auth, (req, res) => {
    try {
        const { id } = req.params

        const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id)

        if (!review) {
            return res.status(404).json({ error: "Отзыв не найден" })
        }

        if (req.user.role !== 'admin' && review.userId !== req.user.id) {
            return res.status(403).json({ error: "Вы можете удалить только свой отзыв" })
        }
        db.prepare('DELETE FROM reviews WHERE id = ?').run(id)
        res.status(204).send()

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Отзыв не удалился" })
    }
})

app.get('/api/admin/users', auth, checkRole('admin'), (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, email, role, createdAt FROM users').all()
        res.json(users)

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Проблема получения" })
    }
})

app.delete('/api/admin/users/:id', auth, checkRole('admin'), (req, res) => {
    try {
        const { id } = req.params

        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id)

        if (!user) {
            return res.status(404).json({ error: "Юзер не найден" })
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(id)
        res.status(204).send()

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Проблема удаления юзера" })
    }
})

app.listen(PORT, () => {
    console.log("Server started on port 3000");
    
})