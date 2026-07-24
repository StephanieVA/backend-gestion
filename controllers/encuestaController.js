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
  try {
    const { semestre } = req.params;

    const [rows] = await db.query(
      `SELECT id, nombre
       FROM cursos
       WHERE ciclo = ?
       ORDER BY id`,
      [semestre]
    );

    res.json(rows);

  } catch (error) {
    console.error("Error al obtener cursos:", error);
    res.status(500).json({
      mensaje: "Error al obtener los cursos."
    });
  }
};

// Registrar encuesta
exports.registrarEncuesta = async (req, res) => {

};


exports.guardarEncuesta = async (req, res) => {


const connection = await db.getConnection();


try {


await connection.beginTransaction();



const {
persona,
respuestas
} = req.body;



// 1. Guardar estudiante

await connection.query(

`
INSERT INTO estudiantes_encuesta
(
dni,
apellidos_nombres,
edad,
sexo,
semestre,
seccion
)
VALUES (?,?,?,?,?,?)

`,

[

persona.dni,
persona.apellidos_nombres,
persona.edad,
persona.sexo,
persona.semestre,
persona.seccion

]

);




// 2. Crear encuesta

const [encuesta] = await connection.query(

`
INSERT INTO encuesta_tutoria
(
dni
)
VALUES (?)

`,

[
persona.dni
]

);
const idEncuesta = encuesta.insertId;
// 3. Guardar respuestas
for(const r of respuestas){
await connection.query(
`
INSERT INTO encuesta_tutoria_respuestas
(
id_encuesta,
id_curso,
recibio,
tipo,
modalidad
)
VALUES (?,?,?,?,?)

`,

[

idEncuesta,
r.idCurso,
r.recibio,
r.tipo,
r.modalidad
]
);}
await connection.commit();
res.json({
mensaje:"Encuesta guardada correctamente"
});
}
catch(error){
await connection.rollback();
console.log(error);
res.status(500).json({
mensaje:"Error al guardar encuesta",
error:error.message
});
}
finally{
connection.release();
}
};
