import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { initial } from '../familyStrings';

/**
 * Small shared building blocks for the Family Group screens, so each modal/panel doesn't
 * re-implement the same overlay, avatar, and badge. Design tokens follow the Payung shell
 * (brand green #009265 / teal #52B69A, danger #DC2626, ground #F6FAF9).
 */

export const FONT = "'Bai Jamjuree', sans-serif";

// Deterministic avatar colour per person, so the same member keeps the same colour.
const AVATAR_COLORS = [
  '#52B69A',
  '#8B5CF6',
  '#F59E0B',
  '#0EA5E9',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
  '#F97316',
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function GroupAvatar({
  name,
  seed,
  size = 44,
  className = '',
}: {
  name?: string | null;
  seed: string;
  size?: number;
  className?: string;
}) {
  const fontSize = Math.round(size * 0.4);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, background: colorFor(seed), fontSize }}
      aria-hidden="true"
    >
      {initial(name)}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  if (role === 'OWNER') {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 text-xs font-semibold text-[#047857]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
        เจ้าของกลุ่ม
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-[#F1F5F9] px-3 text-xs font-semibold text-[#475569]">
      สมาชิก
    </span>
  );
}

/**
 * Accessible modal shell: dimmed backdrop, centred card, closes on backdrop click and Esc,
 * locks body scroll, moves focus to the dialog on open. A subtle scale/opacity enter.
 */
export function ModalShell({
  onClose,
  children,
  maxWidth = 500,
  labelledBy,
}: {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  labelledBy?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll-lock + Escape-to-close + focus the dialog. The enter animation is pure CSS
  // (keyframes in index.css), so there is no setState in this effect.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    cardRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fg-modal-backdrop fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4"
      style={{ fontFamily: FONT }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="fg-modal-card max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl outline-none"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}

/** Icon + title header used at the top of the create / invite / transfer modals. */
export function ModalHeader({
  icon,
  title,
  subtitle,
  titleId,
}: {
  icon: string;
  title: string;
  subtitle: string;
  titleId?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#009265] text-white">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <h2 id={titleId} className="text-xl font-bold text-[#064E3B]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

/** Danger / confirm dialog with a coloured icon disc (delete, remove, leave, rotate…). */
export function ConfirmDialog({
  onClose,
  onConfirm,
  loading,
  icon,
  iconBg,
  confirmBg,
  confirmHover = '',
  title,
  children,
  cancelText,
  confirmText,
  busyText,
  confirmDisabled = false,
}: {
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  icon: string;
  iconBg: string;
  confirmBg: string;
  confirmHover?: string;
  title: string;
  children?: ReactNode;
  cancelText: string;
  confirmText: string;
  busyText: string;
  confirmDisabled?: boolean;
}) {
  return (
    <ModalShell onClose={onClose} maxWidth={500} labelledBy="confirm-title">
      <div className="text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white ${iconBg}`}
        >
          <Icon name={icon} size="large" />
        </div>
        <h2 id="confirm-title" className="mt-4 text-xl font-bold text-[#064E3B]">
          {title}
        </h2>
        {children && (
          <div className="mt-2 text-sm leading-6 text-gray-500">{children}</div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-10 min-w-[120px] rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className={`h-10 min-w-[120px] rounded-lg px-4 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${confirmBg} ${confirmHover}`}
          >
            {loading ? busyText : confirmText}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
