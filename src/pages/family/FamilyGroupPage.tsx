import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import { Icon } from '../../components/ui/Icon';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import {
  MY_FAMILY_GROUPS,
  GROUP_JOIN_LINK,
  CREATE_JOIN_LINK,
  GROUP_BOOKINGS,
  type FamilyGroup,
  type FamilyGroupJoinLink,
  type GroupBookingSummary,
} from '../../graphql/familyGroup';
import { formatDate, useStrings } from './familyStrings';
import { FONT, GroupAvatar, RoleBadge, ConfirmDialog } from './components/familyUi';
import InviteLinkModal from './components/InviteLinkModal';
import {
  CreateGroupWizard,
  RenameGroupModal,
  TransferOwnershipModal,
  DeleteGroupModal,
  LeaveGroupDialog,
} from './components/GroupModals';
import { fgErrorMessage } from './familyErrors';

type ModalKind =
  | 'create'
  | 'invite'
  | 'rename'
  | 'transfer'
  | 'delete'
  | 'leave'
  | 'lastOwner'
  | null;

export default function FamilyGroupPage() {
  const s = useStrings();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: toastError } = useToast();
  const toast = (message: string, kind: 'success' | 'error' = 'success') =>
    kind === 'success' ? success(message) : toastError(message);

  const { data, loading, refetch } = useQuery<{ myFamilyGroups: FamilyGroup[] }>(
    MY_FAMILY_GROUPS,
    { fetchPolicy: 'cache-and-network' },
  );
  const groups = data?.myFamilyGroups ?? [];

  // The user's explicit pick; may be null (initial) or stale (after leave/delete).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);

  // Derive the effective group rather than syncing state in an effect: a stale/empty pick
  // falls back to the first group, so create/leave/delete need no extra bookkeeping.
  const selected = groups.find((g) => g.id === selectedId) ?? groups[0] ?? null;
  const isOwner = selected?.myRole === 'OWNER';
  const isSolo = isOwner && selected?.memberCount === 1;

  return (
    <div
      className="mx-auto w-full max-w-[1120px] px-4 pb-24 pt-6 md:px-6 md:pb-10"
      style={{ fontFamily: FONT }}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A1A1A]">{s.dashboardTitle}</h1>
          <p className="mt-0.5 text-[14px] text-[#8A8C8E]">{s.dashboardSubtitle}</p>
        </div>
        {selected && (
          <div className="ml-auto">
            <GroupSwitcher
              groups={groups}
              selected={selected}
              onSelect={(id) => setSelectedId(id)}
              onCreate={() => setModal('create')}
            />
          </div>
        )}
      </div>

      {loading && groups.length === 0 ? (
        <DashboardSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState onCreate={() => setModal('create')} />
      ) : selected ? (
        <div className="mt-5 space-y-4">
          {isSolo && <SoloBanner groupId={selected.id} onToast={toast} />}
          <GroupHeaderCard
            group={selected}
            onViewMembers={() =>
              navigate(`/family-group/members?group=${selected.id}`)
            }
            onInvite={() => setModal('invite')}
            onRename={() => setModal('rename')}
            onTransfer={() => setModal('transfer')}
            onLeave={() =>
              setModal(selected.myRole === 'OWNER' ? 'lastOwner' : 'leave')
            }
            onDelete={() => setModal('delete')}
          />
          <MemberAppointments group={selected} />
        </div>
      ) : null}

      {/* ── Modals ── */}
      {modal === 'create' && (
        <CreateGroupWizard
          onClose={() => setModal(null)}
          onToast={toast}
          onCreated={(g) => {
            setSelectedId(g.id);
            setModal(null);
          }}
        />
      )}
      {modal === 'invite' && selected && (
        <InviteLinkModal
          groupId={selected.id}
          onClose={() => setModal(null)}
          onToast={toast}
        />
      )}
      {modal === 'rename' && selected && (
        <RenameGroupModal
          group={selected}
          onClose={() => setModal(null)}
          onToast={toast}
          onDone={() => {
            setModal(null);
            refetch();
          }}
        />
      )}
      {modal === 'transfer' && selected && (
        <TransferOwnershipModal
          group={selected}
          onClose={() => setModal(null)}
          onToast={toast}
          onDone={() => {
            setModal(null);
            refetch();
          }}
        />
      )}
      {modal === 'delete' && selected && (
        <DeleteGroupModal
          group={selected}
          onClose={() => setModal(null)}
          onToast={toast}
          onDeleted={() => {
            setModal(null);
            setSelectedId(null);
            refetch();
          }}
        />
      )}
      {modal === 'leave' && selected && (
        <LeaveGroupDialog
          group={selected}
          onClose={() => setModal(null)}
          onToast={toast}
          onLeft={() => {
            setModal(null);
            setSelectedId(null);
            refetch();
          }}
        />
      )}
      {modal === 'lastOwner' && selected && (
        <ConfirmDialog
          onClose={() => setModal(null)}
          onConfirm={() => setModal('transfer')}
          icon="warning"
          iconBg="bg-[#F59E0B]"
          confirmBg="bg-[#009265]"
          confirmHover="hover:bg-[#007C55]"
          title={s.lastOwnerTitle}
          cancelText={s.close}
          confirmText={s.transferOwnership}
          busyText=""
        >
          {s.lastOwnerBody}
        </ConfirmDialog>
      )}

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="bottom-right"
        variant="booking-toast"
      />
    </div>
  );
}

