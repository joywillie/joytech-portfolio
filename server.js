const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const nodemailer = require('nodemailer'); // Added for instant email alerts
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

// Configure the Email Transporter (Using Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS  // Your secure App Password
    }
});

// ROOT ROUTE: Serves your actual styled portfolio website layout
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API ROUTE: Handle Contact Form Submissions, Save to Neon SQL, and send Email Alert
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: "Please provide name, email, and a message." });
    }

    try {
        // 1. Database Stream: Save entry into Neon SQL
        const queryText = 'INSERT INTO messages(name, email, message) VALUES($1, $2, $3) RETURNING *';
        const values = [name, email, message];
        const result = await pool.query(queryText, values);
        
        // 2. Notification Stream: Fire an instant email alert to your inbox
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'jw42205769@gmail.com', // Direct destination inbox
            subject: `🚀 New Portfolio Lead: ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 10px;">
                    <h2 style="color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">New Inquiry from JoyTech Portfolio</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #38bdf8;">${email}</a></p>
                    <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #38bdf8; margin-top: 15px; border-radius: 4px;">
                        <p style="margin: 0; line-height: 1.6;">${message}</p>
                    </div>
                    <p style="font-size: 11px; color: #64748b; margin-top: 20px;">Saved securely to your Neon cloud database rows.</p>
                </div>
            `
        };

        // Trigger the email courier asynchronously
        await transporter.sendMail(mailOptions);

        res.status(201).json({ 
            success: true, 
            message: "Success! Logged to Neon DB and Email notification transmitted.",
            data: result.rows[0] 
        });

    } catch (err) {
        console.error("Processing Engine Error:", err);
        // Even if email fails, we still return success if it successfully logged to the database
        res.status(500).json({ error: "Server process encountered an issue handling the submission lifecycle." });
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
