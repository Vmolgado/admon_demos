// Ajusta con tus valores
const SHEET_ID = '1cF5g5QLXLfOGOGAecm6Fvz4B98acBUCeRRVJbV0-AfQ';
const API_KEY = 'AIzaSyDibUIuRbBxxRu_fn2hcJlbARS4GojpDxw';
const RANGE = '2024!A1:S'; // Asegúrate de que incluya las columnas I y M

// Construimos la URL
const URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

/* 
   Mapeo (ejemplo):
   0 -> A -> FOLIO
   1 -> B -> FECHA
   2 -> C -> MES
   3 -> D -> AÑO EN CURSO
   4 -> E -> SD
   5 -> F -> CLIENTE
   6 -> G -> ASESOR DE VENTAS
   7 -> H -> EMAIL ASESOR VENTAS
   8 -> I -> TIPO DE SERVICIO
   12 -> M -> ESTATUS PLATAFORMA
   15 -> P -> TIPO DE HARDWARE
   16 -> Q -> DISPOSITIVO
   17 -> R -> IMEI
   18 -> S -> SIM
*/
const mapping = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 15, 16, 17, 18];

// Si tu fecha es dd/mm/yyyy
function parseFechaDMY(fechaStr) {
  const [fechaOnly] = fechaStr.split(' ');
  const [day, month, year] = fechaOnly.split('/');
  return new Date(year, Number(month) - 1, Number(day));
}

// Lógica para "Estatus Demo"
function getEstatusDemo(diasTranscurridos) {
  if (diasTranscurridos >= 30) {
    return 'VENCIDO';
  } else if (diasTranscurridos >= 21) {
    return 'PROXIMO A VENCER';
  } else {
    return 'VIGENTE';
  }
}

// Función para filtrar filas de la tabla
function filterTable() {
  const input = document.getElementById('search-input').value.toLowerCase();
  const rows = document.querySelectorAll('#data-table tbody tr');

  rows.forEach((row) => {
    const cells = Array.from(row.children);
    const match = cells.some((cell) => cell.textContent.toLowerCase().includes(input));
    row.style.display = match ? '' : 'none'; // Mostrar u ocultar la fila
  });
}

// Función para descargar la tabla como archivo Excel
function downloadExcel() {
  const table = document.getElementById('data-table');
  const workbook = XLSX.utils.table_to_book(table, { sheet: "Datos" });
  XLSX.writeFile(workbook, 'DemosTTC.xlsx');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch(URL);
    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length === 0) {
      console.warn('No se encontraron datos o el rango está vacío.');
      return;
    }

    const tbody = document.querySelector('#data-table tbody');

    // Empezamos en 1, asumiendo que row[0] son encabezados
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // === Validaciones antes de construir la fila ===
      // TIPO DE SERVICIO -> columna I (índice 8) debe ser "INSTALACION DEMO"
      if (row[8] !== 'INSTALACION DEMO') continue;
      // ESTATUS PLATAFORMA -> columna M (índice 12) debe ser "REALIZADO"
      if (row[12] !== 'REALIZADO') continue;

      // Si pasa las validaciones, creamos la fila
      const tr = document.createElement('tr');

      // (1) Agregamos las columnas mapeadas
      mapping.forEach((colIndex) => {
        const td = document.createElement('td');
        td.textContent = row[colIndex] || '';
        tr.appendChild(td);
      });

      // (2) Cálculo de Días Restantes y Estatus usando la columna FECHA (índice 1)
      const fechaStr = row[1] || '';
      let diasRestantes = '';
      let estatusDemo = '';

      if (fechaStr) {
        const fechaDemo = parseFechaDMY(fechaStr);
        const hoy = new Date();
        const diffMs = hoy - fechaDemo;
        // Convertir ms a días
        const diasTranscurridos = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        // Días restantes = 30 - díasTranscurridos
        diasRestantes = 30 - diasTranscurridos;
        // Determinamos estatus
        estatusDemo = getEstatusDemo(diasTranscurridos);
      }

      // (3) Agregamos celda para Días Restantes
      const tdDiasRestantes = document.createElement('td');
      tdDiasRestantes.textContent = diasRestantes;
      // Color según sea negativo o positivo
      tdDiasRestantes.style.color = (diasRestantes < 0) ? 'red' : 'green';
      tr.appendChild(tdDiasRestantes);

      // (4) Agregamos celda para Estatus Demo
      const tdEstatusDemo = document.createElement('td');
      tdEstatusDemo.textContent = estatusDemo;
      if (estatusDemo === 'VENCIDO') {
        tdEstatusDemo.style.color = 'red';
      } else if (estatusDemo === 'PROXIMO A VENCER') {
        tdEstatusDemo.style.color = 'orange';
      } else {
        tdEstatusDemo.style.color = 'green';
      }
      tr.appendChild(tdEstatusDemo);

      // (5) Agregamos la fila construida al <tbody>
      tbody.appendChild(tr);
    }

    // Agregar eventos
    document.getElementById('search-input').addEventListener('input', filterTable);
    document.getElementById('download-excel').addEventListener('click', downloadExcel);

  } catch (error) {
    console.error('Error al obtener datos de Google Sheets:', error);
  }
});
