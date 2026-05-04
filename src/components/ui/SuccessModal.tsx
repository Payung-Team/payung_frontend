
import { Icon } from './Icon';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[400px] rounded-[20px] bg-white p-8 text-center shadow-lg animate-[fadeIn_0.2s_ease-out]">

        {/* Success Icon */}
        <div className="mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#E6F5ED]">
          <Icon name="check_circle" size="large" color="#52B69A" />
        </div>

        {/* Text */}
        <h2
          className="mt-6 text-2xl font-bold leading-tight text-[#1A1A1A]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          สมัครสมาชิกสำเร็จ!
        </h2>

        <p
          className="mt-3 text-base leading-relaxed text-[#8A8C8E]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          กรุณาตรวจสอบอีเมลของคุณ<br />
          เพื่อยืนยันบัญชีผู้ใช้งาน
        </p>

        {/* Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-8 h-[52px] w-full rounded-lg bg-[#52B69A] text-[18px] font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition-all duration-200 hover:bg-[#45a085] hover:shadow-[0_6px_20px_rgba(82,182,154,0.35)] active:scale-[0.98] cursor-pointer"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          เริ่มต้นใช้งาน
        </button>

      </div>
    </div>
  );
}
