/**
 * แจ้งโรคติดเชื้อ (S10 · PYG-620) — ข้อความไทย/อังกฤษทั้งหมด ตาม Design PYG-616
 *
 * ข้อความทุกจุดของฟีเจอร์นี้อยู่ที่นี่ที่เดียว (DoD: ไม่มีข้อความ hardcode นอกไฟล์ข้อความกลาง)
 * ★ ข้อความแจ้งการเปิดเผย (notice*) ยังเป็นข้อความตัวอย่าง รอผู้รับผิดชอบ PDPA ยืนยัน
 * ★ ตัวอย่างโรค (help) ทีมใส่เอง ยังไม่ผ่านอาจารย์เทคนิคการแพทย์ — แก้ที่นี่ที่เดียว
 *
 * แอปยังไม่มีตัวสลับภาษา useInfectionStrings จึงคืนภาษาไทยเสมอ (แบบเดียวกับ assessmentStrings)
 */

interface InfectionStrings {
  // ── ฝั่งญาติ ──
  fieldTitle: string;
  help: string;
  reassure: string;
  optionNo: string;
  optionNoDesc: string;
  optionYes: string;
  optionYesDesc: string;
  valueNo: string;
  valueYes: string;
  valueUnset: string;
  unsetProfileHint: string;
  /** ข้อความของ checkbox รับทราบ — เป็นข้อความแจ้งการเปิดเผยในตัว (AC5) */
  noticeAck: (name: string) => string;
  missingChoice: string;
  missingAck: string;
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  specify: string;
  saved: string;
  saveFailed: string;
  noticeNotAccepted: string;
  bookingMissing: string;

  // ── ฝั่งผู้ดูแล ──
  cgTitle: string;
  cgYes: string;
  cgYesSub: string;
  cgNo: string;
  cgUnset: string;
  cgUnsetSub: string;
  cgDisclaimer: string;
  cgAck: string;
  cgAcceptHint: string;
  cgAckedAt: (time: string) => string;
  cgChangedTitle: string;
  cgChangedBody: string;
  cgLoadFailed: string;
  cgRetry: string;
  cgAckRequiredToast: string;
}

const TH: InfectionStrings = {
  fieldTitle: 'โรคติดเชื้อที่ผู้ดูแลควรรู้',
  help: 'โรคที่ติดต่อถึงผู้ดูแลได้ระหว่างดูแลใกล้ชิด เช่น วัณโรค ไวรัสตับอักเสบบีหรือซี ไข้หวัดใหญ่หรือโควิด-19',
  reassure: 'การแจ้งช่วยให้ผู้ดูแลเตรียมตัวได้ถูกต้อง และไม่ได้ทำให้จองไม่ได้',
  optionNo: 'ไม่มี',
  optionNoDesc: 'ไม่มีโรคติดเชื้อที่ผู้ดูแลควรรู้',
  optionYes: 'มี',
  optionYesDesc: 'มีโรคติดเชื้อที่ผู้ดูแลควรรู้',
  valueNo: 'ไม่มี',
  valueYes: 'มี',
  valueUnset: 'ยังไม่ได้ระบุ',
  unsetProfileHint: 'ผู้ดูแลจะเห็นว่า “ญาติยังไม่ได้ระบุ” จนกว่าจะเลือก มี หรือ ไม่มี',
  noticeAck: (name) =>
    `ฉันรับทราบว่าข้อมูลนี้จะแสดงเฉพาะผู้ดูแลที่ได้รับคำขอจองของ ${name} ก่อนกดรับงาน ไม่แสดงในหน้าโปรไฟล์ที่คนอื่นเห็น การแจ้งเตือน หรืออีเมล`,
  missingChoice: 'เลือก มี หรือ ไม่มี',
  missingAck: 'กดรับทราบข้อความแจ้งด้านบน',
  save: 'บันทึก',
  saving: 'กำลังบันทึก…',
  cancel: 'ยกเลิก',
  edit: 'แก้ไข',
  specify: 'ระบุ',
  saved: 'บันทึกข้อมูลโรคติดเชื้อแล้ว',
  saveFailed: 'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง',
  noticeNotAccepted: 'ต้องกดรับทราบข้อความแจ้งการเปิดเผยข้อมูลก่อนบันทึก',
  bookingMissing: 'ข้อมูลโรคติดเชื้อ',

  cgTitle: 'โรคติดเชื้อที่ผู้ดูแลควรรู้',
  cgYes: 'ญาติแจ้งว่า มีโรคติดเชื้อที่ผู้ดูแลควรรู้',
  cgYesSub: 'สอบถามรายละเอียดเพิ่มกับผู้ติดต่อได้หลังตอบรับ',
  cgNo: 'ญาติแจ้งว่า ไม่มีโรคติดเชื้อที่ผู้ดูแลควรรู้',
  cgUnset: 'ญาติยังไม่ได้ระบุข้อมูลนี้',
  cgUnsetSub: 'ไม่ได้แปลว่าไม่มี สอบถามผู้ติดต่อได้หลังตอบรับ',
  cgDisclaimer: 'ข้อมูลนี้ญาติเป็นผู้แจ้ง ไม่ใช่ผลตรวจทางการแพทย์ · ใช้เพื่อเตรียมตัวดูแลงานนี้เท่านั้น ห้ามนำไปเผยแพร่ต่อ',
  cgAck: 'ฉันรับทราบข้อมูลโรคติดเชื้อของงานนี้แล้ว',
  cgAcceptHint: 'กดรับทราบข้อมูลโรคติดเชื้อด้านบนก่อนตอบรับ',
  cgAckedAt: (time) => `รับทราบแล้วเมื่อ ${time}`,
  cgChangedTitle: 'ญาติเพิ่งแก้ไขข้อมูลนี้',
  cgChangedBody: 'กรุณาอ่านและรับทราบอีกครั้ง',
  cgLoadFailed: 'โหลดข้อมูลโรคติดเชื้อไม่สำเร็จ ต้องโหลดได้ก่อนจึงจะตอบรับงานได้',
  cgRetry: 'ลองอีกครั้ง',
  cgAckRequiredToast: 'ข้อมูลโรคติดเชื้อของงานนี้เปลี่ยน กรุณาอ่านและรับทราบอีกครั้ง',
};

