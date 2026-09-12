import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Icon } from '../../../components/ui/Icon';
import {
  FAMILY_GROUP_ACTIVITY,
  type FamilyGroup,
  type FamilyGroupActivity,
  type FamilyGroupActivityConnection,
} from '../../../graphql/familyGroup';
import { formatDayHeading, formatTime, useStrings } from '../familyStrings';
import { FG_ERROR, getFgErrorCode } from '../familyErrors';
import { describeActivity, TONE_CLASS } from '../activityCopy';
import {
  extractGraphQLErrorMessage,
  extractServerErrorBody,
} from '../../../lib/apolloErrors';

/**
 * Group activity history (PYG-422 · AC-BS-07).
 *
 * Newest first, keyset paginated — each page asks for the `first` N rows `after` the previous
 * page's `endCursor`, so a row written while the reader is scrolling can never shift the
 * window and duplicate or skip an entry the way an OFFSET page would.
 *
 * **Member-only entry point.** The panel is only ever mounted from the group dashboard, which
 * renders groups returned by `myFamilyGroups` — i.e. groups the caller is an ACTIVE member of.
 * The server re-checks membership on every call (is_group_member); the NOT_A_MEMBER branch
 * below exists for the race where the reader is removed while the page is open.
 */

const PAGE_SIZE = 15;

interface QueryData {
  familyGroupActivity: FamilyGroupActivityConnection;
}

/**
 * The BE query (PYG-421) is not deployed yet, so the server rejects the whole operation at
 * validation time. That is a "not built yet" state, not a failure the reader can retry away —
 * it gets its own calm card instead of a red error with a Retry button.
 *
 * Our API answers that with HTTP 400 + `application/json`, which Apollo Client 4 surfaces as a
 * `ServerError` rather than `CombinedGraphQLErrors` — so the code/message live in the raw body
 * and `getFgErrorCode` comes back empty. Both shapes are checked; the GraphQL one is what a
 * spec-compliant `application/graphql-response+json` server would send instead.
 */
function isSchemaMissing(err: unknown): boolean {
  if (getFgErrorCode(err) === 'GRAPHQL_VALIDATION_FAILED') return true;
  const text = extractGraphQLErrorMessage(err) ?? extractServerErrorBody(err) ?? '';
  return /GRAPHQL_VALIDATION_FAILED|Cannot query field|Unknown (?:type|argument)/i.test(text);
}

