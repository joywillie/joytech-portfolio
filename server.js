const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


// Serve frontend
app.use(express.static(path.join(__dirname, "public")));


// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


// Create tables
async function initDatabase(){

    try{

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users(
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);


        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages(
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(150),
                service VARCHAR(100),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);


        console.log("Database ready");

    }catch(error){

        console.log("Database error:", error.message);

    }
}


initDatabase();



// HOME
app.get("/",(req,res)=>{
    res.sendFile(
        path.join(__dirname,"public","auth.html")
    );
});



// =======================
// SIGNUP
// =======================

app.post("/api/auth/signup", async(req,res)=>{


    const {username,email,password}=req.body;


    if(!username || !email || !password){

        return res.status(400).json({
            error:"All fields required"
        });

    }


    try{


        const hashedPassword =
        await bcrypt.hash(password,10);



        await pool.query(
        `
        INSERT INTO users(username,email,password)
        VALUES($1,$2,$3)
        `,
        [
            username,
            email,
            hashedPassword
        ]);



        res.json({
            success:true,
            message:"Account created"
        });



    }catch(error){


        if(error.code==="23505"){

            return res.status(400).json({
                error:"User already exists"
            });

        }


        res.status(500).json({
            error:"Signup failed"
        });

    }

});




// =======================
// LOGIN
// =======================

app.post("/api/auth/login", async(req,res)=>{


    const {email,password}=req.body;


    try{


        const result =
        await pool.query(
        "SELECT * FROM users WHERE email=$1",
        [email]
        );


        if(result.rows.length===0){

            return res.status(401).json({
                error:"Account not found"
            });

        }



        const user=result.rows[0];


        const match =
        await bcrypt.compare(
            password,
            user.password
        );


        if(!match){

            return res.status(401).json({
                error:"Wrong password"
            });

        }



        const token =
        jwt.sign(
        {
            id:user.id,
            email:user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn:"1d"
        });



        res.json({

            success:true,
            token:token

        });



    }catch(error){


        res.status(500).json({
            error:"Login failed"
        });

    }


});




// =======================
// CONTACT FORM
// =======================

app.post("/api/contact",async(req,res)=>{


const {
    name,
    email,
    service,
    message
}=req.body;


try{


await pool.query(

`
INSERT INTO messages
(name,email,service,message)
VALUES($1,$2,$3,$4)
`,
[
name,
email,
service,
message
]

);



res.json({

success:true

});



}catch(error){


res.status(500).json({

error:"Message failed"

});


}


});




// Start server

const PORT =
process.env.PORT || 3000;


app.listen(PORT,()=>{

console.log(
`Server running on port ${PORT}`
);

});
