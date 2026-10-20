import type { ReactNode } from 'react';
import type { AdminContact } from '../../lib/caregiverMatch';
import { useCaregiverMatchStrings } from '../../lib/caregiverMatchStrings';

/**
 * สถานะของรายชื่อผู้ดูแลตาม booking (S18 · PYG-648) — ตาม Design PYG-645 (D2 · D7 · D9)
 *
 * AC7 / E2 เขียนแบบโน้ตจากทีมงาน: ชิดซ้าย ไม่มีภาพประกอบ ปุ่มเรียงแถวเดียว (มือถือเต็มความกว้าง)
 * ★ ไม่บอกเหตุผลรายคน และไม่บอกจำนวนผู้ดูแลที่ถูกตัดออก (S18 R9)
 */

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" };

const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 h-11 px-[22px] w-full sm:w-auto rounded-xl bg-[#52B69A] hover:bg-[#45A085] ' +
  'text-white text-[14px] font-bold whitespace-nowrap transition-colors cursor-pointer';
const SECONDARY =
  'inline-flex items-center justify-center h-11 px-[22px] w-full sm:w-auto rounded-xl bg-white border border-[#D5D8DB] ' +
  'hover:bg-gray-50 text-[#1A1A1A] text-[14px] font-bold whitespace-nowrap transition-colors cursor-pointer';

const CONTACT_ICON: Record<string, string> = { LINE: 'chat', PHONE: 'call', FORM: 'edit_note' };

/**
 * ช่องติดต่อแอดมิน — ขับด้วย adminContact จาก API (ช่องทางยังไม่เคาะ)
 * ชนิดที่ไม่รู้จักแต่มีลิงก์ → ปุ่มข้อความกลาง · ไม่มีลิงก์ → ข้อความแทนปุ่ม (ยังบอกขั้นถัดไป ไม่ซ่อนทั้งช่อง)
 */
export function AdminContactAction({ contact }: { contact?: AdminContact | null }) {
  const s = useCaregiverMatchStrings();
  if (!contact?.url) {
    return (
      <p className="text-[13px] text-[#575859] leading-5" style={FONT}>
        {s.contactMissing}
      </p>
    );
  }
  const channel = contact.channel.toUpperCase();
  const label =
    { LINE: s.contactLine, PHONE: s.contactPhone, FORM: s.contactForm }[channel] ?? s.contact;
  const external = /^https?:/i.test(contact.url);
  return (
    <span className="inline-flex flex-col items-stretch sm:items-start gap-1 w-full sm:w-auto">
      <a
        href={contact.url}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={PRIMARY}
        style={FONT}
      >
        <span className="material-icons-outlined text-[18px]" aria-hidden="true">
          {CONTACT_ICON[channel] ?? 'support_agent'}
        </span>
        {label}
      </a>
      {contact.display && (
        <span className="text-[12px] text-[#8A8C8E] text-center sm:text-left" style={FONT}>
          {contact.display}
        </span>
      )}
    </span>
  );
}

function NoteCard({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div
      className="bg-white rounded-2xl px-5 py-6 sm:px-9 sm:py-8"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)', ...FONT }}
    >
      <h2 className="text-[18px] sm:text-[20px] font-bold text-[#1A1A1A] leading-snug mb-1.5">{title}</h2>
      <p className="text-[14px] leading-[23px] text-[#575859] max-w-[520px] mb-[22px]">{body}</p>
      <div className="flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-3">{children}</div>
    </div>
  );
}

/** AC7 — ไม่มีผู้ดูแลคนใดผ่านเงื่อนไขของ booking (รายชื่อว่างเป็นผลปกติ ไม่ใช่ error) */
export function NoEligibleCaregiverState({
  contact,
  onEditBooking,
}: {
  contact?: AdminContact | null;
  onEditBooking: () => void;
}) {
  const s = useCaregiverMatchStrings();
  return (
    <NoteCard title={s.emptyTitle} body={s.emptyBody}>
      <AdminContactAction contact={contact} />
      <button type="button" onClick={onEditBooking} className={SECONDARY} style={FONT}>
        {s.editBooking}
      </button>
    </NoteCard>
  );
}

/** E2 — BOOKING_NOT_MATCHABLE: ขั้นถัดไปคือกลับไปแก้การจอง ไม่ใช่ติดต่อแอดมินก่อน (ข้อเสนอ · รอทีมเคาะ) */
export function BookingNotMatchableState({ onBack }: { onBack: () => void }) {
  const s = useCaregiverMatchStrings();
  return (
    <NoteCard title={s.notMatchableTitle} body={s.notMatchableBody}>
      <button type="button" onClick={onBack} className={PRIMARY} style={FONT}>
        {s.backToBooking}
      </button>
    </NoteCard>
  );
}

/** E9 — แจ้งหลังโหลดรายชื่อใหม่ว่าผู้ดูแลที่เลือกไว้รับงานนี้ไม่ได้แล้ว */
export function NotEligibleNotice({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  const s = useCaregiverMatchStrings();
  return (
    <div
      role="status"
      className="flex items-center gap-4 rounded-[10px] bg-[#1F2A27] px-4 py-3 text-[13px] leading-5 text-white"
      style={FONT}
    >
      <span className="flex-1">{s.notEligibleBanner(name)}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="font-bold text-[#8FD9C1] hover:text-white whitespace-nowrap cursor-pointer"
      >
        {s.dismiss}
      </button>
    </div>
  );
}
