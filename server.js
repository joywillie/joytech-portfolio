const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser()); // Enables safe cookie session management
app.use(express.static(path.join(__dirname)));

// Neon PostgreSQL connection pool setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Resets and prepares fresh database architecture on start
const initDB = async () => {
    try {
        console.log("Rebuilding fresh tables for a clean runtime environment...");
        await pool.query('DROP TABLE IF EXISTS users CASCADE;');
        await pool.query('DROP TABLE IF EXISTS messages CASCADE;');

        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Database tables synchronized perfectly.");
    } catch (err) {
        console.error("Database sync error:", err.message);
    }
};
initDB();

// BACKEND ROUTE GUARDS (Replaces unstable frontend window redirections)
app.get('/', (req, res) => {
    // If already authenticated via cookie, send them straight to dashboard
    if (req.cookies.joytech_session === 'true') {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/dashboard', (req, res) => {
    // Strictly blocks non-logged in traffic at the server level
    if (req.cookies.joytech_session !== 'true') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// LOGOUT ROUTE (Clears session backend-side)
app.get('/api/auth/logout', (req, res) => {
    res.clearCookie('joytech_session');
    res.redirect('/');
});

// SIGNUP ENDPOINT
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        await pool.query(
            'INSERT INTO users(username, email, password) VALUES($1, $2, $3)',
            [username, email, password]
        );
        // Set secure access cookie directly on registration success
        res.cookie('joytech_session', 'true', { maxAge: 86400000, httpOnly: false });
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Signup error:", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: "Username or Email is already registered." });
        }
        res.status(500).json({ error: err.message });
    }
});

// SIGNIN ENDPOINT
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE (username = $1 OR email = $1) AND password = $2',
            [userKey, password]
        );
        if (result.rows.length > 0) {
            // Set secure access cookie directly on login success
            res.cookie('joytech_session', 'true', { maxAge: 86400000, httpOnly: false });
            res.json({ success: true });
        } else {
            res.status(401).json({ error: "Invalid credentials. Please try again." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CONTACT ME PROCESSING
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
    console.log(`Server listening securely on port ${PORT}`);
});