// ── Solo-group nudge banner ──────────────────────────────────────────────────
// Shown to an owner whose group is still just them: the whole point of a group is more
// people, so the invite CTA gets a warm, hard-to-miss band above the group card.

function SoloBanner({
  groupId,
  onToast,
}: {
  groupId: string;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}) {
  const s = useStrings();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Prefetch the link so the button can copy synchronously inside the click gesture —
  // a copy fired after an async round-trip is blocked by some browsers (Safari). The group
  // is freshly created here, so it almost always already has a link; errorPolicy 'all' keeps
  // the normal "no link yet" case out of the console.
  const { data } = useQuery<{ groupJoinLink: FamilyGroupJoinLink }>(GROUP_JOIN_LINK, {
    variables: { groupId },
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });
  const [fetchLink] = useLazyQuery<{ groupJoinLink: FamilyGroupJoinLink }>(GROUP_JOIN_LINK, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });
  const [createLink] = useMutation<{ createJoinLink: FamilyGroupJoinLink }>(CREATE_JOIN_LINK);
  const preloaded = data?.groupJoinLink?.url;

  const write = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    onToast(s.toastCopied, 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const copy = async () => {
    if (busy) return;
    if (preloaded) {
      try {
        await write(preloaded);
      } catch {
        onToast(s.copyFailed, 'error');
      }
      return;
    }
    // Fallback: no link cached yet — fetch (or mint) one, then copy.
    setBusy(true);
    try {
      const res = await fetchLink({ variables: { groupId } });
      let url = res.data?.groupJoinLink?.url;
      if (!url) {
        const created = await createLink({ variables: { input: { groupId } } });
        url = created.data?.createJoinLink?.url;
      }
      if (!url) throw new Error('no-link');
      await write(url);
    } catch (e) {
      onToast(fgErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#F2E1B6] bg-[#FEF9EF] p-4 md:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBEAC5] text-[#C4841B]">
        <Icon name="group_add" />
      </span>
      <div className="min-w-[220px] flex-1">
        <p className="text-[15px] font-bold text-[#7A4E0E]">{s.soloBannerTitle}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-[#9C7B41]">{s.soloBannerBody}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={busy}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#E1912F] px-4 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(225,145,47,0.25)] transition-colors hover:bg-[#C87E1E] disabled:opacity-60"
      >
        <Icon name={copied ? 'check' : 'content_copy'} size="small" color="#FFFFFF" />
        {copied ? s.copied : s.copyInviteLink}
      </button>
    </section>
  );
}

// ── Header card ────────────────────────────────────────────────────────────────

/** "created today · no appointments" — a relative "today" reads warmer than a bare date. */
function createdMeta(s: ReturnType<typeof useStrings>, iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const created = sameDay ? s.createdToday : `${s.createdOn} ${formatDate(iso)}`;
  return `${created} · ${s.noAppointmentsYet}`;
}

function GroupHeaderCard({
  group,
  onViewMembers,
  onInvite,
  onRename,
  onTransfer,
  onLeave,
  onDelete,
}: {
  group: FamilyGroup;
  onViewMembers: () => void;
  onInvite: () => void;
  onRename: () => void;
  onTransfer: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const s = useStrings();
  const isOwner = group.myRole === 'OWNER';
  const shown = group.members.slice(0, 4);
  const extra = group.memberCount - shown.length;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <GroupAvatar
          name={group.name}
          seed={group.id}
          size={56}
          className="shadow-[0_4px_16px_rgba(82,182,154,0.2)] ring-[3px] ring-white"
        />
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[20px] font-bold text-[#064E3B]">{group.name}</h2>
            <RoleBadge role={group.myRole} />
          </div>
          <p className="mt-1 text-[13px] text-[#8A8C8E]">{createdMeta(s, group.createdAt)}</p>

          {/* Member avatar stack → opens the full members list on its own page. */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center">
          {shown.map((m, i) => (
            <span
              key={m.id}
              className="rounded-full ring-2 ring-white"
              style={{ marginLeft: i === 0 ? 0 : -8 }}
            >
              <GroupAvatar name={m.displayName || m.email} seed={m.userId} size={30} />
            </span>
          ))}
          {extra > 0 && (
            <span
              className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-[#EEF2F1] text-[11px] font-bold text-[#5B7A70] ring-2 ring-white"
              style={{ marginLeft: -8 }}
            >
              +{extra}
            </span>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={onInvite}
              aria-label={s.invite}
              className="flex h-7.5 w-7.5 items-center justify-center rounded-full border border-dashed border-[#B7D9CD] bg-white text-[#009265] ring-2 ring-white transition-colors hover:bg-[#F0FAF4]"
              style={{ marginLeft: -8 }}
            >
              <Icon name="person_add" size="small" color="#009265" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onViewMembers}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#F0FAF4] hover:text-[#009265]"
        >
          {s.memberCount(group.memberCount)}
          <Icon name="chevron_right" size="small" className="text-gray-400" />
        </button>
      </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={onInvite}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#009265] px-4 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-colors hover:bg-[#007C55]"
            >
              <Icon name="person_add" size="small" color="#FFFFFF" />
              {s.invite}
            </button>
          )}
          <GroupMenu
            isOwner={isOwner}
            onRename={onRename}
            onTransfer={onTransfer}
            onLeave={onLeave}
            onDelete={onDelete}
          />
        </div>
      </div>

      

      {!isOwner && (
        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
          <Icon name="info" size="small" className="mt-0.5 color-[#8A8C8E] text-[#8A8C8E]" />
          <p className="text-[12px] leading-5 text-[#8A8C8E]">{s.memberNotice}</p>
        </div>
      )}
    </section>
  );
}

function GroupMenu({
  isOwner,
  onRename,
  onTransfer,
  onLeave,
  onDelete,
}: {
  isOwner: boolean;
  onRename: () => void;
  onTransfer: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const s = useStrings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const item = (icon: string, label: string, onClick: () => void, danger = false) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] ${
        danger ? 'text-[#DC2626] hover:bg-[#FEF2F2]' : 'text-[#1A1A1A] hover:bg-gray-50'
      }`}
    >
      <Icon name={icon} size="small" className={danger ? '' : 'text-gray-400'} color={danger ? '#DC2626' : undefined} />
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={s.navFamily}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
      >
        <Icon name="more_vert" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-[230px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg"
        >
          {isOwner && item('edit', s.renameGroup, onRename)}
          {isOwner && item('swap_horiz', s.transferOwnership, onTransfer)}
          {item('logout', s.leaveGroup, onLeave)}
          {isOwner && <div className="my-1.5 h-px bg-gray-100" />}
          {isOwner && item('delete', s.deleteGroup, onDelete, true)}
        </div>
      )}
    </div>
  );
}

// ── Group switcher ───────────────────────────────────────────────────────────

function GroupSwitcher({
  groups,
  selected,
  onSelect,
  onCreate,
}: {
  groups: FamilyGroup[];
  selected: FamilyGroup;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  const s = useStrings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white pl-2 pr-2 shadow-sm transition-colors hover:bg-gray-50"
      >
        <GroupAvatar name={selected.name} seed={selected.id} size={24} />
        <span className="max-w-[160px] truncate text-[14px] font-semibold text-[#1A1A1A]">
          {selected.name}
        </span>
        <Icon name="expand_more" size="small" className="text-gray-400" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-[280px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg"
        >
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.7px] text-[#8A8C8E]">
            {s.myGroups}
          </p>
          {groups.map((g) => {
            const active = g.id === selected.id;
            return (
              <button
                key={g.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onSelect(g.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left ${
                  active ? 'bg-[#F0FAF4]' : 'hover:bg-gray-50'
                }`}
              >
                <GroupAvatar name={g.name} seed={g.id} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[#1A1A1A]">
                    {g.name}
                  </span>
                  <span className="block text-[11px] text-[#8A8C8E]">
                    {s.memberCount(g.memberCount)} ·{' '}
                    {g.myRole === 'OWNER' ? s.roleOwner : s.roleMember}
                  </span>
                </span>
                {active && <Icon name="check" size="small" color="#009265" />}
              </button>
            );
          })}
          <div className="my-1.5 h-px bg-gray-100" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#009265] hover:bg-gray-50"
          >
            <Icon name="add" size="small" color="#009265" />
            {s.createNewGroup}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Member appointments feed ────────────────────────────────────────────────
// The shared on-behalf booking feed, split into confirmed / pending / history so the group
// sees active jobs first. In-progress jobs get an expanded card with a live shift timeline.

type ApptTab = 'confirmed' | 'pending' | 'history';

const PENDING_STATUSES = ['unmatched', 'pending'];
const CONFIRMED_STATUSES = ['accepted', 'confirmed', 'in_progress', 'awaiting_release', 'needs_review'];

function bucketOf(status: string): ApptTab {
  if (PENDING_STATUSES.includes(status)) return 'pending';
  if (CONFIRMED_STATUSES.includes(status)) return 'confirmed';
  return 'history'; // completed / cancelled / rejected
}

// Badge tone per booking status — kept local since only this feed renders group bookings.
function statusTone(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-[#ECFDF5] text-[#047857]';
    case 'cancelled':
    case 'rejected':
      return 'bg-[#FEF2F2] text-[#B42318]';
    case 'unmatched':
    case 'pending':
      return 'bg-[#FEF6E7] text-[#B45309]';
    default: // accepted / confirmed / awaiting_release / …
      return 'bg-[#ECFDF5] text-[#047857]';
  }
}

/** Display reference from the booking id — there is no real booking-code column yet. */
function bookingRef(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `#PYG-${h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}

function formatBaht(n?: number | null): string {
  return n == null ? '' : `฿${Math.round(n).toLocaleString('th-TH')}`;
}

/** "09:00" + 4h → "13:00" (same-day care shifts). */
function plannedEnd(startTime?: string | null, hours?: number | null): string | null {
  if (!startTime || hours == null) return null;
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  const total = h * 60 + (m || 0) + Math.round(hours * 60);
  const hh = Math.floor(total / 60) % 24;
  return `${String(hh).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** How far through the shift we are now (kept 0.06–0.94 so the marker stays on the track). */
function shiftProgress(b: GroupBookingSummary): number {
  const end = plannedEnd(b.startTime, b.durationHours);
  if (!b.startTime || !end) return 0.5;
  const start = new Date(`${b.bookingDate}T${b.startTime}:00`).getTime();
  const finish = new Date(`${b.bookingDate}T${end}:00`).getTime();
  const span = finish - start;
  if (!Number.isFinite(span) || span <= 0) return 0.5;
  return Math.min(0.94, Math.max(0.06, (Date.now() - start) / span));
}

/** Month + day for the compact card's date block: { month: "ก.ย.", day: "4" }. */
function monthDay(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: '', day: '' };
  return {
    month: new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(d),
    day: new Intl.DateTimeFormat('th-TH', { day: 'numeric' }).format(d),
  };
}

function MemberAppointments({ group }: { group: FamilyGroup }) {
  const s = useStrings();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ApptTab>('confirmed');
  const [expanded, setExpanded] = useState(false);

  const { data, loading } = useQuery<{ groupBookings: GroupBookingSummary[] }>(
    GROUP_BOOKINGS,
    { variables: { groupId: group.id }, fetchPolicy: 'cache-and-network' },
  );
  const bookings = useMemo(() => data?.groupBookings ?? [], [data?.groupBookings]);

  const buckets = useMemo(() => {
    const acc: Record<ApptTab, GroupBookingSummary[]> = {
      confirmed: [],
      pending: [],
      history: [],
    };
    for (const b of bookings) acc[bucketOf(b.status)].push(b);
    return acc;
  }, [bookings]);

  const goTab = (next: ApptTab) => {
    setTab(next);
    setExpanded(false);
  };

  const list = buckets[tab];
  const shown = expanded ? list : list.slice(0, 5);
  const hasAny = bookings.length > 0;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-[#064E3B]">{s.apptTitle}</h3>
          <p className="mt-0.5 text-[13px] text-[#8A8C8E]">
            {hasAny ? s.apptConfirmedCount(buckets.confirmed.length) : s.apptNone}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            navigate('/booking/new', { state: { groupBooking: { groupId: group.id } } })
          }
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#009265] px-4 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-colors hover:bg-[#007C55]"
        >
          <Icon name="event_available" size="small" color="#FFFFFF" />
          {s.bookOnBehalf}
        </button>
      </div>

      {/* Tabs — confirmed / pending, with a history toggle pinned right. */}
      <div className="mt-4 flex items-center gap-4 border-b border-gray-100">
        <ApptTabButton
          label={s.tabConfirmed}
          count={buckets.confirmed.length}
          active={tab === 'confirmed'}
          onClick={() => goTab('confirmed')}
        />
        <ApptTabButton
          label={s.tabPending}
          count={buckets.pending.length}
          active={tab === 'pending'}
          onClick={() => goTab('pending')}
        />
        <button
          type="button"
          onClick={() => goTab(tab === 'history' ? 'confirmed' : 'history')}
          aria-pressed={tab === 'history'}
          aria-label={s.tabHistory}
          title={s.tabHistory}
          className={`mb-1 ml-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            tab === 'history'
              ? 'bg-[#F0FAF4] text-[#009265]'
              : 'text-gray-400 hover:bg-gray-50 hover:text-[#009265]'
          }`}
        >
          <Icon name="history" size="small" />
        </button>
      </div>

      {loading && !hasAny ? (
        <div className="mt-5 space-y-2.5">
          <div className="h-[68px] w-full animate-pulse rounded-xl bg-gray-100" />
          <div className="h-[68px] w-full animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : list.length === 0 ? (
        <ApptEmpty tab={tab} />
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {shown.map((b) =>
              b.status === 'in_progress' ? (
                <RichAppointmentCard key={b.id} b={b} />
              ) : (
                <CompactAppointmentCard key={b.id} b={b} />
              ),
            )}
          </ul>
          {list.length > 5 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2.5 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:bg-gray-50"
            >
              {expanded ? s.apptShowLess : s.apptViewAll}
              <Icon
                name={expanded ? 'expand_less' : 'expand_more'}
                size="small"
                className="text-gray-400"
              />
            </button>
          )}
        </>
      )}
    </section>
  );
}

function ApptTabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-[14px] font-semibold transition-colors ${
        active
          ? 'border-[#009265] text-[#009265]'
          : 'border-transparent text-[#8A8C8E] hover:text-[#1A1A1A]'
      }`}
    >
      {label}
      <span
        className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
          active ? 'bg-[#009265] text-white' : 'bg-gray-100 text-[#8A8C8E]'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ApptEmpty({ tab }: { tab: ApptTab }) {
  const s = useStrings();
  const copy =
    tab === 'pending'
      ? { icon: 'schedule', title: s.apptEmptyPendingTitle, body: s.apptEmptyPendingBody }
      : tab === 'history'
        ? { icon: 'history', title: s.apptEmptyHistoryTitle, body: s.apptEmptyHistoryBody }
        : { icon: 'event_busy', title: s.apptEmptyTitle, body: s.apptEmptyBody };
  return (
    <div className="mt-4 flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F4F3] text-[#8FA6A0]">
        <Icon name={copy.icon} size="large" />
      </span>
      <p className="mt-4 text-[15px] font-bold text-[#1A1A1A]">{copy.title}</p>
      <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-6 text-[#8A8C8E]">
        {copy.body}
      </p>
    </div>
  );
}

/** Price + optional "held in escrow" note — right-aligned column shared by both cards. */
function ApptPrice({ b }: { b: GroupBookingSummary }) {
  const s = useStrings();
  return (
    <div className="shrink-0 text-right">
      <p className="text-[16px] font-bold text-[#1A1A1A]">{formatBaht(b.estimatedCost)}</p>
      {b.paymentStatus === 'held' && (
        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309]">
          <Icon name="lock" size="small" style={{ fontSize: 13 }} />
          {s.apptEscrow}
        </p>
      )}
    </div>
  );
}

/** Expanded card for an in-progress job: live shift timeline + location details. */
function RichAppointmentCard({ b }: { b: GroupBookingSummary }) {
  const s = useStrings();
  const end = plannedEnd(b.startTime, b.durationHours);
  const pct = `${(shiftProgress(b) * 100).toFixed(1)}%`;
  const startLabel = b.checkInTime
    ? `${s.apptCheckIn} ${b.checkInTime}`
    : b.startTime
      ? `${s.apptStart} ${b.startTime}`
      : '';

  return (
    <li className="rounded-xl border-2 border-[#F6D9A8] bg-[#FFFDF8] p-4">
      <div className="flex items-start gap-3">
        <GroupAvatar name={b.careRecipientName} seed={b.id} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[#1A1A1A]">
            {b.careRecipientName || '—'}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-[#8A8C8E]">
            {bookingRef(b.id)} · {s.serviceTypeLabel(b.serviceType)}
            {b.durationHours != null && ` ${s.apptHours(b.durationHours)}`}
          </p>
        </div>
        <ApptPrice b={b} />
      </div>

      {/* Live shift timeline. */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-semibold text-[#C4841B]">{startLabel}</span>
          {end && (
            <span className="text-[#8A8C8E]">
              {s.apptCheckOut} {end}
            </span>
          )}
        </div>
        <div className="relative mt-2 h-2 rounded-full bg-[#F0EADF]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#E1912F]"
            style={{ width: pct }}
          />
          <span
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E1912F] ring-[3px] ring-white shadow"
            style={{ left: pct }}
          />
        </div>
        <p className="mt-2 text-center text-[12px] font-semibold text-[#C4841B]">
          {s.apptInProgress}
        </p>
      </div>

      <div className="mt-4 space-y-2 border-t border-[#F1E7D3] pt-3">
        {b.locationAddress && <ApptDetailRow icon="location_on" label={s.apptLocationLabel} value={b.locationAddress} />}
        <ApptDetailRow
          icon="home_health"
          label={s.apptServiceFormatLabel}
          value={s.serviceFormatLabel(b.serviceLocations ?? [])}
        />
      </div>
    </li>
  );
}

function ApptDetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-[13px]">
      <Icon name={icon} size="small" className="mt-0.5 text-[#8FA6A0]" />
      <span className="shrink-0 text-[#8A8C8E]">{label}</span>
      <span className="min-w-0 flex-1 text-[#1A1A1A]">{value}</span>
    </div>
  );
}

/** Compact row for confirmed / pending / past bookings. */
function CompactAppointmentCard({ b }: { b: GroupBookingSummary }) {
  const s = useStrings();
  const { month, day } = monthDay(b.bookingDate);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#FBFDFC] p-3">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-white py-1.5 text-center ring-1 ring-gray-100">
        <span className="text-[11px] font-medium text-[#8A8C8E]">{month}</span>
        <span className="text-[18px] font-bold leading-tight text-[#1A1A1A]">{day}</span>
        {b.startTime && <span className="text-[10px] text-[#8A8C8E]">{b.startTime}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-[14px] font-semibold text-[#1A1A1A]">
            {b.careRecipientName || '—'}
          </p>
          <span
            className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold ${statusTone(
              b.status,
            )}`}
          >
            {s.bookingStatusLabel(b.status)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-[#8A8C8E]">
          {bookingRef(b.id)}
          {b.caregiver?.fullName && ` · ${b.caregiver.fullName}`}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-[#8A8C8E]">
          {b.locationAddress && (
            <>
              <Icon name="location_on" size="small" style={{ fontSize: 13 }} className="text-[#B4BCBA]" />
              <span className="truncate">{b.locationAddress}</span>
              <span className="text-gray-300">·</span>
            </>
          )}
          {s.serviceFormatLabel(b.serviceLocations ?? [])}
        </p>
      </div>
      <ApptPrice b={b} />
    </li>
  );
}

// ── Empty & skeleton ───────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const s = useStrings();
  const features = [
    { icon: 'person_add', title: s.featureInvite, hint: s.featureInviteHint },
    { icon: 'event_available', title: s.featureBook, hint: s.featureBookHint },
    { icon: 'visibility', title: s.featureTrack, hint: s.featureTrackHint },
  ];
  return (
    <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm md:p-12">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FAF4]">
        <Icon name="groups" size="large" className="text-[#52B69A]" style={{ fontSize: 40 }} />
      </span>
      <h2 className="mt-5 text-[20px] font-bold text-[#064E3B]">{s.emptyTitle}</h2>
      <p className="mx-auto mt-2 max-w-[460px] text-[14px] leading-6 text-[#8A8C8E]">
        {s.emptyBody}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-[#009265] px-6 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-colors hover:bg-[#007C55]"
      >
        <Icon name="add" size="small" color="#FFFFFF" />
        {s.createGroup}
      </button>
      <div className="mx-auto mt-10 grid max-w-[720px] gap-4 text-left sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg bg-[#F6FAF9] p-4">
            <Icon name={f.icon} className="text-[#52B69A]" />
            <p className="mt-2 text-[13px] font-semibold text-[#1A1A1A]">{f.title}</p>
            <p className="mt-0.5 text-[12px] text-[#8A8C8E]">{f.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-14 w-full animate-pulse rounded-lg bg-gray-100" />
        <div className="h-14 w-full animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}
