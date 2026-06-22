const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",

  user: "root",

  password: "root",

  database: "encuesta",
});

module.exports = db.promise();

//module.exports = pool.promise();
//module.exports = db.promise();
