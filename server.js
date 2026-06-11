const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


async function initDB(){
    try{

        await pool.query(`
        CREATE TABLE IF NOT EXISTS messages(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100),
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `);


        await pool.query(`
        CREATE TABLE IF NOT EXISTS users(
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `);

        console.log("Database ready");

    }catch(err){
        console.log(err);
    }
}

initDB();



/* PAGES */

app.get("/",(req,res)=>{
    res.sendFile(path.join(__dirname,"auth.html"));
});


app.get("/auth",(req,res)=>{
    res.sendFile(path.join(__dirname,"auth.html"));
});


app.get("/dashboard",(req,res)=>{
    res.sendFile(path.join(__dirname,"index.html"));
});



/* SIGNUP */

app.post("/api/auth/signup", async(req,res)=>{

const {username,email,password}=req.body;


if(!username || !email || !password){
return res.status(400).json({
error:"Fill all fields"
});
}


try{

const result = await pool.query(
"INSERT INTO users(username,email,password) VALUES($1,$2,$3) RETURNING id,username,email",
[
username.toLowerCase(),
email.toLowerCase(),
password
]
);


res.json({
success:true,
user:result.rows[0]
});


}catch(err){

if(err.code==="23505"){
return res.status(400).json({
error:"Account already exists"
});
}


res.status(500).json({
error:"Signup failed"
});

}

});





/* LOGIN */


app.post("/api/auth/signin",async(req,res)=>{


const {userKey,password}=req.body;


try{

const result=await pool.query(
"SELECT * FROM users WHERE username=$1 OR email=$1",
[
userKey.toLowerCase()
]
);



if(result.rows.length===0){

return res.status(401).json({
error:"User not found"
});

}



const user=result.rows[0];


if(user.password !== password){

return res.status(401).json({
error:"Wrong password"
});

}



res.json({

success:true,

token:"joytech-login",

user:{
id:user.id,
username:user.username,
email:user.email
}

});



}catch(err){

res.status(500).json({
error:"Login error"
});

}

});





/* CONTACT */

app.post("/api/contact",async(req,res)=>{

const {name,email,message}=req.body;


try{

const result=await pool.query(

"INSERT INTO messages(name,email,message) VALUES($1,$2,$3) RETURNING *",

[name,email,message]

);


res.json({
success:true,
data:result.rows[0]
});


}catch(err){

res.status(500).json({
error:"Message failed"
});

}

});




app.get("/api/messages",async(req,res)=>{

const result=await pool.query(
"SELECT * FROM messages ORDER BY id DESC"
);

res.json(result.rows);

});




const PORT=process.env.PORT || 3000;


app.listen(PORT,()=>{

console.log(
`Server running on port ${PORT}`
);

});
