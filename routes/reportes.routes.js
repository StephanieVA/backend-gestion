const express = require("express");

const router = express.Router();

const controller = require("../controllers/reportesController");

const authAdmin = require("../middleware/authAdmin");

// Reporte paginado: 1 estudiante por página (limit=1 desde el frontend)
// Query: ciclo=I|II|III... (opcional), page, limit
router.get("/por-ciclo", authAdmin, controller.reportePorCiclo);

// Exportar Excel completo (no paginado)
// Query: ciclo=I|II|III... (opcional)
router.get("/exportar-excel", authAdmin, controller.exportarExcel);

router.get("/detalle", authAdmin, controller.detalleEstudiante);

module.exports = router;
