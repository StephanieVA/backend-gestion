const db = require("../config/db");

exports.byCiclo = async (req, res) => {
  try {
    console.log("Entró a byCiclo");

    const { ciclo } = req.query;

    console.log("Ciclo recibido:", ciclo);

    if (!ciclo) {
      return res.status(400).json({
        mensaje: "Falta parametro ciclo",
      });
    }

    const sql = `
      SELECT id, nombre, ciclo
      FROM cursos
      WHERE ciclo = ?
      ORDER BY id ASC
    `;

    console.log("Ejecutando consulta");

    const [rows] = await db.query(sql, [ciclo]);

    console.log("Resultado:", rows.length);

    return res.json({
      ciclo,
      cursos: rows,
    });
  } catch (error) {
    console.log("ERROR:", error);

    return res.status(500).json({
      mensaje: error.message,
    });
  }
};
