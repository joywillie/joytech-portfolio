const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ====================== MIDDLEWARE ======================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ====================== DATABASE ======================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ====================== INIT DB ======================
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Database synced successfully.");
    } catch (err) {
        console.error("DB Init Error:", err);
    }
};

initDB();

// ====================== AUTH ROUTES ======================

// SIGN UP
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users(username, email, password)
            VALUES($1, $2, $3)
            RETURNING id, username, email
        `;

        const result = await pool.query(query, [
            username,
            email,
            hashedPassword
        ]);

        res.status(201).json({
            success: true,
            user: result.rows[0]
        });

    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({
                error: "Username or Email already exists."
            });
        }

        res.status(500).json({ error: "Signup failed." });
    }
});

// SIGN IN
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;

    try {
        const query = `
            SELECT * FROM users
            WHERE username = $1 OR email = $1
        `;

        const result = await pool.query(query, [userKey]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "User not found." });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Wrong password." });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            message: "Login successful",
            token
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed." });
    }
});

// ====================== CONTACT ======================
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    try {
        const query = `
            INSERT INTO messages(name, email, message)
            VALUES($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [name, email, message]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to save message." });
    }
});

// GET MESSAGES
app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM messages ORDER BY created_at DESC'
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: "Error fetching messages." });
    }
});

// ====================== ROUTES ======================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// PROTECTED DASHBOARD (FIXED)
const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;

    if (!header) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const token = header.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ error: "Invalid token" });
    }
};

app.get('/dashboard', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
