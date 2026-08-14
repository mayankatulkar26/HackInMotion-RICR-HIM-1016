# OTP-Based Authentication Setup Guide

This guide explains how to set up and use the new OTP (One-Time Password) based email authentication system for Smart Expense.

## Overview

The OTP authentication flow works as follows:
1. **Signup**: User enters name, email, and password
2. **OTP Generation**: System generates a 6-digit OTP and sends it to the user's email
3. **Verification**: User enters the OTP received in their email
4. **Access**: Upon successful verification, user is automatically logged in and redirected to the dashboard

## Setup Instructions

### 1. Install Dependencies

First, install the required packages:

```bash
npm install
```

The `nodemailer` package has been added to handle email sending.

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env.local
```

#### For Gmail SMTP (Recommended for Testing):

1. Enable "Less secure app access" or use an [App Password](https://support.google.com/accounts/answer/185833):
   - Go to Google Account Security Settings
   - Enable 2-Step Verification
   - Generate an App Password for Mail
   - Copy the 16-character password

2. Update `.env.local`:
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

#### For Custom SMTP Server:

Update `.env.local`:
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
```

### 3. Configure Other Required Variables

Make sure you also have:
```env
MONGODB_URI=your-mongodb-uri
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Database Changes

The User model has been updated with the following new fields:

- `isEmailVerified` (Boolean): Tracks if the user's email has been verified
- `otp` (String): Stores the current OTP
- `otpExpiry` (Date): Stores the OTP expiration time (10 minutes from generation)

No migration needed - MongoDB will create these fields automatically.

## File Changes

### New Files Created:

1. **`src/lib/email.ts`**
   - `sendOTPEmail()`: Sends OTP to user's email
   - `generateOTP()`: Generates a random 6-digit OTP
   - `getOTPExpiry()`: Calculates OTP expiry time (10 minutes)

2. **`src/components/auth/otp-signup-form.tsx`**
   - New signup form component with OTP verification step
   - Two-step UI: Registration → OTP Verification
   - Improved UX with visual feedback and error handling

### Modified Files:

1. **`src/db/models.ts`**
   - Added `isEmailVerified`, `otp`, and `otpExpiry` fields to User schema

2. **`src/actions/auth.ts`**
   - Added `signupWithOTPAction()`: Creates user and sends OTP
   - Added `verifyOTPAction()`: Verifies OTP and marks email as verified

3. **`src/lib/auth.ts`**
   - Updated credentials provider to support OTP verification
   - Added `isOTPVerify` flag for OTP-based signin

4. **`src/app/(auth)/signup/page.tsx`**
   - Updated to use new `OTPSignupForm` component

5. **`package.json`**
   - Added `nodemailer` and `@types/nodemailer` dependencies

## How It Works

### Signup Flow:

```typescript
// User submits signup form
1. signupWithOTPAction(formData)
   ├─ Validate input (name, email, password)
   ├─ Check if email already exists
   ├─ Hash password with bcrypt
   ├─ Generate 6-digit OTP
   ├─ Send OTP email
   ├─ Store user with OTP (not verified yet)
   └─ Return success message

// User enters OTP
2. verifyOTPAction(formData)
   ├─ Validate OTP format (6 digits)
   ├─ Check if OTP hasn't expired
   ├─ Compare provided OTP with stored OTP
   ├─ Mark email as verified
   ├─ Clear OTP and expiry
   ├─ Sign in user automatically
   └─ Redirect to dashboard
```

### Email Template:

The OTP email includes:
- Personalized greeting with user's name
- Large, easy-to-read OTP display
- Expiration time (10 minutes)
- Security notice about not sharing the code
- Professional footer

## OTP Validity:

- **Generation**: 6-digit random number
- **Validity Period**: 10 minutes from generation
- **Auto-Expiry**: After 10 minutes, user must request a new OTP
- **Max Attempts**: No hard limit (user can retry), but OTP expires after 10 minutes

## Security Considerations:

✅ **Implemented:**
- OTP stored in database (not in emails)
- Automatic expiry after 10 minutes
- Password hashed with bcrypt
- HTTPS only in production
- NextAuth JWT session tokens

⚠️ **Recommended Additional Steps:**
- Rate limiting on OTP requests (prevent brute force)
- Rate limiting on OTP verification attempts
- Add reCAPTCHA to signup form
- Monitor for suspicious patterns
- Consider TOTP (Time-based OTP) for enhanced security

## Troubleshooting

### Email Not Sending:

1. **Gmail Issues**:
   - Verify credentials in `.env.local`
   - Check if 2FA is enabled
   - Use App Password instead of regular password
   - Allow less secure app access

2. **SMTP Issues**:
   - Test connection with correct host, port, and credentials
   - Check firewall/network settings
   - Enable TLS/SSL if required

3. **General**:
   - Check application logs for error messages
   - Verify EMAIL_USER environment variable is set
   - Test with a different email provider

### OTP Not Validating:

1. Check expiry time (10 minutes)
2. Verify exact OTP match (case-sensitive, no spaces)
3. Check database connection
4. Verify user exists in database

### User Not Logging In After OTP Verification:

1. Check if `isEmailVerified` is set to true in database
2. Verify NextAuth configuration
3. Check session/JWT configuration in `auth.config.ts`

## Testing the Feature

### Manual Testing Steps:

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Navigate to /signup
# 4. Fill in the signup form
# 5. Check your email for OTP
# 6. Enter OTP and verify
# 7. Should redirect to dashboard automatically
```

### Test Credentials:

For Gmail testing, create a dedicated test email account or use your existing one with an App Password.

## Email Provider Options

### Option 1: Gmail (Easiest for Testing)
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Option 2: SendGrid
```env
# Update email.ts to use SendGrid API
SENDGRID_API_KEY=your-api-key
```

### Option 3: AWS SES
```env
# Update email.ts to use AWS SES
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### Option 4: Custom SMTP
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
```

## Future Enhancements

- [ ] Resend OTP functionality
- [ ] Rate limiting on OTP requests
- [ ] SMS-based OTP option
- [ ] Multi-factor authentication (TOTP)
- [ ] OTP recovery codes
- [ ] Device fingerprinting
- [ ] Login attempt history

## Support

For issues or questions, please refer to:
- [NextAuth Documentation](https://next-auth.js.org/)
- [Nodemailer Documentation](https://nodemailer.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
