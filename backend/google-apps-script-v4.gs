// ─────────────────────────────────────────────
//  DRIVIP — Google Apps Script Backend v4
//  Alternativa al drivip-web para quienes usen
//  solo Google Sheets sin Next.js
//
//  SETUP:
//  1. Abre script.google.com → nuevo proyecto
//  2. Pega este código completo
//  3. En Script Properties agrega:
//     ADMIN_EMAIL    → tu email de DRIVIP
//     ADMIN_PHONE    → número WhatsApp sin + (ej: 50760000000)
//  4. Deploy → New deployment → Web App
//     Execute as: Me | Who has access: Anyone
//  5. Copia la URL → úsala en BACKEND_URL del form HTML
// ─────────────────────────────────────────────

const SHEET_NAME     = 'Bookings'
const HEADERS        = [
  'booking_id','created_at','client_name','whatsapp','email',
  'service_type','route','service_date','service_time',
  'passengers','luggage','total_price','payment_method',
  'payment_status','status','admin_notes'
]

// ── Pricing (server-side — never trust client) ──
const ROUTE_PRICES = {
  'tocumen-to-city':      30,
  'city-to-tocumen':      30,
  'city-to-playa-blanca': 110,
  'city-to-colon':        75,
  'city-to-veracruz':     25,
  'city-to-coronado':     90,
}

const ROUTE_LABELS = {
  'tocumen-to-city':      'Tocumen Airport → Panama City',
  'city-to-tocumen':      'Panama City → Tocumen Airport',
  'city-to-playa-blanca': 'Panama City → Playa Blanca',
  'city-to-colon':        'Panama City → Colón',
  'city-to-veracruz':     'Panama City → Veracruz',
  'city-to-coronado':     'Panama City → Coronado',
}

const MIN_ADVANCE_MS = 6 * 60 * 60 * 1000 // 6 horas

// ════════════════════════════════
//  ENTRY POINTS
// ════════════════════════════════

function doGet(e) {
  const action = e?.parameter?.action

  if (action === 'getAll') return handleGetAll(e)
  if (action === 'getById') return handleGetById(e)

  return jsonResponse({ success: true, message: 'DRIVIP API v4 — OK' })
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const action = body.action

    if (action === 'updateStatus') return handleUpdateStatus(body)

    // Default: create booking
    return handleCreateBooking(body)

  } catch (err) {
    return jsonResponse({ success: false, error: 'Error al procesar la solicitud: ' + err.message }, 400)
  }
}

// ════════════════════════════════
//  HANDLERS
// ════════════════════════════════

function handleCreateBooking(data) {
  // ── Validate required fields ──
  const required = ['clientName','clientWhatsApp','clientEmail','routeId','serviceDate','serviceTime']
  for (const field of required) {
    if (!data[field] || String(data[field]).trim() === '') {
      return jsonResponse({ success: false, error: `Campo requerido: ${field}` }, 400)
    }
  }

  // ── Validate route and calculate price server-side ──
  const routeId = data.routeId
  const price   = ROUTE_PRICES[routeId]
  const label   = ROUTE_LABELS[routeId]

  if (!price) {
    return jsonResponse({ success: false, error: 'Ruta inválida' }, 400)
  }

  // ── Validate advance time ──
  const serviceDateTime = new Date(`${data.serviceDate}T${data.serviceTime}:00`)
  const now             = new Date()
  if (serviceDateTime - now < MIN_ADVANCE_MS) {
    return jsonResponse({
      success: false,
      error: 'Tiempo insuficiente',
      message: 'Las reservas requieren mínimo 6 horas de anticipación.'
    }, 400)
  }

  // ── Build booking ──
  const bookingId = generateBookingId()
  const now2      = new Date().toISOString()

  const row = [
    bookingId,
    now2,
    escHtml(data.clientName.trim()),
    data.clientWhatsApp.trim(),
    data.clientEmail.trim().toLowerCase(),
    data.serviceType || 'custom_transfer',
    label,
    data.serviceDate,
    data.serviceTime,
    parseInt(data.passengers) || 1,
    data.luggage || 'light',
    price,                         // ← siempre del servidor
    data.paymentMethod || 'pay_later',
    'pending',
    'pending',
    '',
  ]

  // ── Append to sheet ──
  const sheet = getOrCreateSheet()
  sheet.appendRow(row)

  // ── Send emails ──
  try {
    sendAdminEmail(bookingId, data, label, price)
    sendClientEmail(bookingId, data, label, price)
  } catch (emailErr) {
    Logger.log('Email error: ' + emailErr.message)
    // Non-fatal
  }

  return jsonResponse({
    success: true,
    data: { bookingId, totalPrice: price, route: label },
    message: 'Reserva creada exitosamente'
  }, 201)
}

function handleGetAll(e) {
  const sheet = getOrCreateSheet()
  const data  = sheet.getDataRange().getValues()
  if (data.length <= 1) return jsonResponse({ success: true, data: { bookings: [] } })

  const headers  = data[0]
  const bookings = data.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] })
    return obj
  })

  return jsonResponse({ success: true, data: { bookings, total: bookings.length } })
}

function handleGetById(e) {
  const id = e?.parameter?.id
  if (!id) return jsonResponse({ success: false, error: 'ID requerido' }, 400)

  const sheet = getOrCreateSheet()
  const data  = sheet.getDataRange().getValues()
  const row   = data.find((r, i) => i > 0 && r[0] === id)

  if (!row) return jsonResponse({ success: false, error: 'Reserva no encontrada' }, 404)

  const headers = data[0]
  const booking = {}
  headers.forEach((h, i) => { booking[h] = row[i] })

  return jsonResponse({ success: true, data: booking })
}

