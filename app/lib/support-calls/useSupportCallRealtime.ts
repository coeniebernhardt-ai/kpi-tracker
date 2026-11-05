'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';

const TABLES = [
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

type Options = {
  supportCallId?: string | null;
  ticketId?: string | null;
  enabled?: boolean;
  /** Called when remote data may have changed. Caller should refetch carefully. */
  onChange: () => void;
  /** When true, skip onChange (e.g. while local form is dirty / busy). */
  pause?: boolean;
};

/**
 * Subscribes to Supabase Realtime for support-call related tables.
 * Falls back silently if realtime is unavailable; exposes connection status.
 */
export function useSupportCallRealtime({
  supportCallId,
  ticketId,
  enabled = true,
  onChange,
  pause = false,
}: Options): { connected: boolean; status: 'off' | 'connecting' | 'live' | 'error' } {
  const [status, setStatus] = useState<'off' | 'connecting' | 'live' | 'error'>('off');
  const onChangeRef = useRef(onChange);
  const pauseRef = useRef(pause);
  onChangeRef.current = onChange;
  pauseRef.current = pause;

  useEffect(() => {
    if (!enabled || (!supportCallId && !ticketId)) {
      setStatus('off');
      return;
    }

    setStatus('connecting');
    const channelName = `sc-rt-${supportCallId || ticketId}-${Math.random().toString(36).slice(2, 8)}`;
    let channel = supabase.channel(channelName);

    const fire = () => {
      if (pauseRef.current) return;
      onChangeRef.current();
    };

    for (const table of TABLES) {
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
      if (s === 'SUBSCRIBED') setStatus('live');
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error');
      else if (s === 'CLOSED') setStatus('off');
    });

    return () => {
      void supabase.removeChannel(channel);
      setStatus('off');
    };
  }, [enabled, supportCallId, ticketId]);

  return { connected: status === 'live', status };
}
