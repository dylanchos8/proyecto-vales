// ID del Spreadsheet donde están las tablas
const SPREADSHEET_ID = "TU_SPREADSHEET_ID";
const SHEET_ORDENES = "OrdenesHorasExtra";

/**
 * 1️⃣ Maneja datos del formulario HTML (POST)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_ORDENES);

    // Guardar cada operario en una fila
    data.operarios.forEach(op => {
      sheet.appendRow([
        new Date(),                 // fecha de creación
        data.supervisorCorreo,      // supervisor
        data.area,                  // área de trabajo
        op.id,                      // id del operario
        op.turno,                   // diurno/nocturno
        "Pendiente",                // estado
        ""                          // respuesta jefe
      ]);
    });

    // Enviar correo al jefe
    enviarCorreoJefe(data);

    return ContentService.createTextOutput("Orden registrada");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err);
  }
}

/**
 * 2️⃣ Enviar correo al jefe con botones aprobar/rechazar
 */
function enviarCorreoJefe(data) {
  const jefeCorreo = "correo_del_jefe@empresa.com";

  let listaOperarios = data.operarios.map(o => 
    `- ${o.nombre} (${o.turno})`
  ).join("<br>");

  // Links de aprobación/rechazo (pasan parámetros en URL)
  const urlBase = ScriptApp.getService().getUrl();
  const urlAprobar = `${urlBase}?action=aprobar&supervisor=${encodeURIComponent(data.supervisorCorreo)}`;
  const urlRechazar = `${urlBase}?action=rechazar&supervisor=${encodeURIComponent(data.supervisorCorreo)}`;

  const htmlBody = `
    <p>Se solicitó horas extra para el área <b>${data.area}</b></p>
    <p><b>Supervisor:</b> ${data.supervisorCorreo}</p>
    <p><b>Operarios:</b><br>${listaOperarios}</p>
    <p>¿Desea aprobar la solicitud?</p>
    <a href="${urlAprobar}" style="padding:10px; background:green; color:white; text-decoration:none;">✅ Aprobar</a>
    <a href="${urlRechazar}" style="padding:10px; background:red; color:white; text-decoration:none;">❌ Rechazar</a>
  `;

  MailApp.sendEmail({
    to: jefeCorreo,
    subject: "Solicitud de Horas Extra",
    htmlBody: htmlBody
  });
}

/**
 * 3️⃣ Manejar clics del jefe en el correo
 */
function doGet(e) {
  const action = e.parameter.action;
  const supervisor = e.parameter.supervisor;

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_ORDENES);
  const data = sheet.getDataRange().getValues();

  // Buscar filas pendientes de ese supervisor y actualizar
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == supervisor && data[i][5] == "Pendiente") {
      sheet.getRange(i + 1, 6).setValue(action == "aprobar" ? "Aprobado" : "Rechazado");
      sheet.getRange(i + 1, 7).setValue(new Date());
    }
  }

  return ContentService.createTextOutput("Solicitud " + action);
}
