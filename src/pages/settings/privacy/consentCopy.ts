/**
 * ข้อความ "ผลที่ตามมา" ตอนถอนความยินยอมแต่ละข้อ — PYG-540
 *
 * ★ ต้องตรงกับสิ่งที่ BE ทำจริงเท่านั้น (ห้ามสัญญาเกินหรือขู่เกินกว่าที่ระบบทำ):
 *   sensitive_health_data / disclose_to_caregiver → BookingService บล็อกการจองใหม่
 *   disclose_to_family_group → กลุ่มไม่เห็นโปรไฟล์/นัด + จองแทนไม่ได้ (FamilyGroupService, BookingService)
 *   marketing → EmailService.sendMarketingEmail ไม่ส่ง
 *   ทุกข้อ → มีผลไปข้างหน้า ไม่ลบข้อมูลย้อนหลัง
 *   ถ้าฝั่ง BE เปลี่ยนผลของการถอน ต้องกลับมาแก้ไฟล์นี้ด้วย
 *
 * ข้อความทางกฎหมาย (label / คำอธิบาย) ไม่อยู่ที่นี่ — มาจาก consentPolicy ของ BE
 */

export interface WithdrawConsequences {
  /** ชื่อสั้นใช้ในหัวข้อ modal เช่น "ถอนความยินยอมเรื่องข้อมูลสุขภาพ?" */
  shortLabel: string;
  /** สิ่งที่จะหยุด/ทำไม่ได้ */
  stops: string[];
  /** สิ่งที่ยังเป็นเหมือนเดิม */
  keeps: string[];
  /** true = ถอนแล้วกระทบการใช้งานหลัก (จองไม่ได้) → เตือนแบบเข้ม */
  severe: boolean;
}

/** แสดงในทุกข้อ — ผู้ใช้มักกลัวว่าถอนแล้วข้อมูลเก่าจะหายหรือถูกลบ */
export const ALWAYS_KEEPS = 'การถอนมีผลนับจากนี้ ข้อมูลที่ใช้ไปก่อนหน้านี้ไม่ถูกลบย้อนหลัง';

const CONSEQUENCES: Record<string, WithdrawConsequences> = {
  sensitive_health_data: {
    shortLabel: 'เรื่องข้อมูลสุขภาพ',
    stops: [
      'จองผู้ดูแลใหม่ไม่ได้ จนกว่าจะให้ความยินยอมอีกครั้ง',
      // BE: UserService.isOnboardingCompleted คืน false เมื่อไม่มีความยินยอมข้อนี้ (PYG-538)
      'ระบบจะถือว่ายังกรอกข้อมูลผู้รับบริการไม่ครบ',
    ],
    keeps: ['งานที่ผู้ดูแลรับไปแล้วยังดำเนินต่อตามปกติ'],
    severe: true,
  },
  disclose_to_caregiver: {
    shortLabel: 'เรื่องการเปิดเผยข้อมูลแก่ผู้ดูแล',
    stops: ['จองผู้ดูแลใหม่ไม่ได้ จนกว่าจะให้ความยินยอมอีกครั้ง'],
    keeps: ['งานที่ผู้ดูแลรับไปแล้วไม่กระทบ (ข้อมูลถูกส่งให้ผู้ดูแลไปแล้ว)'],
    severe: true,
  },
  disclose_to_family_group: {
    shortLabel: 'เรื่องการเปิดเผยข้อมูลให้กลุ่มครอบครัว',
    stops: [
      'สมาชิกในกลุ่มครอบครัวจะไม่เห็นข้อมูลผู้รับบริการและนัดหมายของคุณ',
      'สมาชิกจองผู้ดูแลแทนคุณไม่ได้',
    ],
    keeps: ['คุณยังใช้บัญชีส่วนตัวและจองเองได้ตามปกติ'],
    severe: false,
  },
  marketing: {
    shortLabel: 'เรื่องข่าวสารและโปรโมชัน',
    stops: ['จะไม่ได้รับอีเมลข่าวสารและโปรโมชัน'],
    keeps: ['อีเมลเรื่องการจอง การชำระเงิน และการยืนยันตัวตนยังส่งตามปกติ'],
    severe: false,
  },
};

/**
 * ผลที่ตามมาของการถอนข้อนี้
 * ข้อที่ไม่รู้จัก (BE เพิ่มข้อใหม่แต่ FE ยังไม่อัปเดต) → ข้อความกลาง ๆ ไม่ใช่หน้าพัง
 */
export function consequencesFor(type: string): WithdrawConsequences {
  return (
    CONSEQUENCES[type] ?? {
      shortLabel: 'ข้อนี้',
      stops: ['ฟีเจอร์ที่ต้องใช้ความยินยอมข้อนี้จะหยุดทำงาน'],
      keeps: [],
      severe: false,
    }
  );
}
