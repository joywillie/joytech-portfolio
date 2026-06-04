const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware 
app.use(cors());
app.use(express.json());

// Serve Static Site Files
app.use(express.static(path.join(__dirname)));

// Neon SQL Cloud Database Connection Matrix
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Structural initialization checks for database tables
const initDB = async () => {
    try {
        // Form messaging leads table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // User account credential matrix table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Neon database structures deployed cleanly.");
    } catch (err) {
        console.error("Infrastructure synchronization error:", err);
    }
};
initDB();

/* ==========================================================================
   ROUTING AND URL MAPPING HANDLING
   ========================================================================== */

// Serve Home Portfolio Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve Onboarding/Auth Portal Page
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

/* ==========================================================================
   AUTHENTICATION API SERVICE PIPELINES
   ========================================================================== */

// 1. SIGN UP ENDPOINT (Account Generation)
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: "All account parameters are required fields." });
    }

    try {
        const queryText = 'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email';
        const result = await pool.query(queryText, [username.trim().toLowerCase(), email.trim().toLowerCase(), password]);
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') { // Code for item redundancy (unique violations)
            return res.status(400).json({ error: "That username string or email identifier is already in use." });
        }
        res.status(500).json({ error: "Database transaction fault during account registration." });
    }
});

// 2. SIGN IN ENDPOINT (Credential validation checks)
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;
    if (!userKey || !password) {
        return res.status(400).json({ error: "Identification keys and password parameters are required." });
    }

    try {
        // Allows login validation using username input or matching email input strings
        const queryText = 'SELECT * FROM users WHERE username = $1 OR email = $1';
        const result = await pool.query(queryText, [userKey.trim().toLowerCase()]);

        if (result.rows.length === 0 || result.rows[0].password !== password) {
            return res.status(401).json({ error: "Invalid username/email or password credentials." });
        }

        const user = result.rows[0];
        res.status(200).json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: "Server process fault running identity verification." });
    }
});

// 3. FORGOT PASSWORD OVERWRITE PIPELINE
app.post('/api/auth/forgot', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ error: "Target email mappings and replacement keys are required parameters." });
    }

    try {
        const checkRes = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (checkRes.rows.length === 0) {
            return res.status(444).json({ error: "No profile matched that email record." });
        }

        await pool.query('UPDATE users SET password = $1 WHERE email = $2', [newPassword, email.trim().toLowerCase()]);
        res.status(200).json({ success: true, message: "Credential replacement written successfully." });
    } catch (err) {
        res.status(500).json({ error: "Database mapping error changing target password strings." });
    }
});

/* ==========================================================================
   CONTACT INCOMING INTERACTION CHANNELS
   ========================================================================== */
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        const queryText = 'INSERT INTO messages(name, email, message) VALUES($1, $2, $3) RETURNING *';
        const result = await pool.query(queryText, [name, email, message]);
        
        // Background Formspree API Email Forwarder Link
        try {
            await fetch('https://formspree.io/f/xjgledbb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });
        } catch (e) { console.error("Formspree background route bypass.", e); }

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Database writing failure storing lead." });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database scanning process error." });
    }
});

// Port runtime parameters configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running successfully on port ${PORT}`);
});
