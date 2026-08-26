// ── Booking status — single source of truth ───────────────────────────────────
// These are the BACKEND status names, used verbatim (PYG-357). The frontend used
// to rename them ('confirmed' → 'accepted', 'accepted' → 'awaiting_payment'),
// which meant the word 'accepted' meant two different things depending on which
// file you were in. Don't reintroduce a translation layer.
//
// Flow (PYG-357):
//   confirmed → in_progress → awaiting_release | needs_review → completed
//
// Note 'accepted' means "caregiver said yes, patient has not paid yet" and
// 'confirmed' means "paid, waiting for the service date".

export type BookingStatus =
  | 'pending'           // waiting for a caregiver to accept
  | 'accepted'          // caregiver accepted — payment still due
  | 'confirmed'         // paid — waiting for the service date
  | 'in_progress'       // caregiver checked in
  | 'awaiting_release'  // caregiver checked out, money not yet released
  | 'needs_review'      // check-out flagged — admin is reviewing
  | 'rejected'
  | 'cancelled'
  | 'completed';

const KNOWN_STATUSES = new Set<string>([
  'pending', 'accepted', 'confirmed', 'in_progress',
  'awaiting_release', 'needs_review', 'rejected', 'cancelled', 'completed',
]);

/** Backend values that have no UI state of their own and fold into another one. */
const ALIASES: Record<string, BookingStatus> = {
  unmatched: 'pending',          // created, no caregiver assigned yet
  declined: 'rejected',
  awaiting_payment: 'accepted',  // legacy frontend-only name
};

/**
 * Normalise a raw status string from GraphQL.
 *
 * Unknown values are NOT silently folded into 'pending' — that used to be the
 * behaviour and it meant every status the backend added later showed up as
 * "รอตอบรับ" with no error anywhere. We still have to return something usable,
 * so we fall back to 'pending' but make the noise loud enough to notice.
 */
export function mapGqlStatus(raw: string | null | undefined): BookingStatus {
  const v = (raw ?? '').toLowerCase();
  if (KNOWN_STATUSES.has(v)) return v as BookingStatus;
  const alias = ALIASES[v];
  if (alias) return alias;
  console.warn(
    `[bookingStatus] unknown status "${raw}" from backend — falling back to 'pending'. ` +
    'Add it to BookingStatus if the backend introduced a new one.',
  );
  return 'pending';
}

/** Statuses where the job has started and can no longer be treated as upcoming. */
export const ACTIVE_JOB_STATUSES: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  'in_progress', 'awaiting_release', 'needs_review',
]);
