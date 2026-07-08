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
  name_estudiante,
  seccion,
  categoria,
  actividad,
  dia,
  horas,
  semestre
)
VALUES(
  ?,?,?,?,?,?,?,?
)
`,

        [
          r.estudiante_id && Number(r.estudiante_id) !== 0
            ? r.estudiante_id
            : null,
          r.name_estudiante || null,
          r.seccion,
          r.categoria,
          r.actividad,
          r.dia,
          r.horas,
          r.semestre || null,
        ],
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
