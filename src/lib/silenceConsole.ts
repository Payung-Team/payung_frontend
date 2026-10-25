/**
 * production: ปิดเสียง console ทั้งหมด (ไม่ให้ข้อมูลภายในหลุดถึงผู้ใช้)
 *
 * ต้อง import เป็นบรรทัดแรกสุดของ main.tsx เพื่อให้ทำงานก่อนโมดูลอื่น
 * dev (`npm run dev`) ไม่ได้รับผลกระทบ
 */
if (!import.meta.env.DEV) {
  const noop = () => {};
  for (const method of ['log', 'debug', 'info', 'warn', 'error', 'trace'] as const) {
    console[method] = noop;
  }
}
