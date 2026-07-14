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
SELECT DISTINCT
TRIM(name_estudiante) AS nombre,
semestre,
estado,
encuesta_id,
dni
FROM respuestas
${ciclo ? "WHERE semestre=?" : ""}
)x
`;
    let paramsTotal = [];
    if (ciclo) paramsTotal.push(ciclo);
    const [[totalRow]] = await db.query(sqlTotal, paramsTotal);
    const totalEstudiantes = Number(totalRow.total || 0);
    const totalPaginas = Math.ceil(totalEstudiantes / limite) || 1;
    // ESTUDIANTES
   let sqlEstudiantes = `
SELECT DISTINCT
TRIM(name_estudiante) AS nombres,
semestre,
estado,
encuesta_id,
dni
FROM respuestas
${ciclo ? "WHERE semestre=?" : ""}
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
estado,
encuesta_id,
dni,
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
estado,
encuesta_id,
dni,
dia
`;
    let paramsHoras = [];
    if (ciclo) paramsHoras.push(ciclo);
    const [rowsHoras] = await db.query(sqlHoras, paramsHoras);
    const mapa = new Map();
    estudiantesRows.forEach((e) => {
     mapa.set(
 `${e.nombres}-${e.semestre}-${e.encuesta_id || 'SIN_ID'}`,
 {
   nombres: e.nombres,
   semestre: e.semestre,
   estado: e.estado || "PENDIENTE",
   encuesta_id: e.encuesta_id || null,
   dni: e.dni || null,
   reporte1: reporteVacio(),
   reporte2: reporteVacio(),
   reporteFinal: reporteVacio(),
 },
);
    });

    rowsHoras.forEach((r) => {
      const est = mapa.get(
 `${r.name_estudiante}-${r.semestre}-${r.encuesta_id || 'SIN_ID'}`
);
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
exports.exportarExcel = async (req, res) => {
try {
const ciclo = (req.query.ciclo || "").trim();
// =================================
// HOJA 1 - RESUMEN ESTUDIANTES
// =================================
let sqlResumen = `
SELECT
name_estudiante nombres,
semestre,
estado,
encuesta_id,
dni,
dia,
SUM(horas) totalHoras
FROM respuestas
${ciclo ? "WHERE semestre=?" : ""}
GROUP BY
name_estudiante,
semestre,
estado,
encuesta_id,
dni,
dia
ORDER BY name_estudiante
`;
let paramsResumen=[];
if(ciclo){
 paramsResumen.push(ciclo);
}
const [rowsResumen] = await db.query(
 sqlResumen,
 paramsResumen
);
// =================================
// HOJA 2 - DETALLE ACTIVIDADES
// =================================
let sqlDetalle = `
SELECT
name_estudiante nombres,
semestre,
seccion,
categoria,
actividad,
dia,
SUM(horas) totalHoras
FROM respuestas
${ciclo ? "WHERE semestre=?" : ""}
GROUP BY
name_estudiante,
semestre,
seccion,
categoria,
actividad,
dia
ORDER BY
name_estudiante,
seccion,
actividad
`;
let paramsDetalle=[];
if(ciclo){
 paramsDetalle.push(ciclo);
}
const [rowsDetalle] = await db.query(
 sqlDetalle,
 paramsDetalle
);
// =================================
// HOJA 3 - DATOS COMPLETOS
// =================================
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
let paramsCompleto=[];
if(ciclo){
 paramsCompleto.push(ciclo);
}
const [rowsCompleto] = await db.query(
 sqlCompleto,
 paramsCompleto
);
const workbook = new ExcelJS.Workbook();
// =================================
// CREAR HOJA 1
// =================================
const hoja1 = workbook.addWorksheet(
"Resumen estudiantes"
);
hoja1.columns=[
{
header:"Estudiante",
key:"estudiante",
width:35
},

{
header:"Semestre",
key:"semestre",
width:12
},
  {
header:"Estado",
key:"estado",
width:15
},

{
header:"Encuesta ID",
key:"encuesta_id",
width:20
},
  {
header:"DNI",
key:"dni",
width:15
},

{
header:"Lunes",
key:"Lunes"
},

{
header:"Martes",
key:"Martes"
},

{
header:"Miércoles",
key:"Miércoles"
},

{
header:"Jueves",
key:"Jueves"
},

{
header:"Viernes",
key:"Viernes"
},

{
header:"Sábado",
key:"Sábado"
},

{
header:"Domingo",
key:"Domingo"
},

{
header:"Total",
key:"Total"
}

];
const mapaResumen = new Map();
rowsResumen.forEach(r=>{
const key =
`${r.nombres}-${r.semestre}-${r.encuesta_id || 'SIN_ID'}`;
if(!mapaResumen.has(key)){
mapaResumen.set(key,{
estudiante:r.nombres,
semestre:r.semestre,
estado:r.estado,
encuesta_id:r.encuesta_id,
Lunes:0,
Martes:0,
Miércoles:0,
Jueves:0,
Viernes:0,
Sábado:0,
Domingo:0,
Total:0
});
}
const obj = mapaResumen.get(key);
if(DIAS.includes(r.dia)){
obj[r.dia]+=Number(r.totalHoras)||0;
}
});
mapaResumen.forEach(obj=>{
obj.Total =
obj.Lunes+
obj.Martes+
obj.Miércoles+
obj.Jueves+
obj.Viernes+
obj.Sábado+
obj.Domingo;
hoja1.addRow(obj);
});
// =================================
// CREAR HOJA 2
// =================================
const hoja2 = workbook.addWorksheet(
"Detalle actividades"
);
hoja2.columns=[
{
header:"Estudiante",
key:"estudiante",
width:35
},

{
header:"Semestre",
key:"semestre",
width:10
},

{
header:"Pregunta",
key:"seccion"
},

{
header:"Categoría",
key:"categoria",
width:35
},

{
header:"Actividad",
key:"actividad",
width:35
},

{
header:"Día",
key:"dia"
},

{
header:"Horas",
key:"horas"
}

];
rowsDetalle.forEach(r=>{
hoja2.addRow({
estudiante:r.nombres,
semestre:r.semestre,
seccion:r.seccion,
categoria:r.categoria,
actividad:r.actividad,
dia:r.dia,
horas:r.totalHoras
});
});

// =================================
// CREAR HOJA 3
// =================================
const hoja3 = workbook.addWorksheet(
"Datos completos"
);
hoja3.columns=[
{
header:"ID",
key:"id",
width:10
},

{
header:"Estudiante ID",
key:"estudiante_id",
width:15
},

{
header:"Estudiante",
key:"name_estudiante",
width:35
},

{
header:"Semestre",
key:"semestre",
width:12
},

{
header:"Pregunta",
key:"seccion",
width:10
},

{
header:"Categoría",
key:"categoria",
width:35
},

{
header:"Actividad",
key:"actividad",
width:35
},

{
header:"Día",
key:"dia",
width:15
},

{
header:"Horas",
key:"horas",
width:10
}
];
rowsCompleto.forEach(r=>{
hoja3.addRow(r);
});
// ENCABEZADOS EN NEGRITA
hoja1.getRow(1).font={
bold:true
};
hoja2.getRow(1).font={
bold:true
};
hoja3.getRow(1).font={
bold:true
};
res.setHeader(
"Content-Type",
"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
);
res.setHeader(
"Content-Disposition",
`attachment; filename="reportes.xlsx"`
);
await workbook.xlsx.write(res);
res.end();
}
catch(error){
console.log(error);
res.status(500).json({
mensaje:error.message
});
}

};// =====================================================
// DETALLE PARA MODAL
// =====================================================
// =====================================================
// DETALLE PARA MODAL
// =====================================================

exports.detalleEstudiante = async (req,res)=>{

try{


const {
nombre,
semestre,
encuesta_id
}=req.query;



let sql = `

