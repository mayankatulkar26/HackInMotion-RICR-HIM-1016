'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { loginAction } from '@/actions/auth';
import { ForgotPasswordForm } from './forgot-password-form';

export function LoginForm() {
  const [showPw, setShowPw] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/dashboard';

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginAction(fd);
      if (res.ok) {
        toast.success('Welcome back!', {
          position: 'top-center',
          duration: 1800,
          style: {
            maxWidth: 'min(82vw, 340px)',
            fontSize: '0.9rem',
            lineHeight: '1.3',
          },
        });
        router.push(from);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs text-accent hover:underline font-medium"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
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

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" /> Sign in
            </>
          )}
        </Button>
      </form>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              We&apos;ll help you reset your password securely using OTP.
            </DialogDescription>
          </DialogHeader>
          <ForgotPasswordForm
            onBack={() => setShowForgotPassword(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
