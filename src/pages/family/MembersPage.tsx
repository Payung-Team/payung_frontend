import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { Icon } from '../../components/ui/Icon';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import {
  MY_FAMILY_GROUPS,
  GROUP_BOOKINGS,
  type FamilyGroup,
  type FamilyGroupMember,
  type GroupBookingSummary,
} from '../../graphql/familyGroup';
import { formatDate, useStrings } from './familyStrings';
import { FONT, ConfirmDialog, GroupAvatar, ModalShell } from './components/familyUi';
import MembersPanel from './components/MembersPanel';
import InviteLinkModal from './components/InviteLinkModal';
import { TransferOwnershipModal, LeaveGroupDialog } from './components/GroupModals';

type ModalKind = 'invite' | 'leave' | 'lastOwner' | 'transfer' | null;

/**
 * The group's full members list on its own page (reached from the dashboard's member count).
 * Per-row owner actions live in MembersPanel; this page owns the surrounding chrome — invite,
 * leave, and the transfer path an owner is routed through when they try to leave.
 *
 * Which group to show comes from `?group=<id>` (set by the dashboard link) so the pick survives
 * the navigation; it falls back to the first group, and to the dashboard when there are none.
 */
export default function MembersPage() {
  const s = useStrings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const groupParam = params.get('group');

  const { toasts, removeToast, success, error: toastError } = useToast();
  const toast = (message: string, kind: 'success' | 'error' = 'success') =>
    kind === 'success' ? success(message) : toastError(message);

  const { data, loading, refetch } = useQuery<{ myFamilyGroups: FamilyGroup[] }>(
    MY_FAMILY_GROUPS,
    { fetchPolicy: 'cache-and-network' },
  );
  const groups = data?.myFamilyGroups ?? [];
  const group = groups.find((g) => g.id === groupParam) ?? groups[0] ?? null;

  const [modal, setModal] = useState<ModalKind>(null);
  const [viewMember, setViewMember] = useState<FamilyGroupMember | null>(null);
  const closeModal = () => setModal(null);
  const backToGroup = () => navigate('/family-group');

  if (loading && groups.length === 0) {
    return (
      <div
        className="mx-auto w-full max-w-[1120px] px-4 pb-24 pt-6 md:px-6 md:pb-10"
        style={{ fontFamily: FONT }}
      >
        <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 h-7 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mt-5 space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  // No groups (e.g. left the last one, or a stale link) — the dashboard owns the empty state.
  if (!group) return <Navigate to="/family-group" replace />;

  const isOwner = group.myRole === 'OWNER';

  return (
    <div
      className="mx-auto w-full max-w-[1120px] px-4 pb-24 pt-6 md:px-6 md:pb-10"
      style={{ fontFamily: FONT }}
    >
      <button
        type="button"
        onClick={backToGroup}
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#8A8C8E] transition-colors hover:text-[#009265]"
      >
        <Icon name="arrow_back" size="small" />
        {s.backToGroup}
      </button>

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <div className="min-w-[220px]">
          <h1 className="text-[24px] font-bold text-[#1A1A1A]">{s.membersTitle}</h1>
          <p className="mt-0.5 text-[14px] text-[#8A8C8E]">
            {s.membersSubtitle(group.name, group.memberCount)}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setModal('invite')}
            className="ml-auto inline-flex h-11 items-center gap-2 rounded-lg bg-[#009265] px-5 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-colors hover:bg-[#007C55]"
          >
            <Icon name="person_add" size="small" color="#FFFFFF" />
            {s.invite}
          </button>
        )}
      </div>

      <div className="mt-5">
        <MembersPanel
          group={group}
          onChanged={() => refetch()}
          onToast={toast}
          onBookForMember={(m) =>
            navigate('/booking/new', {
              state: { groupBooking: { groupId: group.id, memberUserId: m.userId } },
            })
          }
          onViewMemberBookings={(m) => setViewMember(m)}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setModal(isOwner ? 'lastOwner' : 'leave')}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#F3C7C7] px-5 text-[14px] font-semibold text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
        >
          <Icon name="logout" size="small" color="#DC2626" />
          {s.leaveGroup}
        </button>
      </div>

      {/* ── Modals ── */}
      {modal === 'invite' && (
        <InviteLinkModal groupId={group.id} onClose={closeModal} onToast={toast} />
      )}
      {modal === 'leave' && (
        <LeaveGroupDialog
          group={group}
          onClose={closeModal}
          onToast={toast}
          onLeft={backToGroup}
        />
      )}
      {modal === 'lastOwner' && (
        <ConfirmDialog
          onClose={closeModal}
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
      {modal === 'transfer' && (
        <TransferOwnershipModal
          group={group}
          onClose={closeModal}
          onToast={toast}
          onDone={() => {
            setModal(null);
            refetch();
          }}
        />
      )}
      {viewMember && (
        <MemberBookingsModal
          group={group}
          member={viewMember}
          onClose={() => setViewMember(null)}
        />
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

/** Read-only list of the on-behalf bookings a given member has made in this group. */
function MemberBookingsModal({
  group,
  member,
  onClose,
}: {
  group: FamilyGroup;
  member: FamilyGroupMember;
  onClose: () => void;
}) {
  const s = useStrings();
  const { data, loading } = useQuery<{ groupBookings: GroupBookingSummary[] }>(GROUP_BOOKINGS, {
    variables: { groupId: group.id },
    fetchPolicy: 'cache-and-network',
  });
  const list = (data?.groupBookings ?? []).filter((b) => b.bookedByUserId === member.userId);

  return (
    <ModalShell onClose={onClose} maxWidth={520} labelledBy="member-bookings-title" showClose>
      <h2 id="member-bookings-title" className="text-xl font-bold text-[#064E3B]">
        {s.memberBookingsTitle(member.displayName || member.email)}
      </h2>
      <p className="mt-1 text-sm text-gray-500">{member.email}</p>

      {loading && list.length === 0 ? (
        <div className="mt-5 space-y-2">
          <div className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : list.length === 0 ? (
        <p className="mt-5 rounded-lg bg-[#F6FAF9] px-4 py-8 text-center text-[13px] leading-6 text-[#8A8C8E]">
          {s.memberBookingsEmpty}
        </p>
      ) : (
        <ul className="mt-5 max-h-[60vh] space-y-2.5 overflow-y-auto">
          {list.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#FBFDFC] p-3"
            >
              <GroupAvatar name={b.careRecipientName} seed={b.id} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-[14px] font-semibold text-[#1A1A1A]">
                    {b.careRecipientName || '—'}
                  </p>
                  <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[#EEF2F1] px-2 text-[11px] font-semibold text-[#5B7A70]">
                    {s.bookingStatusLabel(b.status)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-[#8A8C8E]">
                  {formatDate(b.bookingDate)}
                  {b.startTime && ` · ${b.startTime} น.`}
                  {b.caregiver?.fullName && ` · ${b.caregiver.fullName}`}
                </p>
              </div>
              {b.estimatedCost != null && (
                <p className="shrink-0 text-[14px] font-bold text-[#1A1A1A]">
                  ฿{Math.round(b.estimatedCost).toLocaleString('th-TH')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </ModalShell>
  );
}

