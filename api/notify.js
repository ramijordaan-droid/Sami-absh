// Vercel serverless function: sends a generic Pushover alert only.
// Required Vercel Environment Variables:
// PUSHOVER_APP_TOKEN = your Pushover application/API token
// PUSHOVER_USER_KEY  = your Pushover user key

let lastSentAtByIp = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const host = req.headers.host;
  const origin = req.headers.origin;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: 'Invalid origin' });
      }
    } catch {
      return res.status(403).json({ error: 'Invalid origin' });
    }
  }

  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const previous = lastSentAtByIp.get(ip) || 0;
  if (now - previous < 15000) {
    return res.status(429).json({ error: 'Please wait before trying again' });
  }

  const appToken = process.env.PUSHOVER_APP_TOKEN;
  const userKey = process.env.PUSHOVER_USER_KEY;
  if (!appToken || !userKey) {
    return res.status(500).json({ error: 'Pushover is not configured' });
  }

  // Deliberately accept only a fixed event; never forward names, phone numbers,
  // age, salary, loan amount, or any other form fields.
  if (!req.body || req.body.event !== 'new_form_submission') {
    return res.status(400).json({ error: 'Invalid event' });
  }

  const body = new URLSearchParams({
    token: appToken,
    user: userKey,
    title: 'إشعار الموقع',
    message: 'تم تقديم نموذج جديد على الموقع.',
    priority: '0'
  });

  try {
    const upstream = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const result = await upstream.json();
    if (!upstream.ok || result.status !== 1) {
      return res.status(502).json({ error: 'Pushover rejected the notification' });
    }
    lastSentAtByIp.set(ip, now);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Could not contact Pushover' });
  }
}
