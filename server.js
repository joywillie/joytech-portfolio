const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SERVE FRONTEND: This tells Express to serve your HTML, CSS, and images straight out of your folder
app.use(express.static(__dirname));

// Database Connection Configuration (Connecting to your Neon Console DB)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for secure serverless connections to Neon SQL
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

// ROOT ROUTE: Serves your actual styled portfolio website instead of raw text
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API ROUTE: Handle Contact Form Submissions and save them to Neon SQL
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: "Please provide name, email, and a message." });
    }

    try {
        const queryText = 'INSERT INTO messages(name, email, message) VALUES($1, $2, $3) RETURNING *';
        const values = [name, email, message];
        const result = await pool.query(queryText, values);
        
        res.status(201).json({ 
            success: true, 
            message: "Message saved to Neon SQL successfully!",
            data: result.rows[0] 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error. Could not save message." });
    }
});

// API ROUTE: Securely retrieve messages from your dashboard
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
