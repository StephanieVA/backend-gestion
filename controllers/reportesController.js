const ExcelJS = require("exceljs");
const db = require("../config/db");

const DIAS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function reporteVacio() {
  return {
    Lunes: 0,
    Martes: 0,
    Miércoles: 0,
    Jueves: 0,
    Viernes: 0,
    Sábado: 0,
    Domingo: 0,
  };
}

// =====================================================
// LISTADO PAGINADO DE ESTUDIANTES
// =====================================================

exports.reportePorCiclo = async (req, res) => {
  try {
    const ciclo = (req.query.ciclo || "").trim();

    const pagina = Math.max(1, Number(req.query.page || 1));

    const limite = Math.max(1, Number(req.query.limit || 10));

    const offset = (pagina - 1) * limite;

    // TOTAL ESTUDIANTES

    let sqlTotal = `

SELECT COUNT(*) total

FROM (

SELECT

name_estudiante,
semestre

FROM respuestas


${ciclo ? "WHERE semestre=?" : ""}


GROUP BY

name_estudiante,
semestre


)x

`;

    let paramsTotal = [];

    if (ciclo) paramsTotal.push(ciclo);

    const [[totalRow]] = await db.query(sqlTotal, paramsTotal);

    const totalEstudiantes = Number(totalRow.total || 0);

    const totalPaginas = Math.ceil(totalEstudiantes / limite) || 1;

    // ESTUDIANTES

    let sqlEstudiantes = `

SELECT

MAX(name_estudiante) nombres,

semestre


FROM respuestas


${ciclo ? "WHERE semestre=?" : ""}


GROUP BY

name_estudiante,
semestre


ORDER BY nombres


LIMIT ? OFFSET ?

`;

    let paramsEstudiantes = [];

    if (ciclo) paramsEstudiantes.push(ciclo);

    paramsEstudiantes.push(limite);

    paramsEstudiantes.push(offset);

    const [estudiantesRows] = await db.query(sqlEstudiantes, paramsEstudiantes);

    // DATOS HORAS

    let sqlHoras = `

SELECT


name_estudiante,

semestre,

dia,


SUM(

CASE

WHEN seccion IN (1,2)

THEN horas

ELSE 0

END

) reporte1,


SUM(

CASE

WHEN seccion IN (3,4,5)

THEN horas

ELSE 0

END

) reporte2,


SUM(horas) reporteFinal



FROM respuestas


${ciclo ? "WHERE semestre=?" : ""}


GROUP BY

name_estudiante,

semestre,

dia


`;

    let paramsHoras = [];

    if (ciclo) paramsHoras.push(ciclo);

    const [rowsHoras] = await db.query(sqlHoras, paramsHoras);

    const mapa = new Map();

    estudiantesRows.forEach((e) => {
      mapa.set(
        `${e.nombres}-${e.semestre}`,

        {
          nombres: e.nombres,

          semestre: e.semestre,

          reporte1: reporteVacio(),

          reporte2: reporteVacio(),

          reporteFinal: reporteVacio(),
        },
      );
    });

    rowsHoras.forEach((r) => {
      const est = mapa.get(`${r.name_estudiante}-${r.semestre}`);

      if (!est) return;

      if (!DIAS.includes(r.dia)) return;

      est.reporte1[r.dia] += Number(r.reporte1) || 0;

      est.reporte2[r.dia] += Number(r.reporte2) || 0;

      est.reporteFinal[r.dia] += Number(r.reporteFinal) || 0;
    });

    res.json({
      pagina,

      totalPaginas,

      totalEstudiantes,

      estudiantes: Array.from(mapa.values()),

      dias: DIAS,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      mensaje: error.message,
    });
  }
};

// =====================================================
// EXPORTAR EXCEL
// =====================================================

