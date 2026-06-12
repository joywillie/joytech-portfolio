const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   DATABASE (NEON POSTGRES)
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => console.log("Database connected successfully"))
  .catch(err => console.log("DB connection error:", err.message));

/* =========================
   ROUTES (FRONTEND PAGES)
========================= */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/auth", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "auth.html"));
});

/* =========================
   SIGNUP
========================= */
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hashedPassword]
    );

    res.json({ message: "User created successfully" });

  } catch (err) {
    console.log("Signup error:", err.message);
    res.status(500).json({ error: "Signup failed" });
  }
});

/* =========================
   LOGIN
========================= */
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { userKey, password } = req.body;

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email=$1 OR username=$1",
      [userKey]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });

  } catch (err) {
    console.log("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

/* =========================
   SERVER START
========================= */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
