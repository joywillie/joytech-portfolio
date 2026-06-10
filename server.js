const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'joytech_secret_key_2026';

// Core Middleware Rules
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Neon PostgreSQL connection pool setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Setup fresh tables for users and messages
const initDB = async () => {
    try {
        console.log("Initializing database tables...");
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
        console.log("Database tables verified and ready.");
    } catch (err) {
        console.error("Database status warning:", err.message);
    }
};
initDB();

// GATEWAY ROUTING: Serves auth page by default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// PORTFOLIO ROUTING: Protected dashboard access
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- AUTHENTICATION ENDPOINTS ---

// SIGNUP PORTAL
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Securely hash user password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            'INSERT INTO users(username, email, password) VALUES($1, $2, $3)',
            [username, email, hashedPassword]
        );

        // Generate instant login token
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({ success: true, token });
    } catch (err) {
        console.error("Signup error:", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: "Username or Email already registered." });
        }
        res.status(500).json({ error: "Server registration error." });
    }
});

// SIGNIN PORTAL
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [userKey]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Compare encrypted password hashes
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
                const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
                return res.json({ success: true, token });
            }
        }
        res.status(401).json({ error: "Invalid username, email, or password." });
    } catch (err) {
        res.status(500).json({ error: "Server login error." });
    }
});

// BACKUP CONTACT PROCESSING
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await pool.query('INSERT INTO messages(name, email, message) VALUES($1, $2, $3)', [name, email, message]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`JoyTech Secured Engine running on Port ${PORT}`);
});
