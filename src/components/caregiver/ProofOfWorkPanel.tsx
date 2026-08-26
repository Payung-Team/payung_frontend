/**
 * ProofOfWorkPanel — สรุปหลักฐานการทำงานจากเซิร์ฟเวอร์ (PYG-358 STEP 5)
 *
 * ★ ทุกตัวเลขในนี้มาจาก proofOfWork ฝั่ง backend ทั้งหมด
 *   ห้ามคำนวณระยะเวลาเองแล้วเอามาแสดงเป็นข้อเท็จจริง
 *   (นาฬิกาเครื่องผู้ใช้ปรับได้ ค่าที่เชื่อได้มีแค่ server_ts)
 */
import {
  formatDistanceTh,
  formatDurationTh,
  formatThaiTime,
  reviewReasonTh,
  type ProofOfWorkSummary,
} from '../../lib/monitoring';

interface ProofOfWorkPanelProps {
  proof: ProofOfWorkSummary;
}

export default function ProofOfWorkPanel({ proof }: Readonly<ProofOfWorkPanelProps>) {
  const { checkIn, checkOut, jobCoordsMissing } = proof;

  return (
    <section
      className="rounded-2xl border border-[#E0E2E5] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] sm:p-6"
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      aria-labelledby="pow-heading"
    >
      <h2 id="pow-heading" className="text-[13px] font-bold leading-5 text-[#8A8C8E]">
        หลักฐานการทำงาน
      </h2>

      {/* เวลาสองฝั่ง — วางเรียงกันได้เพราะจอกว้างพอตั้งแต่ sm ขึ้นไป */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <EventCard title="เช็คอิน" event={checkIn} jobCoordsMissing={jobCoordsMissing} />
        <EventCard title="เช็คเอาท์" event={checkOut} jobCoordsMissing={jobCoordsMissing} />
      </div>

      <dl className="mt-4 space-y-2 border-t border-[#F0F1F3] pt-4">
        <Row
          label="เวลาที่ทำงานจริง"
          value={proof.actualMinutes === null ? 'ยังไม่ปิดงาน' : formatDurationTh(proof.actualMinutes)}
          strong
        />
        <Row label="เวลาที่จองไว้" value={formatDurationTh(proof.bookedMinutes)} />
        {jobCoordsMissing && (
          // STEP 5.2 — ไม่มีพิกัดจุดงาน = ไม่แสดงระยะทางเลย ไม่ใช่แสดงเป็น 0
          <Row label="ระยะจากจุดงาน" value="งานนี้ไม่มีพิกัดจุดงาน" muted />
        )}
      </dl>

      {proof.reviewReasons.length > 0 && (
        <div className="mt-4 border-t border-[#F0F1F3] pt-4">
          <p className="text-[12px] font-semibold text-[#8A8C8E]">สิ่งที่แอดมินจะตรวจสอบ</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {proof.reviewReasons.map((reason) => (
              <li
                key={reason}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFBEB] px-3 py-1 text-[12px] font-semibold text-[#B45309]"
              >
                <span className="material-icons text-[14px]">info</span>
                {reviewReasonTh(reason)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {checkOut?.note && (
        <div className="mt-4 border-t border-[#F0F1F3] pt-4">
          <p className="text-[12px] font-semibold text-[#8A8C8E]">บันทึกปิดงาน</p>
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-[#1A1A1A]">
            {checkOut.note}
          </p>
        </div>
      )}

      {checkOut?.photoUrl && (
        <div className="mt-4 border-t border-[#F0F1F3] pt-4">
          <p className="text-[12px] font-semibold text-[#8A8C8E]">รูปภาพประกอบ</p>
          <img
            src={checkOut.photoUrl}
            alt="รูปหลักฐานตอนปิดงาน"
            className="mt-2 max-h-56 w-auto max-w-full rounded-xl border border-[#E9EBEE] object-contain"
          />
        </div>
      )}
    </section>
  );
}

function EventCard({
  title,
  event,
  jobCoordsMissing,
}: Readonly<{
  title: string;
  event: ProofOfWorkSummary['checkIn'];
  jobCoordsMissing: boolean;
}>) {
  if (!event) {
    return (
      <div className="rounded-xl border border-dashed border-[#E0E2E5] bg-[#FAFBFC] px-4 py-3">
        <p className="text-[12px] font-semibold text-[#8A8C8E]">{title}</p>
        <p className="mt-1 text-[13px] text-[#B0B3B8]">ยังไม่มีข้อมูล</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E9EBEE] bg-[#FAFBFC] px-4 py-3">
      <p className="text-[12px] font-semibold text-[#8A8C8E]">{title}</p>
      <p className="mt-1 text-[15px] font-bold text-[#1A1A1A]">{formatThaiTime(event.serverTs)}</p>

      {!jobCoordsMissing && (
        <p className="mt-1 text-[12px] text-[#8A8C8E]">
          {event.distanceM === null
            ? 'ไม่ได้ใช้ตำแหน่ง'
            : `ห่างจากจุดงาน ${formatDistanceTh(event.distanceM)}`}
        </p>
      )}

      {event.gpsAccuracyLow && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-semibold text-[#B45309]">
          <span className="material-icons text-[12px]">location_searching</span>
          สัญญาณอ่อน · ไม่นำไปตัดสิน
        </span>
      )}

      {event.source === 'system' && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#6B7280]">
          ระบบปิดให้อัตโนมัติ
        </span>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
  muted = false,
}: Readonly<{ label: string; value: string; strong?: boolean; muted?: boolean }>) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[13px] text-[#8A8C8E]">{label}</dt>
      <dd
        className={`text-right text-[13px] ${strong ? 'font-bold' : 'font-semibold'} ${
          muted ? 'text-[#8A8C8E]' : 'text-[#1A1A1A]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
