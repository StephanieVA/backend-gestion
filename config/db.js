//const mysql = require("mysql2");

//const db = mysql.createPool({
//host: "localhost",

//user: "root",

//password: "root",

//database: "encuesta",
//});

///module.exports = db.promise();

//module.exports = pool.promise();
//module.exports = db.promise();
const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
});

module.exports = db.promise();
