/**
 * PrivacyNoticeDialog — popup ประกาศความเป็นส่วนตัวฉบับเต็ม เปิดซ้อนบนกล่อง consent
 *
 * หัว popup (ชื่อ + ปุ่มสลับภาษา + ปุ่มปิด) อยู่กับที่ เลื่อนเฉพาะเนื้อหา
 * ผู้ใช้จึงสลับภาษาหรือปิดได้ตลอดโดยไม่ต้องเลื่อนกลับขึ้นไปหาปุ่ม
 *
 * ★ เปิดซ้อนบน modal อื่นเสมอ (ConsentModal, ModalShell ของกลุ่มครอบครัว) ต้องระวังสามเรื่อง:
 *   ① Esc: modal ข้างล่างก็ฟัง keydown บน document — ConsentModal ถือว่า Esc = "ยกเลิกการสมัคร"
 *      จึงดักใน capture phase แล้ว stopPropagation ให้ Esc ปิดแค่ popup นี้
 *   ② คลิก: React ส่ง event ผ่าน portal ขึ้นไปตาม component tree (ไม่ใช่ DOM tree)
 *      คลิกใน popup จะไหลไปถึง backdrop ของ modal ข้างล่างแล้วปิดมัน → หยุดที่ root ของ popup
 *   ③ scroll lock ของ body: เก็บค่าเดิมแล้วคืนตอนปิด ลำดับซ้อนกันแบบ stack จึงคืนค่าถูก
 */
import { useEffect, useRef, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { NoticeContent, NoticeLanguageToggle } from './PrivacyNoticeView';
import { useNoticeLanguage, type NoticeLang, type PrivacyNoticeText } from './useNoticeLanguage';

const TITLE: Record<NoticeLang, string> = {
  th: 'ประกาศความเป็นส่วนตัว',
  en: 'Privacy Notice',
};
const CLOSE: Record<NoticeLang, string> = { th: 'ปิด', en: 'Close' };

const stop = (e: SyntheticEvent) => e.stopPropagation();

export function PrivacyNoticeDialog({
  notice,
  onClose,
  initialLang = 'th',
}: {
  notice: PrivacyNoticeText;
  onClose: () => void;
  initialLang?: NoticeLang;
}) {
  const { lang, setLang, available, shown } = useNoticeLanguage(notice, initialLang);
  const uiLang = shown ?? lang;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // onClose มักเป็น arrow ใหม่ทุก render — เก็บใน ref ไม่ให้ effect ข้างล่างผูก/ถอด listener ซ้ำ
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); // ①
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown, true);

    const previousOverflow = document.body.style.overflow; // ③
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      // คืนโฟกัสให้ปุ่มที่เปิด popup — ผู้ใช้คีย์บอร์ด/screen reader จะได้ไม่หลงตำแหน่ง
      opener?.focus?.();
    };
  }, []);

  const changeLang = (next: NoticeLang) => {
    setLang(next);
    // เปลี่ยนภาษา = เริ่มอ่านใหม่จากหัวเรื่อง ไม่ค้างอยู่กลางเอกสารภาษาเดิม
    bodyRef.current?.scrollTo({ top: 0 });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 sm:p-4"
      onClick={(e) => {
        stop(e); // ②
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseDown={stop}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-notice-dialog-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-[640px] flex-col rounded-2xl bg-white shadow-2xl outline-none"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-[#E0E2E5] px-5 py-3 sm:px-6">
          <span className="material-icons text-[#52B69A]" style={{ fontSize: 20 }} aria-hidden="true">
            privacy_tip
          </span>
          <h2
            id="privacy-notice-dialog-title"
            lang={uiLang}
            className="min-w-0 flex-1 text-base font-bold leading-7 text-[#1A1A1A]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {TITLE[uiLang]}
          </h2>
          <NoticeLanguageToggle available={available} shown={shown} onChange={changeLang} />
          <button
            type="button"
            onClick={onClose}
            aria-label={CLOSE[uiLang]}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[#8A8C8E] transition-colors hover:bg-gray-100 hover:text-[#374151]"
          >
            <span className="material-icons" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </header>

        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-4 sm:px-7 sm:py-5">
          <NoticeContent notice={notice} shown={shown} lang={lang} size="sm" />
        </div>

        <footer className="border-t border-[#E0E2E5] px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            lang={uiLang}
            className="h-11 w-full cursor-pointer rounded-lg border-none bg-[#52B69A] text-[15px] font-bold text-white transition hover:bg-[#45a085]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {CLOSE[uiLang]}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
