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

exports.reportePorCiclo = async (req, res) => {
  try {
    const ciclo = (req.query.ciclo || "").trim();
    const pagina = Math.max(1, Number(req.query.page || 1));
    const limite = Math.max(1, Number(req.query.limit || 1));
    const offset = (pagina - 1) * limite;

    // Total de estudiantes (sin usar tabla estudiantes)
    // Se cuenta por estudiante_id presente en respuestas (agregando por estudiante_id).
    let sqlTotal = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT r.estudiante_id
        FROM respuestas r
        ${ciclo ? "WHERE r.semestre = ?" : ""}
        GROUP BY r.estudiante_id
      ) x
    `;

    const paramsTotal = [];
    if (ciclo) paramsTotal.push(ciclo);

    const [[totalRow]] = await db.query(sqlTotal, paramsTotal);
    const totalEstudiantes = Number(totalRow?.total || 0);
    const totalPaginas = Math.ceil(totalEstudiantes / limite) || 1;

    // Estudiantes paginados (1 por página cuando limit=1)
    // Nombres desde respuestas.name_estudiante
    let sqlEstudiantes = `
      SELECT
        r.estudiante_id,
        MAX(r.name_estudiante) AS nombres
      FROM respuestas r
      ${ciclo ? "WHERE r.semestre = ?" : ""}
      GROUP BY r.estudiante_id
      ORDER BY nombres
      LIMIT ? OFFSET ?
    `;

    const paramsEstudiantes = [];
    if (ciclo) paramsEstudiantes.push(ciclo);
    paramsEstudiantes.push(limite);
    paramsEstudiantes.push(offset);

    const [estudiantesRows] = await db.query(sqlEstudiantes, paramsEstudiantes);

    if (!estudiantesRows.length) {
      return res.json({
        pagina,
        totalPaginas,
        totalEstudiantes,
        estudiantes: [],
        dias: DIAS,
      });
    }

    const estudianteIds = estudiantesRows.map((e) => e.estudiante_id);

    // Agregación en una sola consulta (evita N+1)
    // Reporte1: secciones 1 y 2
    // Reporte2: secciones 3,4,5
    // ReporteFinal: secciones 1..5
    const placeholders = estudianteIds.map(() => "?").join(",");

    let sqlAgg = `
      SELECT
        r.estudiante_id,
        r.dia,
        SUM(CASE WHEN r.seccion IN (1,2) THEN r.horas ELSE 0 END) AS reporte1,
        SUM(CASE WHEN r.seccion IN (3,4,5) THEN r.horas ELSE 0 END) AS reporte2,
        SUM(CASE WHEN r.seccion IN (1,2,3,4,5) THEN r.horas ELSE 0 END) AS reporteFinal
      FROM respuestas r
      WHERE r.estudiante_id IN (${placeholders})
      ${ciclo ? "AND r.semestre = ?" : ""}
      GROUP BY r.estudiante_id, r.dia
    `;

    const paramsAgg = [...estudianteIds];
    if (ciclo) paramsAgg.push(ciclo);

    const [rowsAgg] = await db.query(sqlAgg, paramsAgg);

    const mapa = new Map();
    for (const est of estudiantesRows) {
      mapa.set(est.estudiante_id, {
        estudiante_id: est.estudiante_id,
        nombres: est.nombres,
        reporte1: reporteVacio(),
        reporte2: reporteVacio(),
        reporteFinal: reporteVacio(),
      });
    }

    for (const r of rowsAgg) {
      const est = mapa.get(r.estudiante_id);
      if (!est) continue;
      if (!DIAS.includes(r.dia)) continue;

      est.reporte1[r.dia] += Number(r.reporte1) || 0;
      est.reporte2[r.dia] += Number(r.reporte2) || 0;
      est.reporteFinal[r.dia] += Number(r.reporteFinal) || 0;
    }

    return res.json({
      pagina,
      totalPaginas,
      totalEstudiantes,
      estudiantes: Array.from(mapa.values()),
      dias: DIAS,
    });
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

exports.exportarExcel = async (req, res) => {
  try {
    const ciclo = (req.query.ciclo || "").trim();

    // Hoja 1: Resumen por estudiante (sumatoria total por día considerando secciones 1..5)
    let sqlResumen = `
      SELECT
        r.estudiante_id,
        MAX(r.name_estudiante) AS nombres,
        r.dia,
        SUM(r.horas) AS totalHoras
      FROM respuestas r
      ${ciclo ? "WHERE r.semestre = ?" : ""}
      GROUP BY r.estudiante_id, r.dia
      ORDER BY nombres
    `;

    const paramsResumen = [];
    if (ciclo) paramsResumen.push(ciclo);

    const [rowsResumen] = await db.query(sqlResumen, paramsResumen);

    // Hoja 2: Detalle por actividad
    // Agrupar por: name_estudiante + actividad + dia
    let sqlDetalle = `
      SELECT
        r.name_estudiante AS nombres,
        r.actividad,
        r.dia,
        SUM(r.horas) AS totalHoras
      FROM respuestas r
      ${ciclo ? "WHERE r.semestre = ?" : ""}
      GROUP BY r.name_estudiante, r.actividad, r.dia
      ORDER BY r.name_estudiante, r.actividad
    `;

    const paramsDetalle = [];
    if (ciclo) paramsDetalle.push(ciclo);

    const [rowsDetalle] = await db.query(sqlDetalle, paramsDetalle);

    const workbook = new ExcelJS.Workbook();

    // HOJA 1
    const hoja1 = workbook.addWorksheet("Resumen por estudiante");
    hoja1.columns = [
      { header: "Estudiante", key: "estudiante", width: 30 },
      { header: "Lunes", key: "Lunes", width: 12 },
      { header: "Martes", key: "Martes", width: 12 },
      { header: "Miércoles", key: "Miércoles", width: 12 },
      { header: "Jueves", key: "Jueves", width: 12 },
      { header: "Viernes", key: "Viernes", width: 12 },
      { header: "Sábado", key: "Sábado", width: 12 },
      { header: "Domingo", key: "Domingo", width: 12 },
      { header: "Total", key: "Total", width: 14 },
    ];

    const mapaResumen = new Map();
    for (const row of rowsResumen) {
      const nombres = row.nombres;
      if (!mapaResumen.has(nombres)) {
        mapaResumen.set(nombres, {
          estudiante: nombres,
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

      if (!DIAS.includes(row.dia)) continue;

      const obj = mapaResumen.get(nombres);
      obj[row.dia] += Number(row.totalHoras) || 0;
    }

    for (const obj of mapaResumen.values()) {
      obj.Total =
        Number(obj.Lunes) +
        Number(obj.Martes) +
        Number(obj.Miércoles) +
        Number(obj.Jueves) +
        Number(obj.Viernes) +
        Number(obj.Sábado) +
        Number(obj.Domingo);
      hoja1.addRow(obj);
    }

    // HOJA 2
    const hoja2 = workbook.addWorksheet("Detalle por actividad");
    hoja2.columns = [
      { header: "Estudiante", key: "estudiante", width: 30 },
      { header: "Actividad", key: "actividad", width: 30 },
      { header: "Lunes", key: "Lunes", width: 12 },
      { header: "Martes", key: "Martes", width: 12 },
      { header: "Miércoles", key: "Miércoles", width: 12 },
      { header: "Jueves", key: "Jueves", width: 12 },
      { header: "Viernes", key: "Viernes", width: 12 },
      { header: "Sábado", key: "Sábado", width: 12 },
      { header: "Domingo", key: "Domingo", width: 12 },
      { header: "Total", key: "Total", width: 14 },
    ];

    const mapaDetalle = new Map(); // nombres||actividad => row object
    for (const row of rowsDetalle) {
      const nombres = row.nombres;
      const actividad = row.actividad;
      const key = `${nombres}||${actividad}`;

      if (!mapaDetalle.has(key)) {
        mapaDetalle.set(key, {
          estudiante: nombres,
          actividad: actividad,
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

      if (!DIAS.includes(row.dia)) continue;

      const obj = mapaDetalle.get(key);
      obj[row.dia] += Number(row.totalHoras) || 0;
    }

    for (const obj of mapaDetalle.values()) {
      obj.Total =
        Number(obj.Lunes) +
        Number(obj.Martes) +
        Number(obj.Miércoles) +
        Number(obj.Jueves) +
        Number(obj.Viernes) +
        Number(obj.Sábado) +
        Number(obj.Domingo);
      hoja2.addRow(obj);
    }

    // Estilo: encabezados
    hoja1.getRow(1).font = { bold: true };
    hoja2.getRow(1).font = { bold: true };

    const cicloNombre = ciclo ? `ciclo_${ciclo}` : "todos";
    const fileName = `reportes_${cicloNombre}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};
