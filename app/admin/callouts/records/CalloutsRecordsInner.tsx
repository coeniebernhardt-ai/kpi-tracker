'use client';

import { useSearchParams } from 'next/navigation';
import CalloutsRecordsClient from './CalloutsRecordsClient';

export default function CalloutsRecordsInner() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  return <CalloutsRecordsClient statusFilter={statusFilter} />;
}
