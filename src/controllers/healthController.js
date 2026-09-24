const { getDatabase } = require('../config/database');

function health(req, res) {
  const db = getDatabase();
  let dbOk = false;
  try {
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
}

function webhookInfo(req, res) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }

  res.json({
    whatsapp: {
      webhook_url: '/webhook/whatsapp',
      method: 'POST',
      status: 'active',
    },
    whatsapp_verify_token: process.env.WHATSAPP_VERIFY_TOKEN || 'no configurado',
    server_time: new Date().toISOString(),
  });
}

module.exports = { health, webhookInfo };