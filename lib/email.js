function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendEmail({ to, subject, html, replyTo }) {
  const payload = {
    from: 'Lumière Hair Studio <bookings@m235i.co.za>',
    to: [to],
    subject,
    html,
  };
  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Resend error (${res.status}): ${details}`);
  }

  return res.json();
}

module.exports = { escapeHtml, sendEmail };
