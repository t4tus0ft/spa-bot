const crypto = require('crypto');

const PREFIX = 'sha256=';

function computeSignature(rawBody, secret) {
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return PREFIX + digest;
}

function verifySignature(rawBody, header, secret) {
  if (!rawBody || typeof header !== 'string' || !header.startsWith(PREFIX)) {
    return false;
  }
  const provided = Buffer.from(header.slice(PREFIX.length), 'utf8');
  const expected = Buffer.from(computeSignature(rawBody, secret).slice(PREFIX.length), 'utf8');
  if (provided.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(provided, expected);
}

function verifyWhatsAppWebhook(req, res, next) {
  const secret = process.env.WHATSAPP_APP_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[whatsapp] WHATSAPP_APP_SECRET no configurado; webhook rechazado');
      return res.status(403).json({ error: 'Webhook no configurado' });
    }
    console.warn('[whatsapp] WHATSAPP_APP_SECRET no configurado; omitiendo verificación (solo desarrollo)');
    return next();
  }

  if (!verifySignature(req.rawBody, req.headers['x-hub-signature-256'], secret)) {
    console.warn('[whatsapp] firma de webhook inválida');
    return res.status(403).json({ error: 'Firma inválida' });
  }

  next();
}

module.exports = { verifyWhatsAppWebhook, verifySignature, computeSignature };
