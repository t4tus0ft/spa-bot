const calendarService = require('../services/calendarService');
const spaRepository = require('../repositories/spaRepository');

function availability(req, res) {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'El parámetro "date" es requerido (formato YYYY-MM-DD)' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
  }

  const spa = spaRepository.findByIdOrFirstActive(req.query.spa_id);
  if (!spa) {
    return res.status(404).json({ error: 'No hay spa configurado' });
  }

  const slots = calendarService.getAvailableSlots(spa, date);

  res.json({
    spa_id: spa.id,
    date,
    slots,
    count: slots.length,
  });
}

module.exports = { availability };
