const { sql, ensureSchema } = require('../../lib/db');
const { isAuthenticated } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const bookingId = Number(req.query.id);
  if (!Number.isInteger(bookingId)) {
    res.status(400).json({ error: 'Invalid booking id' });
    return;
  }

  const { action } = req.body || {};
  if (action !== 'confirm' && action !== 'decline') {
    res.status(400).json({ error: 'Invalid action' });
    return;
  }

  const newStatus = action === 'confirm' ? 'confirmed' : 'declined';

  try {
    await ensureSchema();

    const rows = await sql`
      UPDATE bookings SET status = ${newStatus} WHERE id = ${bookingId} RETURNING id
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    if (err && err.code === '23505') {
      res.status(409).json({ error: 'That time slot is already booked by another confirmed appointment.' });
      return;
    }
    res.status(500).json({ error: 'Failed to update booking' });
  }
};
