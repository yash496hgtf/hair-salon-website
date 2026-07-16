const { sql, ensureSchema } = require('../../lib/db');
const { isAuthenticated } = require('../../lib/auth');
const { escapeHtml, sendEmail } = require('../../lib/email');

function formatDateForEmail(dateValue) {
  return new Date(dateValue).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTimeForEmail(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

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
      UPDATE bookings SET status = ${newStatus} WHERE id = ${bookingId}
      RETURNING id, name, email, appointment_date, appointment_time
    `;

    if (rows.length === 0) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    let emailWarning = null;

    if (action === 'confirm') {
      const booking = rows[0];
      try {
        await sendEmail({
          to: booking.email,
          subject: 'Your appointment at Lumière Hair Studio is confirmed',
          html: `<p>Hi ${escapeHtml(booking.name)},</p>
                 <p>Your appointment has been <strong>confirmed</strong> for:</p>
                 <p><strong>${escapeHtml(formatDateForEmail(booking.appointment_date))}</strong> at
                 <strong>${escapeHtml(formatTimeForEmail(booking.appointment_time))}</strong></p>
                 <p>We look forward to seeing you at Lumière Hair Studio!</p>
                 <p>123 Main Street, Your City<br>(555) 123-4567</p>`,
        });
      } catch (emailErr) {
        emailWarning = 'Booking confirmed, but the confirmation email failed to send.';
      }
    }

    res.status(200).json({ success: true, emailWarning });
  } catch (err) {
    if (err && err.code === '23505') {
      res.status(409).json({ error: 'That time slot is already booked by another confirmed appointment.' });
      return;
    }
    res.status(500).json({ error: 'Failed to update booking' });
  }
};
