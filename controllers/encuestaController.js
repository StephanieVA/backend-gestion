const db = require("../config/db");

// Validar DNI
exports.validarDni = async (req, res) => {

    console.log("Entró a validar DNI");

    const { dni } = req.params;

    console.log("DNI:", dni);

    const [rows] = await db.query(
        "SELECT * FROM estudiantes_encuesta WHERE dni=?",
        [dni]
    );

    console.log(rows);

    res.json(rows);
};

// Obtener cursos
exports.obtenerCursos = async (req, res) => {

};

// Registrar encuesta
exports.registrarEncuesta = async (req, res) => {

};
