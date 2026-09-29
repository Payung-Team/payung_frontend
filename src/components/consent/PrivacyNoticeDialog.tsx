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
import { useCallback, useEffect, useRef, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { useScrolledToEnd } from './useScrolledToEnd';
import { NoticeContent, NoticeLanguageToggle } from './PrivacyNoticeView';
import { useNoticeLanguage, type NoticeLang, type PrivacyNoticeText } from './useNoticeLanguage';

const TITLE: Record<NoticeLang, string> = {
  th: 'ประกาศความเป็นส่วนตัว',
  en: 'Privacy Notice',
};
const CLOSE: Record<NoticeLang, string> = { th: 'ปิด', en: 'Close' };

const stop = (e: SyntheticEvent) => e.stopPropagation();

const READ_HINT: Record<NoticeLang, string> = {
  th: 'เลื่อนอ่านให้จบเพื่อยืนยันว่าอ่านประกาศแล้ว',
  en: 'Scroll to the end to confirm you have read the notice',
};
const READ_DONE: Record<NoticeLang, string> = {
  th: 'อ่านจบแล้ว — ปิดหน้านี้เพื่อกลับไปให้ความยินยอม',
  en: 'Finished reading — close this to return to consent',
};

export function PrivacyNoticeDialog({
  notice,
  onClose,
  onReadToEnd,
  initialLang = 'th',
}: {
  notice: PrivacyNoticeText;
  onClose: () => void;
  /**
   * เรียกครั้งเดียวเมื่อผู้ใช้เลื่อนเนื้อหาถึงท้าย (ภาษาไหนก็ได้ — เนื้อความเดียวกัน)
   * ส่งมา = จุดนี้บังคับอ่านจบ → popup แสดงสถานะการอ่านที่ท้าย
   */
  onReadToEnd?: () => void;
  initialLang?: NoticeLang;
}) {
  const { lang, setLang, available, shown } = useNoticeLanguage(notice, initialLang);
  const uiLang = shown ?? lang;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // onClose/onReadToEnd มักเป็น arrow ใหม่ทุก render — เก็บใน ref ไม่ให้ effect ข้างล่างผูก/ถอด listener ซ้ำ
  const onCloseRef = useRef(onClose);
  const onReadToEndRef = useRef(onReadToEnd);
  useEffect(() => {
    onCloseRef.current = onClose;
    onReadToEndRef.current = onReadToEnd;
  }, [onClose, onReadToEnd]);

  // ★ ใช้ตัวตรวจเดียวกับกล่อง consent (เผื่อ 8px, ถ้าเนื้อหาสั้นกว่ากล่อง = ถือว่าอ่านจบ)
  //   กรณี BE ส่งประกาศว่างทั้งคู่ → เหลือแค่ข้อความขอสำเนาทางอีเมล ซึ่งสั้น → นับว่าอ่านจบ
  //   ตั้งใจ: ไฟล์หายเป็นปัญหา deploy ถ้าล็อกไว้ จะไม่มีใครสมัครได้เลย
  const [readToEnd, attachScroller] = useScrolledToEnd();
  const attachBody = useCallback(
    (el: HTMLDivElement | null) => {
      bodyRef.current = el;
      attachScroller(el);
    },
    [attachScroller],
  );
  useEffect(() => {
    if (readToEnd) onReadToEndRef.current?.();
  }, [readToEnd]);

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
        className="flex max-h-[92vh] w-full max-w-[720px] flex-col rounded-2xl bg-white shadow-2xl outline-none"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-[#E0E2E5] px-5 py-4 sm:px-6">
          <span className="material-icons text-[#52B69A]" style={{ fontSize: 24 }} aria-hidden="true">
            privacy_tip
          </span>
          <h2
            id="privacy-notice-dialog-title"
            lang={uiLang}
            className="min-w-0 flex-1 text-lg font-bold leading-7 text-[#1A1A1A] sm:text-xl"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {TITLE[uiLang]}
          </h2>
          <NoticeLanguageToggle available={available} shown={shown} onChange={changeLang} />
          <button
            type="button"
            onClick={onClose}
            aria-label={CLOSE[uiLang]}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[#8A8C8E] transition-colors hover:bg-gray-100 hover:text-[#374151]"
          >
            <span className="material-icons" style={{ fontSize: 22 }}>
              close
            </span>
          </button>
        </header>

        <div ref={attachBody} className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <NoticeContent notice={notice} shown={shown} lang={lang} />
        </div>

        <footer className="border-t border-[#E0E2E5] px-5 py-4 sm:px-6">
          {onReadToEnd && (
            <p
              lang={uiLang}
              role="status"
              className={`mb-3 flex items-center gap-1.5 text-sm font-semibold ${
                readToEnd ? 'text-[#2F8F74]' : 'text-[#B8860B]'
              }`}
            >
              <span className="material-icons" style={{ fontSize: 18 }} aria-hidden="true">
                {readToEnd ? 'check_circle' : 'expand_more'}
              </span>
              {readToEnd ? READ_DONE[uiLang] : READ_HINT[uiLang]}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            lang={uiLang}
            className="h-12 w-full cursor-pointer rounded-lg border-none bg-[#52B69A] text-base font-bold text-white transition hover:bg-[#45a085]"
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
