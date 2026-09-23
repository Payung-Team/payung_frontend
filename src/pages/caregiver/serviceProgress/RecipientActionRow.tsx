import { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import type { PatientProfile } from '../../../lib/patientProfile';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface RecipientActionRowProps {
  patientName: string;
  careRecipientName?: string | null;
  /** รูปของผู้รับบริการ — ไม่มี/โหลดไม่ขึ้น = ตัวอักษรย่อ */
  avatarUrl?: string | null;
  /** PYG-460 — ใช้เฉพาะดึง "ประวัติแพ้ยา" ขึ้นมาโชว์ · รายละเอียดเต็มอยู่ในป๊อปอัปโปรไฟล์ */
  patientProfile?: PatientProfile | null;
  onViewProfile: () => void;
  onViewBookingDetails: () => void;
}

/**
 * แถวล่างของการ์ดงาน — ใครที่เราดูแล + ทางเข้าดูข้อมูลอ้างอิง
 * ใช้ร่วมกันทั้งการ์ดก่อนเช็คอิน (PreShiftCard) และการ์ดระหว่างทำงาน (ShiftStatusCard)
 * เพื่อให้สองหน้าจอนี้ให้ทางเข้าข้อมูลชุดเดียวกันในที่เดียวกัน
 *
 * ★ ประวัติแพ้ยาโชว์ตรงนี้เลย ไม่ได้ซ่อนในป๊อปอัป เพราะเป็นข้อมูลที่ผิดแล้วอันตรายถึงชีวิต
 */
export default function RecipientActionRow({
  patientName,
  careRecipientName,
  avatarUrl,
  patientProfile,
  onViewProfile,
  onViewBookingDetails,
}: Readonly<RecipientActionRowProps>) {
  const displayName = careRecipientName || patientName;
  // จำ URL ที่โหลดพัง (signed URL หมดอายุ ฯลฯ) → ตกเป็นตัวอักษรย่อ ไม่โชว์รูปแตก
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = !!avatarUrl && avatarUrl !== failedSrc;

  return (
    <div className="flex flex-wrap items-center gap-4 p-5">
      {showPhoto ? (
        <img
          src={avatarUrl}
          alt=""
          aria-hidden="true"
          onError={() => setFailedSrc(avatarUrl)}
          className="h-[46px] w-[46px] shrink-0 rounded-full object-cover shadow-[0_4px_16px_rgba(82,182,154,0.25)]"
        />
      ) : (
        <span
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_16px_rgba(82,182,154,0.25)]"
          style={{ background: 'linear-gradient(135deg, #168AAD 0%, #52B69A 100%)' }}
        >
          <span className="text-lg font-bold" style={FONT}>
            {displayName.charAt(0) || '?'}
          </span>
        </span>
      )}

      <div className="min-w-0 flex-[1_1_200px]">
        <p className="text-[11px] font-semibold tracking-wide text-[#8A8C8E]" style={FONT}>
          ผู้รับบริการ
        </p>
        <p className="truncate text-[17px] font-bold leading-relaxed text-[#1A1A1A]" style={FONT}>
          {displayName}
        </p>

        {patientProfile?.allergies && (
          <p
            className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-semibold text-[#991B1B]"
            style={FONT}
          >
            <Icon name="warning" size="small" color="#DC2626" />
            <span className="truncate">แพ้: {patientProfile.allergies}</span>
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onViewProfile}
          className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-semibold text-[#1A1A1A] transition hover:border-[#52B69A] hover:text-[#3A9A7E] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2"
          style={FONT}
        >
          <Icon name="person" size="small" color="currentColor" />
          ดูโปรไฟล์
        </button>
        <button
          type="button"
          onClick={onViewBookingDetails}
          className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#009265] px-5 text-sm font-bold text-white transition hover:bg-[#007A54] focus:outline-none focus:ring-2 focus:ring-[#009265] focus:ring-offset-2"
          style={FONT}
        >
          <Icon name="description" size="small" color="#FFFFFF" />
          ดูรายละเอียดงาน
        </button>
      </div>
    </div>
  );
}
