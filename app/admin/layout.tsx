import { Suspense, type ReactNode } from 'react';
import { AdminDataProvider } from './AdminDataProvider';
import AdminShell from './AdminShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
          Loading admin workspace...
        </div>
      }
    >
      <AdminDataProvider>
        <AdminShell>{children}</AdminShell>
      </AdminDataProvider>
    </Suspense>
  );
}