exports.exportarExcel = async (req, res) => {
  try {
    const ciclo = (req.query.ciclo || "").trim();

    // =====================
    // HOJA 1
    // =====================

    let sqlResumen = `

SELECT


name_estudiante nombres,

semestre,

dia,

SUM(horas) totalHoras


FROM respuestas


${ciclo ? "WHERE semestre=?" : ""}


GROUP BY

name_estudiante,

semestre,

dia


ORDER BY nombres


`;

    let paramsResumen = [];

    if (ciclo) paramsResumen.push(ciclo);

    const [rowsResumen] = await db.query(sqlResumen, paramsResumen);

    // =====================
    // HOJA 2
    // =====================

    let sqlDetalle = `

SELECT


name_estudiante nombres,

semestre,

seccion,

actividad,

dia,

SUM(horas) totalHoras


FROM respuestas


${ciclo ? "WHERE semestre=?" : ""}



GROUP BY

name_estudiante,

semestre,

seccion,

actividad,

dia


ORDER BY

name_estudiante,

seccion,

actividad


`;

    let paramsDetalle = [];

    if (ciclo) paramsDetalle.push(ciclo);

    const [rowsDetalle] = await db.query(sqlDetalle, paramsDetalle);

    const workbook = new ExcelJS.Workbook();

    // ----------------
    // HOJA 1
    // ----------------

    const hoja1 = workbook.addWorksheet("Resumen estudiantes");

    hoja1.columns = [
      {
        header: "Estudiante",
        key: "estudiante",
        width: 35,
      },

      {
        header: "Semestre",
        key: "semestre",
        width: 12,
      },

      {
        header: "Lunes",
        key: "Lunes",
      },

      {
        header: "Martes",
        key: "Martes",
      },

      {
        header: "Miércoles",
        key: "Miércoles",
      },

      {
        header: "Jueves",
        key: "Jueves",
      },

      {
        header: "Viernes",
        key: "Viernes",
      },

      {
        header: "Sábado",
        key: "Sábado",
      },

      {
        header: "Domingo",
        key: "Domingo",
      },

      {
        header: "Total",
        key: "Total",
      },
    ];

    const mapaResumen = new Map();

    rowsResumen.forEach((r) => {
      const key = `${r.nombres}-${r.semestre}`;

      if (!mapaResumen.has(key)) {
        mapaResumen.set(key, {
          estudiante: r.nombres,

          semestre: r.semestre,

          Lunes: 0,
          Martes: 0,
          Miércoles: 0,
          Jueves: 0,
          Viernes: 0,
          Sábado: 0,
          Domingo: 0,

          Total: 0,
        });
      }

      const obj = mapaResumen.get(key);

      if (DIAS.includes(r.dia)) {
        obj[r.dia] += Number(r.totalHoras) || 0;
      }
    });

    mapaResumen.forEach((obj) => {
      obj.Total =
        obj.Lunes +
        obj.Martes +
        obj.Miércoles +
        obj.Jueves +
        obj.Viernes +
        obj.Sábado +
        obj.Domingo;

      hoja1.addRow(obj);
    });

    // ----------------
    // HOJA 2
    // ----------------

    const hoja2 = workbook.addWorksheet("Detalle actividades");

    hoja2.columns = [
      {
        header: "Estudiante",
        key: "estudiante",
        width: 35,
      },

      {
        header: "Semestre",
        key: "semestre",
        width: 12,
      },

      {
        header: "Pregunta",
        key: "seccion",
        width: 10,
      },

      {
        header: "Actividad",
        key: "actividad",
        width: 40,
      },

      {
        header: "Lunes",
        key: "Lunes",
      },

      {
        header: "Martes",
        key: "Martes",
      },

      {
        header: "Miércoles",
        key: "Miércoles",
      },

      {
        header: "Jueves",
        key: "Jueves",
      },

      {
        header: "Viernes",
        key: "Viernes",
      },

      {
        header: "Sábado",
        key: "Sábado",
      },

      {
        header: "Domingo",
        key: "Domingo",
      },

      {
        header: "Total",
        key: "Total",
      },
    ];
    // =====================
// HOJA 3: DATOS COMPLETOS
// =====================

let sqlCompleto = `

SELECT

id,
estudiante_id,
name_estudiante,
semestre,
seccion,
categoria,
actividad,
dia,
horas

FROM respuestas


${ciclo ? "WHERE semestre=?" : ""}


ORDER BY

name_estudiante,
seccion,
actividad,
dia


`;


let paramsCompleto = [];

if(ciclo){
  paramsCompleto.push(ciclo);
}


const [rowsCompleto] = await db.query(
  sqlCompleto,
  paramsCompleto
);

    const mapaDetalle = new Map();

    rowsDetalle.forEach((r) => {
      const key = `${r.nombres}-${r.semestre}-${r.seccion}-${r.actividad}`;

      if (!mapaDetalle.has(key)) {
        mapaDetalle.set(key, {
          estudiante: r.nombres,

          semestre: r.semestre,

          seccion: r.seccion,

          actividad: r.actividad,

          Lunes: 0,
          Martes: 0,
          Miércoles: 0,
          Jueves: 0,
          Viernes: 0,
          Sábado: 0,
          Domingo: 0,

          Total: 0,
        });
      }

      const obj = mapaDetalle.get(key);

      if (DIAS.includes(r.dia)) {
        obj[r.dia] += Number(r.totalHoras) || 0;
      }
    });

    mapaDetalle.forEach((obj) => {
      obj.Total =
        obj.Lunes +
        obj.Martes +
        obj.Miércoles +
        obj.Jueves +
        obj.Viernes +
        obj.Sábado +
        obj.Domingo;

      hoja2.addRow(obj);
    });

    hoja1.getRow(1).font = { bold: true };

    hoja2.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reportes.xlsx"`,
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.log(error);

    res.status(500).json({
      mensaje: error.message,
    });
  }
};

// =====================================================
// DETALLE PARA MODAL
// =====================================================

exports.detalleEstudiante = async (req,res)=>{

try{

const nombre = req.query.nombre;
const semestre = req.query.semestre;


const [rows] = await db.query(
`

SELECT

seccion,
categoria,
actividad,
dia,
horas

FROM respuestas

WHERE 
name_estudiante = ?

AND semestre = ?

ORDER BY
seccion,
actividad,
dia

`,
[
nombre,
semestre
]
);


res.json(rows);


}catch(error){

console.log(error);

res.status(500).json({
mensaje:error.message
});

}

};

