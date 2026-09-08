import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Icon } from '../../../components/ui/Icon';
import {
  CREATE_FAMILY_GROUP,
  RENAME_FAMILY_GROUP,
  TRANSFER_OWNERSHIP,
  DELETE_FAMILY_GROUP,
  MY_FAMILY_GROUPS,
  type FamilyGroup,
} from '../../../graphql/familyGroup';
import { useStrings } from '../familyStrings';
import { fgErrorMessage } from '../familyErrors';
import { ModalShell, ModalHeader, GroupAvatar } from './familyUi';

const NAME_MAX = 80; // GROUP_NAME_MAX_LENGTH on the API

// ── Create ───────────────────────────────────────────────────────────────────

export function CreateGroupModal({
  onClose,
  onCreated,
  onToast,
}: {
  onClose: () => void;
  onCreated: (group: FamilyGroup) => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}) {
  const s = useStrings();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [create, { loading }] = useMutation<{ createFamilyGroup: FamilyGroup }>(
    CREATE_FAMILY_GROUP,
    { refetchQueries: [{ query: MY_FAMILY_GROUPS }] },
  );

  const trimmed = name.trim();
  const localError = !trimmed
    ? s.nameRequired
    : trimmed.length > NAME_MAX
      ? s.nameTooLong(NAME_MAX)
      : '';

  const submit = async () => {
    setTouched(true);
    if (localError) return;
    try {
      const res = await create({ variables: { input: { name: trimmed } } });
      if (res.data?.createFamilyGroup) onCreated(res.data.createFamilyGroup);
    } catch (e) {
      onToast(fgErrorMessage(e), 'error');
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth={500} labelledBy="create-title">
      <ModalHeader
        icon="group_add"
        title={s.createTitle}
        subtitle={s.createSubtitle}
        titleId="create-title"
      />
      <NameField
        label={s.groupNameLabel}
        placeholder={s.groupNamePlaceholder}
        value={name}
        onChange={setName}
        onEnter={submit}
        error={touched ? localError : ''}
        count={s.charCount([...trimmed].length, NAME_MAX)}
      />
      <FormActions
        cancelText={s.cancel}
        confirmText={s.create}
        busyText={s.busyCreating}
        loading={loading}
        disabled={touched && !!localError}
        onClose={onClose}
        onConfirm={submit}
      />
    </ModalShell>
  );
}

// ── Rename ───────────────────────────────────────────────────────────────────

export function RenameGroupModal({
  group,
  onClose,
  onDone,
  onToast,
}: {
  group: FamilyGroup;
  onClose: () => void;
  onDone: () => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}) {
  const s = useStrings();
  const [name, setName] = useState(group.name);
  const [touched, setTouched] = useState(false);
  const [rename, { loading }] = useMutation(RENAME_FAMILY_GROUP);

  const trimmed = name.trim();
  const localError = !trimmed
    ? s.nameRequired
    : trimmed.length > NAME_MAX
      ? s.nameTooLong(NAME_MAX)
      : '';
  const unchanged = trimmed === group.name;

  const submit = async () => {
    setTouched(true);
    if (localError || unchanged) {
      if (unchanged) onClose();
      return;
    }
    try {
      await rename({ variables: { input: { groupId: group.id, name: trimmed } } });
      onToast(s.toastRenamed, 'success');
      onDone();
    } catch (e) {
      onToast(fgErrorMessage(e), 'error');
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth={500} labelledBy="rename-title">
      <h2 id="rename-title" className="text-xl font-bold text-[#064E3B]">
        {s.renameTitle}
      </h2>
      <p className="mt-1 text-sm text-gray-500">{s.renameSubtitle}</p>
      <NameField
        label={s.groupNameLabel}
        placeholder={s.groupNamePlaceholder}
        value={name}
        onChange={setName}
        onEnter={submit}
        error={touched ? localError : ''}
        count={s.charCount([...trimmed].length, NAME_MAX)}
        autoFocus
      />
      <FormActions
        cancelText={s.cancel}
        confirmText={s.save}
        busyText={s.busySaving}
        loading={loading}
        disabled={touched && !!localError}
        onClose={onClose}
        onConfirm={submit}
      />
    </ModalShell>
  );
}

// ── Transfer ownership ─────────────────────────────────────────────────────────

export function TransferOwnershipModal({
  group,
  onClose,
  onDone,
  onToast,
}: {
  group: FamilyGroup;
  onClose: () => void;
  onDone: () => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}) {
  const s = useStrings();
  const others = group.members.filter((m) => !m.isMe && m.role !== 'OWNER');
  const [selected, setSelected] = useState(others[0]?.userId ?? '');
  const [transfer, { loading }] = useMutation(TRANSFER_OWNERSHIP);

  const submit = async () => {
    if (!selected) return;
    const target = others.find((m) => m.userId === selected);
    try {
      await transfer({
        variables: { input: { groupId: group.id, newOwnerUserId: selected } },
      });
      onToast(s.toastTransferred(target?.displayName || target?.email || ''), 'success');
      onDone();
    } catch (e) {
      onToast(fgErrorMessage(e), 'error');
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth={500} labelledBy="transfer-title">
      <ModalHeader
        icon="swap_horiz"
        title={s.transferTitle}
        subtitle={s.transferSubtitle}
        titleId="transfer-title"
      />
      {others.length === 0 ? (
        <p className="mt-5 rounded-lg bg-[#F6FAF9] px-4 py-3 text-[13px] text-[#8A8C8E]">
          {s.noOtherMembers}
        </p>
      ) : (
        <div className="mt-5 space-y-2">
          {others.map((m) => {
            const active = selected === m.userId;
            return (
              <label
                key={m.userId}
                className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
                  active
                    ? 'border-2 border-[#009265] bg-[#F0FAF4]'
                    : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="new-owner"
                  className="h-4 w-4 accent-[#009265]"
                  checked={active}
                  onChange={() => setSelected(m.userId)}
                />
                <GroupAvatar name={m.displayName || m.email} seed={m.userId} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#1A1A1A]">
                    {m.displayName || m.email}
                  </p>
                  <p className="truncate text-[12px] text-[#8A8C8E]">{m.email}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
      <FormActions
        cancelText={s.cancel}
        confirmText={s.transferCta}
        busyText={s.busyTransferring}
        loading={loading}
        disabled={others.length === 0 || !selected}
        onClose={onClose}
        onConfirm={submit}
      />
    </ModalShell>
  );
}

// ── Delete group (type-to-confirm) ──────────────────────────────────────────────

export function DeleteGroupModal({
  group,
  onClose,
  onDeleted,
  onToast,
}: {
  group: FamilyGroup;
  onClose: () => void;
  onDeleted: () => void;
  onToast: (message: string, kind?: 'success' | 'error') => void;
}) {
  const s = useStrings();
  const [confirmText, setConfirmText] = useState('');
  const [del, { loading }] = useMutation(DELETE_FAMILY_GROUP, {
    refetchQueries: [{ query: MY_FAMILY_GROUPS }],
  });
  const matches = confirmText.trim() === group.name;

  const submit = async () => {
    if (!matches) return;
    try {
      await del({ variables: { groupId: group.id } });
      onToast(s.toastDeleted, 'success');
      onDeleted();
    } catch (e) {
      onToast(fgErrorMessage(e), 'error');
    }
  };

  const bullets = [
    { text: s.deleteBullet1(group.memberCount), danger: true },
    { text: s.deleteBullet2, danger: true },
    { text: s.deleteBullet3, danger: true },
    { text: s.deleteBulletKept, danger: false },
  ];

  return (
    <ModalShell onClose={onClose} maxWidth={500} labelledBy="delete-title">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DC2626] text-white">
          <Icon name="delete" size="large" color="#FFFFFF" />
        </div>
        <h2 id="delete-title" className="mt-4 text-xl font-bold text-[#064E3B]">
          {s.deleteTitle(group.name)}
        </h2>
        <p className="mt-2 text-sm text-gray-500">{s.deleteIrreversible}</p>
      </div>
      <ul className="mx-auto mt-4 max-w-[400px] space-y-2 rounded-lg bg-[#FEF2F2] p-4">
        {bullets.map((b, i) => (
          <li
            key={i}
            className={`flex gap-2 text-[13px] ${b.danger ? 'text-[#991B1B]' : 'text-[#047857]'}`}
          >
            <Icon
              name={b.danger ? 'close' : 'check'}
              size="small"
              color={b.danger ? '#991B1B' : '#047857'}
            />
            <span>{b.text}</span>
          </li>
        ))}
      </ul>
      <div className="mx-auto mt-5 max-w-[400px] text-left">
        <label htmlFor="delete-confirm" className="text-sm font-medium text-gray-700">
          {s.deleteTypeToConfirm(group.name)}
        </label>
        <input
          id="delete-confirm"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={group.name}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
        />
      </div>
      <FormActions
        cancelText={s.cancel}
        confirmText={s.deleteGroup}
        busyText={s.busyDeleting}
        loading={loading}
        disabled={!matches}
        danger
        onClose={onClose}
        onConfirm={submit}
      />
    </ModalShell>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────────

function NameField({
  label,
  placeholder,
  value,
  onChange,
  onEnter,
  error,
  count,
  autoFocus,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  error: string;
  count: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="mt-5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnter();
          }
        }}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#2D6A58] focus:ring-1 focus:ring-[#2D6A58]"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-sm text-red-500">{error}</span>
        <span className="ml-auto text-xs text-[#8A8C8E]">{count}</span>
      </div>
    </div>
  );
}

function FormActions({
  cancelText,
  confirmText,
  busyText,
  loading,
  disabled,
  danger,
  onClose,
  onConfirm,
}: {
  cancelText: string;
  confirmText: string;
  busyText: string;
  loading: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="h-10 min-w-[120px] rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading || disabled}
        className={`h-10 min-w-[120px] rounded-lg px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          danger ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'bg-[#009265] hover:bg-[#007C55]'
        }`}
      >
        {loading ? busyText : confirmText}
      </button>
    </div>
  );
}
