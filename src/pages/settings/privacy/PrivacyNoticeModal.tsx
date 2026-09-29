import { ModalShell } from '../../family/components/familyUi';
import {
  PrivacyNoticeView,
  type PrivacyNoticeText,
} from '../../../components/consent/PrivacyNoticeView';

/**
 * ประกาศความเป็นส่วนตัวฉบับเต็ม — PYG-540
 *
 * เนื้อหามาจาก consentPolicy.privacyNoticeTh/En (markdown ไฟล์เดียวกับที่ BE ใช้อ้างอิง)
 * ★ BE คืน '' เมื่อหาไฟล์ไม่เจอ → PrivacyNoticeView แสดงช่องทางขอสำเนาทางอีเมลแทน ไม่ใช่ modal ว่างเปล่า
 */
export function PrivacyNoticeModal({
  notice,
  onClose,
}: {
  notice: PrivacyNoticeText;
  onClose: () => void;
}) {
  return (
    <ModalShell onClose={onClose} maxWidth={820} labelledBy="privacy-notice-title" showClose>
      <h2 id="privacy-notice-title" className="pr-10 text-xl font-bold text-[#064E3B]">
        ประกาศความเป็นส่วนตัว
      </h2>

      <div className="mt-4">
        <PrivacyNoticeView notice={notice} />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="h-11 min-w-[120px] rounded-lg bg-[#009265] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#007C55]"
        >
          ปิด
        </button>
      </div>
    </ModalShell>
  );
}
