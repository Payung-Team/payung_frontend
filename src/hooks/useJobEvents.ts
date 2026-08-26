import { useCallback, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_PROOF_OF_WORK } from '../graphql/queries';
import { supabase } from '../lib/supabase';

// ── Live proof-of-work for the patient tracking view (PYG-361) ────────────────
//
// Three sources feed the same refetch, deliberately:
//   1. Supabase realtime on job_events — instant, but only fires while the
//      websocket is alive and the tab is in front.
//   2. A 30s poll — the safety net. A backgrounded tab gets its timers and
//      sockets throttled by the browser, so without this the patient can stare
//      at stale data with no indication anything is wrong.
//   3. visibilitychange — refetch the moment the tab comes back, rather than
//      waiting out the remainder of the poll interval.
//
// The realtime payload is never rendered directly. It carries raw column values:
// no signed photoUrl, and none of the resolver-computed fields (verdict,
// reviewReasons, jobCoordsMissing). It is a "something changed" ping, nothing more.

const POLL_INTERVAL_MS = 30_000;

export interface JobEventSummary {
  serverTs: string;
  lat?: number | null;
  lng?: number | null;
  photoUrl?: string | null;
  note?: string | null;
}

export interface ProofOfWork {
  checkIn?: JobEventSummary | null;
  checkOut?: JobEventSummary | null;
  actualMinutes?: number | null;
  bookedMinutes: number;
  distanceInM?: number | null;
  distanceOutM?: number | null;
  noCheckout: boolean;
  jobCoordsMissing: boolean;
  reviewReasons: string[];
  disputed: boolean;
  verdict: string;
}

export function useJobEvents(bookingId: string | undefined) {
  const { data, loading, error, refetch } = useQuery<{ proofOfWork: ProofOfWork }>(
    GET_PROOF_OF_WORK,
    {
      variables: { bookingId: bookingId ?? '' },
      skip: !bookingId,
      fetchPolicy: 'cache-and-network',
      pollInterval: POLL_INTERVAL_MS,
      // A booking with no check-in yet is a normal state, not a page-level failure.
      errorPolicy: 'all',
    },
  );

  const safeRefetch = useCallback(() => {
    if (!bookingId) return;
    // Swallow transient network errors — the poll will catch up.
    refetch().catch(() => {});
  }, [bookingId, refetch]);

  // 1. Realtime ping → refetch
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`job-events-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_events',
          filter: `booking_id=eq.${bookingId}`,
        },
        safeRefetch,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, safeRefetch]);

  // 2. Tab came back to the foreground → catch up immediately
  useEffect(() => {
    if (!bookingId) return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') safeRefetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [bookingId, safeRefetch]);

  return {
    proof: data?.proofOfWork ?? null,
    loading,
    error,
    refetch: safeRefetch,
  };
}

export default useJobEvents;
