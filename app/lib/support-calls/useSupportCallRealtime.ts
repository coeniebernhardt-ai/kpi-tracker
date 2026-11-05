'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';

/** Tables managers can reliably SELECT via RLS */
const MANAGER_TABLES = [
  'support_calls',
  'support_call_assignments',
  'support_call_partners',
  'support_call_visits',
  'support_call_hardware_items',
  'support_call_contributions',
  'support_call_communications',
  'support_call_eta_events',
  'support_call_quotes',
  'support_call_job_cards',
  'support_call_documents',
] as const;

/** Assignees: avoid manager-only tables that break the channel */
const MEMBER_TABLES = [
  'support_calls',
  'support_call_assignments',
  'support_call_visits',
  'support_call_hardware_items',
  'support_call_contributions',
  'support_call_eta_events',
  'support_call_documents',
] as const;

export type SyncStatus = 'off' | 'connecting' | 'synced' | 'pending' | 'failed';

type Options = {
  supportCallId?: string | null;
  ticketId?: string | null;
  enabled?: boolean;
  /** Managers subscribe to more tables than members */
  role?: 'manager' | 'member';
  onChange: () => void;
  pause?: boolean;
};

/**
 * Supabase Realtime for support-call tables with role-scoped lists and reconnect backoff.
 */
export function useSupportCallRealtime({
  supportCallId,
  ticketId,
  enabled = true,
  role = 'member',
  onChange,
  pause = false,
}: Options): { connected: boolean; status: SyncStatus } {
  const [status, setStatus] = useState<SyncStatus>('off');
  const onChangeRef = useRef(onChange);
  const pauseRef = useRef(pause);
  onChangeRef.current = onChange;
  pauseRef.current = pause;
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!enabled || (!supportCallId && !ticketId)) {
      setStatus('off');
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fire = () => {
      if (pauseRef.current) return;
      onChangeRef.current();
    };

    const subscribe = () => {
      if (cancelled) return;
      setStatus(attemptRef.current === 0 ? 'connecting' : 'pending');
      const tables = role === 'manager' ? MANAGER_TABLES : MEMBER_TABLES;
      const channelName = `sc-rt-${role}-${supportCallId || ticketId}-${Date.now()}`;
      channel = supabase.channel(channelName);

      for (const table of tables) {
        const filter = supportCallId
          ? table === 'support_calls'
            ? `id=eq.${supportCallId}`
            : `support_call_id=eq.${supportCallId}`
          : undefined;
        channel = channel.on(
          'postgres_changes',
          filter
            ? { event: '*', schema: 'public', table, filter }
            : { event: '*', schema: 'public', table },
          () => fire()
        );
      }

      if (ticketId) {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` },
          () => fire()
        );
      }

      channel.subscribe((s) => {
        if (cancelled) return;
        if (s === 'SUBSCRIBED') {
          attemptRef.current = 0;
          setStatus('synced');
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('failed');
          void supabase.removeChannel(channel!);
          channel = null;
          const delay = Math.min(30000, 1000 * 2 ** Math.min(attemptRef.current, 5));
          attemptRef.current += 1;
          retryTimer = setTimeout(subscribe, delay);
        } else if (s === 'CLOSED') {
          setStatus('off');
        }
      });
    };

    subscribe();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) void supabase.removeChannel(channel);
      setStatus('off');
    };
  }, [enabled, supportCallId, ticketId, role]);

  return { connected: status === 'synced', status };
}
