/**
 * บริการของ booking (`bookings.service_type`) จากบริการที่ติ๊กในฟอร์มจอง — PYG-694
 *
 * BE รับ serviceType ได้ค่าเดียว (CreateBookingDto) และคิดราคาจาก service_price_catalog ของค่านี้
 * → payload (buildBookingPayload) กับราคาประมาณการในฟอร์ม (bookingPrice) ต้องเรียกฟังก์ชันนี้ตัวเดียวกัน
 *   ถ้าคิดกันคนละทาง ราคาที่โชว์ตอนจองจะไม่ตรงกับยอดที่ BE เก็บจริง
 */

/** ชื่อบริการในหน้าเลือกบริการ → รหัส bookings.service_type */
export const SERVICE_TYPE_MAP: Record<string, string> = {
  'ดูแลทั่วไป': 'general_care',
  'ดูแลผู้ป่วยติดเตียง': 'bedridden_care',
  'กายภาพบำบัด': 'physiotherapy',
  'ช่วยจัดการยา': 'medication',
  'เป็นเพื่อน/พูดคุย': 'companion',
};

/** ยังไม่เลือกบริการ / ชื่อที่ไม่รู้จัก */
export const DEFAULT_BOOKING_SERVICE_TYPE = 'general_care';

/**
 * ⚠ booking เก็บได้บริการเดียว จึงใช้บริการแรกที่ติ๊ก (การเก็บหลายบริการเป็นงานของ PYG-690)
 */
export function bookingServiceType(serviceTypes: readonly string[] | null | undefined): string {
  return SERVICE_TYPE_MAP[serviceTypes?.[0] ?? ''] ?? DEFAULT_BOOKING_SERVICE_TYPE;
}
