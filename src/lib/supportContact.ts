/**
 * ช่องทางติดต่อทีมงาน Payung — ทุกจุดที่บอกให้ "ติดต่อทีมงาน" ใช้ค่านี้ที่เดียว
 * เปลี่ยนอีเมลทีมงานเมื่อไร แก้ที่ไฟล์นี้ไฟล์เดียว
 *
 * อีเมลเรื่องข้อมูลส่วนบุคคล / PDPA (PRIVACY_EMAIL ใน consentErrors.ts) ใช้ค่าเดียวกันนี้ และต้องตรงกับ DATA_CONTROLLER.email ฝั่ง BE
 */
export const SUPPORT_EMAIL = 'payung.care@gmail.com';

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
