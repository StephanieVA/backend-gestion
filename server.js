const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: [
    "https://gestion-tiempo-phi.vercel.app",
    "http://localhost:4200"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor funcionando");
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/respuestas", require("./routes/respuestas.routes"));
app.use("/api/reportes", require("./routes/reportes.routes"));
app.use("/api/cursos", require("./routes/cursos.routes"));
app.use("/api/encuesta", require("./routes/encuestaRoutes"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
