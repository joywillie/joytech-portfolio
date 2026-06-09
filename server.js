const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ================= DB =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= INIT DB =================
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("DB Ready");
})();

// ================= SIGNUP =================
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1,$2,$3) RETURNING id, username, email",
      [username, email, hash]
    );

    res.json({ success: true, user: result.rows[0] });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "User already exists" });
    }
    res.status(500).json({ error: "Signup failed" });
  }
});

// ================= SIGNIN =================
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { userKey, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1 OR email=$1",
      [userKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = result.rows[0];

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username }
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= CONTACT =================
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const result = await pool.query(
      "INSERT INTO messages (name,email,message) VALUES ($1,$2,$3) RETURNING *",
      [name, email, message]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// ================= ROUTES =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "auth.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running:", PORT));
