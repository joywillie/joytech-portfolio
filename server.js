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

// Automatically initialize your SQL table on startup if it doesn't exist
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
        console.log("Neon SQL database initialized successfully.");
    } catch (err) {
        console.error("Error initializing SQL database:", err);
    }
};
initDB();

// ROOT ROUTE: Serves your actual styled portfolio website layout
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API ROUTE: Handle Contact Form Submissions, Save to Neon SQL, and forward to Formspree
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: "Please provide name, email, and a message." });
    }

    try {
        // 1. Save entry to Neon SQL Database
        const queryText = 'INSERT INTO messages(name, email, message) VALUES($1, $2, $3) RETURNING *';
        const values = [name, email, message];
        const result = await pool.query(queryText, values);
        
        // 2. Forward to Formspree using Node's built-in global fetch
        // Your existing Formspree ID from your original HTML file: xjgledbb
        try {
            await fetch('https://formspree.io/f/xjgledbb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name, email, message })
            });
            console.log("Formspree email forwarding complete.");
        } catch (emailErr) {
            console.error("Formspree forwarding failed, but data was saved to database:", emailErr);
        }

        res.status(201).json({ 
            success: true, 
            message: "Success! Logged to Neon DB and Email notification sent.",
            data: result.rows[0] 
        });

    } catch (err) {
        console.error("Processing Engine Error:", err);
        res.status(500).json({ error: "Server process encountered an issue handling the submission." });
    }
});

// API ROUTE: Securely retrieve messages via browser endpoint
app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error. Could not fetch messages." });
    }
});

// Set port for deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running successfully on port ${PORT}`);
});
