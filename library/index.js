const express = require('express')
const db = require('./db')
const jwt = require('jsonwebtoken')
const bcr = require('bcryptjs')
const app = express()
app.use(cors())
app.use(express.json())

const PORT = 3000

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
        return res.status(403).json({ error: "Invalid or expaired token" })
    }
}

function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Доступ запрещен: недостаточно прав' });
    }

    next();
  };
};

app.post("api/auth/register", (req, res) => {
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

        const existing = db.prepare(
            "SELECT id FROM users WHERE username = ?"
        ).get(username)

        if (existing) return res.status(409).json({ error: "Такой пользователь уже существует" })

        const salt = bcr.genSaltSync(10)
        const hash = bcr.hashSync(password, salt)
        const role = "user"

        const info = db.prepare(`
        INSERT INTO users (username, email, password, role) 
        VALUES (?, ?, ?, ?)
        `).run(username.trim(), email.trim(), hash, role)

        const newUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(info.lastInsertRowid)

        const { password: _, ...safeUser } = newUser

        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(201).json({ success: true, token, user: safeUser })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ error: "Server failed" })
    }
})

app.post("api/auth/login", (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(401).json({ error: "Missing data" })
        }

        const user = db.prepare(
            "SELECT * FROM users WHERE username = ?"
        ).get(username)
        if (!user) return res.status(409).json({ error: "Неправильный пароль" })

        const valid = bcr.compareSync(password, user.password)
        if (!valid) return res.status(401).json({ error: "Неправильный пароль" })

        const { password: _, ...safeUser } = user

        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(201).json({ success: true, token, user: safeUser })
    }
    catch (error) {
        console.error(error)
        return res.status(500).json({ error: "Something went wrong" })
    }
})

app.get("/api/auth/profile", auth, (req, res) => {
    res.json(req.user)
}) 

app.get("/api/books", auth, (req, res) => {
   
})

app.get("/api/books/:id", (req, res) => {
   
})

app.post("/api/books", auth, (req, res) => {
    try {
        const { title, author, year, genre, description } = req.body

        if (!title || !author) {
            return res.status(400)({ error: "Название и автор обязательны" })
        }

        const info = db.prepare(`
        INSERT INTO books (title, author, year, genre, description) 
        VALUES (?, ?, ?, ?, ?)
        `).run(title.trim(), author.trim(), year, genre, description)


    } catch (err) {
        
    }
})

app.put("/api/books/:id", auth, (req, res) => {
   
})

app.delete("/api/books/:id", auth, (req, res) => {
   
})

app.post("/api/books/:id/reviews", auth, (req, res) => {
   
})

app.get("/api/books/:id/reviews", (req, res) => {
   
})

app.delete("/api/reviews/:id", auth, (req, res) => {
   
})

app.get("/api/admin/users", admin, (req, res) => {
   
})

app.delete("/api/admin/users/:id", admin, (req, res) => {
   
})




app.listen(PORT)