// Gemini proxy. Only job: hold the API key. It never touches shop data —
// the browser runs the tools with its own admin session and posts results back.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const DAILY_CAP = Number(process.env.GEMINI_DAILY_CAP || 200);

// ponytail: in-memory per-IP cap, resets on cold start. It bounds quota burn, it is
// not auth — the real gate is moving this behind the backend's session middleware.
const hits = new Map();

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const readBody = async (req) => {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!process.env.GEMINI_API_KEY) return send(res, 500, { error: 'GEMINI_API_KEY is not set' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  const key = `${new Date().toISOString().slice(0, 10)}:${ip}`;
  if (hits.size > 500) hits.clear();
  const used = (hits.get(key) || 0) + 1;
  if (used > DAILY_CAP) return send(res, 429, { error: 'Daily AI limit reached' });
  hits.set(key, used);

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify(await readBody(req)),
      }
    );
    send(res, upstream.status, await upstream.json());
  } catch (err) {
    send(res, 502, { error: err.message });
  }
}
