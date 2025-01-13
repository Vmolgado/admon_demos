const SHEET_ID = '1cF5g5QLXLfOGOGAecm6Fvz4B98acBUCeRRVJbV0-AfQ';
const API_KEY = 'AIzaSyDibUIuRbBxxRu_fn2hcJlbARS4GojpDxw';
const RANGE = '2024!A1:S'; // Asegúrate de que incluya las columnas necesarias

const URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

const mapping = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 15, 16, 17, 18];

// Mapeo manual de vendedores y sus teléfonos
const vendedoresTelefonos = {
  "VICTOR ALMARAZ": "524444270527",
  "ERNESTO VALLADOLID": "524441749663",
  "DIANA ZUÑIGA": "524444693536",
  "DANIELA OVIEDO": "524445871064",
  "LIC. JORGE LOPEZ": "524442848171",
  "LILIANA RAMIRO": "524442390153",
  "ALEJANDRA GONZALEZ": "525579302118"
};

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

// Función para generar el enlace de WhatsApp dinámico
function createWhatsAppLink(vendedor, telefono, datos) {
  // Verificar si el vendedor tiene un teléfono asociado
  if (!telefono) {
    console.warn(`No se encontró teléfono para el vendedor: ${vendedor}`);
    return null; // Retorna null si no se encuentra el teléfono
  }

  const mensaje = `
Hola, ${vendedor}! Solo para recordarte que tienes un demo próximo a vencer:
- FOLIO: ${datos.folio}
- FECHA: ${datos.fecha}
- SD: ${datos.sd}
- CLIENTE: ${datos.cliente}
- TIPO DE HARDWARE: ${datos.tipoHardware}
- DÍAS RESTANTES: ${datos.diasRestantes}
- ESTATUS DEMO: ${datos.estatusDemo}
Saludos, equipo de seguimiento TTC.
  `;

  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
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
    const thead = document.querySelector('#data-table thead tr');

    // Añadimos el encabezado para WhatsApp
    const thWhatsApp = document.createElement('th');
    thWhatsApp.textContent = 'WhatsApp';
    thead.appendChild(thWhatsApp);

    // Empezamos en 1, asumiendo que row[0] son encabezados
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // === Validaciones antes de construir la fila ===
      if (row[8] !== 'INSTALACION DEMO' || row[12] !== 'REALIZADO') continue;

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

      // (5) Agregamos el ícono de WhatsApp
      const tdWhatsApp = document.createElement('td');
      const vendedor = row[6].trim(); // Nombre del asesor de ventas (columna G)
      const telefono = vendedoresTelefonos[vendedor];

      const datosFila = {
        folio: row[0],
        fecha: row[1],
        sd: row[4],
        cliente: row[5],
        tipoHardware: row[15],
        diasRestantes: diasRestantes,
        estatusDemo: estatusDemo
      };

      const whatsappLink = createWhatsAppLink(vendedor, telefono, datosFila);

      if (whatsappLink) {
        tdWhatsApp.innerHTML = `
          <a href="${whatsappLink}" target="_blank" style="color: #25D366; font-size: 24px;">
            <i class="fa fa-whatsapp"></i>
          </a>
        `;
      } else {
        tdWhatsApp.textContent = 'Sin número';
        tdWhatsApp.style.color = 'red';
      }
      tr.appendChild(tdWhatsApp);

      // (6) Agregamos la fila construida al <tbody>
      tbody.appendChild(tr);
    }

    // Agregar eventos
    document.getElementById('search-input').addEventListener('input', filterTable);

  } catch (error) {
    console.error('Error al obtener datos de Google Sheets:', error);
  }
});

// Función para filtrar filas de la tabla
function filterTable() {
  const input = document.getElementById('search-input').value.toLowerCase();
  const rows = document.querySelectorAll('#data-table tbody tr');

  rows.forEach((row) => {
    const cells = Array.from(row.children);
    const match = cells.some((cell) => cell.textContent.toLowerCase().includes(input));
    row.style.display = match ? '' : 'none';
  });
}