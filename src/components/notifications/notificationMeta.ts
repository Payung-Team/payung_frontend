/**
 * notificationMeta — logic กลางของ notification card (PYG-294)
 *
 * รวมของที่เดิมก๊อปกันใน NotificationBell.tsx และ NotificationsPage.tsx ไว้ที่เดียว:
 * - NotificationType union ครบ 11 ค่า (ตรงกับ backend enum / Prisma)
 * - parseData()      — แกะ data (jsonb-stringified) เป็น { bookingId, link, source }
 * - notificationIcon — map type → material-icon + สี
 * - resolveDeepLink  — สร้าง path ปลายทาง (ใช้ data.link เป็นหลัก)
 * - deriveSource     — หมวดสำหรับ filter tabs (booking / finance / system)
 * - relativeTimeTH   — "x นาที/ชั่วโมง/วันที่แล้ว"
 */

/** ครบ 11 ค่า — ต้องตรงกับ backend NotificationType enum */
export type NotificationType =
  | 'kyc_submitted'
  | 'kyc_verified'
  | 'kyc_rejected'
  | 'kyc_resubmitted'
  | 'booking_new'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'payment_held'
  | 'payment_captured'
  | 'refund_issued'
  | 'dispute_created'
  | 'dispute_resolved';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: string | null;
  isRead: boolean;
  createdAt: string;
}

/** payload ที่ backend เก็บใน data (jsonb) — ดู booking-notification.listener.ts */
export interface NotificationData {
  bookingId?: string;
  link?: string;
  source?: string;
  /** "{caregiverName} • {dateText} {startTimeText}" — เพิ่มเมื่อ backend พร้อม (PYG-294) */
  subtitle?: string;
}

/**
 * subtitle ที่แสดงบน card บรรทัดที่ 2
 * ถ้า backend เก็บ data.subtitle ไว้แล้วใช้เลย ไม่งั้น fallback เป็น body (ประโยคเต็ม)
 */
export function getSubtitle(item: NotificationItem): string {
  return parseData(item.data).subtitle ?? item.body;
}

/** หมวดสำหรับ filter tabs */
export type NotificationSource = 'booking' | 'finance' | 'system';

/** filter tab key — 'all' = ไม่กรอง */
export type FilterTab = 'all' | NotificationSource;

export const FILTER_TABS: ReadonlyArray<{ key: FilterTab; label: string }> = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'booking', label: 'การจอง' },
  { key: 'finance', label: 'การเงิน' },
  { key: 'system', label: 'ระบบ' },
];

/** สี unread dot ตาม spec PYG-294 */
export const UNREAD_DOT_COLOR = '#2563EB';

/** แกะ data (JSON string) อย่างปลอดภัย — คืน {} ถ้า parse ไม่ได้ */
export function parseData(dataJson?: string | null): NotificationData {
  if (!dataJson) {
    return {};
  }
  try {
    const parsed = JSON.parse(dataJson) as NotificationData;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

interface IconStyle {
  /** ชื่อ Google Material Icon (ใช้กับ <span className="material-icons">) */
  icon: string;
  bg: string;
  color: string;
}

const SUCCESS: Pick<IconStyle, 'bg' | 'color'> = { bg: '#F0FDF4', color: '#16A34A' };
const DANGER: Pick<IconStyle, 'bg' | 'color'> = { bg: '#FEF2F2', color: '#DC2626' };
const INFO: Pick<IconStyle, 'bg' | 'color'> = { bg: '#EFF6FF', color: '#2563EB' };
const WARNING: Pick<IconStyle, 'bg' | 'color'> = { bg: '#FFFBEB', color: '#F59E0B' };
const FINANCE: Pick<IconStyle, 'bg' | 'color'> = { bg: '#F0F9F8', color: '#14554F' };

/** map type → ไอคอน + สี (material-icons แทน emoji เดิม) */
export function notificationIcon(type: NotificationType): IconStyle {
  switch (type) {
    // KYC
    case 'kyc_verified':
      return { icon: 'check_circle', ...SUCCESS };
    case 'kyc_rejected':
      return { icon: 'cancel', ...DANGER };
    case 'kyc_resubmitted':
      return { icon: 'autorenew', ...INFO };
    case 'kyc_submitted':
      return { icon: 'pending', ...WARNING };

    // Booking (lucide ClipboardList → assignment)
    case 'booking_new':
      return { icon: 'assignment', ...INFO };
    case 'booking_accepted':
    case 'booking_confirmed':
      return { icon: 'check_circle', ...SUCCESS };
    case 'booking_completed':
      return { icon: 'done_all', ...SUCCESS };
    case 'booking_declined':
    case 'booking_cancelled':
      return { icon: 'cancel', ...DANGER };

    // Finance (lucide CreditCard / Coins → credit_card / savings / payments)
    case 'payment_held':
      return { icon: 'credit_card', ...FINANCE };
    case 'payment_captured':
      return { icon: 'savings', ...FINANCE };
    case 'refund_issued':
      return { icon: 'payments', ...FINANCE };

    // System / dispute (lucide AlertTriangle → report_problem)
    case 'dispute_created':
      return { icon: 'report_problem', ...WARNING };
    case 'dispute_resolved':
      return { icon: 'fact_check', ...INFO };

    default:
      return { icon: 'notifications', ...INFO };
  }
}

/** type ที่ส่งถึง "caregiver" → ปลายทางเป็นหน้า caregiver */
const CAREGIVER_TARGETED: ReadonlySet<NotificationType> = new Set<NotificationType>([
  'booking_new',
  'booking_confirmed',
  'booking_cancelled',
  'payment_captured',
]);

/**
 * ปลายทางตอนกด notification
 * - ใช้ bookingId (จาก data) ทำ deep link `/bookings/{id}` หรือ `/caregiver/bookings/{id}`
 * - ถ้าไม่มี bookingId → kyc ไป /kyc/status, อื่น ๆ ใช้ data.link หรือ /notifications
 */
export function resolveDeepLink(item: NotificationItem): string {
  const { bookingId, link } = parseData(item.data);

  if (item.type.startsWith('booking_') || item.type.startsWith('payment_') ||
      item.type === 'refund_issued' || item.type === 'dispute_resolved') {
    if (bookingId) {
      return CAREGIVER_TARGETED.has(item.type)
        ? `/caregiver/bookings/${bookingId}`
        : `/bookings/${bookingId}`;
    }
  }

  if (item.type.startsWith('kyc_')) {
    return '/kyc/status';
  }

  // dispute_created (admin) หรือ fallback อื่น ๆ
  return link ?? '/notifications';
}

/**
 * หมวดสำหรับ filter tabs — derive จาก `type` เท่านั้น
 *
 * หมายเหตุ: ไม่ใช้ data.source เพราะ booking-notification.listener hardcode
 * source:'booking' ให้ทุก event (รวม payment/refund/dispute) → เชื่อไม่ได้
 * ส่วน type สะท้อนหมวดได้ตรง
 */
export function deriveSource(item: NotificationItem): NotificationSource {
  if (item.type.startsWith('payment_') || item.type === 'refund_issued') return 'finance';
  if (item.type.startsWith('booking_')) return 'booking';
  return 'system'; // kyc_* + dispute_*
}

/** "x นาที/ชั่วโมง/วันที่แล้ว" (ภาษาไทย) */
export function relativeTimeTH(dateText: string): string {
  const now = Date.now();
  const then = new Date(dateText).getTime();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;

  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}
