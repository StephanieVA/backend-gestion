const db = require("../config/db");

// Validar DNI
exports.validarDni = (req, res) => {
    res.json({
        mensaje: "Ruta funcionando",
        dni: req.params.dni
    });
};

// Obtener cursos
exports.obtenerCursos = async (req, res) => {

};

// Registrar encuesta
exports.registrarEncuesta = async (req, res) => {

};
