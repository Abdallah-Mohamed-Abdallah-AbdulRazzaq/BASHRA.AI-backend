require('dotenv').config();
const mysql = require('mysql2/promise');  // Make sure you're importing the promise version of mysql2

// Create a connection pool for efficient querying
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
