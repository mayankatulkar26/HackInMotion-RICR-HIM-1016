# Forgot Password Feature Documentation

## Overview

The "Forgot Password" feature allows users to securely reset their password through an OTP (One-Time Password) verification flow. This is integrated into the login page as a convenient option for users who have forgotten their password.

## User Flow

### Step 1: Request Password Reset
1. User clicks "Forgot?" link on the login page
2. A modal dialog opens with a form to enter their email
3. System sends an OTP to the user's registered email address
4. User sees a confirmation message

### Step 2: Verify OTP
1. User receives email with 6-digit OTP code
2. User enters the OTP in the verification form
3. System validates the OTP (checks expiry and correctness)
4. User proceeds to reset password

### Step 3: Reset Password
1. User enters the OTP again (security measure)
2. User enters their new password (minimum 6 characters)
3. System validates and hashes the new password
4. Password is updated in the database

### Step 4: Success
1. User sees a success message
2. User is returned to the login form
3. User can now log in with their new password

## Technical Implementation

### New Server Actions (in `src/actions/auth.ts`)

#### `requestPasswordResetAction(formData: FormData)`
- **Purpose**: Initiates password reset by sending OTP to user's email
- **Parameters**: FormData with `email` field
- **Returns**: `OTPSignupResult` with success message or error
- **Process**:
  - Validates email format
  - Checks if user exists
  - Generates 6-digit OTP
  - Sends OTP email
  - Stores OTP in database with 10-minute expiry

#### `verifyPasswordResetOTPAction(formData: FormData)`
- **Purpose**: Verifies the OTP before password reset
- **Parameters**: FormData with `email` and `otp` fields
- **Returns**: `ActionResult` (success or error)
- **Process**:
  - Validates OTP format (6 digits)
  - Checks OTP expiry
  - Compares with stored OTP
  - Returns success if valid

#### `resetPasswordAction(formData: FormData)`
- **Purpose**: Updates user's password after OTP verification
- **Parameters**: FormData with `email`, `otp`, and `newPassword` fields
- **Returns**: `ActionResult` (success or error)
- **Process**:
  - Validates all inputs
  - Re-verifies OTP (security)
  - Hashes new password with bcrypt
  - Updates password in database
  - Clears OTP and expiry

### New Component: `ForgotPasswordForm`
**Location**: `src/components/auth/forgot-password-form.tsx`

Features:
- 4-step multi-state component (email, otp-verify, reset-password, success)
- Smooth transitions between steps
- Error handling with toast notifications
- Back buttons to allow users to restart
- Password visibility toggle
- Visual feedback with loading states

### Updated Component: `LoginForm`
**Location**: `src/components/auth/login-form.tsx`

Changes:
- Added "Forgot?" link next to password field
- Integrated modal dialog to show forgot password form
- Uses Radix UI Dialog for accessibility
- Maintains login functionality

## Security Features

✅ **OTP Verification**
- 6-digit random OTP generated on each request
- 10-minute expiry time
- Can only be used once per reset attempt

✅ **Password Security**
- Passwords hashed with bcrypt (10 salt rounds)
- Minimum 6 characters enforced
- Double verification of OTP during reset

✅ **Rate Limiting** (Optional Enhancement)
- Can be added to prevent brute force attempts
- Recommended for production

✅ **Email Validation**
- User must have account with email
- OTP sent only to verified email address
- Email in plaintext cannot be modified during reset

## Files Modified

1. **`src/actions/auth.ts`**
   - Added 3 new server actions for password reset flow

2. **`src/components/auth/login-form.tsx`**
   - Added "Forgot?" link
   - Integrated Dialog modal
   - Imported ForgotPasswordForm

3. **`src/components/auth/login-form.tsx`** (implicitly updated)
   - Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription

## Files Created

1. **`src/components/auth/forgot-password-form.tsx`**
   - New component handling the forgot password flow
   - 4-step process with state management

## Email Integration

The forgot password feature uses the existing email service configured in `src/lib/email.ts`:

