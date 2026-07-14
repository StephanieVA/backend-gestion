const db = require("../config/db");
exports.guardar = async (req, res) => {
  try {
    const respuestas = req.body;
    console.log(
      "Cantidad de respuestas recibidas:",
      respuestas.length
    );
    const valores = respuestas.map((r)=>[
      r.estudiante_id && Number(r.estudiante_id)!==0
        ? r.estudiante_id
        : null,
      r.name_estudiante || null,
      r.dni || null,
      r.encuesta_id || null,
      r.estado || "PENDIENTE",
      r.seccion,
      r.categoria,
      r.actividad,
      r.dia,
      r.horas,
      r.semestre || null
    ]);
    await db.query(
`
INSERT INTO respuestas
(
 estudiante_id,
 name_estudiante,
 dni,
 encuesta_id,
 estado,
 seccion,
 categoria,
 actividad,
 dia,
 horas,
 semestre
)
VALUES ?
`,
[valores]
);
    res.json({
      mensaje:"Guardado",
      registros:respuestas.length
    });
  } catch(error){
    console.log("ERROR MYSQL:");
    console.log(error.message);
    res.status(500).json({
      mensaje:error.message
    });
  }
};
