import { useCallback, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_CARE_LOGS, GET_MY_BOOKING_TASKS } from '../graphql/queries';

// ── Live task progress + care logs for the patient tracking view ─────────────
//
// The caregiver ticks tasks (setTaskDone) and posts notes (addCareLog) from their
// job page. There is no realtime channel for booking_tasks / care_logs, so this
// uses the same safety net as useJobEvents: a 30s poll while the job is running,
// plus an immediate refetch when the tab comes back to the foreground.
// Once the job is over the data is history — `live: false` stops the poll.

const POLL_INTERVAL_MS = 30_000;
const CARE_LOG_LIMIT = 100; // backend MAX_LIMIT

export interface PatientBookingTask {
  id: string;
  description: string;
  timeNote?: string | null;
  sortOrder: number;
  doneAt?: string | null;
}

export interface PatientCareLog {
  id: string;
  bookingId: string;
  category: string;
  body: string;
  photoUrl?: string | null;
  serverTs: string;
}

export function useCareProgress(bookingId: string | undefined, { live }: { live: boolean }) {
  const skip = !bookingId;
  const pollInterval = live ? POLL_INTERVAL_MS : 0;

  const tasksQuery = useQuery<{ myBooking: { id: string; bookingTasks: PatientBookingTask[] } }>(
    GET_MY_BOOKING_TASKS,
    { variables: { id: bookingId ?? '' }, skip, fetchPolicy: 'cache-and-network', pollInterval, errorPolicy: 'all' },
  );
  const logsQuery = useQuery<{ careLogs: PatientCareLog[] }>(
    GET_CARE_LOGS,
    {
      variables: { bookingId: bookingId ?? '', limit: CARE_LOG_LIMIT, offset: 0 },
      skip,
      fetchPolicy: 'cache-and-network',
      pollInterval,
      errorPolicy: 'all',
    },
  );

  const { refetch: refetchTasks } = tasksQuery;
  const { refetch: refetchLogs } = logsQuery;
  const refetch = useCallback(() => {
    if (!bookingId) return;
    // Swallow transient network errors — the poll will catch up.
    refetchTasks().catch(() => {});
    refetchLogs().catch(() => {});
  }, [bookingId, refetchTasks, refetchLogs]);

  useEffect(() => {
    if (!bookingId || !live) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [bookingId, live, refetch]);

  const tasks = tasksQuery.data?.myBooking?.bookingTasks ?? null;
  const logs = logsQuery.data?.careLogs ?? null;

  return {
    /** null = not loaded yet (distinguish from a booking that genuinely has no tasks) */
    tasks,
    /** Newest first, as the backend returns them. null = not loaded yet. */
    logs,
    loading: (tasksQuery.loading && tasks === null) || (logsQuery.loading && logs === null),
    refetch,
  };
}

export default useCareProgress;
