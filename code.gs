function doGet(e) {
  const page = e && e.parameter && e.parameter.page ? e.parameter.page : "";
  let template;

  switch (page) {
    case 'supervisor':
      template = HtmlService.createTemplateFromFile('supervisor');
      break;
    case 'talento':
      template = HtmlService.createTemplateFromFile('talento');
      break;
    case 'restaurante':
      template = HtmlService.createTemplateFromFile('restaurante');
      break;
    case 'operador':
      template = HtmlService.createTemplateFromFile('operador');
      break;
    case 'superadmin':
      template = HtmlService.createTemplateFromFile('superadmin');
      break;
    default:
      template = HtmlService.createTemplateFromFile('login');
  }

  return template
    .evaluate()
    .setTitle("Sistema de Gestión Incolbest")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Valida usuario y devuelve la URL de la página según el rol.
 */
function redirigirPorRol(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Usuarios");
  const datos = hoja.getDataRange().getValues();

  const baseUrl = ScriptApp.getService().getUrl();

  const inputUser = data.usuario.trim().toLowerCase();
  const inputPass = data.contrasena.trim();
  const inputRol = data.role.trim().toLowerCase();

  for (let i = 1; i < datos.length; i++) {
    let [id, usuario, contrasena, rol] = datos[i];
    usuario = (usuario + "").trim().toLowerCase();
    contrasena = (contrasena + "").trim();
    rol = (rol + "").trim().toLowerCase();

    if (usuario === inputUser && contrasena === inputPass && rol === inputRol) {
      Logger.log(`✅ Login correcto para ${usuario} con rol ${rol}`);
      const urlFinal = `${baseUrl}?page=${rol}`;
      Logger.log("URL final generada: " + urlFinal);
      return urlFinal;
    }
  }

  throw new Error("Usuario, contraseña o rol incorrectos.");
}

// Función para obtener todos los usuarios
function getUsuarios() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuarios');
  const data = sheet.getDataRange().getValues();
  const usuarios = [];
  for (let i = 1; i < data.length; i++) { // Saltar encabezado
    usuarios.push({
      id: data[i][0],
      usuario: data[i][1],
      contrasena: data[i][2], // No devolver hash por seguridad
      rol: data[i][3],
      nombre: data[i][4],
      area: data[i][5],
      departamento: data[i][6]
    });
  }
  return usuarios;
}

// Función para agregar un nuevo usuario
function addUsuario(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuarios');
  const lastRow = sheet.getLastRow();
  const newId = lastRow; // ID simple basado en fila
  const hashedPassword = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data.contrasena)
    .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
  sheet.appendRow([newId, data.usuario, hashedPassword, data.rol, data.nombre, data.area, data.departamento]);
  Logger.log(`Usuario agregado: ${data.usuario}`);
}

// Función para obtener un usuario por ID
function getUsuarioById(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuarios');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      return {
        id: data[i][0],
        usuario: data[i][1],
        contrasena: '', // No devolver hash
        rol: data[i][3],
        nombre: data[i][4],
        area: data[i][5],
        departamento: data[i][6]
      };
    }
  }
  return null;
}

// Función para actualizar un usuario
function updateUsuario(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuarios');
  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] == data.id) {
      const hashedPassword = data.contrasena ? Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, data.contrasena)
        .map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('') : dataRange[i][2]; // Mantener hash si no se cambia
      sheet.getRange(i + 1, 1, 1, 7).setValues([[data.id, data.usuario, hashedPassword, data.rol, data.nombre, data.area, data.departamento]]);
      Logger.log(`Usuario actualizado: ${data.usuario}`);
      break;
    }
  }
}

// Función para borrar un usuario
function deleteUsuario(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Usuarios');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      Logger.log(`Usuario borrado con ID: ${id}`);
      break;
    }
  }
}

