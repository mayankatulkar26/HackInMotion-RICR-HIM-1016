import Link from 'next/link';
import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Get your financial dashboard in under a minute.
      </p>
      <div className="mt-8">
        <SignupForm />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
