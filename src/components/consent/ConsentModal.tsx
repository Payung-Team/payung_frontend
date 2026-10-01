/**
 * ConsentModal — pop-up ขอความยินยอม PDPA แบบทีละขั้น (PYG-541)
 *
 * ใช้หลังกดปุ่มสมัคร: ฟอร์มผ่าน validation แล้วเด้งกล่องนี้ขึ้นมา **ก่อนสร้างบัญชี**
 * ★ ความยินยอมต้องมาก่อนการเก็บข้อมูลเสมอ — กดยกเลิก = ไม่มีบัญชีถูกสร้าง
 *
 * ขั้นตอน (ข้ามขั้นที่ policy ไม่มีข้อนั้น):
 *   1. ข้อกำหนดการใช้บริการ — อ่านฉบับเต็ม → ติ๊กยอมรับ → ถัดไป
 *   2. ประกาศความเป็นส่วนตัว — อ่านฉบับเต็ม → ติ๊กยอมรับ → ถัดไป
 *   3. ข้อที่เหลือ (เช่น การรับข่าวสาร — ไม่บังคับ) → ยินยอมและสมัครสมาชิก
 *
 * ★ checkbox ของขั้นเอกสารกดได้หลังเลื่อนอ่านถึงท้ายเอกสารเท่านั้น
 *   ข้อ "ฉันได้อ่านและยอมรับ..." จะเป็นจริงได้ก็ต่อเมื่อเขาเห็นเนื้อหา ถ้าติ๊กได้ทันที
 *   เท่ากับเราบันทึกว่าเขาอ่านแล้วทั้งที่ไม่เคยเห็น
 * ★ "อ่านจบแล้ว" เก็บไว้ที่ ConsentModal (ไม่ใช่ในขั้น) — ย้อนกลับหรือปิดแล้วเปิดใหม่ไม่ต้องอ่านซ้ำ
 *
 * ★ เนื้อความยินยอมทั้งหมดมาจาก `consentPolicy` ของ BE — ภาษาไทยในไฟล์นี้คือป้ายกำกับ UI เท่านั้น
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsentItem, ConsentScreenCopy } from '../../graphql/consent';
import ConsentBox from './ConsentBox';
import { NoticeContent, NoticeLanguageToggle } from './PrivacyNoticeView';
import { useNoticeLanguage, type NoticeLang, type PrivacyNoticeText } from './useNoticeLanguage';
import { useScrolledToEnd } from './useScrolledToEnd';

export interface ConsentModalProps {
  open: boolean;
  items: ConsentItem[];
  granted: Set<string>;
  onToggle: (type: string, next: boolean) => void;
  screen: ConsentScreenCopy | null;
  rightsNote: string;
  termsOfService: PrivacyNoticeText;
  privacyNotice: PrivacyNoticeText;
  policyVersion: string;
  effectiveDate: string;
  /** กำลังสร้างบัญชีอยู่ — ล็อกปุ่มทั้งกล่อง */
  submitting?: boolean;
  /** ข้อความผิดพลาดจากการสมัคร แสดงในกล่องโดยไม่ปิด */
  error?: string;
  onCancel: () => void;
  onAccept: () => void;
}

type DocKey = 'terms' | 'privacy';

/** ขั้นเอกสาร — type ต้องตรงกับ CONSENT_TYPE ฝั่ง BE (consent.constants.ts) */
const DOC_STEPS: readonly {
  key: DocKey;
  type: string;
  title: Record<NoticeLang, string>;
  unavailable: Record<NoticeLang, string>;
}[] = [
  {
    key: 'terms',
    type: 'terms_of_service',
    title: { th: 'ข้อกำหนดการใช้บริการ', en: 'Terms of Service' },
    unavailable: {
      th: 'ขณะนี้ไม่สามารถแสดงข้อกำหนดฉบับเต็มได้ ขอสำเนาได้ทางอีเมล',
      en: 'The full terms cannot be displayed right now. You can request a copy by email at',
    },
  },
  {
    key: 'privacy',
    type: 'privacy_policy',
    title: { th: 'ประกาศความเป็นส่วนตัว', en: 'Privacy Notice' },
    unavailable: {
      th: 'ขณะนี้ไม่สามารถแสดงประกาศฉบับเต็มได้ ขอสำเนาประกาศความเป็นส่วนตัวได้ทางอีเมล',
      en: 'The full notice cannot be displayed right now. You can request a copy by email at',
    },
  },
];

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" };

type Step =
  | { kind: 'doc'; doc: (typeof DOC_STEPS)[number]; item: ConsentItem; text: PrivacyNoticeText }
  | { kind: 'rest'; items: ConsentItem[] };

