const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

//app.get("/", (req, res) => {
// res.send("Servidor funcionando");
//});
app.use((req, res, next) => {
  console.log("Petición:", req.method, req.url);
  next();
});
app.get("/", (req, res) => {
  console.log("Solicitud recibida en /");
  res.send("Servidor funcionando");
});

//
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/respuestas", require("./routes/respuestas.routes"));
app.use("/api/reportes", require("./routes/reportes.routes"));
app.use("/api/cursos", require("./routes/cursos.routes"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor iniciado en puertos ${PORT}`);
});
