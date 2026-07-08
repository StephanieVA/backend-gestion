const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());

// IMPORTANTE
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

// Rutas
app.use("/api/auth", require("./routes/auth.routes"));

app.use("/api/respuestas", require("./routes/respuestas.routes"));

app.use("/api/reportes", require("./routes/reportes.routes"));

app.use("/api/cursos", require("./routes/cursos.routes"));

app.listen(3000, () => {
  console.log("Servidor iniciado");
});
