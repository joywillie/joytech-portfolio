const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ================= DB =================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ================= INIT =================
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT
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
      "INSERT INTO users(username,email,password) VALUES($1,$2,$3) RETURNING id,username,email",
      [username, email, hash]
    );

    res.json({ success: true, user: result.rows[0] });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// ================= SIGNIN (DEBUG SAFE) =================
app.post("/api/auth/signin", async (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body);

    const { userKey, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1 OR email=$1",
      [userKey]
    );

    console.log("USER COUNT:", result.rows.length);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = result.rows[0];

    const ok = await bcrypt.compare(password, user.password);

    console.log("PASSWORD MATCH:", ok);

    if (!ok) {
      return res.status(401).json({ error: "Wrong password" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT_SECRET missing" });
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
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed server error" });
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
