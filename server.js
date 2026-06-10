const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Neon PostgreSQL connection pool setup
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Automate dropping and rebuilding schema on boot setup
const initDB = async () => {
    try {
        console.log("Dropping old tables to ensure a clean slate...");
        // DROPS THE OLD TABLES FIRST
        await pool.query('DROP TABLE IF EXISTS users CASCADE;');
        await pool.query('DROP TABLE IF EXISTS messages CASCADE;');

        console.log("Creating fresh database tables...");
        // REBUILDS THE TABLES FRESH
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
        console.log("Neon Database Architecture Synced Cleanly.");
    } catch (err) {
        console.error("Critical database initialization failure:", err.message);
    }
};
initDB();

// STATIC PAGE GATEWAY ROUTING
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ROUTE TO RESET TABLES MANUALLY VIA BROWSER
app.get('/api/admin/reset-db', async (req, res) => {
    try {
        await initDB();
        res.json({ success: true, message: "Database tables dropped and rebuilt successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API PATH: REGISTRATION SYSTEM (SIGN UP)
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    console.log(`Processing registration attempt for username: ${username}, email: ${email}`);

    try {
        const result = await pool.query(
            'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email',
            [username, email, password]
        );
        console.log(`Successfully created account ID: ${result.rows[0].id}`);
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error("Neon DB Write Error during signup execution:", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: "Username or Email address is already registered." });
        }
        res.status(500).json({ error: `Database Error Details: ${err.message}` });
    }
});

// API PATH: LOGIN SYSTEM (SIGN IN)
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE (username = $1 OR email = $1) AND password = $2',
            [userKey, password]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, message: "Authentication verified." });
        } else {
            res.status(401).json({ error: "Invalid credentials. Double check your typing." });
        }
    } catch (err) {
        console.error("Login verification query crash:", err.message);
        res.status(500).json({ error: `Database Verification Error: ${err.message}` });
    }
});

// PORTFOLIO CLIENT INPUT TRANSMISSIONS (CONTACT FORM)
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        await pool.query('INSERT INTO messages(name, email, message) VALUES($1, $2, $3)', [name, email, message]);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Contact data entry failure:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`JoyTech Portfolio running securely on Port ${PORT}`);
});
