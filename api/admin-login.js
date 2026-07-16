const { setSessionCookie } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: 'Admin password is not configured' });
    return;
  }

  const { password } = req.body || {};

  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }

  setSessionCookie(res);
  res.status(200).json({ success: true });
};
