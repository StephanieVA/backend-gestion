const express = require("express");

const router = express.Router();

const controller = require("../controllers/reportesController");

// Reportes agregados (sumatorias por día)
// Query: ciclo=II ciclo (opcional)
router.get("/por-ciclo", controller.reportePorCiclo);

module.exports = router;
