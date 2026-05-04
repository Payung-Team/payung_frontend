import { useState, useEffect } from 'react';
import { Icon } from './Icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastPosition = 'bottom-right' | 'top-center';
type ToastVariant = 'default' | 'soft-card';

interface ToastProps {
  readonly message: string;
  readonly type?: ToastType;
  readonly duration?: number;
  readonly onClose?: () => void;
  readonly variant?: ToastVariant;
}

export function Toast({
  message,
  type = 'success',
  duration = 3000,
  onClose,
  variant = 'default',
}: ToastProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const closeAnimationMs = 220;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (!isClosing) {
      return;
    }

    const closeTimer = setTimeout(() => {
      setIsMounted(false);
      onClose?.();
    }, closeAnimationMs);

    return () => clearTimeout(closeTimer);
  }, [isClosing, onClose]);

  if (!isMounted) return null;

  const fadeClass = isClosing
    ? 'opacity-0 -translate-y-1'
    : 'opacity-100 translate-y-0';

  if (variant === 'soft-card') {
    const iconWrapClass = {
      success: 'bg-[#B5D3C4] text-[#0E8A5B]',
      error: 'bg-[#F8D7DA] text-[#B42318]',
      info: 'bg-[#D1ECF1] text-[#0C5460]',
      warning: 'bg-[#FFE8B3] text-[#9A6700]',
    }[type];

    const iconName = {
      success: 'check',
      error: 'close',
      info: 'info',
      warning: 'warning',
    }[type];

    return (
      <div className={`flex min-w-[320px] items-center gap-4 rounded-2xl bg-[#E6E6E6] px-7 py-4 text-[#111827] shadow-[0_8px_22px_rgba(0,0,0,0.14)] transition-all duration-200 ${fadeClass}`}>
        <span className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${iconWrapClass}`}>
          <Icon name={iconName} size="small" color="currentColor" />
        </span>
        <span className="text-[16px] font-semibold leading-none" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {message}
        </span>
      </div>
    );
  }

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
  }[type];

  const icon = {
    success: <Icon name="check_circle" size="medium" color="currentColor" />,
    error: <Icon name="cancel" size="medium" color="currentColor" />,
    info: <Icon name="info" size="medium" color="currentColor" />,
    warning: <Icon name="warning" size="medium" color="currentColor" />,
  }[type];

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-lg transition-all duration-200 ${bgColor} ${fadeClass}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}

// Toast Container for multiple toasts
export function ToastContainer({
  toasts,
  onRemove,
  position = 'bottom-right',
  variant = 'default',
}: {
  readonly toasts: ReadonlyArray<ToastProps & { id: string }>;
  readonly onRemove: (id: string) => void;
  readonly position?: ToastPosition;
  readonly variant?: ToastVariant;
}) {
  const positionClass =
    position === 'top-center'
      ? 'fixed top-6 left-1/2 -translate-x-1/2 z-50'
      : 'fixed bottom-4 right-4 z-50';

  return (
    <div className={`${positionClass} flex flex-col gap-2`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          variant={variant}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
