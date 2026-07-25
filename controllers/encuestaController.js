const db = require("../config/db");
const ExcelJS = require("exceljs");

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
exports.exportarExcel = async (req, res) => {

  try {

    const [datos] = await db.query(`
      SELECT
          et.id AS id_encuesta,
          et.dni,
          ee.apellidos_nombres,
          ee.edad,
          ee.sexo,
          ee.semestre,
          ee.seccion,
          c.nombre AS curso,
          etr.recibio,
          etr.tipo,
          etr.modalidad,
          et.fecha

      FROM encuesta_tutoria et

      INNER JOIN estudiantes_encuesta ee
          ON ee.dni = et.dni

      INNER JOIN encuesta_tutoria_respuestas etr
          ON etr.id_encuesta = et.id

      INNER JOIN cursos c
          ON c.id = etr.id_curso

      ORDER BY et.id DESC
    `);

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(
      "Encuesta Tutoría"
    );
    worksheet.columns = [
      {
        header: "ID",
        key: "id_encuesta",
        width: 10
      },
      {
        header: "DNI",
        key: "dni",
        width: 15
      },
      {
        header: "Apellidos y nombres",
        key: "apellidos_nombres",
        width: 40
      },
      {
        header: "Edad",
        key: "edad",
        width: 10
      },
      {
        header: "Sexo",
        key: "sexo",
        width: 15
      },

      {
        header: "Semestre",
        key: "semestre",
        width: 12
      },
      {
        header: "Sección",
        key: "seccion",
        width: 12
      },
      {
        header: "Curso",
        key: "curso",
        width: 45
      },

      {        header: "Recibió Tutoría",
        key: "recibio",
        width: 18
      },
      {
        header: "Tipo",
        key: "tipo",
        width: 18
      },

      {
        header: "Modalidad",
        key: "modalidad",
        width: 18
      },
      {
        header: "Fecha",
        key: "fecha",
        width: 22
      }
    ];
    worksheet.getRow(1).font = {
      bold: true,
      color: {
        argb: "FFFFFFFF"
      }
    };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "1F4E78"
      }
    };
    worksheet.getRow(1).alignment = {
      horizontal: "center",
      vertical: "middle"
    };
    datos.forEach(registro => {
      worksheet.addRow(registro);
    });
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: {
            style: "thin"
          },
          left: {
            style: "thin"
          },
          bottom: {
            style: "thin"
          },
          right: {
            style: "thin"
          }
        };
      });
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Reporte_Encuesta_Tutoria.xlsx"'
    );
    await workbook.xlsx.write(res);
    res.end();
  }
  catch (error) {
    console.log(error);
    res.status(500).json({
      mensaje: "Error al exportar Excel"
    });
  }
};