// Función para buscar usuarios
// Función para buscar usuarios con filtros
function buscarUsuarios(filtros) {
  try {
    // Verificar permisos: solo superadmin
    const usuarioEmail = Session.getActiveUser().getEmail();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaUsuarios = ss.getSheetByName("Usuarios");
    const datosUsuarios = hojaUsuarios.getDataRange().getValues();
    let rolUsuario = null;

    for (let i = 1; i < datosUsuarios.length; i++) {
      if (datosUsuarios[i][1].toString().toLowerCase() === usuarioEmail.toLowerCase()) {
        rolUsuario = datosUsuarios[i][3].toString().toLowerCase();
        break;
      }
    }

    if (!rolUsuario || rolUsuario !== 'superadmin') {
      throw new Error('Permisos insuficientes. Solo superadmin puede buscar usuarios.');
    }

    // Obtener todos los usuarios
    const usuarios = [];
    for (let i = 1; i < datosUsuarios.length; i++) {
      usuarios.push({
        id: datosUsuarios[i][0],
        usuario: datosUsuarios[i][1],
        rol: datosUsuarios[i][3],
        nombre: datosUsuarios[i][4],
        area: datosUsuarios[i][5],
        departamento: datosUsuarios[i][6],
      });
    }

    // Aplicar filtros (coincidencias parciales, case-insensitive)
    const resultados = usuarios.filter(user => {
      return Object.keys(filtros).every(key => {
        if (!filtros[key]) return true;  // Si el filtro está vacío, no filtrar
        const valorFiltro = filtros[key].toString().toLowerCase();
        const valorUsuario = (user[key] || '').toString().toLowerCase();
        return valorUsuario.includes(valorFiltro);
      });
    });

    Logger.log(`Búsqueda realizada por ${usuarioEmail}: ${resultados.length} resultados`);
    return resultados;
  } catch (error) {
    Logger.log('Error en buscarUsuarios: ' + error.message);
    throw new Error('Error al buscar usuarios: ' + error.message);
  }
}

function displayUsuarios(usuarios) {
  console.log('Mostrando usuarios:', usuarios.length);
  const body = document.getElementById('usuariosBody');
  body.innerHTML = '';
  if (usuarios.length === 0) {
    body.innerHTML = '<tr><td colspan="8">No hay usuarios registrados.</td></tr>';  // Actualizado a 8 columnas
    return;
  }
  usuarios.forEach(function(user) {
    const row = body.insertRow();
    row.insertCell(0).textContent = user.id;
    row.insertCell(1).textContent = user.usuario;
    row.insertCell(2).textContent = user.rol;
    row.insertCell(3).textContent = user.nombre;
    row.insertCell(4).textContent = user.area;
    row.insertCell(5).textContent = user.departamento;
    const actions = row.insertCell(7);  
    actions.innerHTML = '<button onclick="editUser(' + user.id + ')">Editar</button> <button onclick="deleteUser(' + user.id + ')">Borrar</button>';
  });
}

// --- FUNCIONES PARA RESTAURANTE ---

/**
 * Guarda un menú del día en la hoja "Menus".
 * Requiere permisos: solo "superadmin" o "supervisor".
 */
