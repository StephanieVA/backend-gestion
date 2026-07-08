const jwt = require("jsonwebtoken");
const db = require("../config/db");

// Middleware: solo admin (codigo === '2026002')
// Espera Authorization: Bearer <token>
module.exports = async function authAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ mensaje: "Falta token" });
    }

    const token = auth.slice("Bearer ".length);

    let payload;
    try {
      payload = jwt.verify(token, "mi_clave_secreta");
    } catch (e) {
      return res.status(401).json({ mensaje: "Token inválido" });
    }

    const userId = payload?.id;
    if (!userId) {
      return res.status(401).json({ mensaje: "Token inválido" });
    }

    const [rows] = await db.query(
      `SELECT codigo FROM estudiantes WHERE id = ?`,
      [userId],
    );

    if (!rows.length) {
      return res.status(401).json({ mensaje: "Usuario no encontrado" });
    }

    const codigo = String(rows[0].codigo);

    if (codigo !== "2026002") {
      return res.status(403).json({ mensaje: "No autorizado" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ mensaje: err.message });
  }
};
