import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { PROFESSIONS, isProfession } from '../../lib/professions';
import { normalizeLicenseStatus, toBangkokYmd, type LicenseInfo, type LicenseStatus } from '../../lib/license';
import { formatLicenseDate, useLicenseStrings } from '../../lib/licenseStrings';

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

/** ไอคอน + สี ของแต่ละสถานะ — ป้ายมีข้อความเสมอ ไม่พึ่งสีอย่างเดียว */
const STATUS_STYLE: Record<LicenseStatus, { icon: string; className: string }> = {
  pending: { icon: 'hourglass_top', className: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' },
  approved: { icon: 'verified', className: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' },
  rejected: { icon: 'cancel', className: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]' },
  expired: { icon: 'event_busy', className: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]' },
  unknown: { icon: 'help', className: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]' },
};

export function LicenseStatusPill({ status }: { status: LicenseStatus }) {
  const s = useLicenseStrings();
  const style = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${style.className}`} style={font}>
      <Icon name={style.icon} color="currentColor" style={{ fontSize: 15 }} />
      {s.status[status]}
    </span>
  );
}

/**
 * การ์ด "ใบประกอบวิชาชีพ" ในหน้าสถานะ KYC (PYG-588 · ดีไซน์ PYG-584 C4 / M2)
 * แสดงเฉพาะเมื่อมีใบประกอบฯ — หน้าที่เรียกเป็นคนตัดสินตามวิชาชีพ
 *
 * ทางอัปโหลดใบใหม่ (ไม่ผ่าน / หมดอายุ):
 *   - KYC ถูกปฏิเสธ → แก้ KYC ที่ขั้น 2 (resubmitKyc ผูกใบใหม่ให้)
 *   - KYC อนุมัติแล้ว → BE (PYG-587) ยังไม่มี operation ส่งใบใหม่แยกจาก KYC จึงแจ้งให้ติดต่อทีมงาน
 */
export default function LicenseStatusCard({
  license,
  profession,
  kycStatus,
}: {
  license: LicenseInfo;
  profession: string | null | undefined;
  kycStatus: string | null | undefined;
}) {
  const s = useLicenseStrings();
  const navigate = useNavigate();
  const status = normalizeLicenseStatus(license.status);
  const professionLabel = isProfession(profession) ? PROFESSIONS[profession].label : '-';
  const number = license.licenseNumber ?? '-';
  const expiry = license.expiresAt ? formatLicenseDate(toBangkokYmd(license.expiresAt)) : '-';
  const canResubmit = kycStatus === 'rejected';
  const needsNewLicense = status === 'rejected' || status === 'expired';

  return (
    <section
      aria-labelledby="license-status-title"
      className="w-full rounded-[16px] border border-[#E2E8F0] bg-white p-5 text-left"
      style={font}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="license-status-title" className="text-[15px] font-semibold text-[#0F172A]">{s.sectionTitle}</h3>
        <LicenseStatusPill status={status} />
      </div>

      <p className="mt-2 text-[13.5px] leading-[20px] text-[#475569]">
        {status === 'approved'
          ? s.statusApprovedMeta(professionLabel, number, expiry)
          : s.statusMeta(professionLabel, number, expiry)}
      </p>

      {status === 'pending' && <p className="mt-1 text-[13px] text-[#64748B]">{s.pendingNote}</p>}

      {status === 'rejected' && (
        <div className="mt-3 rounded-[10px] bg-[#FEF2F2] px-3 py-2">
          <p className="text-[12px] font-semibold text-[#B91C1C]">{s.rejectedReasonLabel}</p>
          <p className="mt-0.5 text-[13.5px] text-[#7F1D1D]">{license.rejectionReason || '-'}</p>
        </div>
      )}

      {status === 'expired' && (
        <p className="mt-3 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-[13.5px] text-[#334155]">{s.expiredNote(number, expiry)}</p>
      )}

      {status === 'unknown' && <p className="mt-2 text-[13px] text-[#64748B]">{s.unknownNote}</p>}

      {needsNewLicense && (
        canResubmit ? (
          <button
            type="button"
            onClick={() => navigate('/kyc/resubmit', { state: { step: 2 } })}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-4 text-[14px] font-bold text-white hover:bg-[#0B7A70] sm:w-auto cursor-pointer"
          >
            <Icon name={status === 'expired' ? 'upload' : 'edit_document'} color="white" style={{ fontSize: 18 }} />
            {status === 'expired' ? s.reuploadAction : s.resubmitAction}
          </button>
        ) : (
          <p className="mt-3 flex items-start gap-2 text-[13px] text-[#64748B]">
            <Icon name="info" color="currentColor" style={{ fontSize: 17 }} />
            {s.reuploadUnavailable}
          </p>
        )
      )}
    </section>
  );
}
