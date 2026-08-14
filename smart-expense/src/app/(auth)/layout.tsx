import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh bg-background text-foreground flex flex-col overflow-hidden">
      <div className="aurora" aria-hidden />

      {/* Header */}
      <header className="relative border-b border-border/60 p-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg tracking-tight">Wealth Sight</span>
        </Link>
      </header>

      {/* Centered form section */}
      <section className="relative flex-1 p-6 sm:p-10">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden lg:flex flex-col justify-center auth-tagline">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent/80 auth-tagline-kicker">
              Smart money habits
            </p>
            <div className="mt-6 space-y-3 text-4xl font-semibold leading-tight tracking-tight text-foreground/95">
              <div className="auth-tagline-line text-transparent bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 bg-clip-text" style={{ animationDelay: '0.1s' }}>
                Track Smart
              </div>
              <div className="auth-tagline-line text-transparent bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 bg-clip-text" style={{ animationDelay: '0.35s' }}>
                Spend Wise
              </div>
              <div className="auth-tagline-line text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 bg-clip-text" style={{ animationDelay: '0.6s' }}>
                Grow Strong
              </div>
            </div>
            <p className="mt-6 max-w-md text-base text-muted-foreground auth-tagline-copy" style={{ animationDelay: '0.8s' }}>
              Make every decision clearer with a smarter way to track spending and build wealth.
            </p>
          </div>

          <div className="auth-form-panel w-full max-w-md justify-self-center lg:justify-self-end">{children}</div>
        </div>
      </section>
    </main>
  );
}
