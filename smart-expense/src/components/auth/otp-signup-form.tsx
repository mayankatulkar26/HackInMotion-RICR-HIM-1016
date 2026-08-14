'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, UserPlus, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signupWithOTPAction, verifyOTPAction } from '@/actions/auth';

type SignupStep = 'register' | 'verify-otp';

export function OTPSignupForm() {
  const [step, setStep] = useState<SignupStep>('register');
  const [showPw, setShowPw] = useState(false);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();

  function onSignupSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signupWithOTPAction(fd);
      if (res.ok) {
        setEmail((fd.get('email') as string).toLowerCase());
        setName(fd.get('name') as string);
        setOtpSent(true);
        setStep('verify-otp');
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
      const res = await verifyOTPAction(fd);
      if (res.ok) {
        toast.success('Email verified! Redirecting to dashboard...');
        router.push('/dashboard');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (step === 'verify-otp') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            OTP sent to <strong>{email}</strong>. Please check your inbox and enter the code below.
          </p>
        </div>

        <form onSubmit={onOTPVerifySubmit} className="space-y-4">
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
              setStep('register');
              setOtpSent(false);
              setEmail('');
            }}
            disabled={pending}
          >
            Back to Sign Up
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Didn't receive the code?{' '}
          <button
            onClick={() => {
              setStep('register');
              setOtpSent(false);
            }}
            className="text-accent hover:underline font-medium"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSignupSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required placeholder="Riya Kapoor" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
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
          ℹ️ We'll send a verification code to your email to complete signup.
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" /> Create account & Send OTP
          </>
        )}
      </Button>
    </form>
  );
}
