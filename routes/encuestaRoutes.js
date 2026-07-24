const express = require("express");
const router = express.Router();

const encuestaController = require("../controllers/encuestaController");

// Validar si el DNI ya existe
router.get("/validar-dni/:dni", encuestaController.validarDni);

// Obtener cursos por semestre
router.get("/cursos/:semestre", encuestaController.obtenerCursos);

// Registrar encuesta completa
router.post("/registrar", encuestaController.registrarEncuesta);

router.post("/guardar", encuestaController.guardarEncuesta);

module.exports = router;
