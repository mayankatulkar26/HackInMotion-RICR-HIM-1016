'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  requestPasswordResetAction,
  verifyPasswordResetOTPAction,
  resetPasswordAction,
} from '@/actions/auth';

type ForgotPasswordStep = 'email' | 'otp-verify' | 'reset-password' | 'success';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await requestPasswordResetAction(fd);
      if (res.ok) {
        setEmail((fd.get('email') as string).toLowerCase());
        setStep('otp-verify');
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    });
  }

  function onOTPVerifySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('email', email);
    startTransition(async () => {
      const res = await verifyPasswordResetOTPAction(fd);
      if (res.ok) {
        setStep('reset-password');
        toast.success('OTP verified! Now enter your new password.');
      } else {
        toast.error(res.error);
      }
    });
  }

  function onResetPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('email', email);
    startTransition(async () => {
      const res = await resetPasswordAction(fd);
      if (res.ok) {
        setStep('success');
        toast.success('Password reset successfully!');
        setTimeout(() => {
          onBack();
          router.refresh();
        }, 2000);
      } else {
        toast.error(res.error);
      }
    });
  }

  // Step 1: Request Password Reset
  if (step === 'email') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Reset Your Password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email address and we&apos;ll send you an OTP to reset your password.
          </p>
        </div>

        <form onSubmit={onEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending OTP…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" /> Send Reset OTP
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onBack}
            disabled={pending}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </Button>
        </form>
      </div>
    );
  }

  // Step 2: Verify OTP
  if (step === 'otp-verify') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Verify OTP</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a verification code to <strong>{email}</strong>
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Check your inbox for the 6-digit OTP code.
          </p>
        </div>

        <form onSubmit={onOTPVerifySubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-otp">Verification Code</Label>
            <Input
              id="reset-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="000000"
              className="text-center text-2xl letter-spacing tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code from your email
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Verify OTP
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setStep('email');
              setEmail('');
            }}
            disabled={pending}
          >
            <ArrowLeft className="h-4 w-4" /> Request New OTP
          </Button>
        </form>
      </div>
    );
  }

  // Step 3: Reset Password
  if (step === 'reset-password') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Create New Password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your new password to complete the reset.
          </p>
        </div>

        <form onSubmit={onResetPasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="000000"
              className="text-center text-2xl letter-spacing tracking-widest"
            />
            <p className="text-xs text-muted-foreground">Re-enter your OTP</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                name="newPassword"
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-900">
              ✓ Password must be at least 6 characters long.
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Resetting…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Reset Password
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setStep('otp-verify')}
            disabled={pending}
          >
            <ArrowLeft className="h-4 w-4" /> Back to OTP
          </Button>
        </form>
      </div>
    );
  }

  // Step 4: Success
  if (step === 'success') {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900">
            ✓ Password Reset Successfully!
          </h2>
          <p className="mt-2 text-sm text-green-800">
            Your password has been reset. You can now sign in with your new password.
          </p>
        </div>

        <Button onClick={onBack} size="lg" className="w-full">
          Back to Login
        </Button>
      </div>
    );
  }

  return null;
}
