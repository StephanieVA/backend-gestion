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

function buildReporteTotals(rows) {
  // rows: [{ dia, total_horas }]
  const totals = Object.fromEntries(DIAS.map((d) => [d, 0]));
  for (const r of rows) {
    if (totals[r.dia] !== undefined) totals[r.dia] = Number(r.total_horas || 0);
  }
  return totals;
}

async function getReportePorEstudiante(seccionIn, estudianteIds) {
  // Retorna: [{ estudiante_id, dia, total_horas }]
  // Si estudianteIds es null => todos.
  const placeholdersSecciones = seccionIn.map(() => "?").join(",");

  let sql = `
    SELECT 
      estudiante_id,
      dia,
      SUM(horas) AS total_horas
    FROM respuestas
    WHERE seccion IN (${placeholdersSecciones})
  `;

  const params = [...seccionIn];

  if (estudianteIds && estudianteIds.length) {
    const placeholdersIds = estudianteIds.map(() => "?").join(",");
    sql += ` AND estudiante_id IN (${placeholdersIds})`;
    params.push(...estudianteIds);
  }

  sql += ` GROUP BY estudiante_id, dia `;

  const [rows] = await db.query(sql, params);
  return rows;
}

exports.reportePorCiclo = async (req, res) => {
  try {
    const { ciclo } = req.query; // ejemplo: 'II ciclo'

    // Obtener estudiantes que respondieron (tienen respuestas) y filtrar por ciclo/semestre si se envía
    let sqlEst = `
      SELECT e.id AS estudiante_id, e.nombres
      FROM estudiantes e
      WHERE EXISTS (
        SELECT 1 FROM respuestas r WHERE r.estudiante_id = e.id
      )
    `;

    const paramsEst = [];

    if (ciclo) {
      sqlEst += ` AND e.semestre = ? `;
      paramsEst.push(ciclo);
    }

    const [estudiantes] = await db.query(sqlEst, paramsEst);

    const estudianteIds = estudiantes.map((e) => e.estudiante_id);

    const [r1Rows, r2Rows, rfRows] = await Promise.all([
      // Reporte 1: seccion 1 y 2
      getReportePorEstudiante([1, 2], estudianteIds),
      // Reporte 2: seccion 3, 4 y 5
      getReportePorEstudiante([3, 4, 5], estudianteIds),
      // Reporte final: 1..5
      getReportePorEstudiante([1, 2, 3, 4, 5], estudianteIds),
    ]);

    const initByStudent = (list) => {
      const map = new Map();
      for (const e of list) {
        map.set(e.estudiante_id, {
          estudiante_id: e.estudiante_id,
          nombres: e.nombres,
          reporte1: buildReporteTotals([]),
          reporte2: buildReporteTotals([]),
          reporteFinal: buildReporteTotals([]),
        });
      }
      return map;
    };

    const byStudent = initByStudent(estudiantes);

    for (const r of r1Rows) {
      const st = byStudent.get(r.estudiante_id);
      if (!st) continue;
      st.reporte1[r.dia] = Number(r.total_horas || 0);
    }
    for (const r of r2Rows) {
      const st = byStudent.get(r.estudiante_id);
      if (!st) continue;
      st.reporte2[r.dia] = Number(r.total_horas || 0);
    }
    for (const r of rfRows) {
      const st = byStudent.get(r.estudiante_id);
      if (!st) continue;
      st.reporteFinal[r.dia] = Number(r.total_horas || 0);
    }

    res.json({
      ciclo: ciclo || null,
      dias: DIAS,
      estudiantes: Array.from(byStudent.values()),
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
