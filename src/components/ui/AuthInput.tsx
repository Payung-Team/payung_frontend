import React, { useState } from 'react';
import { Icon } from './Icon';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  icon: React.ReactNode | string;
  error?: string;
  isPassword?: boolean;
  wrapperClassName?: string;
}

export default function AuthInput({
  label,
  id,
  icon,
  error,
  isPassword,
  wrapperClassName = '',
  className = '',
  ...props
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const type = isPassword ? (showPassword ? 'text' : 'password') : props.type || 'text';

  const isReadOnlyOrDisabled = props.disabled || props.readOnly;

  const inputBorder = error
    ? 'border-[#DC3545] bg-[#FFF0F1] text-[#DC3545]'
    : isReadOnlyOrDisabled
      ? 'border-[#E0E2E5] bg-[#F5F6F7] text-[#8A8C8E] cursor-not-allowed'
      : 'border-[#E0E2E5] bg-white focus:border-[#52B69A] text-[#1A1A1A]';

  const iconColor = error 
    ? 'text-[#DC3545]' 
    : isReadOnlyOrDisabled
      ? 'text-[#C6C8CB]'
      : 'text-[#AAB2BA]';

  return (
    <div className={wrapperClassName}>
      <label
        htmlFor={id}
        className="text-sm font-bold leading-6 text-[#575859]"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {label}
      </label>
      <div className="relative mt-1">
        <span className={`pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 ${iconColor}`}>
          {typeof icon === 'string' ? <img src={icon} alt="" width={18} height={18} /> : icon}
        </span>
        <input
          id={id}
          type={type}
          className={`h-[50px] w-full rounded-lg border-[1.5px] pl-10 ${isPassword ? 'pr-10' : 'pr-4'
            } text-[15px] placeholder-[#C6C8CB] outline-none transition-colors ${inputBorder} ${className}`}
          style={{ fontFamily: "'Inter', sans-serif" }}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-[#AAB2BA] hover:text-[#575859] transition-colors cursor-pointer"
          >
            {showPassword ? (
              <Icon name="visibility_off" size="small" color="currentColor" />
            ) : (
              <Icon name="visibility" size="small" color="currentColor" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p
          className="mt-1.5 text-[12px] font-medium leading-[15px] text-[#DC3545]"
          style={{ fontFamily: "'Inter', sans-serif" }}
          id={`${id}-error`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
