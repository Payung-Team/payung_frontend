import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import { Icon } from '../../components/ui/Icon';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import {
  MY_FAMILY_GROUPS,
  GROUP_JOIN_LINK,
  CREATE_JOIN_LINK,
  type FamilyGroup,
  type FamilyGroupJoinLink,
} from '../../graphql/familyGroup';
import { formatDate, useStrings } from './familyStrings';
import { FONT, GroupAvatar, RoleBadge, ConfirmDialog } from './components/familyUi';
import MembersPanel from './components/MembersPanel';
import InviteLinkModal from './components/InviteLinkModal';
import {
  CreateGroupWizard,
  RenameGroupModal,
  TransferOwnershipModal,
  DeleteGroupModal,
} from './components/GroupModals';
import { LEAVE_FAMILY_GROUP } from '../../graphql/familyGroup';
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
  const [membersOpen, setMembersOpen] = useState(false);

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
              onSelect={(id) => {
                setSelectedId(id);
                setMembersOpen(false);
              }}
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
            membersOpen={membersOpen}
            onToggleMembers={() => setMembersOpen((v) => !v)}
            onInvite={() => setModal('invite')}
            onRename={() => setModal('rename')}
            onTransfer={() => setModal('transfer')}
            onLeave={() =>
              setModal(selected.myRole === 'OWNER' ? 'lastOwner' : 'leave')
            }
            onDelete={() => setModal('delete')}
          />
          {membersOpen && (
            <MembersPanel group={selected} onChanged={() => refetch()} onToast={toast} />
          )}
          <MemberAppointments />
        </div>
      ) : null}

      {/* ── Modals ── */}
      {modal === 'create' && (
        <CreateGroupWizard
          onClose={() => setModal(null)}
          onToast={toast}
          onCreated={(g) => {
            setSelectedId(g.id);
            setMembersOpen(false);
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

// ── Leave (members only) ───────────────────────────────────────────────────────

function LeaveGroupDialog({
  group,
  onClose,
  onLeft,
  onToast,
}: {
  group: FamilyGroup;
  onClose: () => void;
  onLeft: () => void;
  onToast: (m: string, k?: 'success' | 'error') => void;
}) {
  const s = useStrings();
  const [leave, { loading }] = useMutation<{
    leaveFamilyGroup: { groupId: string; groupName: string; left: boolean };
  }>(LEAVE_FAMILY_GROUP, {
    refetchQueries: [{ query: MY_FAMILY_GROUPS }],
  });
  const submit = async () => {
    try {
      const res = await leave({ variables: { groupId: group.id } });
      onToast(s.toastLeft(res.data?.leaveFamilyGroup?.groupName || group.name), 'success');
      onLeft();
    } catch (e) {
      onToast(fgErrorMessage(e), 'error');
    }
  };
  return (
    <ConfirmDialog
      onClose={onClose}
      onConfirm={submit}
      loading={loading}
      icon="logout"
      iconBg="bg-[#DC2626]"
      confirmBg="bg-[#DC2626]"
      confirmHover="hover:bg-[#B91C1C]"
      title={s.leaveTitle(group.name)}
      cancelText={s.cancel}
      confirmText={s.leaveCta}
      busyText={s.busyLeaving}
    >
      {s.leaveBody}
    </ConfirmDialog>
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
  membersOpen,
  onToggleMembers,
  onInvite,
  onRename,
  onTransfer,
  onLeave,
  onDelete,
}: {
  group: FamilyGroup;
  membersOpen: boolean;
  onToggleMembers: () => void;
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

      {/* Member avatar stack → toggles the full members list below the card. */}
      <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
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
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#EEF2F1] text-[11px] font-bold text-[#5B7A70] ring-2 ring-white"
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
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-dashed border-[#B7D9CD] bg-white text-[#009265] ring-2 ring-white transition-colors hover:bg-[#F0FAF4]"
              style={{ marginLeft: -8 }}
            >
              <Icon name="person_add" size="small" color="#009265" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleMembers}
          aria-expanded={membersOpen}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:text-[#009265]"
        >
          {s.memberCount(group.memberCount)}
          <Icon
            name={membersOpen ? 'expand_less' : 'chevron_right'}
            size="small"
            className="text-gray-400"
          />
        </button>
      </div>

      {!isOwner && (
        <div className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-4">
          <Icon name="info" size="small" className="mt-0.5 text-gray-400" />
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

// ── Member appointments ─────────────────────────────────────────────────────
// The group's shared booking feed. There is no group-appointment query yet, so this shows
// the (real) empty state; "จองแทนสมาชิก" starts a booking via the caregiver search.

function MemberAppointments() {
  const s = useStrings();
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-[#064E3B]">{s.apptTitle}</h3>
          <p className="mt-0.5 text-[13px] text-[#8A8C8E]">{s.apptNone}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/search')}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#009265] px-4 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-colors hover:bg-[#007C55]"
        >
          <Icon name="event_available" size="small" color="#FFFFFF" />
          {s.bookOnBehalf}
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center px-4 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F4F3] text-[#8FA6A0]">
          <Icon name="event_busy" size="large" />
        </span>
        <p className="mt-4 text-[15px] font-bold text-[#1A1A1A]">{s.apptEmptyTitle}</p>
        <p className="mx-auto mt-1.5 max-w-[420px] text-[13px] leading-6 text-[#8A8C8E]">
          {s.apptEmptyBody}
        </p>
      </div>
    </section>
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
