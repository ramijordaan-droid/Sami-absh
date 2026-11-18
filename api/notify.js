// Vercel serverless function — generic Pushover test notification only.
// Add fresh credentials below before deploying.
// Do not put this file in a public repository.

const PUSHOVER_APP_TOKEN = "PUT_NEW_APPLICATION_API_TOKEN_HERE";
const PUSHOVER_USER_KEY = "PUT_NEW_USER_KEY_HERE";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Accept only a fixed event. Never forward form fields or personal data.
  if (!req.body || req.body.event !== "new_form_submission") {
    return res.status(400).json({ ok: false, error: "Invalid event" });
  }

  if (
    PUSHOVER_APP_TOKEN === "PUT_NEW_APPLICATION_API_TOKEN_HERE" ||
    PUSHOVER_USER_KEY === "PUT_NEW_USER_KEY_HERE"
  ) {
    return res.status(500).json({
      ok: false,
      error: "Add fresh Pushover credentials in api/notify.js"
    });
  }

  const body = new URLSearchParams({
    token: PUSHOVER_APP_TOKEN,
    user: PUSHOVER_USER_KEY,
    title: "إشعار الموقع",
    message: "تم تقديم نموذج جديد على الموقع.",
    priority: "0"
  });

  try {
    const upstream = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const raw = await upstream.text();
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      result = null;
    }

    if (!upstream.ok || !result || result.status !== 1) {
      // Return Pushover's diagnostic errors to help troubleshoot HTTP 400.
      const errors = Array.isArray(result?.errors) ? result.errors : [];
      return res.status(502).json({
        ok: false,
        error: "Pushover rejected the notification",
        pushover_status: upstream.status,
        details: errors.length ? errors : ["Unexpected response from Pushover"]
      });
    }

    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({
      ok: false,
      error: "Could not contact Pushover"
    });
  }
}
