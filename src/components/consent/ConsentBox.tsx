/**
 * ConsentBox — กล่องความยินยอม PDPA (PYG-539)
 *
 * ★ กฎที่ห้ามผ่อน (ทั้งสามข้อผิดแล้วไม่มี error ให้เห็น แต่ความยินยอมใช้ไม่ได้ตามกฎหมาย):
 *
 *   ① ข้อความมาจาก `consentPolicy` ของ BE เท่านั้น — component นี้ไม่มีข้อความของตัวเองสักคำ
 *      ที่เห็นเป็นภาษาไทยในไฟล์นี้คือป้ายกำกับ UI (เช่น "เลื่อนอ่านให้จบ") ไม่ใช่เนื้อความยินยอม
 *
 *   ② ห้ามติ๊กมาให้ล่วงหน้า — ค่าเริ่มต้นคือไม่ติ๊กเสมอ
 *      กฎหมายต้องการ "การกระทำโดยชัดแจ้ง" ไม่ใช่ "การที่ผู้ใช้ไม่ยกเลิกค่าที่เราตั้งไว้"
 *
 *   ③ ข้อที่ `sensitive` (ม.26) ต้องอยู่ในกรอบของตัวเอง แยกสายตาจากข้อตกลงทั่วไป
 *      และต้องเลื่อนอ่านจนสุดก่อนถึงจะติ๊กได้
 */
import { useState } from 'react';
import type { ConsentItem } from '../../graphql/consent';
// PYG-541: แยกออกมาเป็นไฟล์ของตัวเอง ให้ ConsentModal ใช้ร่วมกันได้
import { useScrolledToEnd } from './useScrolledToEnd';

export interface ConsentBoxProps {
  items: ConsentItem[];
  /** type ที่ผู้ใช้ติ๊กไว้ */
  granted: Set<string>;
  onToggle: (type: string, next: boolean) => void;
  /** ข้อความสิทธิ์เจ้าของข้อมูลจาก BE — แสดงท้ายกล่องเสมอ */
  rightsNote: string;
  /** ประกาศความเป็นส่วนตัวฉบับเต็ม (Markdown) — เปิดอ่านได้จากลิงก์ */
  privacyNotice: string;
  disabled?: boolean;
  /** แสดง error ใต้ข้อที่ยังไม่ติ๊ก (ตั้งหลังผู้ใช้กดบันทึกแล้ว) */
  showErrors?: boolean;
}

function SensitiveItem({
  item,
  checked,
  onToggle,
  disabled,
  error,
}: {
  item: ConsentItem;
  checked: boolean;
  onToggle: (next: boolean) => void;
  disabled: boolean;
  error?: string;
}) {
  const [reachedEnd, attachScroller] = useScrolledToEnd();
  const canToggle = !disabled && reachedEnd;

  return (
    <div className="rounded-2xl border-2 border-[#E0B84C] bg-[#FFFBF0] p-5">
      <div className="flex items-start gap-2">
        <span className="material-icons text-[#B8860B]" style={{ fontSize: 22 }}>
          shield
        </span>
        <p className="text-sm font-bold leading-6 text-[#7A5C00]">
          ข้อมูลที่กฎหมายคุ้มครองเป็นพิเศษ — กรุณาอ่านให้จบก่อนให้ความยินยอม
        </p>
      </div>

      <p className="mt-3 text-base font-bold leading-7 text-[#1A1A1A]">{item.labelTh}</p>

      {/* กล่องเลื่อนอ่าน — ปุ่มติ๊กปลดล็อกเมื่อเลื่อนถึงท้าย */}
      <div
        ref={attachScroller}
        className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-[#E0E2E5] bg-white p-4 text-sm leading-7 text-[#575859]"
      >
        {item.descriptionTh}
      </div>

      {!reachedEnd && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#B8860B]">
          <span className="material-icons" style={{ fontSize: 18 }}>
            expand_more
          </span>
          เลื่อนอ่านให้จบก่อนจึงจะให้ความยินยอมได้
        </p>
      )}

      <label
        className={`mt-3 flex items-start gap-3 rounded-xl border p-4 ${
          canToggle
            ? 'cursor-pointer border-[#E0E2E5] bg-white hover:bg-gray-50'
            : 'cursor-not-allowed border-[#EDEEF0] bg-[#F6F7F8] opacity-60'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={!canToggle}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#52B69A]"
        />
        <span className="text-base font-bold leading-7 text-[#1A1A1A]">
          ฉันยินยอม
          {item.required && <span className="ml-1 text-red-500">*</span>}
        </span>
      </label>

      {error && <p className="mt-2 text-sm font-semibold text-red-500">{error}</p>}
    </div>
  );
}

function PlainItem({
  item,
  checked,
  onToggle,
  disabled,
  error,
}: {
  item: ConsentItem;
  checked: boolean;
  onToggle: (next: boolean) => void;
  disabled: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E0E2E5] bg-white p-4 hover:bg-gray-50">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#52B69A]"
        />
        <span>
          <span className="block text-base font-bold leading-7 text-[#1A1A1A]">
            {item.labelTh}
            {item.required && <span className="ml-1 text-red-500">*</span>}
          </span>
          <span className="mt-1 block text-sm leading-6 text-[#8A8C8E]">
            {item.descriptionTh}
          </span>
        </span>
      </label>
      {error && <p className="mt-1.5 text-sm font-semibold text-red-500">{error}</p>}
    </div>
  );
}

export default function ConsentBox({
  items,
  granted,
  onToggle,
  rightsNote,
  privacyNotice,
  disabled = false,
  showErrors = false,
}: ConsentBoxProps) {
  const [noticeOpen, setNoticeOpen] = useState(false);

  const errorFor = (item: ConsentItem) =>
    showErrors && item.required && !granted.has(item.type)
      ? 'ต้องให้ความยินยอมข้อนี้ก่อนจึงจะบันทึกได้'
      : undefined;

  return (
    <div className="space-y-4">
      {items.map((item) =>
        item.sensitive ? (
          <SensitiveItem
            key={item.type}
            item={item}
            checked={granted.has(item.type)}
            onToggle={(next) => onToggle(item.type, next)}
            disabled={disabled}
            error={errorFor(item)}
          />
        ) : (
          <PlainItem
            key={item.type}
            item={item}
            checked={granted.has(item.type)}
            onToggle={(next) => onToggle(item.type, next)}
            disabled={disabled}
            error={errorFor(item)}
          />
        ),
      )}

      <p className="text-sm leading-6 text-[#8A8C8E]">{rightsNote}</p>

      <button
        type="button"
        onClick={() => setNoticeOpen((open) => !open)}
        className="cursor-pointer border-none bg-none p-0 text-sm font-semibold text-[#52B69A] hover:underline"
      >
        {noticeOpen ? 'ปิดประกาศความเป็นส่วนตัว' : 'อ่านประกาศความเป็นส่วนตัวฉบับเต็ม'}
      </button>

      {noticeOpen && (
        <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#E0E2E5] bg-[#FAFAFA] p-4 text-sm leading-7 text-[#575859]">
          {privacyNotice}
        </div>
      )}
    </div>
  );
}
