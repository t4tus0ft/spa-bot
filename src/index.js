require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const healthController = require('./controllers/healthController');
const catalogController = require('./controllers/catalogController');
const availabilityController = require('./controllers/availabilityController');
const chatController = require('./controllers/chatController');
const adminController = require('./controllers/adminController');

const { rateLimit } = require('./middleware/rateLimit');
const { verifyWhatsAppWebhook } = require('./middleware/whatsappSignature');
const { getDatabase, closeDatabase } = require('./config/database');
const messageRepository = require('./repositories/messageRepository');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; },
}));

getDatabase();
messageRepository.deleteOlderThan(7);

const demoRateLimit = rateLimit({
  windowMs: Number(process.env.DEMO_RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.DEMO_RATE_LIMIT_MAX) || 20,
});

app.get('/health', healthController.health);
app.get('/webhook-info', healthController.webhookInfo);

app.get('/catalog', catalogController.list);
app.get('/catalog/:id', catalogController.byId);

app.get('/availability', availabilityController.availability);

app.post('/demo/chat', demoRateLimit, chatController.demoChat);
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: PUBLIC_DIR });
});

app.get('/demo', (req, res) => {
  res.sendFile('demo.html', { root: PUBLIC_DIR });
});

app.post('/webhook/whatsapp', verifyWhatsAppWebhook, chatController.handleWhatsApp);
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('Webhook WhatsApp verificado');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.get('/admin', (req, res) => {
  res.sendFile('admin.html', { root: PUBLIC_DIR });
});
app.get('/api/admin/spas', requireAdmin, adminController.listSpas);
app.get('/api/admin/spas/:id', requireAdmin, adminController.getSpa);
app.post('/api/admin/spas', requireAdmin, adminController.createSpa);
app.put('/api/admin/spas/:id', requireAdmin, adminController.updateSpa);
app.get('/api/admin/appointments', requireAdmin, adminController.listAppointments);
app.patch('/api/admin/appointments/:id', requireAdmin, adminController.updateAppointmentStatus);

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_TOKEN no configurado' });
  }
  const provided = req.headers['x-admin-token'];
  if (provided !== expected) {
    return res.status(403).json({ error: 'Token de administración inválido' });
  }
  next();
}

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

function gracefulShutdown() {
  console.log('\nCerrando SpaBot...');
  closeDatabase();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

app.listen(PORT, () => {
  console.log(`🧖‍♀️ SpaBot corriendo en puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

module.exports = app;