function handleUpdateStatus(body) {
  const { bookingId, status, adminNotes } = body
  if (!bookingId || !status) {
    return jsonResponse({ success: false, error: 'bookingId y status son requeridos' }, 400)
  }

  const sheet  = getOrCreateSheet()
  const data   = sheet.getDataRange().getValues()
  const rowIdx = data.findIndex((r, i) => i > 0 && r[0] === bookingId)

  if (rowIdx === -1) return jsonResponse({ success: false, error: 'Reserva no encontrada' }, 404)

  const sheetRow = rowIdx + 1 // 1-indexed

  // Col O = status (index 14), Col P = admin_notes (index 15)
  sheet.getRange(sheetRow, 15).setValue(status)
  if (adminNotes !== undefined) sheet.getRange(sheetRow, 16).setValue(adminNotes)

  return jsonResponse({ success: true, message: 'Reserva actualizada' })
}

// ════════════════════════════════
//  EMAILS
// ════════════════════════════════

function sendAdminEmail(bookingId, data, routeLabel, price) {
  const props       = PropertiesService.getScriptProperties()
  const adminEmail  = props.getProperty('ADMIN_EMAIL')
  const adminPhone  = props.getProperty('ADMIN_PHONE')

  if (!adminEmail) return

  const waLink = `https://wa.me/${adminPhone}?text=${encodeURIComponent(
    `Hola ${data.clientName}, soy de DRIVIP. Tu reserva ${bookingId} ha sido confirmada 🚗`
  )}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0F1624;padding:28px 32px;text-align:center">
        <h1 style="color:#fff;font-size:24px;font-weight:800;letter-spacing:0.1em;margin:0">▲ DRIVIP</h1>
      </div>
      <div style="padding:32px;background:#fff">
        <h2 style="color:#0F1624;font-size:18px;margin:0 0 20px">🚗 Nueva reserva — ${bookingId}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${tableRow('Cliente', escHtml(data.clientName))}
          ${tableRow('WhatsApp', '+' + data.clientWhatsApp)}
          ${tableRow('Email', data.clientEmail)}
          ${tableRow('Ruta', routeLabel)}
          ${tableRow('Fecha', data.serviceDate + ' ' + data.serviceTime)}
          ${tableRow('Pasajeros', data.passengers || 1)}
          ${tableRow('Equipaje', data.luggage || 'light')}
          ${tableRow('Total', '<strong style="color:#6B5CE7">$' + price + '</strong>')}
          ${tableRow('Pago', data.paymentMethod === 'pay_now' ? 'Pago inmediato' : 'Pago al llegar')}
        </table>
        <div style="text-align:center;margin-top:28px">
          <a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-weight:700;font-size:14px">
            Confirmar por WhatsApp
          </a>
        </div>
      </div>
    </div>`

  GmailApp.sendEmail(adminEmail, `🚗 Nueva reserva DRIVIP — ${bookingId}`, '', { htmlBody: html })
}

function sendClientEmail(bookingId, data, routeLabel, price) {
  const props      = PropertiesService.getScriptProperties()
  const adminPhone = props.getProperty('ADMIN_PHONE')

  const waLink = `https://wa.me/${adminPhone}?text=${encodeURIComponent(
    `Hola DRIVIP, tengo una consulta sobre mi reserva ${bookingId}`
  )}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0F1624;padding:28px 32px;text-align:center">
        <h1 style="color:#fff;font-size:24px;font-weight:800;letter-spacing:0.1em;margin:0">▲ DRIVIP</h1>
      </div>
      <div style="padding:32px;background:#fff">
        <h2 style="color:#0F1624;font-size:18px;margin:0 0 8px">¡Hola, ${escHtml(data.clientName)}!</h2>
        <p style="color:#555;font-size:14px;margin:0 0 20px">Tu solicitud fue recibida. Nuestro equipo te contactará pronto para confirmar.</p>
        <div style="background:#f8f8ff;border-left:3px solid #6B5CE7;border-radius:8px;padding:18px 20px;margin:0 0 20px">
          <p style="margin:0 0 6px;font-size:13px;color:#888">Booking ID</p>
          <p style="margin:0;font-size:18px;font-weight:800;color:#6B5CE7">${bookingId}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${tableRow('Ruta', routeLabel)}
          ${tableRow('Fecha', data.serviceDate + ' ' + data.serviceTime)}
          ${tableRow('Pasajeros', data.passengers || 1)}
          ${tableRow('Total', '<strong style="color:#6B5CE7">$' + price + '</strong>')}
        </table>
        <div style="text-align:center;margin-top:28px">
          <a href="${waLink}" style="display:inline-block;background:#25d366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:100px;font-weight:700;font-size:14px">
            Contactar por WhatsApp
          </a>
        </div>
        <p style="text-align:center;font-size:11px;color:#999;margin-top:24px;font-style:italic">Confirmado antes de salir.</p>
      </div>
    </div>`

  GmailApp.sendEmail(data.clientEmail, `✅ Solicitud recibida — ${bookingId}`, '', { htmlBody: html })
}

// ════════════════════════════════
//  UTILITIES
// ════════════════════════════════

function generateBookingId() {
  const d   = new Date()
  const date = d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 900 + 100)
  return `DRV-${date}-${rand}`
}

function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tableRow(label, value) {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;font-size:13px;width:120px">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;color:#111;font-weight:500">${value}</td>
  </tr>`
}

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet()
  let sheet   = ss.getSheetByName(SHEET_NAME)

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow(HEADERS)
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setBackground('#0F1624')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
  }

  return sheet
}

function jsonResponse(data, code) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
  return output
}
