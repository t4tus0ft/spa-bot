function rateLimit({ windowMs, max, keyGenerator } = {}) {
  const window = Number(windowMs) > 0 ? Number(windowMs) : 60000;
  const limit = Number(max) > 0 ? Number(max) : 20;
  const getKey = keyGenerator || (req => req.ip || req.socket?.remoteAddress || 'unknown');
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now >= entry.resetAt) hits.delete(key);
    }
  }, window);
  if (cleanup.unref) cleanup.unref();

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = getKey(req);
    const entry = hits.get(key);

    if (!entry || now >= entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + window });
      return next();
    }

    entry.count += 1;
    if (entry.count > limit) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' });
    }

    next();
  };
}

module.exports = { rateLimit };
