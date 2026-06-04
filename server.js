const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());                  // Allows your frontend to connect to this API
app.use(express.json());          // Allows your server to accept and read JSON data

// Test/Root Route
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the Joytech Portfolio API! Server is up and running." });
});

// Example Route: Get Portfolio Projects
app.get('/api/projects', (req, res) => {
    const projects = [
        { id: 1, title: "Project One", description: "A cool web app", tech: ["React", "Node"] },
        { id: 2, title: "Project Two", description: "Another awesome project", tech: ["Python", "Flask"] }
    ];
    res.json(projects);
});

// Example Route: Handle Contact Form Submissions
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: "Please provide name, email, and a message." });
    }

    console.log(`Received message from ${name} (${email}): ${message}`);
    
    // In the future, you can save this to a database or send an email here!
    res.json({ success: true, message: "Thank you for reaching out! Message received." });
});

// Render dynamically assigns a port via process.env.PORT. 
// 0.0.0.0 allows it to accept external connections.
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running successfully on port ${PORT}`);
});
