const express = require("express");

const app = express();

app.get("/", (req, res) => {
  console.log("RECIBIDA PETICION ROOT");
  res.status(200).send("OK Railway");
});

const PORT = process.env.PORT || 3000;

console.log("PORT ASIGNADO:", PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
