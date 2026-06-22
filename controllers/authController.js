const db = require("../config/db");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { codigo, password } = req.body;

    const [rows] = await db.query(
      `
SELECT *
FROM estudiantes
WHERE codigo=?
`,

      [codigo],
    );

    if (rows.length === 0) {
      return res.status(401).json({
        mensaje: "Usuario no encontrado",
      });
    }

    const usuario = rows[0];

    const valido = password === usuario.password;

    if (!valido) {
      return res.status(401).json({
        mensaje: "Contraseña incorrecta",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
      },

      "mi_clave_secreta",

      {
        expiresIn: "1d",
      },
    );

    res.json({
      mensaje: "Login correcto",

      token,

      usuario: {
        id: usuario.id,
        codigo: usuario.codigo,
        nombres: usuario.nombres,
        edad: usuario.edad,
        sexo: usuario.sexo,
        semestre: usuario.semestre,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      mensaje: error.message,
    });
  }
};
