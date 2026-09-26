# 📊 Cómo Conectar PBerrio a Google Sheets (En 2 Minutos)

Esta página de pre-registro ya guarda automáticamente cada registro en el navegador con la opción de descargar el listado en **Excel (.CSV)** con un solo clic.

Si además deseas que cada vez que alguien se inscriba aparezca automáticamente en una **hoja de cálculo de Google Sheets en tiempo real**, sigue estos sencillos pasos:

---

### Paso 1: Crear una Hoja de Cálculo en Google Sheets
1. Entra a [Google Sheets](https://sheets.new) y crea una nueva hoja en blanco.
2. Nómbrala por ejemplo: `PBerrio - Lista de Espera`.
3. En la primera fila (fila 1), escribe estos encabezados:
   - **A1:** `ID`
   - **B1:** `Fecha`
   - **C1:** `Nombre`
   - **D1:** `WhatsApp`
   - **E1:** `Correo`
   - **F1:** `Origen`

---

### Paso 2: Abrir el Editor de Apps Script
1. En el menú superior de Google Sheets, ve a:
   **Extensiones** > **Apps Script**.
2. Borra el código que aparezca por defecto y pega este código exacto:

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Evita conflictos si varias personas se registran al mismo segundo
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = {};
    
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter || {};
    }
    
    sheet.appendRow([
      data.id || '',
      data.formattedDate || new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
      data.name || '',
      data.phone || '',
      data.email || '',
      data.source || 'PBerrio Web Landing'
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

---

### Paso 3: Publicar como Aplicación Web
1. Haz clic en el botón azul arriba a la derecha: **Implementar** > **Nueva implementación** (*Deploy > New deployment*).
2. En el icono de engranaje (⚙️), selecciona: **Aplicación web** (*Web app*).
3. Configura las siguientes opciones:
   - **Descripción:** `PBerrio Webhook`
   - **Ejecutar como:** **Yo** (*tu cuenta de Google*)
   - **Quién tiene acceso:** **Cualquiera** (*Anyone*) ⚠️ *Es indispensable para que la página web pueda enviar los datos sin pedir login.*
4. Haz clic en **Implementar**.
5. Si te pide autorizar permisos con tu cuenta de Google, concédelos (*Avanzado > Ir a proyecto*).
6. Copia la **URL de la aplicación web** que termina en `/exec`.

---

### Paso 4: Pegar la URL en `config.js`
Abre el archivo [config.js](file:///C:/Users/aleja/OneDrive/Documentos/preregisto_pberrio/config.js) y pega tu URL entre las comillas:

```javascript
const APP_CONFIG = {
  GOOGLE_SHEET_WEBHOOK_URL: "https://script.google.com/macros/s/TU_URL_AQUI/exec",
  ...
};
```

¡Listo! A partir de ese momento, cada persona que se registre en la página aparecerá al instante en tu Google Sheet y además podrás abrir un chat de WhatsApp con ellos en 1 clic.
