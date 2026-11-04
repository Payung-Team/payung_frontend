// สถานะ booking / การชำระเงิน — ใช้ร่วมกันระหว่างตารางและหน้ารายละเอียด (แอดมิน)
export const BOOKING_STATUS_META: Record<string, { label: string; cls: string }> = {
  unmatched: { label: 'รอจับคู่', cls: 'bg-gray-100 text-gray-700' },
  pending: { label: 'รอผู้ดูแลตอบรับ', cls: 'bg-amber-50 text-amber-700' },
  accepted: { label: 'ตอบรับแล้ว', cls: 'bg-sky-50 text-sky-700' },
  confirmed: { label: 'ยืนยันแล้ว', cls: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'กำลังดูแล', cls: 'bg-violet-50 text-violet-700' },
  completed: { label: 'เสร็จสิ้น', cls: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'ถูกปฏิเสธ', cls: 'bg-red-50 text-red-700' },
  cancelled: { label: 'ยกเลิก', cls: 'bg-red-50 text-red-700' },
  expired: { label: 'หมดเวลา', cls: 'bg-gray-100 text-gray-500' },
};

export const PAYMENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'รอชำระ', cls: 'text-amber-600' },
  held: { label: 'กันวงเงินแล้ว', cls: 'text-sky-600' },
  voided: { label: 'ยกเลิกรายการ', cls: 'text-gray-500' },
  expired: { label: 'หมดเวลาชำระ', cls: 'text-gray-500' },
  captured: { label: 'ชำระแล้ว', cls: 'text-emerald-600' },
  transferred: { label: 'โอนผู้ดูแลแล้ว', cls: 'text-emerald-700' },
  refunded: { label: 'คืนเงินแล้ว', cls: 'text-gray-600' },
  partially_refunded: { label: 'คืนเงินบางส่วน', cls: 'text-gray-600' },
  failed: { label: 'ล้มเหลว', cls: 'text-red-600' },
};

export const formatThaiDate = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
export const formatThaiDateTime = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatTHB = (n: number | null | undefined) =>
  n == null ? '-' : `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const bookingStatusLabel = (s: string) => BOOKING_STATUS_META[s]?.label ?? s;
