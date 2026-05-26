import type { ReactNode } from 'react';

export default function CalloutsLayout({ children }: { children: ReactNode }) {
  return <div className="max-w-6xl">{children}</div>;
}