SELECT
id,
seccion,
categoria,
actividad,
dia,
horas

FROM respuestas

WHERE 
name_estudiante=?
AND semestre=?

`;
let params=[
nombre,
semestre
];
if(encuesta_id && encuesta_id !== "null"){
sql += `
AND encuesta_id=?
`;
params.push(encuesta_id);
}
sql += `
ORDER BY
seccion,
actividad,
dia
`;
const [rows]=await db.query(
sql,
params
);
res.json(rows);
}catch(error){
console.log("ERROR DETALLE:");
console.log(error.message);
res.status(500).json({
mensaje:error.message

});


}


};
// =====================================================
// VALIDAR RESPUESTAS DE ESTUDIANTE
// =====================================================

exports.validarRespuesta = async (req,res)=>{
try{
const {
nombre,
semestre
}=req.body;
// generar identificador único
const encuesta_id =
"ENC-" +
Date.now();
// actualizar respuestas
await db.query(
`
UPDATE respuestas
SET
encuesta_id=?,
estado='VALIDADO'
WHERE
name_estudiante=?
AND semestre=?
AND estado='PENDIENTE'
`,
[
encuesta_id,
nombre,
semestre
]
);
res.json({
mensaje:"Registro validado",
encuesta_id
});
}
catch(error){
console.log(error);
res.status(500).json({
mensaje:error.message
});
}

};
// =====================================================
// ELIMINAR REGISTRO COMPLETO
// =====================================================

exports.eliminarRespuesta = async(req,res)=>{
try{
const {
encuesta_id
}=req.body;
await db.query(
`
DELETE FROM respuestas
WHERE encuesta_id=?
`,
[
encuesta_id
]
);
res.json({
mensaje:"Registro eliminado correctamente"
});
}catch(error){
console.log(error);
res.status(500).json({
mensaje:error.message
});
}
};
// =====================================================
// VALIDAR ESTUDIANTE
// =====================================================

exports.validarEstudiante = async (req,res)=>{

try{
const {nombre, semestre}=req.body;
// generar un identificador único
const encuesta_id = Date.now();
// actualizar todas las respuestas del estudiante
await db.query(
`
UPDATE respuestas
SET 
encuesta_id=?,
estado='VALIDADO'
WHERE 
name_estudiante=?
AND semestre=?
`,
[
encuesta_id,
nombre,
semestre
]
);
res.json({
mensaje:"Estudiante validado",
encuesta_id
});
}catch(error){
console.log(error);
res.status(500).json({
mensaje:error.message
});
}
};
// =====================================================
// EDITAR DATOS DEL ESTUDIANTE
// =====================================================

exports.editarEstudiante = async(req,res)=>{
try{
const {
encuesta_id,
dni
}=req.body;
await db.query(
`
UPDATE respuestas
SET dni=?
WHERE encuesta_id=?
`,
[
dni,
encuesta_id
]
);
res.json({
mensaje:"Datos actualizados"
});
}catch(error){
console.log(error);
res.status(500).json({
mensaje:error.message

});
}
};
