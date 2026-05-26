import { Suspense } from 'react';
import NotificationsPageImpl from './NotificationsPageImpl';

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
          Loading notifications...
        </div>
      }
    >
      <NotificationsPageImpl />
    </Suspense>
  );
}
