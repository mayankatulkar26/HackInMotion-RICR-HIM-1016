import nodemailer from 'nodemailer';

// Configure SMTP email service.
//
// Timeouts are intentionally aggressive (10s each): serverless hosts kill
// long-running functions at ~15-30s, so we'd rather fail fast and surface
// the real error to the user than hang until the platform kills us.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // false for STARTTLS (587), true for SSL (465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

// Validate configuration
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('⚠️  Warning: SMTP credentials not configured. OTP emails will fail.');
  console.warn('Set SMTP_USER and SMTP_PASS in .env file.');
}

export async function sendOTPEmail(email: string, otp: string, name: string) {
  try {
    // Verify credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials not configured in environment variables');
    }

    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@smartexpense.com',
      to: email,
      subject: 'Your Smart Expense OTP Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0066cc;">Welcome to Smart Expense, ${name}!</h2>
            
            <p>Your account verification code is:</p>
            
            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h1 style="color: #0066cc; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            
            <p><strong>This code will expire in 10 minutes.</strong></p>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this code, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            
            <p style="color: #999; font-size: 12px;">
              © 2024 Smart Expense. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to send OTP: ${error.message}`
        : 'Failed to send OTP email'
    );
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
