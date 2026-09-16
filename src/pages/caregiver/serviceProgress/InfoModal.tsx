import { useEffect, type ReactNode } from 'react';
import { Icon } from '../../../components/ui/Icon';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** lg = เนื้อหาเป็นกริดหลายคอลัมน์ (โปรไฟล์เต็ม) · md = รายการสั้น ๆ */
  size?: 'md' | 'lg';
  children: ReactNode;
}

/** เปลือกป๊อปอัปแบบอ่านข้อมูล — ใช้ร่วมกันระหว่างป๊อปอัปโปรไฟล์ผู้รับบริการและรายละเอียดงาน
 *  บนมือถือยกขึ้นจากก้นจอ (bottom sheet) บนจอใหญ่อยู่กลางจอ */
export default function InfoModal({ isOpen, onClose, title, subtitle, size = 'md', children }: Readonly<InfoModalProps>) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`max-h-[88vh] w-full overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl ${
          size === 'lg' ? 'sm:max-w-[640px]' : 'sm:max-w-[480px]'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#F0F1F3] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-[#1A1A1A]" style={FONT}>
              {title}
            </p>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-[#8A8C8E]" style={FONT}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#575859] transition hover:bg-[#F0F1F3] focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-73px)] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
