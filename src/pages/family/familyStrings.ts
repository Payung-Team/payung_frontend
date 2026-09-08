/**
 * Copy for the Family Group screens. Thai only — the rest of the app is Thai, so the
 * strings live in one place here rather than being scattered as inline literals.
 */

/** e.g. "12 ส.ค. 2569" (Buddhist year). */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Grapheme-aware first character for avatars (handles Thai + emoji). */
export function initial(name: string | null | undefined, fallback = '?'): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return fallback;
  return [...trimmed][0] ?? fallback;
}

/** The strings table. A hook-shaped accessor so call sites read `const s = useStrings()`. */
export function useStrings(): Strings {
  return S;
}

export interface Strings {
  navFamily: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  emptyTitle: string;
  emptyBody: string;
  createGroup: string;
  featureInvite: string;
  featureInviteHint: string;
  featureBook: string;
  featureBookHint: string;
  featureTrack: string;
  featureTrackHint: string;
  roleOwner: string;
  roleMember: string;
  createdOn: string;
  memberCount: (n: number) => string;
  invite: string;
  memberNotice: string;
  myGroups: string;
  createNewGroup: string;
  renameGroup: string;
  transferOwnership: string;
  leaveGroup: string;
  deleteGroup: string;
  membersTitle: string;
  you: string;
  ownerCannotRemoveSelf: string;
  memberRowMenu: string;
  makeOwner: string;
  removeFromGroup: string;
  joinedOn: string;
  recipientsTitle: string;
  recipientsSubtitle: string;
  recipientsEmpty: string;
  addedByYou: string;
  addedByMember: string;
  inviteTitle: string;
  inviteSubtitle: string;
  inviteLinkLabel: string;
  copy: string;
  copied: string;
  copyFailed: string;
  linkExpiresOn: (date: string) => string;
  usesRemaining: (n: number) => string;
  usesUnlimited: string;
  memberLimitLine: (count: number, limit: number) => string;
  shareWarning: string;
  rotateLink: string;
  revokeLink: string;
  close: string;
  noLinkYet: string;
  createLink: string;
  creating: string;
  rotateConfirmTitle: string;
  rotateConfirmBody: string;
  rotateConfirmCta: string;
  revokeConfirmTitle: string;
  revokeConfirmBody: string;
  revokeConfirmCta: string;
  createTitle: string;
  createSubtitle: string;
  groupNameLabel: string;
  groupNamePlaceholder: string;
  charCount: (n: number, max: number) => string;
  nameRequired: string;
  nameTooLong: (max: number) => string;
  cancel: string;
  create: string;
  renameTitle: string;
  renameSubtitle: string;
  save: string;
  transferTitle: string;
  transferSubtitle: string;
  transferCta: string;
  noOtherMembers: string;
  deleteTitle: (name: string) => string;
  deleteIrreversible: string;
  deleteBullet1: (n: number) => string;
  deleteBullet2: string;
  deleteBullet3: string;
  deleteBulletKept: string;
  deleteTypeToConfirm: (name: string) => string;
  removeTitle: (name: string) => string;
  removeBody: string;
  removeCta: string;
  leaveTitle: (name: string) => string;
  leaveBody: string;
  leaveCta: string;
  lastOwnerTitle: string;
  lastOwnerBody: string;
  // busy labels shown on buttons while a mutation runs
  busyWorking: string;
  busyCreating: string;
  busySaving: string;
  busyTransferring: string;
  busyRemoving: string;
  busyLeaving: string;
  busyDeleting: string;
  busyJoining: string;
  // toasts
  toastCopied: string;
  toastRenamed: string;
  toastRemoved: (name: string) => string;
  toastTransferred: (name: string) => string;
  toastLeft: (name: string) => string;
  toastDeleted: string;
  toastLinkRotated: string;
  toastLinkRevoked: string;
  // join page
  joinChecking: string;
  joinInvitedTo: string;
  invitedBy: (name: string) => string;
  joinBenefits1: string;
  joinBenefits2: string;
  joinBenefits3: string;
  joinCta: string;
  joinLater: string;
  joinSignedOutTitle: string;
  joinSignedOutBody: string;
  signIn: string;
  register: string;
  joinAlreadyTitle: string;
  joinAlreadyBody: (name: string) => string;
  goToGroup: string;
  joinSuccessTitle: string;
  joinSuccessBody: (name: string) => string;
  enterGroup: string;
  backHome: string;
  errExpiredTitle: string;
  errRevokedTitle: string;
  errExhaustedTitle: string;
  errFullTitle: string;
  errInvalidTitle: string;
  errAskOwner: string;
}

