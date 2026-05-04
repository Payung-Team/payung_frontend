
import { Icon } from './Icon';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
  showCancel?: boolean;
}

export default function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'info',
  isLoading = false,
  showCancel = true,
}: AlertModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'error_outline',
          iconBg: 'bg-[#FEF2F2]',
          iconColor: '#DC2626',
          confirmBtn: 'bg-[#DC2626] hover:bg-[#B91C1C] shadow-[0_4px_12px_rgba(220,38,38,0.2)]',
        };
      case 'warning':
        return {
          icon: 'warning_amber',
          iconBg: 'bg-[#FFFBEB]',
          iconColor: '#D97706',
          confirmBtn: 'bg-[#D97706] hover:bg-[#B45309] shadow-[0_4px_12px_rgba(217,119,6,0.2)]',
        };
      case 'success':
        return {
          icon: 'check_circle_outline',
          iconBg: 'bg-[#F0FDF4]',
          iconColor: '#16A34A',
          confirmBtn: 'bg-[#16A34A] hover:bg-[#15803D] shadow-[0_4px_12px_rgba(22,163,74,0.2)]',
        };
      default:
        return {
          icon: 'help_outline',
          iconBg: 'bg-[#F0F9FF]',
          iconColor: '#0284C7',
          confirmBtn: 'bg-[#0284C7] hover:bg-[#0369A1] shadow-[0_4px_12px_rgba(2,132,199,0.2)]',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm transition-all duration-300">
      <div 
        className="w-full max-w-[400px] rounded-[24px] bg-white p-8 text-center shadow-2xl animate-[modalEnter_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-full ${styles.iconBg} mb-6 transition-transform duration-300 hover:scale-110 shadow-sm`}>
          <Icon name={styles.icon as any} size="large" color={styles.iconColor} />
        </div>

        {/* Text */}
        <h2
          className="text-2xl font-bold leading-tight text-[#111827]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {title}
        </h2>

        <p
          className="mt-3 text-base leading-relaxed text-[#6B7280]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`h-[52px] w-full rounded-xl text-[16px] font-bold text-white transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${styles.confirmBtn}`}
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {isLoading ? (
               <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : null}
            {confirmText}
          </button>
          
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-[52px] w-full rounded-xl border border-[#E5E7EB] bg-white text-[16px] font-semibold text-[#6B7280] transition-all duration-200 hover:bg-[#F9FAFB] active:scale-[0.98] cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
