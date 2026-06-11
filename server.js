const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || "joytech_secret_key_change_this";

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// =========================
// NEON DB CONNECTION (SAFE)
// =========================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// =========================
// DATABASE INIT (SAFE)
// =========================
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        service VARCHAR(100),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("DB READY ✅");
  } catch (err) {
    console.error("DB INIT ERROR (non-fatal):", err.message);
  }
};

initDB();

// =========================
// ROUTES - FRONTEND
// =========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/auth", (req, res) => {
  res.sendFile(path.join(__dirname, "auth.html"));
});

// =========================
// SIGNUP (SECURE)
// =========================
app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username.toLowerCase(), email.toLowerCase(), hashedPassword]
    );

    return res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "User already exists" });
    }

    return res.status(500).json({ error: "Signup failed" });
  }
});

// =========================
// LOGIN (JWT TOKEN)
// =========================
app.post("/api/auth/signin", async (req, res) => {
  const { userKey, password } = req.body;

  if (!userKey || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE username=$1 OR email=$1`,
      [userKey.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid login" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid login" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Login failed" });
  }
});

// =========================
// CONTACT FORM
// =========================
app.post("/api/contact", async (req, res) => {
  const { name, email, service, message } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO messages (name, email, service, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, email, service, message]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ error: "Message not saved" });
  }
});

// =========================
// GET MESSAGES (ADMIN)
// =========================
app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// =========================
// START SERVER
// =========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
