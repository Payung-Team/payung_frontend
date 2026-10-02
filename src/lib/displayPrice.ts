/**
 * ราคาที่แสดงบนหน้าค้นหา / โปรไฟล์ผู้ดูแล (PYG-536)
 *
 * ราคามาจาก BE (service_price_catalog / ราคากลางชั่วคราว) ผู้ดูแลตั้งเองไม่ได้แล้ว
 * BE คืน 0 หรือ null เมื่อยังหาราคาให้ผู้ดูแลคนนั้นไม่ได้ (เช่น ยังไม่ได้เลือกประเภทงาน)
 * → ห้ามแสดง "฿0" ให้คืน null แล้วให้หน้าจอแสดงข้อความแทน
 */
export function hasDisplayPrice(rate: number | null | undefined): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0;
}

/** "฿1,234" หรือ null ถ้ายังไม่มีราคา */
export function formatDisplayPrice(rate: number | null | undefined): string | null {
  return hasDisplayPrice(rate) ? `฿${rate.toLocaleString()}` : null;
}

export const NO_PRICE_LABEL = 'ยังไม่มีราคา';
