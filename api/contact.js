// ===================================================================
// api/contact.js — Vercel serverless function
// Receives the contact form's data and sends a formatted email via
// Resend. The API key lives here, server-side, only — it is never
// sent to the browser, so it can't be stolen from the page's source.
// ===================================================================

module.exports = async function handler(req, res) {
  // Only accept POST — reject anything else (GET, etc.)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, contact, details, website } = req.body;
  // Honeypot spam protection — discard submissions where the hidden
  // website field has been filled in by a bot.
  if (typeof website === 'string' && website.trim() !== '') {
    return res.status(200).json({ success: true });
  }

  // Basic server-side validation — never trust the client alone.
  if (!name || !contact) {
    return res.status(400).json({ error: 'Name and contact info are required.' });
  }

  if (name.length > 200 || contact.length > 200 || (details && details.length > 5000)) {
    return res.status(400).json({ error: 'Submission too long.' });
  }

  const emailHtml = buildEmailHtml({ name, contact, details });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DEME Housepainting <enquiries@demehousepainting.ie>',
        to: process.env.CONTACT_EMAIL_TO,
        // The field accepts "email or phone". Resend rejects a reply_to that
        // isn't an email address, which would lose phone-only enquiries -
        // so only set it when the visitor actually gave an email.
        ...(isEmail(contact) ? { reply_to: contact.trim() } : {}),
        subject: `New enquiry from ${name}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Resend error:', errBody);
      return res.status(502).json({ error: 'Email service failed.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
};

// -------------------------------------------------------------------
// Email template — inline styles only. Email clients (Outlook, Gmail,
// Apple Mail) largely ignore <style> blocks and modern CSS, so every
// style has to live directly on each element via the style="" attribute.
// -------------------------------------------------------------------
function buildEmailHtml({ name, contact, details }) {
  const escapedName = escapeHtml(name);
  const escapedContact = escapeHtml(contact);
  const escapedDetails = details ? escapeHtml(details).replace(/\n/g, '<br>') : '<em style="color:#8a8577;">No details provided.</em>';

  return `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background-color:#F0EBDF; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0EBDF; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color:#FAFAF8; border-radius: 6px; overflow: hidden;">

          <tr>
            <td style="background-color:#16233F; padding: 28px 32px;">
              <span style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #D9A468; font-weight: 600;">New Website Enquiry</span>
              <div style="font-size: 22px; color: #FAFAF8; font-weight: 300; margin-top: 6px;">
                <strong style="font-weight: 800;">DEME</strong> Housepainting
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #8a8577; padding-bottom: 4px;">Name</td>
                </tr>
                <tr>
                  <td style="font-size: 16px; color: #16233F; border-bottom: 1px solid #E5DFD0; padding-bottom: 12px;">${escapedName}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #8a8577; padding-bottom: 4px;">Email / Phone</td>
                </tr>
                <tr>
                  <td style="font-size: 16px; color: #16233F; border-bottom: 1px solid #E5DFD0; padding-bottom: 12px;">${escapedContact}</td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #8a8577; padding-bottom: 4px;">Project Details</td>
                </tr>
                <tr>
                  <td style="font-size: 15px; line-height: 1.6; color: #16233F;">${escapedDetails}</td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding: 18px 32px; background-color: #F0EBDF; font-size: 12px; color: #8a8577;">
              Sent automatically from the DEME Housepainting website contact form.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str).trim());
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
