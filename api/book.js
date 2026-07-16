const BOOKING_EMAIL = 'yashikmaharaj496@gmail.com';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateAppointment(dateStr, timeStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') || !/^\d{2}:\d{2}$/.test(timeStr || '')) {
    return 'Invalid appointment date or time format';
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const dayOfWeek = selectedDate.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    return 'Appointment date must be in the future';
  }

  if (dayOfWeek === 0 || dayOfWeek === 1) {
    return 'The salon is open Tuesday–Saturday only';
  }

  const [hour, minute] = timeStr.split(':').map(Number);
  const minutesSinceMidnight = hour * 60 + minute;
  if (minutesSinceMidnight < 9 * 60 || minutesSinceMidnight > 19 * 60) {
    return 'Appointment time must be between 9:00 AM and 7:00 PM';
  }

  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, email, date, time, message } = req.body || {};

  if (!name || !email || !date || !time || !message) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const validationError = validateAppointment(date, time);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(500).json({ error: 'Email service is not configured' });
    return;
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lumière Hair Studio <onboarding@resend.dev>',
        to: [BOOKING_EMAIL],
        reply_to: email,
        subject: `New booking request from ${name} — ${date} ${time}`,
        html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>
               <p><strong>Email:</strong> ${escapeHtml(email)}</p>
               <p><strong>Requested Date:</strong> ${escapeHtml(date)}</p>
               <p><strong>Requested Time:</strong> ${escapeHtml(time)}</p>
               <p><strong>Message:</strong></p>
               <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });

    if (!resendRes.ok) {
      const details = await resendRes.text();
      res.status(502).json({ error: 'Failed to send email', details });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
