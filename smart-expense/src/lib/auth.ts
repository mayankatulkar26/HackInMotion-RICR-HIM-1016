import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectDb } from '@/db';
import { User } from '@/db/models';
import { authConfig } from './auth.config';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const otpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  isOTPVerify: z.literal('true'),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        otp: {},
        isOTPVerify: {},
      },
      async authorize(raw) {
        // Handle OTP verification signin
        if (raw?.isOTPVerify === 'true') {
          const parsed = otpVerifySchema.safeParse(raw);
          if (!parsed.success) return null;
          const { email } = parsed.data;

          await connectDb();
          const user = await User.findOne({ email: email.toLowerCase() }).lean();
          if (!user || !user.isEmailVerified) return null;

          return {
            id: String(user._id),
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          };
        }

        // Handle regular password signin
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        await connectDb();
        const user = await User.findOne({ email: email.toLowerCase() }).lean();
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
});
