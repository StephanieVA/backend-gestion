const express = require("express");

const router = express.Router();

const controller = require("../controllers/cursosController");

router.get("/by-ciclo", controller.byCiclo);

module.exports = router;
