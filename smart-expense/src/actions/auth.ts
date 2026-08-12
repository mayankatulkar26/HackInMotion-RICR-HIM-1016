'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { connectDb } from '@/db';
import { User } from '@/db/models';
import { signIn, signOut } from '@/lib/auth';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

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
    await signIn('credentials', {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    throw err;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' });
}
