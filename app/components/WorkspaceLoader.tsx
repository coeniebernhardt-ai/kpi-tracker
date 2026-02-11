'use client';

import { useState, useEffect } from 'react';
import Logo from './Logo';

/**
 * Branded loading screen: Think-Q logo + "Opening Your Workspace" + subtle loader.
 * Dark theme, fade-in 200–300ms, fade-out when ready. Used when loadingData === true.
 */
export default function WorkspaceLoader({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (active) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(t);
    }
  }, [active, mounted]);

  if (!visible && !active) return null;

  return (
    <div
      className={`fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-slate-950 transition-opacity duration-[250ms] ${active ? 'opacity-100' : 'opacity-0'}`}
      aria-busy={active}
      aria-live="polite"
    >
      <Logo variant="team" className="opacity-90" width={160} height={40} />
      <p className="text-slate-400 text-sm font-medium">Opening Your Workspace</p>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-2 h-2 rounded-full bg-blue-300 animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}
