import { useState, useEffect } from 'react';
import { Icon } from './Icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastPosition = 'bottom-right' | 'top-center' | 'top-right';
export type ToastVariant = 'default' | 'soft-card' | 'admin-toast' | 'booking-toast' | 'decline-toast' | 'dispute-toast';

interface ToastProps {
  readonly message: React.ReactNode;
  readonly type?: ToastType;
  readonly duration?: number;
  readonly onClose?: () => void;
  readonly variant?: ToastVariant;
  readonly isContainerChild?: boolean;
}

export function Toast({
  message,
  type = 'success',
  duration = 3000,
  onClose,
  variant = 'default',
  isContainerChild = false,
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

  if (variant === 'booking-toast') {
    return (
      <div
        className={`flex w-[340px] max-w-[90vw] items-start gap-4 rounded-[20px] bg-[#E6F5ED] border border-[#D1FAE5] px-6 py-5 text-[#1A1A1A] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.08),0px_10px_10px_-5px_rgba(0,0,0,0.03)] transition-all duration-200 ${fadeClass} relative`}
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* Circle Check Icon */}
        <span className="inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-[#005C3E] text-white">
          <Icon name="check" style={{ fontSize: '14px', fontWeight: 'bold' }} color="#FFFFFF" />
        </span>

        {/* Content */}
        <div className="flex flex-col items-start gap-1 pr-4">
          <span className="text-[14px] font-bold leading-[24px] text-[#004D36]">
            แจ้งเตือนจากระบบ
          </span>
          <span className="text-[12px] font-normal leading-[19px] text-[#1A1A1A] whitespace-pre-line">
            {message}
          </span>
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-5 right-5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#52B69A] hover:text-[#005C3E] transition-all cursor-pointer bg-transparent border-0 p-0"
            aria-label="Close"
          >
            <Icon name="close" style={{ fontSize: '20px' }} />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'decline-toast') {
    return (
      <div
        className={`flex w-[340px] max-w-[90vw] items-start gap-4 rounded-[20px] bg-[#FFF5F5] border border-[#FEE2E2] px-6 py-5 text-[#8C1D1D] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.08),0px_10px_10px_-5px_rgba(0,0,0,0.03)] transition-all duration-200 ${fadeClass} relative`}
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* Info Icon with white background representing cutout */}
        <Icon
          name="info"
          className="text-[24px] text-[#8C1D1D] bg-white rounded-full shrink-0"
          style={{ fontSize: '24px' }}
        />

        {/* Content */}
        <div className="flex flex-col items-start gap-1 pr-4">
          <span className="text-[14px] font-bold leading-[24px] text-[#8C1D1D]">
            แจ้งเตือนจากระบบ
          </span>
          <span className="text-[12px] font-normal leading-[19px] text-[#8C1D1D] whitespace-pre-line">
            {message}
          </span>
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-5 right-5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#C94A4A] hover:text-[#8C1D1D] transition-all cursor-pointer bg-transparent border-0 p-0"
            aria-label="Close"
          >
            <Icon name="close" style={{ fontSize: '20px' }} />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'dispute-toast') {
    const bgClass = {
      success: 'bg-[#059669]',
      error: 'bg-[#DC2626]',
      info: 'bg-[#2563EB]',
      warning: 'bg-[#D97706]',
    }[type];

    const iconName = {
      success: 'check',
      error: 'close',
      info: 'info',
      warning: 'warning',
    }[type];

    return (
      <div
        className={`inline-flex items-center gap-2.5 rounded-xl ${bgClass} p-3 text-white shadow-lg transition-all duration-200 ${fadeClass}`}
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Icon name={iconName} style={{ fontSize: '18px' }} color="#FFFFFF" />
        </span>
        <span className="text-[13px] font-bold leading-5">{message}</span>
      </div>
    );
  }

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

  if (variant === 'admin-toast') {
    const bgClass = {
      success: 'bg-[#ECFDF5] border border-[#10B981]/25 text-[#047857]',
      error: 'bg-[#FEF2F2] border border-[#EF4444]/20 text-[#DC2626]',
      info: 'bg-[#EFF6FF] border border-[#3B82F6]/20 text-[#1D4ED8]',
      warning: 'bg-[#FFFBEB] border border-[#F59E0B]/20 text-[#D97706]',
    }[type];

    return (
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-[14px] font-semibold leading-5 shadow-sm transition-all duration-200 ${bgClass} ${fadeClass}`}
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <span>{message}</span>
        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-black/5 opacity-85 hover:opacity-100 transition-all cursor-pointer"
            aria-label="Dismiss toast"
          >
            <Icon name="close" size="small" className="text-current scale-75" />
          </button>
        )}
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

  const positionClass = isContainerChild
    ? 'relative'
    : 'fixed top-20 right-6 z-50';

  return (
    <div
      className={`${positionClass} flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-lg transition-all duration-200 ${bgColor} ${fadeClass}`}
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
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
      ? 'fixed top-20 left-1/2 -translate-x-1/2 z-50'
      : position === 'top-right'
        ? 'fixed top-20 right-6 z-50'
        : 'fixed bottom-4 right-4 z-50';

  return (
    <div className={`${positionClass} flex flex-col gap-2`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          variant={toast.variant ?? variant}
          onClose={() => onRemove(toast.id)}
          isContainerChild={true}
        />
      ))}
    </div>
  );
}
