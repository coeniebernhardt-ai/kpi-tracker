import { Suspense } from 'react';
import CalloutsRecordsInner from './CalloutsRecordsInner';

export default function CalloutsRecordsPage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading records…</p>}>
      <CalloutsRecordsInner />
    </Suspense>
  );
}
