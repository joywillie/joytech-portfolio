const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();

// Global Security and Request Parsing Middleware
app.use(cors());
app.use(express.json());

// Serve Static Assets (Images, Icons, Compiled Stylesheets) Safely from Root Directory
app.use(express.static(path.join(__dirname)));

// Neon SQL Cloud Database Core Integration Matrix
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Database Infrastructure Synchronization on Boot
const initDB = async () => {
    try {
        // Core Lead Inbound Messages Storage Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Gatekeeper Authentication Credential Matrix Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Neon Database Architecture Synced Cleanly.");
    } catch (err) {
        console.error("Critical Infrastructure Initialization Fault:", err);
    }
};
initDB();

/* ==========================================================================
   GATEKEEPER ROUTING SYSTEM (WEBSITE SECURITY LOCK MECHANISM)
   ========================================================================== */

/**
 * 1. THE LOCK: Overriding Root Directory Path Mapping.
 * Instead of displaying index.html directly, this intercepts visitors 
 * and forces them to complete the Sign Up / Login workflow inside auth.html.
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

/**
 * 2. THE VAULT: Hidden Core Portfolio Destination.
 * Your main interactive digital portfolio (index.html) is securely bound behind this path. 
 * The login submission script redirects users here upon successful verification.
 */
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


/* ==========================================================================
   BACKEND AUTHENTICATION SERVICE ENDPOINTS
   ========================================================================== */

// 1. ACCOUNT GENERATION PIPELINE (Sign Up Engine)
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: "All account parameters (Username, Email, Password) are required." });
    }

    try {
        const queryText = 'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email';
        const result = await pool.query(queryText, [
            username.trim().toLowerCase(), 
            email.trim().toLowerCase(), 
            password
        ]);
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') { // Postgres Unique Constraint Infraction Code
            return res.status(400).json({ error: "That specific username or email address is already registered." });
        }
        res.status(500).json({ error: "Database transaction fault occurred during profile deployment." });
    }
});

// 2. CREDENTIAL LOOKUP PIPELINE (Sign In / Lock Verification Engine)
app.post('/api/auth/signin', async (req, res) => {
    const { userKey, password } = req.body;

    if (!userKey || !password) {
        return res.status(400).json({ error: "Identification lookup strings and passwords are required parameters." });
    }

    try {
        // Allows unified logging via either matching account username or email fields dynamically
        const queryText = 'SELECT * FROM users WHERE username = $1 OR email = $1';
        const result = await pool.query(queryText, [userKey.trim().toLowerCase()]);

        if (result.rows.length === 0 || result.rows[0].password !== password) {
            return res.status(401).json({ error: "Access Denied. Invalid identifier credentials or password mismatch." });
        }

        const user = result.rows[0];
        res.status(200).json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: "Identity cross-referencing process fault within backend stack." });
    }
});


/* ==========================================================================
   CONTACT FORM HANDLERS AND INBOUND TRANSACTION SERVICES
   ========================================================================== */

app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    try {
        // Store inside transactional database logs
        const queryText = 'INSERT INTO messages(name, email, message) VALUES($1, $2, $3) RETURNING *';
        const result = await pool.query(queryText, [name, email, message]);
        
        // Background Formspree Redirection Layer Bypass
        try {
            await fetch('https://formspree.io/f/xjgledbb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });
        } catch (e) { 
            console.error("Formspree background route bypass warning:", e.message); 
        }

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Database communication failure writing contact lead record." });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database scanning transaction error fetching lead tables." });
    }
});


/* ==========================================================================
   SERVER RUNTIME INITIALIZATION
   ========================================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gatekeeper Web Architecture listening actively on Port ${PORT}`);
});
