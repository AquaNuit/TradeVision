import crypto from 'node:crypto';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'tradevision2026';
const ADMIN_EMAIL = 'admin@tradevision.local';
const SECRET_KEY = '67a100130a4345992e8584aa28fcce3e7e747bae4ca1d1cf7a1cc3aabfee56fa';

function createAccessToken(username) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: username, role: 'admin', exp, iat: now })).toString('base64url');
  const msg = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', SECRET_KEY).update(msg).digest('base64url');
  return `${msg}.${sig}`;
}

function parseBody(event) {
  let body = event.body || '';
  if (event.isBase64Encoded) body = Buffer.from(body, 'base64').toString('utf8');
  const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded') || body.includes('username=')) {
    const params = new URLSearchParams(body);
    return { username: params.get('username') || '', password: params.get('password') || '' };
  }
  try {
    const json = JSON.parse(body || '{}');
    return { username: json.username || '', password: json.password || '' };
  } catch {
    return { username: '', password: '' };
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  const { username, password } = parseBody(event);
  if (!username || !password) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ detail: 'Username and password required' }) };
  }
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ detail: 'Incorrect username or password' }) };
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      access_token: createAccessToken(username),
      token_type: 'bearer',
      expires_in: 86400,
      user: { username: ADMIN_USERNAME, email: ADMIN_EMAIL, full_name: 'Admin', role: 'admin' },
    }),
  };
};
