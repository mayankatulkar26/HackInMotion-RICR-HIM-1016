import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to continue to your dashboard.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-72 rounded-md bg-secondary/40 animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-accent hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
