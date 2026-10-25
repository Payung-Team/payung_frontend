/**
 * แบบประเมิน ADL + เงื่อนไขพิเศษ (S08 · PYG-610) — รายการข้อ และข้อความไทย/อังกฤษทั้งหมด
 *
 * ข้อความทุกจุดของแบบประเมินอยู่ที่นี่ที่เดียว (DoD: ไม่มีข้อความ hardcode นอกไฟล์ข้อความกลาง)
 * copy ตาม Copy deck ของ PYG-606
 *
 * ★ รหัสข้อ ADL / ช่วงคะแนน / รหัส Flags ต้องตรงกับ BE ทุกตัวอักษร
 *   (payung_backend/src/assessment/assessment.constants.ts — Sammy เคาะ PYG-642, PYG-638)
 *   ส่งรหัสผิด BE ตอบ ASSESSMENT_ANSWER_INVALID / ASSESSMENT_FLAG_INVALID
 * ★ ลำดับตัวเลือกในแต่ละข้อเรียงจากคะแนนสูง (ทำเองได้) ไปต่ำ ตาม Design
 *
 * แอปยังไม่มีตัวสลับภาษา useAssessmentStrings จึงคืนภาษาไทยเสมอ (แบบเดียวกับ phoneAuthStrings)
 */

export const ADL_ITEMS = [
  { code: 'feeding', maxScore: 2 },
  { code: 'grooming', maxScore: 1 },
  { code: 'transfers', maxScore: 3 },
  { code: 'toilet_use', maxScore: 2 },
  { code: 'mobility', maxScore: 3 },
  { code: 'dressing', maxScore: 2 },
  { code: 'stairs', maxScore: 2 },
  { code: 'bathing', maxScore: 1 },
  { code: 'bowels', maxScore: 2 },
  { code: 'bladder', maxScore: 2 },
] as const;

export type AdlCode = (typeof ADL_ITEMS)[number]['code'];

export const ADL_MAX_TOTAL = 20;

/** ตอบ "ไม่แน่ใจ" ตั้งแต่ข้อนี้ขึ้นไป BE ตั้ง Flag ไม่แน่ใจให้ (R7) — ฝั่งนี้ใช้แค่เตือนล่วงหน้า */
export const UNSURE_FLAG_THRESHOLD = 3;

export const FLAG_CODES = [
  'ng_tube',
  'urinary_catheter',
  'oxygen',
  'pressure_ulcer',
  'injection',
  'end_of_life',
  'dementia',
  'diabetes',
  'fall_risk',
] as const;

export type FlagCode = (typeof FLAG_CODES)[number];

/** Flag ที่มีตัวเลือกย่อยความรุนแรง (R8) */
export const DEMENTIA_FLAG: FlagCode = 'dementia';

interface AdlOptionText {
  label: string;
  desc?: string;
}

interface AdlItemText {
  title: string;
  hint?: string;
  /** key = คะแนนของตัวเลือก */
  options: Record<number, AdlOptionText>;
}

