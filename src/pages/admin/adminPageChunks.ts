/**
 * โค้ดของหน้าแอดมินแต่ละหน้า (lazy chunk) — ที่เดียวที่ App.tsx และการโหลดล่วงหน้าใช้ร่วมกัน
 *
 * ★ PYG-715 ทำไมต้องโหลดล่วงหน้า (INP): PYG-713 แยกโค้ดตามหน้า → กดเมนูหน้าที่ยังไม่เคยเปิด
 *   ต้องรอดาวน์โหลด chunk + โชว์ skeleton แล้วสลับเป็นหน้าจริง (จัดเลย์เอาต์ 2 รอบ)
 *   วัดได้ INP ~520 ms (CPU ช้า 4×) · production ~736 ms เพราะ chunk ที่ยังไม่อยู่ใน cache ของ Cloudflare ตอบช้า
 *   เข้าแอดมินแล้วโหลดทุกหน้าไว้ตอนเบราว์เซอร์ว่าง → กดเมนูไม่ต้องรอ (เหลือ ~100 ms)
 * ★ ใช้ loader ตัวเดียวกับ React.lazy — import() path เดียวกัน = chunk เดียวกัน โหลดครั้งเดียว
 */
export const adminPageLoaders = {
  Admin: () => import('./Admin'),
  KycReviewListPage: () => import('./KycReviewListPage'),
  KycReviewDetailPage: () => import('./KycReviewDetailPage'),
  ProfilePhotoReviewPage: () => import('./ProfilePhotoReviewPage'),
  ProfessionChangeRequestsPage: () => import('./ProfessionChangeRequestsPage'),
  CareActivitiesPage: () => import('./CareActivitiesPage'),
  AdminUsersPage: () => import('./AdminUsersPage'),
  AdminCaregiverDetailPage: () => import('./AdminCaregiverDetailPage'),
  AdminPaymentsPage: () => import('./AdminPaymentsPage'),
  AdminDisputesPage: () => import('./AdminDisputesPage'),
  AdminDisputeDetailPage: () => import('./AdminDisputeDetailPage'),
};

let prefetched = false;

/** โหลด chunk ของทุกหน้าแอดมินไว้ก่อน — เรียกซ้ำได้ (ทำแค่ครั้งแรก) · พังก็ไม่เป็นไร lazy จะโหลดเองตอนกด */
export function prefetchAdminPages(): void {
  if (prefetched) return;
  prefetched = true;
  for (const load of Object.values(adminPageLoaders)) {
    load().catch(() => {});
  }
}
