import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="dark relative min-h-dvh bg-background text-foreground grid lg:grid-cols-2 overflow-hidden">
      <div className="aurora" aria-hidden />

      {/* Left: hero panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 border-r border-border/60 bg-card/40 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg tracking-tight">SmartExpense</span>
        </Link>

        <div className="relative">
          <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
          <blockquote className="relative text-2xl leading-relaxed font-light">
            &ldquo;Finally saw where my money actually goes. The health score alone
            changed three of my habits.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/20 text-accent font-semibold">
              A
            </div>
            <div>
              <p className="text-sm font-medium">Aditi Sharma</p>
              <p className="text-xs text-muted-foreground">Product designer, Bengaluru</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Built for Hack In Motion &middot; FinTech theme
        </p>
      </aside>

      {/* Right: form */}
      <section className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
