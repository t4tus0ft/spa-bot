# SpaBot

Bot de IA para reservas de spa por WhatsApp, con agenda, catálogo de servicios y panel de administración. Multi-tenant: cada spa tiene su catálogo, horario y número de WhatsApp.

## Requisitos

- Node.js
- npm

## Instalación

```bash
npm install
cp .env.example .env
```

Edita `.env` con tus credenciales (ver [Variables de entorno](#variables-de-entorno)).

## Uso

```bash
npm start   # producción
npm run dev # desarrollo con recarga (nodemon)
npm test    # tests con el runner nativo (node:test)
```

La base de datos SQLite se crea y migra automáticamente al arrancar, con un spa por defecto sembrado desde `src/data/catalog.json`.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `AI_API_KEY` | Clave del proveedor de IA (compatible con OpenAI SDK) |
| `AI_BASE_URL` | URL base del proveedor (por defecto Groq) |
| `AI_MODEL` | Modelo a usar |
| `DATABASE_PATH` | Ruta del archivo SQLite |
| `CONVERSATION_RETENTION_DAYS` | Días de conversaciones a conservar (0 desactiva la limpieza) |
| `NODE_ENV` | `development` expone `/webhook-info` |
| `TIMEZONE` | Zona horaria para la fecha del prompt |
| `WHATSAPP_VERIFY_TOKEN` | Token de verificación del webhook de Meta |
| `WHATSAPP_APP_SECRET` | App Secret de Meta; firma `X-Hub-Signature-256`. Obligatorio en producción |
| `WHATSAPP_API_VERSION` | Versión de la Graph API |
| `ADMIN_TOKEN` | Token para `/api/admin/*` (header `X-Admin-Token`) |
| `PORT` | Puerto del servidor |
| `DEMO_RATE_LIMIT_MAX` | Máximo de peticiones por IP a `/demo/chat` por ventana |
| `DEMO_RATE_LIMIT_WINDOW_MS` | Duración de la ventana del rate limit |

## Endpoints

Públicos:

- `GET /` — página de presentación
- `GET /demo` — demo de chat
- `POST /demo/chat` — `{ message, sessionId? }`
- `GET /catalog`, `GET /catalog/:id` — catálogo de servicios
- `GET /availability?date=YYYY-MM-DD` — horarios disponibles
- `GET /health` — estado (503 si la base de datos falla)
- `GET /webhook-info` — solo en `development`

WhatsApp:

- `GET /webhook/whatsapp` — verificación de suscripción de Meta
- `POST /webhook/whatsapp` — recepción de mensajes (firma `X-Hub-Signature-256`)

Administración (requieren header `X-Admin-Token`):

- `GET /admin` — panel
- `GET /api/admin/spas`, `GET /api/admin/spas/:id`
- `POST /api/admin/spas`, `PUT /api/admin/spas/:id`
- `GET /api/admin/appointments?spa_id=`
- `PATCH /api/admin/appointments/:id` — `{ status }`

## Estructura

```
src/
  config/        conexión a BD, migraciones y prompt del sistema
  controllers/   handlers HTTP
  middleware/    firma de webhook y rate limit
  repositories/  acceso a datos (spas, citas, conversaciones, mensajes)
  services/      IA, calendario y envío por WhatsApp
  data/          catálogo por defecto
public/          páginas (presentación, demo, admin)
```
