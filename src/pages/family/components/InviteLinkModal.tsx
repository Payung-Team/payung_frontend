import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Icon } from '../../../components/ui/Icon';
import {
  GROUP_JOIN_LINK,
  CREATE_JOIN_LINK,
  ROTATE_JOIN_LINK,
  REVOKE_JOIN_LINK,
  type FamilyGroupJoinLink,
} from '../../../graphql/familyGroup';
import { useStrings } from '../familyStrings';
import { fgErrorMessage, getFgErrorCode, FG_ERROR } from '../familyErrors';
import { ModalShell, ModalHeader, ConfirmDialog } from './familyUi';

/**
 * Owner-only invite screen (SCR-FG2-001). Replaces the old email-invite form:
 * a single copy-link box with expiry + remaining-uses, plus Rotate / Revoke (each behind
 * a confirm). Every op here is guarded @GroupRole(OWNER) server-side — the dashboard only
 * mounts this for owners, but the server is the real gate.
 */

type Confirming = 'rotate' | 'revoke' | null;

export default function InviteLinkModal({
  groupId,
  onClose,
  onToast,
}: {
  groupId: string;
  onClose: () => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}) {
  const s = useStrings();
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);

  const { data, loading, error, refetch } = useQuery<{
    groupJoinLink: FamilyGroupJoinLink;
  }>(GROUP_JOIN_LINK, {
    variables: { groupId },
    fetchPolicy: 'network-only',
  });

  const [createLink, { loading: creating }] = useMutation(CREATE_JOIN_LINK);
  const [rotateLink, { loading: rotating }] = useMutation(ROTATE_JOIN_LINK);
  const [revokeLink, { loading: revoking }] = useMutation(REVOKE_JOIN_LINK);

  const link = data?.groupJoinLink;
  // "No link yet" is a normal state, not a failure — offer to create one.
  const noLinkYet = getFgErrorCode(error) === FG_ERROR.JOIN_LINK_NOT_FOUND;
  const hardError = error && !noLinkYet;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      onToast(s.toastCopied, 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast(s.copyFailed, 'error');
    }
  };

  const handleCreate = async () => {
    try {
      await createLink({ variables: { input: { groupId } } });
      await refetch();
    } catch (e) {
      onToast(fgErrorMessage(e), 'error');
    }
  };

  const handleRotate = async () => {
    try {
      await rotateLink({ variables: { input: { groupId } } });
      await refetch();
      setConfirming(null);
      setCopied(false);
      onToast(s.toastLinkRotated, 'success');
    } catch (e) {
      setConfirming(null);
      onToast(fgErrorMessage(e), 'error');
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeLink({ variables: { groupId } });
      await refetch();
      setConfirming(null);
      onToast(s.toastLinkRevoked, 'success');
    } catch (e) {
      setConfirming(null);
      onToast(fgErrorMessage(e), 'error');
    }
  };

  if (confirming === 'rotate') {
    return (
      <ConfirmDialog
        onClose={() => setConfirming(null)}
        onConfirm={handleRotate}
        loading={rotating}
        icon="autorenew"
        iconBg="bg-[#DC2626]"
        confirmBg="bg-[#DC2626]"
        confirmHover="hover:bg-[#B91C1C]"
        title={s.rotateConfirmTitle}
        cancelText={s.cancel}
        confirmText={s.rotateConfirmCta}
        busyText={s.busyWorking}
      >
        {s.rotateConfirmBody}
      </ConfirmDialog>
    );
  }
  if (confirming === 'revoke') {
    return (
      <ConfirmDialog
        onClose={() => setConfirming(null)}
        onConfirm={handleRevoke}
        loading={revoking}
        icon="link_off"
        iconBg="bg-[#DC2626]"
        confirmBg="bg-[#DC2626]"
        confirmHover="hover:bg-[#B91C1C]"
        title={s.revokeConfirmTitle}
        cancelText={s.cancel}
        confirmText={s.revokeConfirmCta}
        busyText={s.busyWorking}
      >
        {s.revokeConfirmBody}
      </ConfirmDialog>
    );
  }

  return (
    <ModalShell onClose={onClose} maxWidth={520} labelledBy="invite-title" showClose>
      <ModalHeader
        icon="link"
        title={s.inviteTitle}
        subtitle={s.inviteSubtitle}
        titleId="invite-title"
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          <div className="h-11 w-full animate-pulse rounded-lg bg-gray-100" />
          <div className="h-16 w-full animate-pulse rounded-lg bg-gray-100" />
        </div>
      ) : hardError ? (
        <div className="mt-6">
          <p className="rounded-lg bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B42318]">
            {fgErrorMessage(error)}
          </p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {s.close}
            </button>
          </div>
        </div>
      ) : noLinkYet || !link ? (
        <div className="mt-6 text-center">
          <p className="text-[14px] text-[#8A8C8E]">{s.noLinkYet}</p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-[#009265] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-colors hover:bg-[#007C55] disabled:opacity-60"
          >
            <Icon name="add_link" size="small" color="#FFFFFF" />
            {creating ? s.creating : s.createLink}
          </button>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {s.close}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <label
              htmlFor="invite-link-url"
              className="text-sm font-medium text-gray-700"
            >
              {s.inviteLinkLabel}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="invite-link-url"
                readOnly
                value={link.url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-[#F6FAF9] px-3 py-2 font-mono text-[13px] text-[#4B5563] outline-none"
              />
              <button
                type="button"
                onClick={copy}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#009265] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-colors hover:bg-[#007C55]"
              >
                <Icon
                  name={copied ? 'check' : 'content_copy'}
                  size="small"
                  color="#FFFFFF"
                />
                {copied ? s.copied : s.copy}
              </button>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[#8A8C8E]">{s.inviteHelper}</p>
          </div>

          {/* Link management kept quiet — the invite flow is the loud part (design SCR-FG2). */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setConfirming('rotate')}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8A8C8E] transition-colors hover:text-[#B45309]"
            >
              <Icon name="autorenew" size="small" />
              {s.rotateLink}
            </button>
            <button
              type="button"
              onClick={() => setConfirming('revoke')}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8A8C8E] transition-colors hover:text-[#DC2626]"
            >
              <Icon name="link_off" size="small" />
              {s.revokeLink}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
