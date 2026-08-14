'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { connectDb } from '@/db';
import { User } from '@/db/models';
import { signIn, signOut } from '@/lib/auth';
import { sendOTPEmail, generateOTP, getOTPExpiry } from '@/lib/email';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const otpSignupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const otpVerifySchema = z.object({
  email: z.string().email('Invalid email'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type ActionResult =
  | { ok: true; user?: { name?: string | null; email?: string | null } }
  | { ok: false; error: string };

export type OTPSignupResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }
  const { name, email, password } = parsed.data;
  const emailLower = email.toLowerCase();

  await connectDb();
  const existing = await User.findOne({ email: emailLower }).lean();
  if (existing) {
    return { ok: false, error: 'An account with this email already exists.' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ email: emailLower, name, passwordHash });

  try {
    await signIn('credentials', {
      email: emailLower,
      password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: 'Account created but sign-in failed. Please log in.' };
    }
    throw err;
  }

  return { ok: true };
}

/* ============================================================ OTP SIGNUP ========== */

export async function signupWithOTPAction(formData: FormData): Promise<OTPSignupResult> {
  const parsed = otpSignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' };
  }

  const { name, email, password } = parsed.data;
  const emailLower = email.toLowerCase();

  await connectDb();

  // Check if user already exists
  const existing = await User.findOne({ email: emailLower }).lean();
  if (existing && existing.isEmailVerified) {
    return { ok: false, error: 'An account with this email already exists.' };
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiry = getOTPExpiry();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Send OTP email
    await sendOTPEmail(emailLower, otp, name);

    // Create or update user with OTP (not verified yet)
    if (existing) {
      // Update existing user
      await User.updateOne(
        { email: emailLower },
        {
          name,
          passwordHash,
          otp,
          otpExpiry,
          isEmailVerified: false,
        }
      );
    } else {
      // Create new user
      await User.create({
        email: emailLower,
        name,
        passwordHash,
        otp,
        otpExpiry,
        isEmailVerified: false,
      });
    }

    return { ok: true, message: 'OTP sent to your email. Please verify to continue.' };
  } catch (error) {
    console.error('OTP signup error:', error);
    return { ok: false, error: 'Failed to send OTP. Please try again.' };
  }
}

export async function verifyOTPAction(formData: FormData): Promise<ActionResult> {
  const parsed = otpVerifySchema.safeParse({
    email: formData.get('email'),
    otp: formData.get('otp'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email and 6-digit OTP.' };
  }

  const { email, otp } = parsed.data;
  const emailLower = email.toLowerCase();

  await connectDb();

  const user = await User.findOne({ email: emailLower });
  if (!user) {
    return { ok: false, error: 'User not found. Please sign up first.' };
  }

  // Check if OTP is expired
  if (!user.otpExpiry || new Date() > user.otpExpiry) {
    return { ok: false, error: 'OTP has expired. Please sign up again.' };
  }

  // Check if OTP matches
  if (user.otp !== otp) {
    return { ok: false, error: 'Invalid OTP. Please try again.' };
  }

  try {
    // Mark email as verified and clear OTP
    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Sign in using OTP verification credentials
    await signIn('credentials', {
      email: emailLower,
      otp,
      isOTPVerify: 'true',
      redirect: false,
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: 'Email verified but sign-in failed. Please log in manually.' };
    }
    throw err;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email and password.' };
  }

  try {
    const email = parsed.data.email.toLowerCase();
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirect: false,
    });

    const user = await User.findOne({ email }).select('name email').lean();
    return {
      ok: true,
      user: {
        name: user?.name ?? null,
        email: user?.email ?? email,
      },
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    throw err;
  }
}

export async function signOutAction() {
  await signOut({ redirect: false });
}

/* ============================================================ FORGOT PASSWORD ========== */

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function requestPasswordResetAction(
  formData: FormData
): Promise<OTPSignupResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid email' };
  }

  const { email } = parsed.data;
  const emailLower = email.toLowerCase();

  await connectDb();

  const user = await User.findOne({ email: emailLower }).lean();
  if (!user) {
    return { ok: false, error: 'No account found with this email address.' };
  }

  try {
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Send OTP email
    await sendOTPEmail(emailLower, otp, user.name || 'User');

    // Store OTP in database
    await User.updateOne(
      { email: emailLower },
      {
        otp,
        otpExpiry,
      }
    );

    return {
      ok: true,
      message: 'Password reset OTP sent to your email. Please verify to continue.',
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    return { ok: false, error: 'Failed to send reset OTP. Please try again.' };
  }
}

export async function verifyPasswordResetOTPAction(
  formData: FormData
): Promise<ActionResult> {
  const parsed = otpVerifySchema.safeParse({
    email: formData.get('email'),
    otp: formData.get('otp'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Please enter a valid email and 6-digit OTP.' };
  }

  const { email, otp } = parsed.data;
  const emailLower = email.toLowerCase();

  await connectDb();

  const user = await User.findOne({ email: emailLower });
  if (!user) {
    return { ok: false, error: 'User not found.' };
  }

  // Check if OTP is expired
  if (!user.otpExpiry || new Date() > user.otpExpiry) {
    return { ok: false, error: 'OTP has expired. Please request a new one.' };
  }

  // Check if OTP matches
  if (user.otp !== otp) {
    return { ok: false, error: 'Invalid OTP. Please try again.' };
  }

  return { ok: true };
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get('email'),
    otp: formData.get('otp'),
    newPassword: formData.get('newPassword'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? 'Invalid input',
    };
  }

  const { email, otp, newPassword } = parsed.data;
  const emailLower = email.toLowerCase();

  await connectDb();

  const user = await User.findOne({ email: emailLower });
  if (!user) {
    return { ok: false, error: 'User not found.' };
  }

  // Verify OTP one more time
  if (!user.otpExpiry || new Date() > user.otpExpiry) {
    return { ok: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (user.otp !== otp) {
    return { ok: false, error: 'Invalid OTP.' };
  }

  try {
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    await User.updateOne(
      { email: emailLower },
      {
        passwordHash,
        otp: null,
        otpExpiry: null,
      }
    );

    return { ok: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { ok: false, error: 'Failed to reset password. Please try again.' };
  }
}
