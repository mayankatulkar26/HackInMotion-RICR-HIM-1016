import nodemailer from 'nodemailer';

/**
 * Email sender with two providers:
 *
 *   1. **Resend (HTTPS)** — preferred. Works on every serverless host
 *      (Vercel, Render free, Netlify, Cloudflare) because it goes over
 *      HTTPS, not raw SMTP. Set RESEND_API_KEY to enable.
 *   2. **SMTP (nodemailer)** — fallback for anyone who has open SMTP egress.
 *      Uses SMTP_HOST/PORT/SECURE/USER/PASS.
 *
 * At least one must be configured. Selection is silent: whichever key is
 * present wins; if both are set, Resend goes first and SMTP is the fallback.
 */

const RESEND_URL = 'https://api.resend.com/emails';
const RESEND_KEY = process.env.RESEND_API_KEY;
// Default "from" is Resend's sandbox address; works out of the box without
// domain verification. Set RESEND_FROM to a verified sender for production.
const RESEND_FROM = process.env.RESEND_FROM || 'Wealth Sight <onboarding@resend.dev>';

// Timeouts are intentionally tight — serverless functions get killed by the
// host at ~15-30s, so fail fast and surface the real error instead of
// letting the platform SIGKILL us mid-request.
const smtpTransporter =
  process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      })
    : null;

if (!RESEND_KEY && !smtpTransporter) {
  console.warn(
    '⚠️  No email provider configured. Set RESEND_API_KEY (recommended) or SMTP_USER + SMTP_PASS.',
  );
}

/* ---------------------------------------------------- Provider: Resend ---- */

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!RESEND_KEY) throw new Error('resend not configured');
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Resend ${res.status}: ${body.slice(0, 200) || res.statusText}`,
    );
  }
}

/* -------------------------------------------------- Provider: SMTP (nodemailer) */

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!smtpTransporter) throw new Error('SMTP not configured');
  await smtpTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER!,
    to,
    subject,
    html,
  });
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
  const errors: string[] = [];

  if (RESEND_KEY) {
    try {
      await sendViaResend(email, subject, html);
      console.log('✅ OTP email sent via Resend');
      return true;
    } catch (err: any) {
      errors.push(`resend: ${err?.message ?? String(err)}`);
    }
  }

  if (smtpTransporter) {
    try {
      await sendViaSmtp(email, subject, html);
      console.log('✅ OTP email sent via SMTP');
      return true;
    } catch (err: any) {
      errors.push(`smtp: ${err?.message ?? String(err)}`);
    }
  }

  const detail =
    errors.length > 0
      ? errors.join(' | ')
      : 'no email provider configured (set RESEND_API_KEY or SMTP_USER + SMTP_PASS)';
  console.error('❌ OTP email failed:', detail);
  throw new Error(`Failed to send OTP: ${detail}`);
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
