import { Icon } from '../ui/Icon';
import { usePhoneAuthStrings } from '../../lib/phoneAuthStrings';

export type AuthMethod = 'phone' | 'email';

interface MethodTabsProps {
  /** ใช้ประกอบ id ของแท็บและ panel เช่น "login" → login-tab-phone / login-panel-phone */
  idPrefix: string;
  ariaLabel: string;
  active: AuthMethod;
  onChange: (method: AuthMethod) => void;
  disabled?: boolean;
}

const METHODS: readonly { key: AuthMethod; icon: string }[] = [
  { key: 'phone', icon: 'phone_iphone' },
  { key: 'email', icon: 'email' },
];

/** แท็บเลือกวิธี เบอร์โทรศัพท์ / อีเมล ของหน้า Login และหน้าสมัคร (PYG-604) */
export default function MethodTabs({ idPrefix, ariaLabel, active, onChange, disabled }: MethodTabsProps) {
  const s = usePhoneAuthStrings();
  const labels: Record<AuthMethod, string> = { phone: s.methodPhone, email: s.methodEmail };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: AuthMethod = active === 'phone' ? 'email' : 'phone';
    onChange(next);
    document.getElementById(`${idPrefix}-tab-${next}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="mt-6 grid grid-cols-2 gap-1 rounded-[10px] border border-[#E0E2E5] bg-white p-1"
    >
      {METHODS.map(({ key, icon }) => {
        const selected = active === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${key}`}
            aria-controls={`${idPrefix}-panel-${key}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(key)}
            onKeyDown={handleKeyDown}
            className={`flex h-12 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-base font-semibold transition-colors disabled:cursor-not-allowed ${
              selected ? 'bg-[#E6F5ED] text-[#1B5C48]' : 'text-[#575859] hover:bg-[#F5F6F7]'
            }`}
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            <Icon name={icon} className="!text-[20px]" color="currentColor" />
            {labels[key]}
          </button>
        );
      })}
    </div>
  );
}
