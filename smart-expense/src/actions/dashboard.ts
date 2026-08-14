'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { normalizeMonthFilter } from '@/lib/dashboard-filter';

const COOKIE = 'smart-expense-month';

/**
 * Persist the dashboard's month filter as a cookie the server component
 * reads on next render. Passing null / '' / 'all' clears the filter.
 * Revalidates all pages whose data depends on the filter.
 */
export async function setDashboardMonth(month: string | null): Promise<void> {
  const store = await cookies();
  const normalized = normalizeMonthFilter(month);
  if (normalized) {
    store.set(COOKIE, normalized, {
      httpOnly: false,
      sameSite: 'lax',
      // ~1 year — this is a UI preference, no PII
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  } else {
    store.delete(COOKIE);
  }
  revalidatePath('/dashboard');
  revalidatePath('/insights');
}
