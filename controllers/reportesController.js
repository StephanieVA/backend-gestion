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
dia,
SUM(horas) totalHoras

FROM respuestas

${ciclo ? "WHERE semestre=?" : ""}

GROUP BY

name_estudiante,
semestre,
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
`${r.nombres}-${r.semestre}`;


if(!mapaResumen.has(key)){


mapaResumen.set(key,{

estudiante:r.nombres,

semestre:r.semestre,

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

