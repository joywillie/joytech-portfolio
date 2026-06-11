const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// =====================
// DATABASE (NEON POSTGRES)
// =====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// TEST CONNECTION (SAFE)
pool.connect()
  .then(() => console.log("✅ Database connected successfully"))
  .catch(err => console.log("❌ DB connection error:", err.message));

// =====================
// CREATE TABLES AUTO
// =====================
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
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

    console.log("✅ Tables ready");
  } catch (err) {
    console.log("❌ DB INIT ERROR:", err.message);
  }
};

initDB();

// =====================
// ROUTES (PAGES)
// =====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/auth", (req, res) => {
  res.sendFile(path.join(__dirname, "auth.html"));
});

// =====================
// JWT SECRET
// =====================
const JWT_SECRET = process.env.JWT_SECRET || "joytech_secret_key_change_this";

// =====================
// SIGNUP
// =====================
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username.toLowerCase(), email.toLowerCase(), hashedPassword]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0]
    });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "User already exists" });
    }
    console.log(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// =====================
// LOGIN
// =====================
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { userKey, password } = req.body;

    if (!userKey || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1 OR email=$1",
      [userKey.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// =====================
// CONTACT FORM
// =====================
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, service, message } = req.body;

    await pool.query(
      `INSERT INTO messages (name, email, service, message)
       VALUES ($1, $2, $3, $4)`,
      [name, email, service, message]
    );

    res.json({ success: true, message: "Message saved successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Message failed" });
  }
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
