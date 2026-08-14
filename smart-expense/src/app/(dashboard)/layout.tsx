import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { listGoals } from '@/actions/budgets';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const goals = await listGoals();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ConfirmProvider>
        <div className="flex min-h-dvh lg:h-screen">
          <Sidebar />
          <div className="flex flex-1 min-w-0 flex-col">
            <Topbar
              user={{ name: session.user.name, email: session.user.email }}
              goals={goals}
            />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
              {children}
            </main>
          </div>
        </div>
      </ConfirmProvider>
    </div>
  );
}
