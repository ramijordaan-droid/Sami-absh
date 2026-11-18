// Vercel serverless function — TEST ONLY.
// Sends a generic notification. It never accepts or forwards form fields.
// IMPORTANT: These credentials were shared in chat. Rotate them after testing.

const PUSHOVER_APP_TOKEN = 'a1i47tapxjska68ppeuv5sz7n7k549';
const PUSHOVER_USER_KEY = 'ui9s8fpr41hf3qvnydb2dx7u6cru8b';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Accept only a fixed test event; do not forward names, phone numbers,
  // salaries, loan details, or any other submitted form data.
  if (!req.body || req.body.event !== 'test_notification') {
    return res.status(400).json({ error: 'Invalid test event' });
  }

  try {
    const payload = new URLSearchParams({
      token: PUSHOVER_APP_TOKEN,
      user: PUSHOVER_USER_KEY,
      title: 'اختبار إشعارات الموقع',
      message: 'تم إرسال إشعار تجريبي بنجاح.',
      priority: '0'
    });

    const upstream = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload
    });

    const result = await upstream.json();
    if (!upstream.ok || result.status !== 1) {
      return res.status(502).json({ error: 'Pushover rejected the test notification' });
    }

    return res.status(200).json({ ok: true, message: 'Test notification sent' });
  } catch {
    return res.status(502).json({ error: 'Could not contact Pushover' });
  }
}