export default function ConsentModal(props: ConsentModalProps) {
  // อยู่นอก ConsentWizard: wizard ถูก unmount ตอนปิดกล่อง แต่ "อ่านจบแล้ว" ต้องจำข้ามการเปิดใหม่
  const [readDocs, setReadDocs] = useState<ReadonlySet<DocKey>>(new Set());
  const markRead = useCallback(
    (key: DocKey) =>
      setReadDocs((prev) => (prev.has(key) ? prev : new Set(prev).add(key))),
    [],
  );

  if (!props.open) return null;
  // ★ mount ใหม่ทุกครั้งที่เปิด → เริ่มที่ขั้นแรกเสมอ (ติ๊กที่เคยติ๊กยังอยู่ — state อยู่ที่ Register)
  return <ConsentWizard {...props} readDocs={readDocs} onRead={markRead} />;
}

function ConsentWizard({
  items,
  granted,
  onToggle,
  screen,
  rightsNote,
  termsOfService,
  privacyNotice,
  policyVersion,
  effectiveDate,
  submitting = false,
  error,
  onCancel,
  onAccept,
  readDocs,
  onRead,
}: ConsentModalProps & { readDocs: ReadonlySet<DocKey>; onRead: (key: DocKey) => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const texts: Record<DocKey, PrivacyNoticeText> = { terms: termsOfService, privacy: privacyNotice };
  const docSteps: Step[] = DOC_STEPS.flatMap((doc) => {
    const item = items.find((i) => i.type === doc.type);
    return item ? [{ kind: 'doc' as const, doc, item, text: texts[doc.key] }] : [];
  });
  const docTypes = new Set(DOC_STEPS.map((d) => d.type));
  const restItems = items.filter((i) => !docTypes.has(i.type));
  const steps: Step[] = restItems.length > 0 ? [...docSteps, { kind: 'rest', items: restItems }] : docSteps;

  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= steps.length - 1;

  const docRead = (step: Step) => step.kind !== 'doc' || readDocs.has(step.doc.key);
  const missingRequired = items.some((item) => item.required && !granted.has(item.type));
  const allDocsRead = steps.every(docRead);

  const canNext =
    current.kind === 'doc'
      ? docRead(current) && (!current.item.required || granted.has(current.item.type))
      : true;
  const canAccept = isLast && canNext && allDocsRead && !missingRequired && !submitting;

  // Esc = ยกเลิก · onCancel มักเป็น arrow ใหม่ทุก render — เก็บใน ref
  // ไม่งั้น effect รันใหม่ทุกครั้งที่ติ๊ก แล้วดึงโฟกัสกลับไปที่กล่อง ผู้ใช้คีย์บอร์ดหลงตำแหน่ง
  const cancelRef = useRef({ onCancel, submitting });
  useEffect(() => {
    cancelRef.current = { onCancel, submitting };
  }, [onCancel, submitting]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cancelRef.current.submitting) cancelRef.current.onCancel();
    };
    document.addEventListener('keydown', onKeyDown);

    // ล็อก scroll ของหน้าหลังไม่ให้เลื่อนตามขณะกล่องเปิด
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => setStepIndex((i) => Math.min(steps.length - 1, i + 1));

  const stepTitle =
    current.kind === 'doc'
      ? current.doc.title.th
      : restItems.every((i) => !i.required)
        ? 'ตัวเลือกเพิ่มเติม'
        : 'ความยินยอมเพิ่มเติม';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
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
        // ★ ความสูงคงที่ทุกขั้น — กล่องไม่ยืด/หดตอนกดถัดไป ปุ่มอยู่ที่เดิมให้กดต่อได้เลย
        className="flex h-[min(680px,92vh)] w-full max-w-[560px] flex-col rounded-2xl bg-white shadow-xl outline-none"
      >
        <header className="px-6 pb-3 pt-5">
          <p className="text-xs font-semibold text-[#8A8C8E]">
            {screen?.titleTh ?? 'ความยินยอม'}
            {steps.length > 1 && ` · ขั้นตอนที่ ${stepIndex + 1} จาก ${steps.length}`}
          </p>
          {steps.length > 1 && (
            <div className="mt-2 flex gap-1.5" aria-hidden="true">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= stepIndex ? 'bg-[#52B69A]' : 'bg-[#E5E7EB]'
                  }`}
                />
              ))}
            </div>
          )}
          <h2
            id="consent-modal-title"
            className="mt-3 text-xl font-bold leading-8 text-[#1A1A1A]"
            style={FONT}
          >
            {stepTitle}
          </h2>
        </header>

        {current.kind === 'doc' ? (
          <DocStep
            key={current.doc.key}
            step={current}
            checked={granted.has(current.item.type)}
            onToggle={(next) => onToggle(current.item.type, next)}
            read={readDocs.has(current.doc.key)}
            onRead={onRead}
            disabled={submitting}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            {restItems.every((i) => !i.required) && (
              <p className="mb-3 text-sm leading-6 text-[#8A8C8E]">
                ข้อต่อไปนี้ไม่บังคับ ไม่เลือกก็สมัครและใช้บริการได้ตามปกติ
              </p>
            )}
            <ConsentBox
              items={current.items}
              granted={granted}
              onToggle={onToggle}
              rightsNote={rightsNote}
              disabled={submitting}
            />
            <p className="mt-4 text-xs text-[#B0B2B5]">
              นโยบายเวอร์ชัน {policyVersion} · เริ่มใช้ {effectiveDate}
            </p>
          </div>
        )}

        <footer className="border-t border-[#E0E2E5] px-6 pb-5 pt-4">
          {error && <p className="mb-3 text-[13px] font-semibold text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={isFirst ? onCancel : goBack}
              disabled={submitting}
              className="h-12 flex-1 cursor-pointer rounded-lg border border-[#E0E2E5] bg-white text-base font-bold text-[#575859] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              style={FONT}
            >
              {isFirst ? 'ยกเลิก' : 'ย้อนกลับ'}
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={onAccept}
                disabled={!canAccept}
                className={`h-12 flex-1 rounded-lg bg-[#52B69A] text-base font-bold text-white transition ${
                  canAccept ? 'cursor-pointer hover:bg-[#45a085]' : 'cursor-not-allowed opacity-60'
                }`}
                style={FONT}
              >
                {submitting ? 'กำลังสมัครสมาชิก...' : 'ยินยอมและสมัครสมาชิก'}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!canNext || submitting}
                className={`h-12 flex-1 rounded-lg bg-[#52B69A] text-base font-bold text-white transition ${
                  canNext && !submitting ? 'cursor-pointer hover:bg-[#45a085]' : 'cursor-not-allowed opacity-60'
                }`}
                style={FONT}
              >
                ถัดไป
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

/** ขั้นเอกสาร: อ่านฉบับเต็มในกล่องเลื่อน → ถึงท้ายแล้ว checkbox ยอมรับจึงกดได้ */
function DocStep({
  step,
  checked,
  onToggle,
  read,
  onRead,
  disabled,
}: {
  step: Extract<Step, { kind: 'doc' }>;
  checked: boolean;
  onToggle: (next: boolean) => void;
  read: boolean;
  onRead: (key: DocKey) => void;
  disabled: boolean;
}) {
  const { doc, item, text } = step;
  const { lang, setLang, available, shown } = useNoticeLanguage(text);
  const uiLang = shown ?? lang;

  // ★ ตัวตรวจเดียวกับกล่องอื่น: เผื่อ 8px · เนื้อหาสั้นกว่ากล่อง = อ่านจบ
  //   BE หาไฟล์ไม่เจอ → เหลือข้อความขอสำเนาทางอีเมลสั้น ๆ → นับว่าอ่านจบ
  //   (ตั้งใจ: ไฟล์หายเป็นปัญหา deploy ถ้าล็อกไว้จะไม่มีใครสมัครได้เลย)
  const [reachedEnd, attachScroller] = useScrolledToEnd();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const attachBody = useCallback(
    (el: HTMLDivElement | null) => {
      bodyRef.current = el;
      attachScroller(el);
    },
    [attachScroller],
  );
  useEffect(() => {
    if (reachedEnd) onRead(doc.key);
  }, [reachedEnd, onRead, doc.key]);

  const isRead = read || reachedEnd;
  const canTick = !disabled && isRead;

  const changeLang = (next: NoticeLang) => {
    setLang(next);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
      {available.length > 1 && (
        <div className="mb-2.5 flex justify-end">
          <NoticeLanguageToggle available={available} shown={shown} onChange={changeLang} />
        </div>
      )}

      <div
        ref={attachBody}
        tabIndex={0}
        aria-label={doc.title[uiLang]}
        className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#E0E2E5] bg-[#FAFBFB] px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-[#52B69A] sm:px-5"
      >
        <NoticeContent notice={text} shown={shown} lang={lang} size="sm" unavailable={doc.unavailable} />
      </div>

      <p
        role="status"
        className={`mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold ${
          isRead ? 'text-[#2F8F74]' : 'text-[#B8860B]'
        }`}
      >
        <span className="material-icons" style={{ fontSize: 16 }} aria-hidden="true">
          {isRead ? 'check_circle' : 'expand_more'}
        </span>
        {isRead ? 'อ่านจบแล้ว' : 'เลื่อนอ่านให้จบก่อนจึงจะกดยอมรับได้'}
      </p>

      <label
        className={`mt-2.5 flex items-start gap-3 rounded-xl border px-4 py-3 ${
          canTick
            ? 'cursor-pointer border-[#E0E2E5] bg-white hover:bg-gray-50'
            : 'cursor-not-allowed border-[#EDEEF0] bg-[#F6F7F8] opacity-60'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={!canTick}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#52B69A]"
        />
        <span lang={uiLang} className="text-sm font-bold leading-6 text-[#1A1A1A]">
          {uiLang === 'en' ? item.labelEn : item.labelTh}
          {item.required && <span className="ml-1 text-red-500">*</span>}
        </span>
      </label>
    </div>
  );
}