const S: Strings = {
  navFamily: 'จัดการกลุ่ม',
  dashboardTitle: 'จัดการกลุ่ม',
  dashboardSubtitle: 'ภาพรวมกลุ่ม สมาชิก และผู้รับการดูแล',
  emptyTitle: 'คุณยังไม่มีกลุ่มครอบครัว',
  emptyBody:
    'สร้างกลุ่มเพื่อเชิญพี่น้องหรือญาติเข้ามาช่วยกันดูแล แชร์ข้อมูลผู้รับการดูแล และจองผู้ดูแลแทนกันได้ โดยที่ค่าบริการยังชำระโดยผู้จองเท่านั้น',
  createGroup: 'สร้างกลุ่มครอบครัว',
  featureInvite: 'เชิญด้วยลิงก์',
  featureInviteHint: 'ลิงก์คำเชิญมีอายุ 7 วัน',
  featureBook: 'จองแทนสมาชิกได้',
  featureBookHint: 'ผู้จองเป็นผู้ชำระเงิน',
  featureTrack: 'ติดตามการจองร่วมกัน',
  featureTrackHint: 'เห็นการจองของทุกคนในกลุ่ม',
  roleOwner: 'เจ้าของกลุ่ม',
  roleMember: 'สมาชิก',
  createdOn: 'สร้างเมื่อ',
  memberCount: (n) => `${n} สมาชิก`,
  invite: 'เชิญสมาชิก',
  memberNotice:
    'คุณเป็นสมาชิกของกลุ่มนี้ — ดูข้อมูลและติดตามการจองของกลุ่มได้ ส่วนการเชิญ ลบสมาชิก และจัดการกลุ่มทำได้เฉพาะเจ้าของกลุ่ม',
  myGroups: 'กลุ่มของฉัน',
  createNewGroup: 'สร้างกลุ่มใหม่',
  renameGroup: 'เปลี่ยนชื่อกลุ่ม',
  transferOwnership: 'โอนสิทธิ์เจ้าของกลุ่ม',
  leaveGroup: 'ออกจากกลุ่ม',
  deleteGroup: 'ลบกลุ่ม',
  membersTitle: 'สมาชิกในกลุ่ม',
  you: '(คุณ)',
  ownerCannotRemoveSelf: 'เจ้าของกลุ่มลบตัวเองไม่ได้',
  memberRowMenu: 'ตัวเลือกสมาชิก',
  makeOwner: 'ตั้งเป็นเจ้าของกลุ่ม',
  removeFromGroup: 'ลบออกจากกลุ่ม',
  joinedOn: 'เข้าร่วม',
  recipientsTitle: 'ผู้รับการดูแลในกลุ่ม',
  recipientsSubtitle: 'โปรไฟล์ที่สมาชิกแชร์ไว้เพื่อจองแทนกัน',
  recipientsEmpty: 'ยังไม่มีใครแชร์โปรไฟล์ผู้รับการดูแลในกลุ่มนี้',
  addedByYou: 'คุณเพิ่ม',
  addedByMember: 'สมาชิกเพิ่ม',
  inviteTitle: 'เชิญเข้ากลุ่ม',
  inviteSubtitle: 'แชร์ลิงก์นี้ให้คนในครอบครัว ใครมีลิงก์เข้าร่วมได้เลย',
  inviteLinkLabel: 'ลิงก์คำเชิญ',
  copy: 'คัดลอก',
  copied: 'คัดลอกแล้ว',
  copyFailed: 'คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง',
  linkExpiresOn: (date) => `ลิงก์นี้ใช้ได้ถึง ${date}`,
  usesRemaining: (n) => `เข้าร่วมได้อีก ${n} คน`,
  usesUnlimited: 'เข้าร่วมได้ไม่จำกัดจำนวน',
  memberLimitLine: (count, limit) => `ตอนนี้มีสมาชิก ${count} จาก ${limit} คน`,
  shareWarning: 'ใครก็ตามที่ได้ลิงก์นี้เข้ากลุ่มได้ — แชร์เฉพาะกับคนในครอบครัวเท่านั้น',
  rotateLink: 'สร้างลิงก์ใหม่ (ยกเลิกลิงก์เดิม)',
  revokeLink: 'ปิดลิงก์เข้าร่วม',
  close: 'ปิด',
  noLinkYet: 'กลุ่มนี้ยังไม่มีลิงก์เข้าร่วม',
  createLink: 'สร้างลิงก์เชิญ',
  creating: 'กำลังสร้าง…',
  rotateConfirmTitle: 'สร้างลิงก์คำเชิญใหม่?',
  rotateConfirmBody:
    'ลิงก์เดิมที่แชร์ไปแล้วจะใช้ไม่ได้ทันที คนที่ยังไม่ได้กดเข้าร่วมต้องใช้ลิงก์ใหม่',
  rotateConfirmCta: 'สร้างลิงก์ใหม่',
  revokeConfirmTitle: 'ปิดลิงก์เข้าร่วม?',
  revokeConfirmBody:
    'ลิงก์ปัจจุบันจะใช้ไม่ได้ทันที และกลุ่มจะไม่มีลิงก์จนกว่าคุณจะสร้างใหม่',
  revokeConfirmCta: 'ปิดลิงก์',
  createTitle: 'สร้างกลุ่มครอบครัว',
  createSubtitle: 'ตั้งชื่อกลุ่มเพื่อเริ่มชวนคนในครอบครัวเข้ามาช่วยกันดูแล',
  groupNameLabel: 'ชื่อกลุ่ม',
  groupNamePlaceholder: 'เช่น ครอบครัววงศ์ดี',
  charCount: (n, max) => `${n} / ${max} ตัวอักษร`,
  nameRequired: 'กรุณาตั้งชื่อกลุ่ม',
  nameTooLong: (max) => `ชื่อกลุ่มต้องไม่เกิน ${max} ตัวอักษร`,
  cancel: 'ยกเลิก',
  create: 'สร้างกลุ่ม',
  renameTitle: 'เปลี่ยนชื่อกลุ่ม',
  renameSubtitle: 'ชื่อกลุ่มจะแสดงให้สมาชิกทุกคนเห็น',
  save: 'บันทึก',
  transferTitle: 'โอนสิทธิ์เจ้าของกลุ่ม',
  transferSubtitle:
    'เลือกสมาชิกที่จะเป็นเจ้าของกลุ่มคนใหม่ — คุณจะกลายเป็นสมาชิกทั่วไปทันที',
  transferCta: 'ยืนยันการโอน',
  noOtherMembers: 'ยังไม่มีสมาชิกคนอื่นให้โอนสิทธิ์ กรุณาเชิญสมาชิกก่อน',
  deleteTitle: (name) => `ลบกลุ่ม ${name}?`,
  deleteIrreversible: 'การกระทำนี้ย้อนกลับไม่ได้',
  deleteBullet1: (n) => `สมาชิกทั้ง ${n} คนจะถูกนำออกจากกลุ่ม`,
  deleteBullet2: 'ลิงก์คำเชิญที่ค้างอยู่จะถูกยกเลิก',
  deleteBullet3: 'ประวัติกิจกรรมของกลุ่มจะถูกลบ',
  deleteBulletKept: 'ประวัติการจองและการชำระเงินยังคงอยู่',
  deleteTypeToConfirm: (name) => `พิมพ์ “${name}” เพื่อยืนยัน`,
  removeTitle: (name) => `ลบ ${name} ออกจากกลุ่ม?`,
  removeBody:
    'สมาชิกรายนี้จะไม่เห็นข้อมูลผู้รับการดูแลและกิจกรรมของกลุ่มทันที การจองที่ทำไปแล้วจะยังคงอยู่ในประวัติ',
  removeCta: 'ลบสมาชิก',
  leaveTitle: (name) => `ออกจากกลุ่ม ${name}?`,
  leaveBody:
    'คุณจะไม่เห็นข้อมูลผู้รับการดูแลและกิจกรรมของกลุ่มนี้อีก หากต้องการกลับเข้ามา ต้องให้เจ้าของกลุ่มเชิญใหม่',
  leaveCta: 'ออกจากกลุ่ม',
  lastOwnerTitle: 'ออกจากกลุ่มไม่ได้',
  lastOwnerBody:
    'คุณเป็นเจ้าของกลุ่มคนเดียวในตอนนี้ โปรดโอนสิทธิ์เจ้าของกลุ่มให้สมาชิกคนอื่นก่อน หรือลบกลุ่มทิ้ง',
  busyWorking: 'กำลังดำเนินการ…',
  busyCreating: 'กำลังสร้าง…',
  busySaving: 'กำลังบันทึก…',
  busyTransferring: 'กำลังโอน…',
  busyRemoving: 'กำลังลบ…',
  busyLeaving: 'กำลังออก…',
  busyDeleting: 'กำลังลบ…',
  busyJoining: 'กำลังเข้าร่วม…',
  toastCopied: 'คัดลอกลิงก์แล้ว — ส่งให้คนที่ต้องการเชิญได้เลย',
  toastRenamed: 'เปลี่ยนชื่อกลุ่มแล้ว',
  toastRemoved: (name) => `นำ ${name} ออกจากกลุ่มแล้ว`,
  toastTransferred: (name) => `โอนสิทธิ์เจ้าของกลุ่มให้ ${name} แล้ว`,
  toastLeft: (name) => `ออกจากกลุ่ม ${name} แล้ว`,
  toastDeleted: 'ลบกลุ่มแล้ว',
  toastLinkRotated: 'สร้างลิงก์ใหม่แล้ว ลิงก์เดิมใช้ไม่ได้อีก',
  toastLinkRevoked: 'ปิดลิงก์เข้าร่วมแล้ว',
  joinChecking: 'กำลังตรวจสอบลิงก์คำเชิญ…',
  joinInvitedTo: 'คุณได้รับคำเชิญให้เข้าร่วม',
  invitedBy: (name) => `เชิญโดย ${name}`,
  joinBenefits1: 'จองผู้ดูแลแทนสมาชิกในกลุ่มได้',
  joinBenefits2: 'ติดตามการจองของทุกคนในกลุ่ม',
  joinBenefits3: 'ค่าบริการชำระโดยผู้จองแต่ละครั้ง',
  joinCta: 'เข้าร่วมกลุ่ม',
  joinLater: 'ไว้ภายหลัง',
  joinSignedOutTitle: 'คุณได้รับคำเชิญเข้าร่วมกลุ่มครอบครัว',
  joinSignedOutBody:
    'เข้าสู่ระบบหรือสมัครสมาชิกเพื่อดูรายละเอียดและเข้าร่วมกลุ่ม เราจะพากลับมาที่หน้านี้ให้อัตโนมัติ',
  signIn: 'เข้าสู่ระบบ',
  register: 'สมัครสมาชิกใหม่',
  joinAlreadyTitle: 'คุณอยู่ในกลุ่มนี้อยู่แล้ว',
  joinAlreadyBody: (name) => `คุณเป็นสมาชิกของ ${name} อยู่แล้ว`,
  goToGroup: 'ไปที่หน้ากลุ่ม',
  joinSuccessTitle: 'เข้าร่วมกลุ่มสำเร็จ',
  joinSuccessBody: (name) =>
    `ยินดีต้อนรับสู่ ${name} ตอนนี้คุณติดตามและจองแทนสมาชิกในกลุ่มได้แล้ว`,
  enterGroup: 'เข้าสู่หน้ากลุ่ม',
  backHome: 'กลับหน้าหลัก',
  errExpiredTitle: 'ลิงก์คำเชิญหมดอายุแล้ว',
  errRevokedTitle: 'ลิงก์คำเชิญถูกยกเลิกแล้ว',
  errExhaustedTitle: 'ลิงก์คำเชิญถูกใช้ครบจำนวนแล้ว',
  errFullTitle: 'กลุ่มนี้มีสมาชิกครบแล้ว',
  errInvalidTitle: 'ลิงก์คำเชิญไม่ถูกต้อง',
  errAskOwner: 'กรุณาขอลิงก์ใหม่จากเจ้าของกลุ่ม',
};
