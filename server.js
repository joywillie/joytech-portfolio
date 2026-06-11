const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// =======================
// INIT DATABASE
// =======================
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                service VARCHAR(100),
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Database ready.");
    } catch (err) {
        console.error("DB init error:", err);
    }
};

initDB();

// =======================
// PAGES
// =======================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// =======================
// AUTH: SIGNUP
// =======================
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users(username, email, password)
             VALUES($1, $2, $3)
             RETURNING id, username, email`,
            [
                username.trim().toLowerCase(),
                email.trim().toLowerCase(),
                hashedPassword
            ]
        );

        res.status(201).json({
            success: true,
            user: result.rows[0]
        });

    } catch (err) {
        console.error(err);

        if (err.code === '23505') {
            return res.status(400).json({
                error: "Username or email already exists"
            });
        }

        res.status(500).json({ error: "Signup failed" });
    }
});

// =======================
// AUTH: SIGNIN
// =======================
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;

    if (!userKey || !password) {
        return res.status(400).json({ error: "Missing credentials" });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM users WHERE username=$1 OR email=$1`,
            [userKey.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "User not found" });
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
});

// =======================
// CONTACT FORM
// =======================
app.post('/api/contact', async (req, res) => {
    const { name, email, service, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO messages(name, email, service, message)
             VALUES($1, $2, $3, $4)
             RETURNING *`,
            [name, email, service, message]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Message failed to send" });
    }
});

// =======================
// GET MESSAGES (ADMIN)
// =======================
app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM messages ORDER BY created_at DESC'
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
