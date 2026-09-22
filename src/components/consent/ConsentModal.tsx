/**
 * ConsentModal — pop-up ขอความยินยอม PDPA (PYG-541)
 *
 * ใช้หลังกดปุ่มสมัคร: ฟอร์มผ่าน validation แล้วเด้งกล่องนี้ขึ้นมา **ก่อนสร้างบัญชี**
 * ★ ความยินยอมต้องมาก่อนการเก็บข้อมูลเสมอ — กดยกเลิก = ไม่มีบัญชีถูกสร้าง
 *
 * ★ ปุ่มยินยอมปลดล็อกเมื่อครบสองอย่าง:
 *     ① เลื่อนอ่านจนสุด — ไม่ให้กดผ่านโดยไม่เห็นเนื้อหา
 *     ② ติ๊กข้อบังคับครบ
 *   ข้อ ① ไม่ใช่แค่ UX: กล่องนี้มีประกาศความเป็นส่วนตัวฉบับเต็มอยู่ข้างใน
 *   ถ้ากดยินยอมได้ทันทีโดยไม่เลื่อน เท่ากับเราบันทึกว่าเขาอ่านแล้วทั้งที่เขาไม่เคยเห็น
 *
 * ★ ข้อความทั้งหมดมาจาก `consentPolicy` ของ BE — component นี้ไม่มีเนื้อความยินยอม
 *   ของตัวเองสักคำ (ที่เป็นภาษาไทยในไฟล์คือป้ายกำกับ UI เท่านั้น)
 */
import { useEffect, useRef } from 'react';
import type { ConsentItem, ConsentScreenCopy } from '../../graphql/consent';
import ConsentBox from './ConsentBox';
import { useScrolledToEnd } from './useScrolledToEnd';

export interface ConsentModalProps {
  open: boolean;
  items: ConsentItem[];
  granted: Set<string>;
  onToggle: (type: string, next: boolean) => void;
  screen: ConsentScreenCopy | null;
  rightsNote: string;
  privacyNotice: string;
  policyVersion: string;
  effectiveDate: string;
  /** กำลังสร้างบัญชีอยู่ — ล็อกปุ่มทั้งกล่อง */
  submitting?: boolean;
  /** ข้อความผิดพลาดจากการสมัคร แสดงในกล่องโดยไม่ปิด */
  error?: string;
  onCancel: () => void;
  onAccept: () => void;
}

export default function ConsentModal({
  open,
  items,
  granted,
  onToggle,
  screen,
  rightsNote,
  privacyNotice,
  policyVersion,
  effectiveDate,
  submitting = false,
  error,
  onCancel,
  onAccept,
}: ConsentModalProps) {
  const [reachedEnd, attachScroller] = useScrolledToEnd();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const missingRequired = items.some(
    (item) => item.required && !granted.has(item.type),
  );
  const canAccept = open && reachedEnd && !missingRequired && !submitting;

  // Esc = ยกเลิก · ล็อก scroll ของหน้าหลังไม่ให้เลื่อนตามขณะกล่องเปิด
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, submitting, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      // คลิกนอกกล่อง = ยกเลิก · ระหว่างสร้างบัญชีห้ามปิด ไม่งั้นผู้ใช้ไม่รู้ว่าสมัครสำเร็จไหม
      onClick={() => !submitting && onCancel()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[560px] flex-col rounded-2xl bg-white shadow-xl outline-none"
      >
        <div className="border-b border-[#E0E2E5] px-6 pb-4 pt-6">
          <h2
            id="consent-modal-title"
            className="text-2xl font-bold leading-9 text-[#1A1A1A]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {screen?.titleTh ?? 'ความยินยอม'}
          </h2>
          {screen?.introTh && (
            <p className="mt-1.5 text-base leading-7 text-[#8A8C8E]">{screen.introTh}</p>
          )}
        </div>

        {/* ★ กล่องเลื่อนอ่านเดียวครอบทั้ง checkbox และประกาศฉบับเต็ม */}
        <div ref={attachScroller} className="flex-1 overflow-y-auto px-6 py-5">
          <ConsentBox
            items={items}
            granted={granted}
            onToggle={onToggle}
            rightsNote={rightsNote}
            privacyNotice={privacyNotice}
            disabled={submitting}
            showErrors={false}
          />

          <p className="mt-5 text-xs text-[#B0B2B5]">
            นโยบายเวอร์ชัน {policyVersion} · เริ่มใช้ {effectiveDate}
          </p>
        </div>

        <div className="border-t border-[#E0E2E5] px-6 pb-6 pt-4">
          {/* บอกเหตุผลที่ปุ่มยังกดไม่ได้ — ปุ่มเทาเฉย ๆ ผู้ใช้จะไม่รู้ว่าต้องทำอะไร */}
          {!reachedEnd && (
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[#B8860B]">
              <span className="material-icons" style={{ fontSize: 18 }}>
                expand_more
              </span>
              เลื่อนอ่านให้จบก่อนจึงจะกดยินยอมได้
            </p>
          )}
          {reachedEnd && missingRequired && (
            <p className="mb-3 text-sm font-semibold text-[#B8860B]">
              กรุณาติ๊กข้อที่มีเครื่องหมาย * ให้ครบ
            </p>
          )}
          {error && <p className="mb-3 text-sm font-semibold text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="h-[52px] flex-1 cursor-pointer rounded-lg border border-[#E0E2E5] bg-white text-lg font-bold text-[#575859] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={!canAccept}
              className={`h-[52px] flex-1 rounded-lg bg-[#52B69A] text-lg font-bold text-white transition ${
                canAccept ? 'cursor-pointer hover:bg-[#45a085]' : 'cursor-not-allowed opacity-60'
              }`}
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {submitting ? 'กำลังสมัครสมาชิก...' : 'ยินยอมและสมัครสมาชิก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
