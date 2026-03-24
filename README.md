# DRIVIP Jotform — Sistema de Reservas Frontend

> **Confirmado antes de salir.**

Formulario standalone de reservas para DRIVIP. Se conecta al backend de `drivip-web` (Next.js) o directamente a Google Apps Script.

---

## 📁 Archivos

| Archivo | Descripción |
|---|---|
| `form/drivip-booking-form-v5.html` | Formulario de reserva (standalone, sin dependencias) |
| `form/drivip-ops-panel.html` | Panel OPS interno con métricas y gestión de reservas |
| `backend/google-apps-script-v4.gs` | Backend alternativo en Google Apps Script |
| `docs/SETUP.md` | Guía de activación paso a paso |

---

## 🔌 Backends compatibles

| Backend | Repositorio | Características |
|---|---|---|
| **drivip-web** (recomendado) | `kmediafilms-lgtm/drivip-web` | Next.js, Google Sheets, Calendar, Resend |
| **Google Apps Script** | `backend/google-apps-script-v4.gs` | Solo Sheets + Gmail, sin servidor |

---

## ⚡ Quick Start

### 1. Configurar la URL del backend

En `drivip-booking-form-v5.html`, línea ~270:
```js
BACKEND_URL: 'https://tu-drivip-web.vercel.app'
```

### 2. Abrir en navegador
```bash
open form/drivip-booking-form-v5.html
```

### 3. Ver guía completa
```
docs/SETUP.md
```

---

## 🎨 Brand

| Token | Valor |
|---|---|
| Navy | `#0F1624` |
| Purple | `#6B5CE7` |
| Fonts | Outfit · Poppins |
| Slogan | *Confirmado antes de salir.* |

---

## 🔐 Seguridad

- Precio siempre calculado **server-side** — el cliente nunca puede manipularlo
- Validación de mínimo **6 horas** de anticipación
- Sanitización de inputs con `escHtml()`
- Flag anti-doble-click en el botón de submit

---

## 🗺️ Rutas y precios

| Ruta | Precio |
|---|---|
| Tocumen → Panama City | $30 |
| Panama City → Tocumen | $30 |
| Panama City → Playa Blanca | $110 |
| Panama City → Colón | $75 |
| Panama City → Veracruz | $25 |
| Panama City → Coronado | $90 |

---

*Desarrollado para DRIVIP · Panamá · 2026*
