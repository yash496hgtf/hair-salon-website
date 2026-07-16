const crypto = require('crypto');

const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;
const COOKIE_NAME = 'admin_session';

function createSessionToken() {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const signature = crypto
    .createHmac('sha256', process.env.ADMIN_PASSWORD)
    .update(String(expiry))
    .digest('hex');
  return `${expiry}.${signature}`;
}

function verifySessionToken(token) {
  if (!token) return false;
  const [expiryStr, signature] = token.split('.');
  if (!expiryStr || !signature) return false;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  const expected = crypto
    .createHmac('sha256', process.env.ADMIN_PASSWORD)
    .update(expiryStr)
    .digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

function setSessionCookie(res) {
  const token = createSessionToken();
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_MS / 1000}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}

module.exports = { isAuthenticated, setSessionCookie, clearSessionCookie };
