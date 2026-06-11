const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve Frontend static assets
app.use(express.static(__dirname));

// Database Connection Configuration (Neon Console DB)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Automatically initialize tables on system startup
const initDB = async () => {
    try {
        // Core Form Leads Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Authentication Account Matrix
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Neon PostgreSQL infrastructure synchronized successfully.");
    } catch (err) {
        console.error("Database initialization fault:", err);
    }
};
initDB();

// SERVE ROOT PORTFOLIO INDEX ARCHITECTURE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SERVE AUTHENTICATION PAGE ROUTE
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

/* ==========================================================================
   AUTHENTICATION API SERVICE PIPELINES
   ========================================================================== */

// 1. REGISTRATION ENDPOINT (SIGN UP)
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: "All account fields are mandatory fields." });
    }

    try {
        const queryText = 'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email';
        const result = await pool.query(queryText, [username.trim().toLowerCase(), email.trim().toLowerCase(), password]);
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (err) {
        if(err.code === '23505') { // Code for duplicate item violations
            return res.status(400).json({ error: "Username or email string already exists in records." });
        }
        res.status(500).json({ error: "Database transaction error processing sign-up." });
    }
});

// 2. VALIDATION ENDPOINT (SIGN IN)
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;
    if (!userKey || !password) {
        return res.status(400).json({ error: "Credentials must contain user tags and credentials." });
    }

    try {
        // Query allows looking up account records via user parameters or email parameters
        const queryText = 'SELECT * FROM users WHERE username = $1 OR email = $1';
        const result = await pool.query(queryText, [userKey.trim().toLowerCase()]);

        if (result.rows.length === 0 || result.rows[0].password !== password) {
            return res.status(401).json({ error: "Invalid user identifiers or password credentials matches." });
        }

        const user = result.rows[0];
        res.status(200).json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: "Server process fault parsing signature authentication requests." });
    }
});

// 3. OVERWRITE PIPELINE ENGINE (FORGOT PASSWORD ALTERATIONS)
app.post('/api/auth/forgot', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        return res.status(400).json({ error: "Target email mapping and key replacements are mandatory parameters." });
    }

    try {
        const checkQuery = 'SELECT id FROM users WHERE email = $1';
        const checkRes = await pool.query(checkQuery, [email.trim().toLowerCase()]);

        if (checkRes.rows.length === 0) {
            return res.status(444).json({ error: "No account profile identified with matching email." });
        }

        const updateQuery = 'UPDATE users SET password = $1 WHERE email = $2';
        await pool.query(updateQuery, [newPassword, email.trim().toLowerCase()]);
        res.status(200).json({ success: true, message: "Target password block rewritten safely." });
    } catch (err) {
        res.status(500).json({ error: "Server structural database record writing failure." });
    }
});

/* ==========================================================================
   FORM INCOMING SUBMISSION HANDLERS
   ========================================================================== */
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        const queryText = 'INSERT INTO messages(name, email, message) VALUES($1, $2, $3) RETURNING *';
        const result = await pool.query(queryText, [name, email, message]);
        
        // Background Formspree API Relay Loop
        try {
            await fetch('https://formspree.io/f/xjgledbb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });
        } catch (e) { console.error("Formspree bridge pipeline idle.", e); }

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Lead processing failure sequence tripped." });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database reading trace processing fault." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running successfully on port ${PORT}`);
});