export default function ActivityPanel({ group }: { group: FamilyGroup }) {
  const s = useStrings();

  const { data, loading, error, fetchMore, refetch } = useQuery<QueryData>(
    FAMILY_GROUP_ACTIVITY,
    {
      variables: { groupId: group.id, first: PAGE_SIZE },
      fetchPolicy: 'cache-and-network',
      // Keep a partial page on screen if a later page errors, and let the panel render its
      // own state instead of the error bubbling out of the dashboard.
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
  );

  const connection = data?.familyGroupActivity;
  const items = useMemo(() => connection?.nodes ?? [], [connection]);
  const hasNextPage = connection?.hasNextPage ?? false;
  const endCursor = connection?.endCursor ?? null;

  // A page can only be asked for when the server gave us somewhere to continue from; a
  // `hasNextPage: true` with no cursor is treated as the end rather than a dead button.
  const canLoadMore = hasNextPage && !!endCursor;

  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState<unknown>(null);
  // `loadingMore` state lands a tick after the click/intersection; this ref closes that gap so
  // two observer callbacks in the same frame cannot fire the same page twice.
  const inFlight = useRef(false);

  const loadMore = useCallback(async () => {
    if (!canLoadMore || inFlight.current) return;
    inFlight.current = true;
    setLoadingMore(true);
    setPageError(null);
    try {
      await fetchMore({
        variables: { groupId: group.id, first: PAGE_SIZE, after: endCursor },
        updateQuery: (prev, { fetchMoreResult }) => {
          const next = fetchMoreResult?.familyGroupActivity;
          if (!next) return prev;
          const seen = new Set(prev.familyGroupActivity.nodes.map((n) => n.id));
          return {
            familyGroupActivity: {
              ...next,
              // Keyset paging still overlaps if a row lands between pages — dedupe by id so
              // React never sees two rows with the same key.
              nodes: [
                ...prev.familyGroupActivity.nodes,
                ...next.nodes.filter((n) => !seen.has(n.id)),
              ],
            },
          };
        },
      });
    } catch (e) {
      setPageError(e);
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }, [canLoadMore, endCursor, fetchMore, group.id]);

  // Infinite scroll: a sentinel below the last row pulls the next page into view before the
  // reader hits the bottom. The button underneath stays — it is the keyboard path, and the
  // fallback when IntersectionObserver never fires (hidden tab, reduced-motion scroll jumps).
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !canLoadMore || loadingMore || pageError) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, loadingMore, pageError, loadMore]);

  // Which userId is the reader — so their own rows read "คุณ …" rather than their own name.
  const myUserId = group.members.find((m) => m.isMe)?.userId;

  const firstLoad = loading && items.length === 0;
  const showError = !!error && items.length === 0;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-[#064E3B]">{s.activityTitle}</h3>
          <p className="mt-0.5 text-[13px] text-[#8A8C8E]">{s.activitySubtitle}</p>
        </div>
        {!showError && (
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            aria-label={s.activityRefresh}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-[13px] font-semibold text-[#475569] transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <Icon name="refresh" size="small" className="text-gray-400" />
            {s.activityRefresh}
          </button>
        )}
      </div>

      <div className="mt-5">
        {firstLoad ? (
          <FeedSkeleton />
        ) : showError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={s.activityEmptyTitle} body={s.activityEmptyBody} icon="history" />
        ) : (
          <>
            <Feed items={items} myUserId={myUserId} />

            {canLoadMore ? (
              <>
                <div ref={sentinelRef} aria-hidden="true" className="h-px" />
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-5 text-[13px] font-semibold text-[#475569] transition-colors hover:bg-gray-50 disabled:opacity-60"
                  >
                    {loadingMore && (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-[#009265]" />
                    )}
                    {loadingMore ? s.activityLoadingMore : s.activityLoadMore}
                  </button>
                </div>
              </>
            ) : (
              <p className="mt-4 text-center text-[12px] text-[#B0B4B8]">{s.activityEnd}</p>
            )}

            {!!pageError && (
              <p className="mt-3 text-center text-[12px] text-[#DC2626]">
                {s.activityErrorTitle} · {s.activityErrorBody}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────

/** Rows are already newest-first from the server; this only inserts the day separators. */
function Feed({
  items,
  myUserId,
}: {
  items: FamilyGroupActivity[];
  myUserId?: string;
}) {
  const s = useStrings();

  // A row opens a new day when its heading differs from the row above it. Derived by looking
  // back at the previous item rather than by carrying a mutable "last heading" through the
  // map, which the React compiler rejects as a render-time mutation.
  const rows = useMemo(
    () =>
      items.map((item, i) => {
        const heading = formatDayHeading(item.createdAt);
        const previous = i === 0 ? null : formatDayHeading(items[i - 1].createdAt);
        return { item, heading, showHeading: heading !== previous };
      }),
    [items],
  );

  return (
    <ol className="relative">
      {rows.map(({ item, heading, showHeading }, i) => {
        const isMe = !!myUserId && item.actor?.userId === myUserId;
        const actorName = isMe
          ? s.activityActorYou
          : item.actor?.displayName?.trim() ||
            item.actor?.email?.trim() ||
            s.activityActorUnknown;
        const { icon, tone, text, code } = describeActivity(item, actorName);

        return (
          <li key={item.id}>
            {showHeading && (
              <p className="pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.7px] text-[#8A8C8E] first:pt-0">
                {heading}
              </p>
            )}
            <div className="relative flex gap-3 pb-4">
              {/* Timeline rail — hidden on the last row so the line stops at the last dot. */}
              {i < rows.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[17px] top-9 h-[calc(100%-1.75rem)] w-px bg-gray-100"
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[tone]}`}
              >
                <Icon name={icon} size="small" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[14px] leading-6 text-[#1A1A1A]" title={code}>
                  {text}
                </p>
                <p className="mt-0.5 text-[12px] text-[#8A8C8E]">
                  <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ── States ───────────────────────────────────────────────────────────────────

function EmptyState({
  title,
  body,
  icon,
  tone = 'neutral',
}: {
  title: string;
  body: string;
  icon: string;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
          tone === 'danger' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F0F4F3] text-[#8FA6A0]'
        }`}
      >
        <Icon name={icon} size="large" />
      </span>
      <p className="mt-4 text-[15px] font-bold text-[#1A1A1A]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-6 text-[#8A8C8E]">{body}</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const s = useStrings();

  // "Not deployed yet" and "you are no longer a member" are both expected outcomes with
  // nothing to retry — only a genuine failure gets the Retry button.
  if (isSchemaMissing(error)) {
    return (
      <EmptyState
        icon="hourglass_empty"
        title={s.activityUnavailableTitle}
        body={s.activityUnavailableBody}
      />
    );
  }
  if (getFgErrorCode(error) === FG_ERROR.NOT_A_MEMBER) {
    return (
      <EmptyState
        icon="lock"
        title={s.activityMemberOnlyTitle}
        body={s.activityMemberOnlyBody}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
        <Icon name="error_outline" size="large" />
      </span>
      <p className="mt-4 text-[15px] font-bold text-[#1A1A1A]">{s.activityErrorTitle}</p>
      <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-6 text-[#8A8C8E]">
        {extractGraphQLErrorMessage(error) ?? s.activityErrorBody}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-5 text-[13px] font-semibold text-[#475569] transition-colors hover:bg-gray-50"
      >
        <Icon name="refresh" size="small" className="text-gray-400" />
        {s.activityRetry}
      </button>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2 pt-1">
            <div
              className="h-4 animate-pulse rounded bg-gray-100"
              style={{ width: `${70 - i * 8}%` }}
            />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
