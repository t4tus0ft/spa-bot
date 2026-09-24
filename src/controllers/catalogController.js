const spaRepository = require('../repositories/spaRepository');

function list(req, res) {
  const spa = spaRepository.findByIdOrFirstActive(req.query.spa_id);
  if (!spa) {
    return res.status(404).json({ error: 'No hay spa configurado' });
  }
  const catalog = spaRepository.toCatalog(spa);
  res.json({
    spa_id: spa.id,
    count: catalog.length,
    services: catalog,
  });
}

function byId(req, res) {
  const spa = spaRepository.findByIdOrFirstActive(req.query.spa_id);
  if (!spa) {
    return res.status(404).json({ error: 'No hay spa configurado' });
  }
  const service = spaRepository.toCatalog(spa).find(s => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Servicio no encontrado' });
  }
  res.json(service);
}

module.exports = { list, byId };
