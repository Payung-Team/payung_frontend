import DisputeCard, { DisputeField, DisputeLink } from './DisputeCard';
import FiledByBadge from './FiledByBadge';
import type { DisputeDetail } from './disputeDetailMapper';
import { formatTHB, formatThaiDate } from './disputeMeta';

interface DisputeBookingInfoCardProps {
  dispute: DisputeDetail;
}

// PYG-321 — ข้อมูลผู้เกี่ยวข้องและการจอง + link chips ไป booking / transaction / profile
export default function DisputeBookingInfoCard({ dispute }: DisputeBookingInfoCardProps) {
  return (
    <DisputeCard title="ข้อมูลผู้เกี่ยวข้องและการจอง">
      <dl className="grid gap-5 sm:grid-cols-2">
        <DisputeField label="ผู้แจ้ง">
          <span>{dispute.filer.name}</span>
          <FiledByBadge filedBy={dispute.filer.role} />
        </DisputeField>

        <DisputeField label="ผู้ถูกร้องเรียน">
          <span>{dispute.respondent.name}</span>
          {/* TODO: ไปหน้า /admin/users/:caregiverId เมื่อ mock ผูกกับข้อมูลจริง */}
          <DisputeLink label="ดูโปรไฟล์" />
        </DisputeField>

        <DisputeField label="Booking ID">
          <span className="font-[Inter]">{dispute.bookingId}</span>
          {/* TODO: ไปหน้ารายละเอียดการจอง */}
          <DisputeLink label="ดูการจอง" />
        </DisputeField>

        <DisputeField label="วันที่ให้บริการ">
          <span className="font-[Inter]">{formatThaiDate(dispute.serviceDate)}</span>
        </DisputeField>

        <DisputeField label="จำนวนเงินธุรกรรม">
          <span className="font-[Inter]">{formatTHB(dispute.amount)}</span>
          {/* TODO: ไปหน้า /admin/payments พร้อม filter transaction ของ booking นี้ */}
          <DisputeLink label="ดูธุรกรรม" />
        </DisputeField>
      </dl>

      <div className="mt-5 border-t border-[#F0F1F3] pt-4">
        <p className="text-xs text-[#8A8C8E]">รายละเอียดปัญหา</p>
        <p className="mt-2 text-[15px] leading-6 text-[#1A1A1A]">{dispute.reason || '—'}</p>
      </div>
    </DisputeCard>
  );
}
