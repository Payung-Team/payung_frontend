import { ModalShell } from '../../family/components/familyUi';
import { PRIVACY_EMAIL } from '../../../lib/consentErrors';
import { SimpleMarkdown } from './SimpleMarkdown';

/**
 * ประกาศความเป็นส่วนตัวฉบับเต็ม — PYG-540
 *
 * เนื้อหามาจาก consentPolicy.privacyNoticeTh (markdown ไฟล์เดียวกับที่ BE ใช้อ้างอิง)
 * ★ BE คืน '' เมื่อหาไฟล์ไม่เจอ → แสดงช่องทางขอสำเนาทางอีเมลแทน ไม่ใช่ modal ว่างเปล่า
 */
export function PrivacyNoticeModal({
  markdown,
  onClose,
}: {
  markdown: string;
  onClose: () => void;
}) {
  const hasNotice = markdown.trim() !== '';

  return (
    <ModalShell onClose={onClose} maxWidth={820} labelledBy="privacy-notice-title" showClose>
      <h2 id="privacy-notice-title" className="pr-10 text-xl font-bold text-[#064E3B]">
        ประกาศความเป็นส่วนตัว
      </h2>

      <div className="mt-4">
        {hasNotice ? (
          <SimpleMarkdown source={markdown} />
        ) : (
          <p className="text-[15px] leading-7 text-[#374151]">
            ขณะนี้ไม่สามารถแสดงประกาศฉบับเต็มได้ ขอสำเนาประกาศความเป็นส่วนตัวได้ทางอีเมล{' '}
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="font-semibold text-[#009265] underline underline-offset-2"
            >
              {PRIVACY_EMAIL}
            </a>
          </p>
        )}
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
