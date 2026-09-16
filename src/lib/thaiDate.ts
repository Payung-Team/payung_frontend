/**
 * "2569-09-16" → "16 ก.ย. 2569" (พุทธศักราช)
 *
 * ย้ายออกมาจาก CaregiverBookingDetailPage ตอนที่ป๊อปอัปรายละเอียดงาน (JobInfoModals)
 * ต้องแปลงวันที่เหมือนกันแต่ถูกเรียกจากทั้งหน้าเช็คอินและหน้าระหว่างปฏิบัติงาน
 * — ถ้าปล่อยให้แต่ละที่เขียนเอง วันหนึ่งจะมีหน้าที่โชว์ ค.ศ. ปนกับ พ.ศ.
 *
 * ใช้การบวก 543 กับปีในสตริงตรง ๆ ไม่ผ่าน Date เพราะค่าที่รับมาเป็นวันที่ล้วน
 * (ไม่มีเวลา/โซนเวลา) การแปลงผ่าน Date จะเลื่อนวันได้ตาม timezone ของเครื่อง
 */
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]) + 543;
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = monthNames[parseInt(parts[1]) - 1];
    const day = parseInt(parts[2]);
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}
