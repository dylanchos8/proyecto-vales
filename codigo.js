/*let MySheets = SpreadsheetApp.getActiveSpreadsheet();
let LoginSheet = MySheets.getSheetByName("");
const SPREADSHEET_ID = "1bVdqtUEhBZ5jYE2LPLA5TG5JqLpble1MsUfcbZszBAY";
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);*/

function doGet() {
  var template = HtmlService.createTemplateFromFile('interfazPrincipal');
  var html = template.evaluate();
  return html;
}

function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function loadLogin() {
  return HtmlService.createHtmlOutputFromFile("login").getContent();
}

function irInterfazPrincipal() {
  return HtmlService.createHtmlOutputFromFile("interfazPrincipal").getContent();
}

function verificarPassword(form) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetUsuarios = ss.getSheetByName('Usuarios');
  var dataUsuarios = sheetUsuarios.getDataRange().getValues();
  var sheetRoles = ss.getSheetByName('Roles');
  var dataRoles = sheetRoles.getDataRange().getValues();

  Logger.log('Usuario ingresado: ' + form.usuario); // Para depuración

  for (var i = 1; i < dataUsuarios.length; i++) { // Empieza en 1 para saltar headers
    if (dataUsuarios[i][1] == form.usuario) { // Columna B: Usuario
      if (dataUsuarios[i][2] == form.contrasena) { // Columna C: Contraseña
        var usuario = {
          nombre: dataUsuarios[i][1],
          roles: []
        };
        // Buscar rol en la hoja Roles
        for (var fila = 1; fila < dataRoles.length; fila++) {
          if (dataRoles[fila][0] == usuario.nombre) { // Columna A: Usuario
            usuario.roles = dataRoles[fila]; // Toda la fila de roles
            break;
          }
        }
        return usuario;
      } else {
        throw 'Contraseña incorrecta.';
      }
    }
  }
  throw 'Usuario no encontrado.';
}