const TH = {
  // ทุกหน้าของแบบประเมิน
  stepOf: (n: number, total: number) => `ขั้นที่ ${n} จาก ${total}`,
  stepsLabel: 'ขั้นตอนแบบประเมิน',
  stepPersonal: 'ข้อมูลส่วนตัว',
  stepAdl: 'แบบประเมิน ADL',
  stepFlags: 'เงื่อนไขพิเศษ',
  stepSummary: 'สรุปผล',
  asideTitleOnboarding: 'อีกนิดเดียว ก็เริ่มจองได้',
  asideTitleBooking: 'ทำแบบประเมินก่อนจองต่อ',
  asideTitleProfile: 'แก้ไขแบบประเมิน',
  asideDoneLabel: 'ครบทุกขั้นแล้ว',
  asideDoneTitle: 'พร้อมจองบริการดูแลแล้ว',
  subjectLabel: 'กำลังประเมินให้',
  subjectLabelShort: 'ประเมินให้',
  ageSuffix: (age: number) => `${age} ปี`,
  disclaimerTitle: 'ญาติเป็นผู้ประเมิน ไม่ใช่การวินิจฉัยทางการแพทย์',
  disclaimerBody: 'คำตอบใช้เพื่อหาผู้ดูแลที่เหมาะกับผู้รับบริการคนนี้',
  // ประเมินโปรไฟล์ของตัวเอง (is_self) — ไม่ใช่ญาติเป็นผู้ตอบ ข้อความ AC7 แบบญาติจะทำให้เข้าใจผิด
  disclaimerTitleSelf: 'ประเมินด้วยตัวเอง ไม่ใช่การวินิจฉัยทางการแพทย์',
  disclaimerBodySelf: 'คำตอบใช้เพื่อหาผู้ดูแลที่เหมาะกับคุณ',
  disclaimerSummaryBody: 'คะแนนนี้ใช้เพื่อหาผู้ดูแลที่เหมาะสม ไม่ได้บอกโรคหรืออาการทางการแพทย์',
  leaveWarning: 'ถ้าออกจากหน้านี้ก่อนบันทึก คำตอบจะไม่ถูกเก็บไว้',
  leaveConfirm: 'ออกจากแบบประเมินตอนนี้ คำตอบที่กรอกไว้จะหายไป ต้องการออกหรือไม่?',
  // Onboarding: ต้องทำแบบประเมินก่อนถึงจะเข้าแอปได้ — ทางออกเดียวคือออกจากระบบ แล้วกลับมาทำต่อตอน login
  logoutOnboarding: 'ออกจากระบบ',
  leaveConfirmOnboarding:
    'ต้องทำแบบประเมินให้เสร็จก่อนจึงจะเริ่มใช้งานได้ ออกจากระบบตอนนี้ คำตอบที่กรอกไว้จะหายไป และต้องทำใหม่เมื่อเข้าสู่ระบบครั้งถัดไป ต้องการออกจากระบบหรือไม่?',
  back: 'ย้อนกลับ',
  edit: 'แก้ไข',
  loading: 'กำลังโหลดแบบประเมิน...',
  loadFailed: 'โหลดข้อมูลแบบประเมินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  notFound: 'ไม่พบผู้รับบริการนี้ หรือคุณไม่มีสิทธิ์ทำแบบประเมินให้ผู้รับบริการคนนี้',
  retry: 'ลองใหม่',
  goHome: 'กลับหน้าหลัก',

  // ขั้น ADL
  adlTitle: 'ช่วยเหลือตัวเองได้แค่ไหน',
  adlSubtitle: 'ตอบตามที่ทำได้จริงในช่วง 1–2 วันที่ผ่านมา ต้องตอบทุกข้อ ถ้าไม่ทราบให้เลือก “ไม่แน่ใจ”',
  adlProgress: (done: number, total: number) => `ตอบแล้ว ${done} จาก ${total} ข้อ`,
  adlUnsureCount: (n: number) => `ไม่แน่ใจ ${n} ข้อ`,
  adlQuestionOf: (n: number, total: number) => `ข้อ ${n} จาก ${total}`,
  adlQuestionOfShort: (n: number, total: number) => `ข้อ ${n}/${total}`,
  statusAnswered: 'ตอบแล้ว',
  statusUnsure: 'ไม่แน่ใจ',
  statusMissing: 'ยังไม่ได้ตอบ',
  or: 'หรือ',
  unsureLabel: 'ไม่แน่ใจ',
  unsureHint: 'ยังไม่ทราบคำตอบ',
  unsureThreshold: 'ตอบ “ไม่แน่ใจ” ครบ 3 ข้อแล้ว ระบบจะบันทึกว่า',
  unsureThresholdFlag: 'ยังไม่แน่ใจบางข้อ',
  unsureThresholdTail: 'ไว้ในผลประเมิน',
  questionNumber: (n: number) => `ข้อ ${n}`,
  adlErrorBanner: (count: number) => `ยังตอบไม่ครบ ${count} ข้อ`,
  adlGoTo: (n: number) => `ไปที่ข้อ ${n}`,
  adlErrorItem: 'กรุณาเลือกคำตอบ หรือเลือก “ไม่แน่ใจ”',
  adlNext: 'ถัดไป: เงื่อนไขพิเศษ',

  // ขั้น Flags
  flagsTitle: 'มีเงื่อนไขพิเศษที่ผู้ดูแลควรรู้ไหม',
  flagsSubtitle: 'เลือกได้หลายข้อ ถ้าไม่มีข้อไหนตรง ให้เลือก “ไม่มีเงื่อนไขพิเศษ”',
  flagsNoneLabel: 'ไม่มีเงื่อนไขพิเศษ',
  flagsNoneHint: 'ไม่มีข้อไหนด้านล่างตรงกับผู้รับบริการคนนี้',
  flagsNoneHintSelf: 'ไม่มีข้อไหนด้านล่างตรงกับคุณ',
  flagsDivider: 'หรือเลือกข้อที่ตรง',
  flagsGroupLabel: 'เงื่อนไขพิเศษ เลือกได้หลายข้อ',
  flagsCount: (n: number) => `เลือกแล้ว ${n} ข้อ`,
  flagsNoticeCleared: (n: number) => `ล้าง ${n} ข้อที่เลือกไว้แล้ว เพราะเลือก “ไม่มีเงื่อนไขพิเศษ”`,
  flagsNoticeNoneRemoved: 'เอา “ไม่มีเงื่อนไขพิเศษ” ออกแล้ว',
  flagsUndo: 'เลือกคืน',
  severityLegend: 'อาการรุนแรงไหม',
  severityMild: 'ไม่รุนแรง',
  severityMildHint: 'ยังทำกิจวัตรง่าย ๆ ได้เมื่อมีคนบอก',
  severitySevere: 'รุนแรง',
  severitySevereHint: 'ต้องมีคนอยู่ด้วยตลอด',
  flagsErrorEmpty: 'เลือกอย่างน้อย 1 ข้อ หรือเลือก “ไม่มีเงื่อนไขพิเศษ”',
  flagsErrorSeverity: 'กรุณาเลือกระดับอาการ',
  flagsNext: 'ถัดไป: ดูสรุปผล',

  // ขั้นสรุป
  summaryTitle: 'ตรวจสอบก่อนบันทึก',
  summarySubtitle: 'ตรวจคำตอบให้ถูกต้องก่อนกดยืนยัน',
  scoreTitle: 'คะแนนการช่วยเหลือตัวเอง (ADL)',
  scoreOutOf: '/ 20 คะแนน',
  scoreScaleLow: '0 ต้องช่วยทุกอย่าง',
  scoreScaleHigh: '20 ช่วยเหลือตัวเองได้',
  scoreFrom: (scored: number, unsure: number) =>
    `รวมจาก ${scored} ข้อที่เลือกคำตอบ · ไม่แน่ใจ ${unsure} ข้อ`,
  scorePreviewNote: 'ข้อที่ตอบ “ไม่แน่ใจ” นับเป็น 0 คะแนน · คะแนนที่บันทึกจริงคำนวณที่ระบบ',
  systemFlagTitle: 'ระบบบันทึก “ยังไม่แน่ใจบางข้อ” ให้อัตโนมัติ',
  systemFlagBody: (u: number, list: string) =>
    `เพราะตอบ “ไม่แน่ใจ” ${u} ข้อ (${list}) ถ้าทราบคำตอบแล้ว กดแก้ไขคำตอบรายข้อก่อนบันทึกได้`,
  summaryFlagsTitle: 'เงื่อนไขพิเศษ',
  summaryChosen: 'คุณเลือก',
  summarySystem: 'ระบบบันทึกให้ (ไม่ได้มาจากการเลือกของคุณ)',
  unsureFlagLabel: 'ยังไม่แน่ใจบางข้อ',
  answersTitle: 'คำตอบรายข้อ',
  save: 'ยืนยันและบันทึก',
  saveFromBooking: 'บันทึกและกลับไปจองต่อ',
  saving: 'กำลังบันทึก...',

  // บันทึกเรียบร้อย
  successTitle: 'บันทึกแบบประเมินเรียบร้อยแล้ว',
  successMeta: (name: string, date: string) => `ของ${name} · บันทึกเมื่อ ${date}`,
  successResult: 'ผลที่บันทึกไว้',
  successScoreUnit: '/ 20 คะแนน ADL',
  successCtaOnboarding: 'เริ่มใช้งาน Payung',
  successCtaBooking: 'กลับไปจองต่อ',
  successCtaBookingNote: 'ข้อมูลการจองที่กรอกไว้ยังอยู่ครบ',
  successCtaProfile: 'กลับไปที่โปรไฟล์',

  // error จาก API ตอนบันทึก — คำตอบที่กรอกยังอยู่ กดบันทึกใหม่ได้
  errIncomplete: 'แบบประเมินยังไม่ครบ กรุณาตรวจคำตอบทุกข้อและเงื่อนไขพิเศษอีกครั้ง',
  errAnswerInvalid: 'คำตอบบางข้อไม่ตรงกับตัวเลือกที่ระบบรับ กรุณาเลือกคำตอบข้อนั้นใหม่',
  errFlagInvalid: 'เงื่อนไขพิเศษบางข้อไม่อยู่ในรายการที่ระบบรับ กรุณาเลือกใหม่',
  errFlagsConflict: 'เลือก “ไม่มีเงื่อนไขพิเศษ” พร้อมเงื่อนไขอื่นไม่ได้ กรุณาตรวจหน้าเงื่อนไขพิเศษอีกครั้ง',
  errAccessDenied: 'คุณไม่มีสิทธิ์บันทึกแบบประเมินของผู้รับบริการคนนี้',
  errNetwork: 'บันทึกไม่สำเร็จ อาจเกิดจากการเชื่อมต่อขัดข้อง คำตอบยังอยู่ครบ กดบันทึกอีกครั้งได้',
  errUnknown: 'บันทึกไม่สำเร็จ คำตอบยังอยู่ครบ กรุณากดบันทึกอีกครั้ง',

  // การจอง (AC9, AC10)
  assessedBadge: 'ประเมินแล้ว',
  notAssessedBadge: 'ยังไม่ได้ประเมิน',
  gateTitle: (name: string) => `ต้องทำแบบประเมินของ${name}ก่อนจอง`,
  gateBody: (name: string) =>
    `แบบประเมินช่วยให้เราหาผู้ดูแลที่ดูแลได้ตรงกับความต้องการของ${name} ทำครั้งเดียวต่อคน`,
  gatePointTime: 'ใช้เวลาประมาณ 3–5 นาที',
  gatePointKept: 'ข้อมูลการจองที่กรอกไว้ยังอยู่ครบ',
  gatePointReturn: (name: string) => `ทำเสร็จแล้วระบบพากลับมาที่ขั้นนี้ โดยเลือก${name}ไว้ให้`,
  gateCta: 'ทำแบบประเมินตอนนี้',
  gateAlt: 'เลือกคนอื่น',
  gateMissing: 'แบบประเมินของผู้รับบริการ',
  gateNewTitle: 'ผู้รับบริการรายใหม่ต้องบันทึกและทำแบบประเมินก่อนจอง',
  gateNewBody:
    'ระบบจะบันทึกผู้รับบริการรายนี้ไว้ในรายชื่อของคุณ แล้วพาไปทำแบบประเมิน ทำเสร็จแล้วกลับมาจองต่อได้ทันที',
  gateNewCta: 'บันทึกและทำแบบประเมิน',
  gateNewSaving: 'กำลังบันทึกผู้รับบริการ...',
  gateNewFillFirst: 'กรอกข้อมูลที่จำเป็นของผู้รับบริการให้ครบก่อน',
  gateNewSaveFailed: 'บันทึกผู้รับบริการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  errorRequired: (name: string) => `ยังจองให้${name}ไม่ได้ เพราะยังไม่มีแบบประเมิน`,
  errorRequiredAction: 'ทำแบบประเมิน',
  errorRequiredOnBehalf: (name: string) =>
    `ยังจองให้${name}ไม่ได้ เพราะยังไม่มีแบบประเมิน เจ้าของโปรไฟล์ต้องทำแบบประเมินก่อน`,
  thisRecipient: 'ผู้รับบริการคนนี้',

  // โปรไฟล์
  profileSectionTitle: 'แบบประเมินผู้รับบริการ',
  profileSectionHint: 'คะแนน ADL และเงื่อนไขพิเศษที่ใช้หาผู้ดูแลที่เหมาะสม',
  profileEmpty: 'ยังไม่มีผู้รับบริการที่บันทึกไว้',
  profileLoadFailed: 'โหลดแบบประเมินไม่สำเร็จ',
  profileScore: (score: number) => `${score} / 20 คะแนน`,
  profileAssessedAt: (date: string) => `ประเมินล่าสุด ${date}`,
  profileNoFlags: 'ไม่มีเงื่อนไขพิเศษ',
  profileStart: 'ทำแบบประเมิน',
  profileEdit: 'แก้ไขแบบประเมิน',
  selfBadge: 'ตัวเอง',

  // label ของ Flag ที่สรุปรวมความรุนแรง
  dementiaWithSeverity: (label: string, severe: boolean) =>
    `${label} · ${severe ? 'รุนแรง' : 'ไม่รุนแรง'}`,
  unknownFlag: (code: string) => `เงื่อนไขอื่น (${code})`,

  adl: {
    feeding: {
      title: 'การกินอาหาร',
      hint: 'เมื่อมีอาหารวางเตรียมไว้ตรงหน้า',
      options: {
        2: { label: 'กินเองได้', desc: 'ตักและกินเองได้ตามปกติ' },
        1: { label: 'กินได้ แต่ต้องมีคนช่วย', desc: 'เช่น ช่วยตัดหรือตักอาหารให้ก่อน' },
        0: { label: 'กินเองไม่ได้', desc: 'ต้องมีคนป้อน' },
      },
    },
    grooming: {
      title: 'การล้างหน้า หวีผม แปรงฟัน',
      options: {
        1: { label: 'ทำเองได้' },
        0: { label: 'ต้องมีคนช่วย' },
      },
    },
    transfers: {
      title: 'การลุกจากที่นอนไปนั่งเก้าอี้',
      hint: 'รวมการลุกนั่งบนเตียง',
      options: {
        3: { label: 'ทำเองได้' },
        2: { label: 'ต้องมีคนช่วยเล็กน้อย', desc: 'ช่วยพยุง หรือคอยดูให้ปลอดภัย' },
        1: { label: 'ต้องมีคนช่วยมาก', desc: 'นั่งได้เอง แต่ลุกต้องใช้คนช่วย 1–2 คน' },
        0: { label: 'ทำเองไม่ได้', desc: 'นั่งทรงตัวเองไม่ได้' },
      },
    },
    toilet_use: {
      title: 'การใช้ห้องน้ำ',
      hint: 'เข้าออกห้องน้ำ ทำความสะอาด จัดเสื้อผ้า',
      options: {
        2: { label: 'ทำเองได้ทั้งหมด' },
        1: { label: 'ทำเองได้บางส่วน', desc: 'ต้องมีคนช่วยบางขั้นตอน' },
        0: { label: 'ต้องมีคนช่วยทั้งหมด' },
      },
    },
    mobility: {
      title: 'การเดินหรือเคลื่อนที่ในบ้าน',
      hint: 'ภายในห้องหรือภายในบ้าน',
      options: {
        3: { label: 'เดินเองได้', desc: 'ใช้ไม้เท้าช่วยได้' },
        2: { label: 'เดินได้ แต่ต้องมีคนช่วย', desc: 'ต้องพยุงหรือคอยดู' },
        1: { label: 'ใช้รถเข็นเองได้', desc: 'เข็นเลี้ยวหรือผ่านประตูได้' },
        0: { label: 'เคลื่อนที่เองไม่ได้' },
      },
    },
    dressing: {
      title: 'การสวมใส่เสื้อผ้า',
      hint: 'รวมติดกระดุม รูดซิป',
      options: {
        2: { label: 'ทำเองได้' },
        1: { label: 'ทำเองได้ประมาณครึ่งหนึ่ง', desc: 'ที่เหลือต้องมีคนช่วย' },
        0: { label: 'ต้องมีคนช่วยทั้งหมด', desc: 'ต้องมีคนใส่ให้' },
      },
    },
    stairs: {
      title: 'การขึ้นลงบันได 1 ชั้น',
      options: {
        2: { label: 'ทำเองได้' },
        1: { label: 'ต้องมีคนช่วย' },
        0: { label: 'ทำเองไม่ได้' },
      },
    },
    bathing: {
      title: 'การอาบน้ำ',
      options: {
        1: { label: 'อาบเองได้' },
        0: { label: 'ต้องมีคนช่วย', desc: 'หรือต้องมีคนอาบให้' },
      },
    },
    bowels: {
      title: 'การกลั้นอุจจาระ',
      hint: 'ในช่วง 1 สัปดาห์ที่ผ่านมา',
      options: {
        2: { label: 'กลั้นได้ปกติ' },
        1: { label: 'กลั้นไม่ได้บางครั้ง', desc: 'ไม่เกินสัปดาห์ละ 1 ครั้ง' },
        0: { label: 'กลั้นไม่ได้ หรือต้องสวนให้' },
      },
    },
    bladder: {
      title: 'การกลั้นปัสสาวะ',
      hint: 'ในช่วง 1 สัปดาห์ที่ผ่านมา',
      options: {
        2: { label: 'กลั้นได้ปกติ' },
        1: { label: 'กลั้นไม่ได้บางครั้ง', desc: 'ไม่เกินวันละ 1 ครั้ง' },
        0: { label: 'กลั้นไม่ได้ หรือใส่สายสวน' },
      },
    },
  } as Record<AdlCode, AdlItemText>,

  flags: {
    ng_tube: { label: 'ใช้สายยางให้อาหาร', desc: 'ทางจมูก หรือทางหน้าท้อง' },
    urinary_catheter: { label: 'ใช้สายสวนปัสสาวะ', desc: 'มีถุงปัสสาวะที่ต้องดูแล' },
    oxygen: { label: 'ใช้ออกซิเจนหรือเครื่องช่วยหายใจ', desc: 'ใช้ถัง หรือเครื่องผลิตออกซิเจน' },
    pressure_ulcer: { label: 'มีแผลกดทับ', desc: 'หรือมีแผลที่ต้องทำความสะอาดเป็นประจำ' },
    injection: { label: 'ต้องฉีดยา', desc: 'เช่น อินซูลิน หรือยาฉีดตามแพทย์สั่ง' },
    end_of_life: { label: 'อยู่ในระยะท้าย', desc: 'ดูแลแบบประคับประคอง' },
    dementia: {
      label: 'สมองเสื่อมหรืออัลไซเมอร์',
      desc: 'จำคนหรือเรื่องใกล้ตัวไม่ค่อยได้ สับสนวันเวลาหรือสถานที่',
    },
    diabetes: { label: 'เบาหวานที่ต้องเจาะน้ำตาลหรือคุมอาหาร', desc: 'ต้องตรวจน้ำตาลหรือดูแลเรื่องอาหาร' },
    fall_risk: { label: 'เสี่ยงหกล้มหรือเคยล้มใน 6 เดือน', desc: 'เดินไม่มั่นคง หรือเคยหกล้มในช่วงที่ผ่านมา' },
  } as Record<FlagCode, { label: string; desc: string }>,
};

