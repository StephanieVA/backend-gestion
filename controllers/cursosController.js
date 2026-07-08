const db = require("../config/db");

// GET /api/cursos/by-ciclo?ciclo=I%20ciclo
// Retorna: [{ id, nombre, ciclo }]
exports.byCiclo = async (req, res) => {
  try {
    const { ciclo } = req.query;

    if (!ciclo) {
      return res.status(400).json({ mensaje: "Falta parametro ciclo" });
    }

    const sql = `
      SELECT id, nombre, ciclo
      FROM cursos
      WHERE ciclo = ?
      ORDER BY id ASC
    `;

    const [rows] = await db.query(sql, [ciclo]);

    res.json({ ciclo, cursos: rows });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
