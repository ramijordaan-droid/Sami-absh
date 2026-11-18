// Vercel serverless function: sends a generic Pushover alert only.
// Never accepts or forwards form fields or applicant information.

let lastSentAtByIp = new Map();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Safe health check: reports whether secrets are configured, never their values.
    return res.status(200).json({
      route: 'ok',
      appTokenConfigured: Boolean(process.env.PUSHOVER_APP_TOKEN),
      userKeyConfigured: Boolean(process.env.PUSHOVER_USER_KEY)
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ code: 'method_not_allowed' });
  }

  const host = req.headers.host;
  const origin = req.headers.origin;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ code: 'origin_mismatch' });
      }
    } catch {
      return res.status(403).json({ code: 'invalid_origin' });
    }
  }

  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const previous = lastSentAtByIp.get(ip) || 0;
  if (now - previous < 15000) {
    return res.status(429).json({ code: 'rate_limited' });
  }

  const appToken = process.env.PUSHOVER_APP_TOKEN;
  const userKey = process.env.PUSHOVER_USER_KEY;
  if (!appToken || !userKey) {
    return res.status(500).json({
      code: 'missing_environment_variable',
      appTokenConfigured: Boolean(appToken),
      userKeyConfigured: Boolean(userKey)
    });
  }

  if (!req.body || req.body.event !== 'new_form_submission') {
    return res.status(400).json({ code: 'invalid_event' });
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
    let result;
    try { result = await upstream.json(); } catch { result = null; }
    if (!upstream.ok || !result || result.status !== 1) {
      // Return only Pushover's validation text, never credentials.
      const safeErrors = Array.isArray(result?.errors) ? result.errors.slice(0, 3) : [];
      return res.status(502).json({ code: 'pushover_rejected', details: safeErrors });
    }
    lastSentAtByIp.set(ip, now);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ code: 'pushover_unreachable' });
  }
}
