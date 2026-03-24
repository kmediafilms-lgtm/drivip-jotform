# DRIVIP Jotform — Guía de Activación

## Paso 1 — Elige tu backend

Tienes dos opciones:

### Opción A: drivip-web (Next.js) — Recomendado
Si ya tienes `drivip-web` desplegado en Vercel.

Tu URL será algo como: `https://drivip-web.vercel.app`

### Opción B: Google Apps Script — Standalone
Si quieres un backend solo con Google Sheets, sin Next.js.

---

## Paso 2A — Configurar con drivip-web

1. Abre `form/drivip-booking-form-v5.html`
2. Busca la línea:
   ```js
   BACKEND_URL: 'REEMPLAZA_CON_TU_URL_DE_DRIVIP_WEB'
   ```
3. Reemplaza con tu URL de Vercel:
   ```js
   BACKEND_URL: 'https://drivip-web.vercel.app'
   ```

4. Abre `form/drivip-ops-panel.html`
5. Busca:
   ```js
   BACKEND_URL: 'REEMPLAZA_CON_TU_BACKEND_URL'
   ADMIN_KEY:   ''
   ```
6. Reemplaza con:
   ```js
   BACKEND_URL: 'https://drivip-web.vercel.app'
   ADMIN_KEY:   'tu_WEBHOOK_SECRET_de_env'
   ```

---

## Paso 2B — Configurar con Google Apps Script

1. Ve a [script.google.com](https://script.google.com) → Nuevo proyecto
2. Copia todo el contenido de `backend/google-apps-script-v4.gs`
3. Pégalo en el editor y guarda

### Script Properties
- Clic en ⚙️ Configuración del proyecto → Script Properties
- Agrega:
  - `ADMIN_EMAIL` → tu@email.com
  - `ADMIN_PHONE` → 50760000000 (sin +)

### Deploy
- Deploy → New deployment
- Type: **Web App**
- Execute as: **Me**
- Who has access: **Anyone**
- Clic **Deploy** → copia la URL

### Conectar el formulario
En `form/drivip-booking-form-v5.html`:
```js
BACKEND_URL: 'https://script.google.com/macros/s/TU_ID/exec'
```

En `form/drivip-ops-panel.html`:
```js
BACKEND_URL: 'https://script.google.com/macros/s/TU_ID/exec'
ADMIN_KEY:   ''  // No se usa con Apps Script
```

---

## Paso 3 — Probar

1. Abre `drivip-booking-form-v5.html` en el navegador
2. Completa una reserva de prueba
3. Verifica:
   - ✅ Aparece en Google Sheets
   - ✅ Recibes email de notificación
   - ✅ El cliente recibe email de confirmación
   - ✅ Se crea evento en Google Calendar (solo drivip-web)

---

## Paso 4 — Panel OPS

1. Abre `drivip-ops-panel.html`
2. Ingresa tu clave:
   - **drivip-web**: tu `WEBHOOK_SECRET`
   - **Apps Script**: cualquier clave (solo para la pantalla de auth local)
3. Verás todas las reservas con métricas en tiempo real
4. Desde el drawer puedes:
   - Cambiar status (Pendiente → Confirmada → etc.)
   - Agregar notas internas
   - Abrir WhatsApp del cliente con mensaje pre-cargado

---

## Estructura de archivos

```
drivip-jotform/
├── form/
│   ├── drivip-booking-form-v5.html  ← Formulario principal
│   └── drivip-ops-panel.html        ← Panel OPS interno
├── backend/
│   └── google-apps-script-v4.gs    ← Backend Apps Script (opción B)
└── docs/
    └── SETUP.md                     ← Esta guía
```
