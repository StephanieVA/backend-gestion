const db = require("../config/db");

exports.guardar = async (req, res) => {
  try {
    console.log("BODY RECIBIDO");

    console.log(JSON.stringify(req.body, null, 2));

    const respuestas = req.body;

    for (const r of respuestas) {
      await db.query(
        `
INSERT INTO respuestas(

estudiante_id,
seccion,
categoria,
actividad,
dia,
horas

)

VALUES(

?,?,?,?,?,?

)

`,

        [r.estudiante_id, r.seccion, r.categoria, r.actividad, r.dia, r.horas],
      );
    }

    res.json({
      mensaje: "Guardado",
    });
  } catch (error) {
    console.log("ERROR MYSQL");

    console.log(error);

    res.status(500).json({
      mensaje: error.message,
    });
  }
};
