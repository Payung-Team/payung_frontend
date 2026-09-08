import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Icon } from '../../../components/ui/Icon';
import {
  REMOVE_MEMBER,
  TRANSFER_OWNERSHIP,
  type FamilyGroup,
  type FamilyGroupMember,
} from '../../../graphql/familyGroup';
import { formatDate, useStrings } from '../familyStrings';
import { fgErrorMessage } from '../familyErrors';
import { GroupAvatar, RoleBadge, ConfirmDialog } from './familyUi';

/**
 * Members list with roles. Owner-only per-row actions (make owner / remove) are hidden for
 * members — reflecting permission model §6. The server re-checks every mutation, so a
 * hidden button is a UX nicety, not the security boundary.
 */
export default function MembersPanel({
  group,
  onChanged,
  onToast,
}: {
  group: FamilyGroup;
  onChanged: () => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}) {
  const s = useStrings();
  const isOwner = group.myRole === 'OWNER';
  const [pending, setPending] = useState<{
    kind: 'remove' | 'makeOwner';
    member: FamilyGroupMember;
  } | null>(null);

  const [removeMember, { loading: removing }] = useMutation(REMOVE_MEMBER);
  const [transfer, { loading: transferring }] = useMutation(TRANSFER_OWNERSHIP);

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

  const doMakeOwner = async (m: FamilyGroupMember) => {
    try {
      await transfer({
        variables: { input: { groupId: group.id, newOwnerUserId: m.userId } },
      });
      setPending(null);
      onToast(s.toastTransferred(m.displayName || m.email), 'success');
      onChanged();
    } catch (e) {
      setPending(null);
      onToast(fgErrorMessage(e), 'error');
    }
  };

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
      <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.7px] text-[#8A8C8E]">
        {s.membersTitle} ({group.memberCount})
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
              labelMenu={s.memberRowMenu}
              labelMakeOwner={s.makeOwner}
              labelRemove={s.removeFromGroup}
              ownerCannotRemoveSelf={s.ownerCannotRemoveSelf}
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
        <ConfirmDialog
          onClose={() => setPending(null)}
          onConfirm={() => doMakeOwner(pending.member)}
          loading={transferring}
          icon="swap_horiz"
          iconBg="bg-[#009265]"
          confirmBg="bg-[#009265]"
          confirmHover="hover:bg-[#007C55]"
          title={s.transferTitle}
          cancelText={s.cancel}
          confirmText={s.transferCta}
          busyText={s.busyTransferring}
        >
          {s.transferSubtitle}
        </ConfirmDialog>
      )}
    </section>
  );
}

/** Per-row overflow menu. Only owners acting on OTHER members get actions. */
function RowActions({
  member,
  isOwner,
  labelMenu,
  labelMakeOwner,
  labelRemove,
  ownerCannotRemoveSelf,
  onMakeOwner,
  onRemove,
}: {
  member: FamilyGroupMember;
  isOwner: boolean;
  labelMenu: string;
  labelMakeOwner: string;
  labelRemove: string;
  ownerCannotRemoveSelf: string;
  onMakeOwner: () => void;
  onRemove: () => void;
}) {
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

  // The owner's own row: a disabled control that explains why (can't remove self).
  if (member.isMe && isOwner) {
    return (
      <button
        type="button"
        disabled
        title={ownerCannotRemoveSelf}
        aria-label={ownerCannotRemoveSelf}
        className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg text-gray-300"
      >
        <Icon name="more_vert" />
      </button>
    );
  }

  // Members (or the owner's view of themselves as a non-owner) get no row actions.
  if (!isOwner || member.isMe) {
    return <span className="h-9 w-9" aria-hidden="true" />;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labelMenu}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100"
      >
        <Icon name="more_vert" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-[210px] rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onMakeOwner();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#1A1A1A] hover:bg-gray-50"
          >
            <Icon name="workspace_premium" size="small" className="text-gray-400" />
            {labelMakeOwner}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRemove();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] text-[#DC2626] hover:bg-[#FEF2F2]"
          >
            <Icon name="person_remove" size="small" color="#DC2626" />
            {labelRemove}
          </button>
        </div>
      )}
    </div>
  );
}
