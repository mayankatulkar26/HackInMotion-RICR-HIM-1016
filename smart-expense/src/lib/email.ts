/**
 * Email sender for OTP verification.
 *
 * Uses Brevo's HTTP API instead of SMTP.
 * This keeps the setup simple and avoids nodemailer.
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM = process.env.BREVO_FROM || 'Wealth Sight <no-reply@yourdomain.com>';

function parseSender(from: string): { email: string; name: string } {
  const match = from.match(/^(.+?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }

  return { name: 'Wealth Sight', email: from.trim() };
}

async function sendViaBrevo(
  to: string,
  subject: string,
  html: string,
  name: string,
): Promise<void> {
  if (!BREVO_API_KEY) throw new Error('Brevo API key not configured');

  const sender = parseSender(BREVO_FROM);

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: sender.name,
        email: sender.email,
      },
      to: [
        {
          email: to,
          name,
        },
      ],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 200) || res.statusText}`);
  }
}

/* ---------------------------------------------------- Public API --------- */

const OTP_TEMPLATE = (otp: string, name: string) => `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #0066cc;">Welcome to Wealth Sight, ${name}!</h2>
    <p>Your account verification code is:</p>
    <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
      <h1 style="color: #0066cc; letter-spacing: 5px; margin: 0;">${otp}</h1>
    </div>
    <p><strong>This code will expire in 10 minutes.</strong></p>
    <p style="color: #666; font-size: 14px;">
      If you didn't request this code, please ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    <p style="color: #999; font-size: 12px;">© 2026 Wealth Sight. All rights reserved.</p>
  </div>
</div>`.trim();

export async function sendOTPEmail(
  email: string,
  otp: string,
  name: string,
): Promise<boolean> {
  const subject = 'Your Wealth Sight OTP Verification Code';
  const html = OTP_TEMPLATE(otp, name);

  if (!BREVO_API_KEY) {
    const detail = 'Brevo API key not configured';
    console.error('❌ OTP email failed:', detail);
    throw new Error(`Failed to send OTP: ${detail}`);
  }

  try {
    await sendViaBrevo(email, subject, html, name);
    console.log('✅ OTP email sent via Brevo');
    return true;
  } catch (err: any) {
    const detail = err?.message ?? String(err);
    console.error('❌ OTP email failed:', detail);
    throw new Error(`Failed to send OTP: ${detail}`);
  }
}

// Generate a random OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get OTP expiry time (10 minutes from now)
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}