function guardarMenu(datos) {
  try {
    // Verificar permisos
    const usuarioEmail = Session.getActiveUser().getEmail();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaUsuarios = ss.getSheetByName("Usuarios");
    const datosUsuarios = hojaUsuarios.getDataRange().getValues();
    let rolUsuario = null;

    for (let i = 1; i < datosUsuarios.length; i++) {
      if (datosUsuarios[i][1].toString().toLowerCase() === usuarioEmail.toLowerCase()) {
        rolUsuario = datosUsuarios[i][3].toString().toLowerCase();
        break;
      }
    }

    if (!rolUsuario || (rolUsuario !== 'superadmin' && rolUsuario !== 'supervisor')) {
      throw new Error('Permisos insuficientes. Solo superadmin o supervisor pueden guardar menús.');
    }

    const hojaMenus = ss.getSheetByName("Menus");
    if (!hojaMenus) {
      throw new Error('Hoja "Menus" no encontrada. Créala en la Spreadsheet.');
    }

    const lastRow = hojaMenus.getLastRow();
    const newId = lastRow; // ID incremental basado en fila
    hojaMenus.appendRow([
      newId,
      new Date(),
      datos.entrada,
      datos.principio,
      datos.proteina,
      datos.acompanamiento,
      datos.ubicacion
    ]);

    Logger.log(`Menú guardado por ${usuarioEmail} con rol ${rolUsuario}`);
    return { success: true, message: 'Menú guardado exitosamente' };
  } catch (error) {
    Logger.log('Error en guardarMenu: ' + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Obtiene todos los menús de la hoja "Menus".
 */
function obtenerMenus() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaMenus = ss.getSheetByName("Menus");
    if (!hojaMenus) {
      throw new Error('Hoja "Menus" no encontrada.');
    }

    const data = hojaMenus.getDataRange().getValues();
    const menus = [];
    for (let i = 1; i < data.length; i++) {
      menus.push({
        id: data[i][0],
        fecha: data[i][1].toLocaleDateString(),
        entrada: data[i][2],
        principio: data[i][3],
        proteina: data[i][4],
        acompanamiento: data[i][5],
        ubicacion: data[i][6]
      });
    }

    return menus;
  } catch (error) {
    Logger.log('Error en obtenerMenus: ' + error.message);
    throw new Error('Error al obtener menús: ' + error.message);
  }
}

/**
 * Edita un menú existente en la hoja "Menus" por ID (número de fila).
 * Requiere permisos: solo "superadmin" o "supervisor".
 */
function editarMenu(id, datos) {
  try {
    // Verificar permisos
    const usuarioEmail = Session.getActiveUser().getEmail();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaUsuarios = ss.getSheetByName("Usuarios");
    const datosUsuarios = hojaUsuarios.getDataRange().getValues();
    let rolUsuario = null;

    for (let i = 1; i < datosUsuarios.length; i++) {
      if (datosUsuarios[i][1].toString().toLowerCase() === usuarioEmail.toLowerCase()) {
        rolUsuario = datosUsuarios[i][3].toString().toLowerCase();
        break;
      }
    }

    if (!rolUsuario || (rolUsuario !== 'superadmin' && rolUsuario !== 'supervisor')) {
      throw new Error('Permisos insuficientes.');
    }

    const hojaMenus = ss.getSheetByName("Menus");
    if (!hojaMenus) {
      throw new Error('Hoja "Menus" no encontrada.');
    }

    const rowIndex = parseInt(id) + 1;
    if (rowIndex < 2 || rowIndex > hojaMenus.getLastRow()) {
      throw new Error('ID de menú inválido.');
    }

    hojaMenus.getRange(rowIndex, 3, 1, 5).setValues([[datos.entrada, datos.principio, datos.proteina, datos.acompanamiento, datos.ubicacion]]);
    Logger.log(`Menú editado por ${usuarioEmail} en fila ${rowIndex}`);
    return { success: true, message: 'Menú editado exitosamente' };
  } catch (error) {
    Logger.log('Error en editarMenu: ' + error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Elimina un menú de la hoja "Menus" por ID (número de fila).
 * Requiere permisos: solo "superadmin" o "supervisor".
 */
function eliminarMenu(id) {
  try {
    // Verificar permisos
    const usuarioEmail = Session.getActiveUser().getEmail();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaUsuarios = ss.getSheetByName("Usuarios");
    const datosUsuarios = hojaUsuarios.getDataRange().getValues();
    let rolUsuario = null;

    for (let i = 1; i < datosUsuarios.length; i++) {
      if (datosUsuarios[i][1].toString().toLowerCase() === usuarioEmail.toLowerCase()) {
        rolUsuario = datosUsuarios[i][3].toString().toLowerCase();
        break;
      }
    }

    if (!rolUsuario || (rolUsuario !== 'superadmin' && rolUsuario !== 'supervisor')) {
      throw new Error('Permisos insuficientes.');
    }

    const hojaMenus = ss.getSheetByName("Menus");
    if (!hojaMenus) {
      throw new Error('Hoja "Menus" no encontrada.');
    }

    const rowIndex = parseInt(id) + 1;
    if (rowIndex < 2 || rowIndex > hojaMenus.getLastRow()) {
      throw new Error('ID de menú inválido.');
    }

    hojaMenus.deleteRow(rowIndex);
    Logger.log(`Menú eliminado por ${usuarioEmail} en fila ${rowIndex}`);
    return { success: true, message: 'Menú eliminado exitosamente' };
  } catch (error) {
    Logger.log('Error en eliminarMenu: ' + error.message);
    return { success: false, message: error.message };
  }
}