const EN: InfectionStrings = {
  fieldTitle: 'Infectious diseases your caregiver should know about',
  help: 'Conditions that can pass to a caregiver during close care, such as tuberculosis, hepatitis B or C, scabies, or flu or COVID-19 that is still contagious',
  reassure: 'Telling us helps the caregiver prepare properly. It won’t stop you from booking.',
  optionNo: 'No',
  optionNoDesc: 'No infectious disease the caregiver should know about',
  optionYes: 'Yes',
  optionYesDesc: 'Has an infectious disease the caregiver should know about',
  valueNo: 'No',
  valueYes: 'Yes',
  valueUnset: 'Not provided',
  unsetProfileHint: 'Caregivers will see “Not provided yet” until you choose Yes or No',
  noticeAck: (name) =>
    `I understand this is shown only to caregivers who receive a booking request for ${name}, before they accept. It never appears on profiles others can see, in notifications or in email.`,
  missingChoice: 'Choose Yes or No',
  missingAck: 'Confirm the notice above',
  save: 'Save',
  saving: 'Saving…',
  cancel: 'Cancel',
  edit: 'Edit',
  specify: 'Provide',
  saved: 'Infectious disease information saved',
  saveFailed: 'Couldn’t save. Please try again.',
  noticeNotAccepted: 'Confirm the disclosure notice before saving',
  bookingMissing: 'Infectious disease information',

  cgTitle: 'Infectious diseases to know about',
  cgYes: 'The family says there is an infectious disease to know about',
  cgYesSub: 'You can ask the contact person for details after accepting',
  cgNo: 'The family says there is no infectious disease to know about',
  cgUnset: 'The family hasn’t provided this yet',
  cgUnsetSub: 'This doesn’t mean there is none. You can ask the contact person after accepting.',
  cgDisclaimer: 'Provided by the family, not a medical test result. Use it only to prepare for this job and don’t share it.',
  cgAck: 'I’ve read the infectious disease information for this job',
  cgAcceptHint: 'Confirm the infectious disease information above before accepting',
  cgAckedAt: (time) => `Confirmed at ${time}`,
  cgChangedTitle: 'The family just updated this.',
  cgChangedBody: 'Please read and confirm again.',
  cgLoadFailed: 'Couldn’t load the infectious disease information. It must load before you can accept.',
  cgRetry: 'Try again',
  cgAckRequiredToast: 'The infectious disease information changed. Please read and confirm again.',
};

export const INFECTION_STRINGS = { th: TH, en: EN };

export function useInfectionStrings(): InfectionStrings {
  return TH;
}
