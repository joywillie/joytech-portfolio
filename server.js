const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'joytech_secret_key_2026';

// ==========================================
// 1. CORE MIDDLEWARE RULES
// ==========================================
app.use(cors());
app.use(express.json());
// Serves static assets (CSS, JS, Images) directly from the root directory
app.use(express.static(path.resolve(__dirname)));

// ==========================================
// 2. NEON POSTGRESQL CONNECTION POOL
// ==========================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000 // Prevents the application from stalling indefinitely
});

// ==========================================
// 3. SECURE ROUTING GATEWAYS (ABSOLUTE PATHS)
// ==========================================
// Served by default when visiting the root domain URL
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'auth.html'));
});

// Protected portfolio application dashboard address
app.get('/dashboard', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// ==========================================
// 4. ASYNCHRONOUS DATABASE SETUP
// ==========================================
// Runs concurrently in the background so it never blocks Render's internal port check
const initDB = async () => {
    try {
        console.log("Connecting to Neon PostgreSQL database...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("🚀 Database system architecture tables verified and active.");
    } catch (err) {
        console.error("⚠️ Database connection delayed or failed:", err.message);
    }
};
initDB();

// ==========================================
// 5. SECURE AUTHENTICATION ENDPOINTS
// ==========================================

// USER REGISTER PORTAL
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            'INSERT INTO users(username, email, password) VALUES($1, $2, $3)',
            [username, email, hashedPassword]
        );

        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ success: true, token });
    } catch (err) {
        console.error("Signup exception caught:", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: "Username or Email already registered." });
        }
        res.status(500).json({ error: "Server registration error." });
    }
});

// USER LOGIN PORTAL
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [userKey]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
                const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ success: true, token });
            }
        }
        res.status(401).json({ error: "Invalid username, email, or password." });
    } catch (err) {
        console.error("Login exception caught:", err);
        res.status(500).json({ error: "Server verification error." });
    }
});

// ==========================================
// 6. BACKUP CONTACT FORM PROCESSING
// ==========================================
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await pool.query('INSERT INTO messages(name, email, message) VALUES($1, $2, $3)', [name, email, message]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 7. IMMEDIATE INSTANCE PORT BINDING
// ==========================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Port binding confirmed! JoyTech Engine listening directly on Port ${PORT}`);
});
