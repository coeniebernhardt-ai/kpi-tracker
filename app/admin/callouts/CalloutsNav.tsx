'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin/callouts', label: 'Dashboard' },
  { href: '/admin/callouts/upload', label: 'Upload' },
  { href: '/admin/callouts/records', label: 'Records' },
  { href: '/admin/callouts/review', label: 'Review' },
  { href: '/admin/callouts/documents', label: 'Documents' },
  { href: '/admin/callouts/analytics', label: 'Analytics' },
  { href: '/admin/callouts/settings', label: 'Settings' },
];

export default function CalloutsNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
      {LINKS.map((l) => {
        const active = pathname === l.href || (l.href !== '/admin/callouts' && pathname.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
