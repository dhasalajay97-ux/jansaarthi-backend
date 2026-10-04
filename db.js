const mysql = require("mysql2");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({
    path: path.join(__dirname, ".env")
});
console.log("DB USER:", process.env.DB_USER);
console.log("DB NAME:", process.env.DB_NAME);
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
db.connect((err) => {
    if (err) {
        console.log("❌ MySQL Connection Failed!");
        console.log(err.message);
        return;
    }
    console.log("✅ MySQL Connected Successfully!");
});
module.exports = db;
