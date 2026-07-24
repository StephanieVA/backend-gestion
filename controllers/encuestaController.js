const db = require("../config/db");

// Validar DNI
exports.validarDni = async (req, res) => {
  try {
    const { dni } = req.params;

    const [rows] = await db.query(
      "SELECT dni FROM estudiantes_encuesta WHERE dni = ?",
      [dni]
    );

    if (rows.length > 0) {
      return res.json({
        existe: true,
        mensaje: "El DNI ya se encuentra registrado."
      });
    }

    return res.json({
      existe: false,
      mensaje: "DNI disponible."
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Error al validar el DNI."
    });
  }
};

// Obtener cursos
exports.obtenerCursos = async (req, res) => {

};

// Registrar encuesta
exports.registrarEncuesta = async (req, res) => {

};
