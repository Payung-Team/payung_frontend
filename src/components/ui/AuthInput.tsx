import React, { useState } from 'react';

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

  const inputBorder = error
    ? 'border-[#DC3545] bg-[#FFF0F1] text-[#DC3545]'
    : 'border-[#E0E2E5] bg-white focus:border-[#52B69A] text-[#1A1A1A]';

  const iconColor = error ? 'text-[#DC3545]' : 'text-[#AAB2BA]';

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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
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
