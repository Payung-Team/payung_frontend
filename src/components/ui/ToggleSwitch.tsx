import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  className = '',
}) => {
  const trackClass = disabled
    ? 'cursor-not-allowed bg-[#E0E2E5]'
    : checked
      ? 'bg-[#52B69A] cursor-pointer'
      : 'bg-[#E0E2E5] cursor-pointer';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`relative h-6 w-12 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#52B69A] focus-visible:ring-offset-2 ${trackClass} ${className}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          checked && !disabled ? 'left-6.5' : 'left-0.5'
        }`}
      />
    </button>
  );
};
