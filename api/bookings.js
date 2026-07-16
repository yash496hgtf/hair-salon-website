const { sql, ensureSchema } = require('../lib/db');
const { isAuthenticated } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await ensureSchema();

    const rows = await sql`
      SELECT id, name, email, appointment_date, appointment_time, message, status, created_at
      FROM bookings
      ORDER BY appointment_date ASC, appointment_time ASC
    `;

    res.status(200).json({ bookings: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load bookings' });
  }
};