export type AssessmentStrings = typeof TH;

const EN: AssessmentStrings = {
  stepOf: (n, total) => `Step ${n} of ${total}`,
  stepsLabel: 'Assessment steps',
  stepPersonal: 'Your details',
  stepAdl: 'ADL assessment',
  stepFlags: 'Special conditions',
  stepSummary: 'Summary',
  asideTitleOnboarding: 'Almost ready to book',
  asideTitleBooking: 'Complete the assessment to continue booking',
  asideTitleProfile: 'Edit assessment',
  asideDoneLabel: 'All steps complete',
  asideDoneTitle: 'Ready to book care',
  subjectLabel: 'Assessing for',
  subjectLabelShort: 'For',
  ageSuffix: (age) => `${age} yrs`,
  disclaimerTitle: 'Assessed by family, not a medical diagnosis',
  disclaimerBody: 'Your answers help us find the right caregiver for this person.',
  disclaimerTitleSelf: 'Self-assessed, not a medical diagnosis',
  disclaimerBodySelf: 'Your answers help us find the right caregiver for you.',
  disclaimerSummaryBody: 'This score helps us match a caregiver. It is not a medical diagnosis.',
  leaveWarning: "If you leave before saving, your answers won't be kept.",
  leaveConfirm: 'Leave the assessment now? Your answers will be lost.',
  logoutOnboarding: 'Log out',
  leaveConfirmOnboarding:
    "You need to finish the assessment before using Payung. Log out now? Your answers will be lost and you'll start again next time you log in.",
  back: 'Back',
  edit: 'Edit',
  loading: 'Loading assessment...',
  loadFailed: 'Could not load the assessment. Please try again.',
  notFound: "We couldn't find this person, or you can't assess them.",
  retry: 'Try again',
  goHome: 'Go to home',

  adlTitle: 'How much can they do on their own?',
  adlSubtitle:
    'Answer based on the past 1–2 days. Every question needs an answer — choose “Not sure” if you don\'t know.',
  adlProgress: (done, total) => `${done} of ${total} answered`,
  adlUnsureCount: (n) => `${n} not sure`,
  adlQuestionOf: (n, total) => `Question ${n} of ${total}`,
  adlQuestionOfShort: (n, total) => `Q${n}/${total}`,
  statusAnswered: 'Answered',
  statusUnsure: 'Not sure',
  statusMissing: 'Not answered',
  or: 'or',
  unsureLabel: 'Not sure',
  unsureHint: "I don't know yet",
  unsureThreshold: "You've chosen “Not sure” 3 times. We'll note",
  unsureThresholdFlag: 'Some answers unsure',
  unsureThresholdTail: 'in the result',
  questionNumber: (n) => `Q${n}`,
  adlErrorBanner: (count) => `${count} questions still need an answer`,
  adlGoTo: (n) => `Go to question ${n}`,
  adlErrorItem: 'Please choose an answer, or “Not sure”.',
  adlNext: 'Next: Special conditions',

  flagsTitle: 'Anything special the caregiver should know?',
  flagsSubtitle: 'Choose all that apply. If none do, choose “No special conditions”.',
  flagsNoneLabel: 'No special conditions',
  flagsNoneHint: 'None of the items below apply',
  flagsNoneHintSelf: 'None of the items below apply to you',
  flagsDivider: 'or choose what applies',
  flagsGroupLabel: 'Special conditions, choose all that apply',
  flagsCount: (n) => `${n} selected`,
  flagsNoticeCleared: (n) => `Cleared ${n} selections because you chose “No special conditions”`,
  flagsNoticeNoneRemoved: '“No special conditions” was removed',
  flagsUndo: 'Undo',
  severityLegend: 'How severe is it?',
  severityMild: 'Mild',
  severityMildHint: 'Can do simple routines with prompting',
  severitySevere: 'Severe',
  severitySevereHint: 'Needs someone with them at all times',
  flagsErrorEmpty: 'Choose at least one, or “No special conditions”.',
  flagsErrorSeverity: 'Please choose a severity.',
  flagsNext: 'Next: View summary',

  summaryTitle: 'Review before saving',
  summarySubtitle: 'Check your answers before confirming',
  scoreTitle: 'Self-care score (ADL)',
  scoreOutOf: '/ 20',
  scoreScaleLow: '0 needs help with everything',
  scoreScaleHigh: '20 fully independent',
  scoreFrom: (scored, unsure) => `From ${scored} answered questions · ${unsure} not sure`,
  scorePreviewNote: '“Not sure” counts as 0 · the saved score is calculated by the system',
  systemFlagTitle: 'We added “Some answers unsure” automatically',
  systemFlagBody: (u, list) =>
    `You chose “Not sure” ${u} times (${list}). If you know the answers, edit them before saving.`,
  summaryFlagsTitle: 'Special conditions',
  summaryChosen: 'You chose',
  summarySystem: 'Added by the system (not your selection)',
  unsureFlagLabel: 'Some answers unsure',
  answersTitle: 'Answers',
  save: 'Confirm and save',
  saveFromBooking: 'Save and continue booking',
  saving: 'Saving...',

  successTitle: 'Assessment saved',
  successMeta: (name, date) => `For ${name} · Saved on ${date}`,
  successResult: 'Saved result',
  successScoreUnit: '/ 20 ADL score',
  successCtaOnboarding: 'Start using Payung',
  successCtaBooking: 'Continue booking',
  successCtaBookingNote: 'Your booking details are kept',
  successCtaProfile: 'Back to profile',

  errIncomplete: 'The assessment is incomplete. Please check every question and the special conditions.',
  errAnswerInvalid: "Some answers aren't valid options. Please choose them again.",
  errFlagInvalid: "Some special conditions aren't on the list. Please choose again.",
  errFlagsConflict: '“No special conditions” can’t be chosen with other conditions. Please check that page again.',
  errAccessDenied: "You don't have permission to save this person's assessment.",
  errNetwork: 'Could not save, possibly a connection problem. Your answers are kept, please try again.',
  errUnknown: 'Could not save. Your answers are kept, please try again.',

  assessedBadge: 'Assessed',
  notAssessedBadge: 'Not assessed',
  gateTitle: (name) => `${name} needs an assessment before booking`,
  gateBody: (name) => `It helps us match a caregiver to ${name}'s needs. You only do it once per person.`,
  gatePointTime: 'About 3–5 minutes',
  gatePointKept: 'Your booking details are kept',
  gatePointReturn: (name) => `We'll bring you back here with ${name} selected`,
  gateCta: 'Start assessment now',
  gateAlt: 'Choose someone else',
  gateMissing: 'Care recipient assessment',
  gateNewTitle: 'A new care recipient must be saved and assessed before booking',
  gateNewBody: "We'll save this person to your list and take you to the assessment, then bring you back to continue booking.",
  gateNewCta: 'Save and start assessment',
  gateNewSaving: 'Saving care recipient...',
  gateNewFillFirst: "Fill in the care recipient's required details first",
  gateNewSaveFailed: 'Could not save the care recipient. Please try again.',
  errorRequired: (name) => `Can't book for ${name} yet — no assessment on file`,
  errorRequiredAction: 'Start assessment',
  errorRequiredOnBehalf: (name) =>
    `Can't book for ${name} yet — no assessment on file. The profile owner needs to complete it first.`,
  thisRecipient: 'this person',

  profileSectionTitle: 'Care recipient assessments',
  profileSectionHint: 'ADL score and special conditions used to match a caregiver',
  profileEmpty: 'No saved care recipients yet',
  profileLoadFailed: 'Could not load assessments',
  profileScore: (score) => `${score} / 20`,
  profileAssessedAt: (date) => `Last assessed ${date}`,
  profileNoFlags: 'No special conditions',
  profileStart: 'Start assessment',
  profileEdit: 'Edit assessment',
  selfBadge: 'Me',

  dementiaWithSeverity: (label, severe) => `${label} · ${severe ? 'severe' : 'mild'}`,
  unknownFlag: (code) => `Other condition (${code})`,

  adl: {
    feeding: {
      title: 'Eating',
      hint: 'When food is placed in front of them',
      options: {
        2: { label: 'Eats independently', desc: 'Can scoop and eat normally' },
        1: { label: 'Eats with some help', desc: 'e.g. food needs cutting first' },
        0: { label: 'Cannot eat independently', desc: 'Needs to be fed' },
      },
    },
    grooming: {
      title: 'Washing face, combing hair, brushing teeth',
      options: { 1: { label: 'Independent' }, 0: { label: 'Needs help' } },
    },
    transfers: {
      title: 'Moving from bed to chair',
      hint: 'Including sitting up in bed',
      options: {
        3: { label: 'Independent' },
        2: { label: 'Needs a little help', desc: 'Support or supervision for safety' },
        1: { label: 'Needs a lot of help', desc: 'Can sit, but needs 1–2 people to stand' },
        0: { label: 'Unable', desc: 'Cannot keep balance sitting' },
      },
    },
    toilet_use: {
      title: 'Using the toilet',
      hint: 'Getting on and off, cleaning, adjusting clothes',
      options: {
        2: { label: 'Fully independent' },
        1: { label: 'Partly independent', desc: 'Needs help with some steps' },
        0: { label: 'Needs full help' },
      },
    },
    mobility: {
      title: 'Walking or moving around the home',
      hint: 'Within the room or house',
      options: {
        3: { label: 'Walks independently', desc: 'A cane is fine' },
        2: { label: 'Walks, but needs help', desc: 'Needs support or supervision' },
        1: { label: 'Uses a wheelchair independently', desc: 'Can turn and go through doors' },
        0: { label: 'Cannot move independently' },
      },
    },
    dressing: {
      title: 'Dressing',
      hint: 'Including buttons and zips',
      options: {
        2: { label: 'Independent' },
        1: { label: 'Does about half', desc: 'Needs help with the rest' },
        0: { label: 'Needs full help', desc: 'Needs to be dressed' },
      },
    },
    stairs: {
      title: 'Going up and down one flight of stairs',
      options: { 2: { label: 'Independent' }, 1: { label: 'Needs help' }, 0: { label: 'Unable' } },
    },
    bathing: {
      title: 'Bathing',
      options: { 1: { label: 'Bathes independently' }, 0: { label: 'Needs help', desc: 'Or needs to be bathed' } },
    },
    bowels: {
      title: 'Bowel control',
      hint: 'In the past week',
      options: {
        2: { label: 'Continent' },
        1: { label: 'Occasional accident', desc: 'No more than once a week' },
        0: { label: 'Incontinent or needs enemas' },
      },
    },
    bladder: {
      title: 'Bladder control',
      hint: 'In the past week',
      options: {
        2: { label: 'Continent' },
        1: { label: 'Occasional accident', desc: 'No more than once a day' },
        0: { label: 'Incontinent or catheterised' },
      },
    },
  },

  flags: {
    ng_tube: { label: 'Feeding tube', desc: 'Nasal or abdominal' },
    urinary_catheter: { label: 'Urinary catheter', desc: 'Has a urine bag to look after' },
    oxygen: { label: 'Oxygen or breathing machine', desc: 'Tank or oxygen concentrator' },
    pressure_ulcer: { label: 'Pressure sore', desc: 'Or a wound that needs regular cleaning' },
    injection: { label: 'Needs injections', desc: 'e.g. insulin or prescribed injections' },
    end_of_life: { label: 'End-of-life care', desc: 'Palliative care' },
    dementia: { label: 'Dementia or Alzheimer’s', desc: 'Forgets people or recent events, confused about time or place' },
    diabetes: { label: 'Diabetes needing glucose checks or diet control', desc: 'Needs blood sugar checks or diet care' },
    fall_risk: { label: 'Fall risk or a fall in the past 6 months', desc: 'Unsteady walking, or has fallen recently' },
  },
};

export const ASSESSMENT_STRINGS = { th: TH, en: EN };

export function useAssessmentStrings(): AssessmentStrings {
  return TH;
}

/** ชื่อ Flag สำหรับแสดงผล — รหัสที่ไม่รู้จัก (BE เพิ่มทีหลัง) ต้องไม่ทำให้หน้าจอพัง */
export function flagLabel(s: AssessmentStrings, code: string): string {
  return (s.flags as Record<string, { label: string } | undefined>)[code]?.label ?? s.unknownFlag(code);
}

/** Flags ที่ญาติเลือก เป็นข้อความพร้อมแสดง — สมองเสื่อมต่อท้ายด้วยระดับความรุนแรง */
export function chosenFlagLabels(
  s: AssessmentStrings,
  flags: readonly string[],
  dementiaSevere: boolean | null,
): string[] {
  return flags.map((code) =>
    code === DEMENTIA_FLAG && dementiaSevere != null
      ? s.dementiaWithSeverity(flagLabel(s, code), dementiaSevere)
      : flagLabel(s, code),
  );
}

/** "2026-10-16T..." → "16 ต.ค. 2569" (เวลาท้องถิ่นของเครื่อง) */
export function formatAssessedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}
