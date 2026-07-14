const express = require("express");
const router = express.Router();
const controller = require("../controllers/reportesController");
const authAdmin = require("../middleware/authAdmin");

router.get(
  "/por-ciclo",
  authAdmin,
  controller.reportePorCiclo
);

router.get(
  "/exportar-excel",
  authAdmin,
  controller.exportarExcel
);

// CAMBIAR ESTA PARTE
router.get(
  "/detalle-estudiante",
  controller.detalleEstudiante
);
router.post(
"/validar",
reportesController.validarRespuesta
);

module.exports = router;
