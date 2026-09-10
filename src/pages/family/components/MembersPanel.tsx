import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Icon } from '../../../components/ui/Icon';
import {
  REMOVE_MEMBER,
  type FamilyGroup,
  type FamilyGroupMember,
} from '../../../graphql/familyGroup';
import { formatDate, useStrings } from '../familyStrings';
import { fgErrorMessage } from '../familyErrors';
import { GroupAvatar, RoleBadge, ConfirmDialog } from './familyUi';
import { TransferOwnershipModal } from './GroupModals';

/**
 * Members list with roles. Owner-only per-row actions (make owner / remove) are hidden for
 * members — reflecting permission model §6. The server re-checks every mutation, so a
 * hidden button is a UX nicety, not the security boundary.
 */
export default function MembersPanel({
  group,
  onChanged,
  onToast,
  onBookForMember,
  onViewMemberBookings,
}: {
  group: FamilyGroup;
  onChanged: () => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
  onBookForMember: (member: FamilyGroupMember) => void;
  onViewMemberBookings: (member: FamilyGroupMember) => void;
}) {
  const s = useStrings();
  const isOwner = group.myRole === 'OWNER';
  const [pending, setPending] = useState<{
    kind: 'remove' | 'makeOwner';
    member: FamilyGroupMember;
  } | null>(null);

  const [removeMember, { loading: removing }] = useMutation(REMOVE_MEMBER);

  const doRemove = async (m: FamilyGroupMember) => {
    try {
      await removeMember({
        variables: { input: { groupId: group.id, userId: m.userId } },
      });
      setPending(null);
      onToast(s.toastRemoved(m.displayName || m.email), 'success');
      onChanged();
    } catch (e) {
      setPending(null);
      onToast(fgErrorMessage(e), 'error');
    }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
      <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.7px] text-[#8A8C8E]">
        {s.membersListLabel(group.memberCount)}
      </p>
      <ul>
        {group.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
          >
            <GroupAvatar name={m.displayName || m.email} seed={m.userId} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-[#1A1A1A]">
                {m.displayName || m.email}
                {m.isMe && (
                  <span className="ml-1.5 text-[11px] font-medium text-[#8A8C8E]">
                    {s.you}
                  </span>
                )}
              </p>
              <p className="truncate text-[12px] text-[#8A8C8E]">
                {m.email} · {s.joinedOn} {formatDate(m.joinedAt)}
              </p>
            </div>
            <RoleBadge role={m.role} />
            <RowActions
              member={m}
              isOwner={isOwner}
              onBook={() => onBookForMember(m)}
              onViewBookings={() => onViewMemberBookings(m)}
              onMakeOwner={() => setPending({ kind: 'makeOwner', member: m })}
              onRemove={() => setPending({ kind: 'remove', member: m })}
            />
          </li>
        ))}
      </ul>

      {pending?.kind === 'remove' && (
        <ConfirmDialog
          onClose={() => setPending(null)}
          onConfirm={() => doRemove(pending.member)}
          loading={removing}
          icon="person_remove"
          iconBg="bg-[#DC2626]"
          confirmBg="bg-[#DC2626]"
          confirmHover="hover:bg-[#B91C1C]"
          title={s.removeTitle(pending.member.displayName || pending.member.email)}
          cancelText={s.cancel}
          confirmText={s.removeCta}
          busyText={s.busyRemoving}
        >
          {s.removeBody}
        </ConfirmDialog>
      )}
      {pending?.kind === 'makeOwner' && (
        <TransferOwnershipModal
          group={group}
          preselectUserId={pending.member.userId}
          onClose={() => setPending(null)}
          onToast={onToast}
          onDone={() => {
            setPending(null);
            onChanged();
          }}
        />
      )}
    </section>
  );
}

/**
 * Per-row overflow menu. Everyone gets booking actions (จองแทน / ดูการจอง); the owner also
 * gets make-owner / remove on OTHER members' rows (server re-checks either way).
 */
function RowActions({
  member,
  isOwner,
  onBook,
  onViewBookings,
  onMakeOwner,
  onRemove,
}: {
  member: FamilyGroupMember;
  isOwner: boolean;
  onBook: () => void;
  onViewBookings: () => void;
  onMakeOwner: () => void;
  onRemove: () => void;
}) {
  const s = useStrings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const showOwnerActions = isOwner && !member.isMe;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const item = (
    icon: string,
    label: string,
    onClick: () => void,
    danger = false,
  ) => (
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
      <Icon
        name={icon}
        size="small"
        className={danger ? '' : 'text-gray-400'}
        color={danger ? '#DC2626' : undefined}
      />
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
        aria-label={s.memberRowMenu}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100"
      >
        <Icon name="more_vert" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-[230px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg"
        >
          {item('event_available', s.bookForMember, onBook)}
          {item('receipt_long', s.viewMemberBookings, onViewBookings)}
          {showOwnerActions && <div className="my-1.5 h-px bg-gray-100" />}
          {showOwnerActions && item('workspace_premium', s.makeOwner, onMakeOwner)}
          {showOwnerActions && item('person_remove', s.removeFromGroup, onRemove, true)}
        </div>
      )}
    </div>
  );
}