- **Provider**: Gmail SMTP (via credentials in .env)
- **Configuration Variables**:
  - `SMTP_HOST`: smtp.gmail.com
  - `SMTP_PORT`: 587
  - `SMTP_SECURE`: false (for TLS)
  - `SMTP_USER`: Your Gmail email
  - `SMTP_PASS`: Your Gmail App Password

**Email Template**: Same professional template used for signup OTP

## Usage Example

### For End Users:
```
1. Go to /login
2. Click "Forgot?" link below password field
3. Enter your email address
4. Click "Send Reset OTP"
5. Check your email for 6-digit code
6. Enter OTP in the form
7. Enter your new password
8. Click "Reset Password"
9. See success message
10. Return to login and use new password
```

### For Developers (Testing):
```typescript
// Test forgot password flow
const fd = new FormData();
fd.set('email', 'user@example.com');
const res = await requestPasswordResetAction(fd);
// Result: { ok: true, message: "OTP sent..." }

// Verify OTP
const fd2 = new FormData();
fd2.set('email', 'user@example.com');
fd2.set('otp', '123456');
const res2 = await verifyPasswordResetOTPAction(fd2);
// Result: { ok: true }

// Reset password
const fd3 = new FormData();
fd3.set('email', 'user@example.com');
fd3.set('otp', '123456');
fd3.set('newPassword', 'NewPassword123');
const res3 = await resetPasswordAction(fd3);
// Result: { ok: true }
```

## Testing Checklist

- [ ] Click "Forgot?" link on login page
- [ ] Modal opens with email form
- [ ] Enter valid email address
- [ ] Receive OTP email
- [ ] Enter OTP in verification form
- [ ] OTP validates and proceeds to password reset
- [ ] Enter new password
- [ ] Password updates successfully
- [ ] See success message
- [ ] Login with new password works
- [ ] Test with expired OTP (wait 10+ minutes)
- [ ] Test with wrong OTP
- [ ] Test with non-existent email
- [ ] Test with weak password (< 6 chars)

## Troubleshooting

### "No account found with this email"
- Ensure the email is registered in your system
- User may need to sign up first

### "OTP has expired"
- OTP is valid for 10 minutes only
- User can request a new OTP by going back to email step

### "Invalid OTP"
- Check that OTP is copied correctly (no spaces)
- Ensure OTP matches exactly (case-sensitive digits)

### Email not received
- Check spam/junk folder
- Verify SMTP credentials in .env
- Check email service logs

### Password reset successful but can't login
- Ensure new password is being used
- Check that email is lowercase
- Clear browser cache/cookies

## Future Enhancements

- [ ] Resend OTP functionality with countdown timer
- [ ] Rate limiting on OTP requests
- [ ] SMS-based password reset option
- [ ] Password strength meter
- [ ] Security questions as alternative verification
- [ ] Login attempt history
- [ ] Device fingerprinting
- [ ] Two-factor authentication (2FA)

## Database Impact

The existing User model already has the required fields:
- `otp` - Stores the temporary OTP
- `otpExpiry` - Stores OTP expiration timestamp

No database migration needed - existing schema is compatible.

## API Endpoints

All password reset operations are Server Actions (not REST endpoints):

| Action | Type | Input | Output |
|--------|------|-------|--------|
| `requestPasswordResetAction` | Server Action | email | OTPSignupResult |
| `verifyPasswordResetOTPAction` | Server Action | email, otp | ActionResult |
| `resetPasswordAction` | Server Action | email, otp, newPassword | ActionResult |

## Performance Considerations

- Email sending is async (doesn't block user)
- OTP generation is instant (6 random digits)
- Database queries are indexed on email field
- Minimal payload size for all requests

## Production Deployment

Before deploying to production:

1. **Email Service**:
   - Use production SMTP credentials
   - Enable SSL/TLS verification
   - Consider email service like SendGrid, AWS SES

2. **Security**:
   - Add rate limiting middleware
   - Enable HTTPS only
   - Add reCAPTCHA to password reset form

3. **Monitoring**:
   - Log all password reset attempts
   - Alert on suspicious patterns
   - Monitor email service health

4. **Backup**:
   - Ensure database backups are working
   - Have recovery procedures in place

## Support

For issues or feature requests, refer to:
- [Nodemailer Documentation](https://nodemailer.com/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/components/dialog)
