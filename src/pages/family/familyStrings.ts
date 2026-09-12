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

/** e.g. "14:05" — the time-of-day shown on an activity row. */
export function formatTime(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Day separator for the activity feed: "วันนี้" / "เมื่อวาน" / a full date. Compared on the
 * local calendar day, not on elapsed hours, so 23:50 → 00:10 reads as yesterday → today.
 */
export function formatDayHeading(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (days === 0) return S.today;
  if (days === 1) return S.yesterday;
  return formatDate(d);
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
  // create wizard
  wizardStep: (n: number, total: number) => string;
  wizardNameStep: string;
  wizardInviteStep: string;
  next: string;
  editGroupName: string;
  skipForNow: string;
  enterGroupCta: string;
  inviteHelper: string;
  // dashboard: solo banner + group card meta + appointments
  soloBannerTitle: string;
  soloBannerBody: string;
  copyInviteLink: string;
  createdToday: string;
  noAppointmentsYet: string;
  seeMembers: string;
  apptTitle: string;
  apptNone: string;
  apptCount: (n: number) => string;
  bookOnBehalf: string;
  bookPickRecipient: string;
  bookNoRecipients: string;
  bookContinue: string;
  apptEmptyTitle: string;
  apptEmptyBody: string;
  bookedByYou: string;
  bookedBy: (name: string) => string;
  apptHours: (n: number) => string;
  bookingStatusLabel: (status: string) => string;
  // appointments feed — tabs, in-progress card, view-all
  apptConfirmedCount: (n: number) => string;
  tabConfirmed: string;
  tabPending: string;
  tabHistory: string;
  tabCount: (n: number) => string;
  apptEscrow: string;
  apptCheckIn: string;
  apptCheckOut: string;
  apptInProgress: string;
  apptStart: string;
  apptLocationLabel: string;
  apptServiceFormatLabel: string;
  apptViewAll: string;
  apptShowLess: string;
  apptEmptyPendingTitle: string;
  apptEmptyPendingBody: string;
  apptEmptyHistoryTitle: string;
  apptEmptyHistoryBody: string;
  serviceTypeLabel: (t: string) => string;
  serviceFormatLabel: (locs: string[]) => string;
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
  membersSubtitle: (groupName: string, count: number) => string;
  backToGroup: string;
  membersListLabel: (n: number) => string;
  you: string;
  ownerCannotRemoveSelf: string;
  memberRowMenu: string;
  makeOwner: string;
  removeFromGroup: string;
  bookForMember: string;
  viewMemberBookings: string;
  memberBookingsTitle: (name: string) => string;
  memberBookingsEmpty: string;
  joinedOn: string;
  recipientsTitle: string;
  recipientsSubtitle: string;
  recipientsEmpty: string;
  addedByYou: string;
  addedByMember: string;
  addRecipient: string;
  editRecipient: string;
  removeRecipient: string;
  recipientMenu: string;
  recipientNameLabel: string;
  recipientNamePlaceholder: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  addRecipientTitle: string;
  addRecipientSubtitle: string;
  editRecipientTitle: string;
  removeRecipientTitle: (name: string) => string;
  removeRecipientBody: string;
  add: string;
  busyAdding: string;
  toastRecipientAdded: string;
  toastRecipientUpdated: string;
  toastRecipientRemoved: (name: string) => string;
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
  // activity feed (PYG-422) — the per-action sentences live in activityCopy.ts
  today: string;
  yesterday: string;
  activityTitle: string;
  activitySubtitle: string;
  activityRefresh: string;
  activityEmptyTitle: string;
  activityEmptyBody: string;
  activityLoadMore: string;
  activityLoadingMore: string;
  activityEnd: string;
  activityErrorTitle: string;
  activityErrorBody: string;
  activityRetry: string;
  activityUnavailableTitle: string;
  activityUnavailableBody: string;
  activityMemberOnlyTitle: string;
  activityMemberOnlyBody: string;
  activityActorUnknown: string;
  activityActorYou: string;
}

const S: Strings = {
  navFamily: 'จัดการกลุ่ม',
  dashboardTitle: 'จัดการกลุ่ม',
  dashboardSubtitle: 'ภาพรวมกลุ่มและนัดหมายของสมาชิก',
  wizardStep: (n, total) => `ขั้นที่ ${n} จาก ${total}`,
  wizardNameStep: 'ตั้งชื่อกลุ่ม',
  wizardInviteStep: 'ชวนคนเข้ากลุ่ม (ข้ามได้)',
  next: 'ถัดไป',
  editGroupName: 'แก้ไขชื่อกลุ่ม',
  skipForNow: 'ข้ามไปก่อน',
  enterGroupCta: 'เข้าสู่กลุ่ม',
  inviteHelper: 'ลิงก์ใช้ได้ 7 วัน · ใครมีลิงก์เข้ากลุ่มได้ แชร์เฉพาะคนในครอบครัว',
  soloBannerTitle: 'กลุ่มยังมีแค่คุณคนเดียว',
  soloBannerBody:
    'แชร์ลิงก์คำเชิญให้คนในครอบครัว เพื่อจองผู้ดูแลแทนกันและติดตามนัดหมายร่วมกัน',
  copyInviteLink: 'คัดลอกลิงก์เชิญ',
  createdToday: 'สร้างเมื่อวันนี้',
  noAppointmentsYet: 'ยังไม่มีนัดหมาย',
  seeMembers: 'ดูสมาชิก',
  apptTitle: 'นัดหมายของสมาชิก',
  apptNone: 'ยังไม่มีรายการ',
  apptCount: (n) => `${n} รายการ`,
  bookOnBehalf: 'จองแทนสมาชิก',
  bookPickRecipient: 'เลือกผู้รับบริการที่จะจองให้ แล้วกรอกรายละเอียดในขั้นตอนถัดไป',
  bookNoRecipients: 'ยังไม่มีผู้รับบริการในกลุ่ม เพิ่มคนที่คุณจะจองแทนเพื่อเริ่มต้น',
  bookContinue: 'ถัดไป',
  bookedByYou: 'จองโดยคุณ',
  bookedBy: (name) => `จองโดย ${name}`,
  apptHours: (n) => `${n} ชม.`,
  bookingStatusLabel: (status) =>
    ({
      unmatched: 'รอจับคู่ผู้ดูแล',
      pending: 'รอผู้ดูแลยืนยัน',
      accepted: 'ยืนยันแล้ว',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังดูแล',
      awaiting_release: 'รอปิดงาน',
      needs_review: 'รอตรวจสอบ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิกแล้ว',
      rejected: 'ถูกปฏิเสธ',
    })[status] ?? status,
  apptEmptyTitle: 'ยังไม่มีนัดหมายในกลุ่ม',
  apptEmptyBody:
    'เมื่อคุณหรือสมาชิกจองผู้ดูแล รายการจะแสดงที่นี่ และทุกคนในกลุ่มจะติดตามได้พร้อมกัน',
  apptConfirmedCount: (n) => `${n} รายการที่ยืนยันแล้ว`,
  tabConfirmed: 'ยืนยันแล้ว',
  tabPending: 'รอยืนยันการจอง',
  tabHistory: 'ประวัติ',
  tabCount: (n) => `${n}`,
  apptEscrow: 'พักเงินไว้',
  apptCheckIn: 'เช็คอิน',
  apptCheckOut: 'เช็คเอาท์',
  apptInProgress: 'กำลังบริการ',
  apptStart: 'เริ่ม',
  apptLocationLabel: 'สถานที่',
  apptServiceFormatLabel: 'รูปแบบบริการ',
  apptViewAll: 'ดูการจองทั้งหมดของกลุ่ม',
  apptShowLess: 'ย่อรายการ',
  apptEmptyPendingTitle: 'ไม่มีรายการรอยืนยัน',
  apptEmptyPendingBody: 'การจองที่รอผู้ดูแลจับคู่หรือยืนยันจะแสดงที่นี่',
  apptEmptyHistoryTitle: 'ยังไม่มีประวัติการจอง',
  apptEmptyHistoryBody: 'งานที่เสร็จสิ้นหรือยกเลิกแล้วจะย้ายมาเก็บที่นี่',
  serviceTypeLabel: (t) =>
    ({
      general_care: 'ดูแลทั่วไป',
      elderly_care: 'ดูแลผู้สูงอายุ',
      bedridden_care: 'ดูแลผู้ป่วยติดเตียง',
      physiotherapy: 'กายภาพบำบัด',
      medication: 'ช่วยจัดการยา',
      companion: 'เป็นเพื่อน/พูดคุย',
      nursing: 'พยาบาลวิชาชีพ',
      basic_care: 'ดูแลเบื้องต้น',
      home_health: 'สุขภาพที่บ้าน',
      patient_transport: 'รับส่งผู้ป่วย',
    })[t] ?? t,
  serviceFormatLabel: (locs) => {
    const home = locs.includes('at_home');
    const out = locs.includes('accompany_outside');
    if (home && out) return 'ดูแลที่บ้าน + พาไปนอกบ้าน';
    if (out) return 'พาไปทำธุระนอกบ้าน';
    return 'ดูแลที่บ้านผู้ป่วย';
  },
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
  membersSubtitle: (groupName, count) => `${groupName} · ${count} สมาชิก`,
  backToGroup: 'กลับไปหน้ากลุ่ม',
  membersListLabel: (n) => `สมาชิก (${n})`,
  you: '(คุณ)',
  ownerCannotRemoveSelf: 'เจ้าของกลุ่มลบตัวเองไม่ได้',
  memberRowMenu: 'ตัวเลือกสมาชิก',
  makeOwner: 'ตั้งเป็นเจ้าของกลุ่ม',
  removeFromGroup: 'ลบออกจากกลุ่ม',
  bookForMember: 'จองแทนสมาชิกรายนี้',
  viewMemberBookings: 'ดูการจองของสมาชิก',
  memberBookingsTitle: (name) => `การจองของ ${name}`,
  memberBookingsEmpty: 'สมาชิกคนนี้ยังไม่มีการจองในกลุ่ม',
  joinedOn: 'เข้าร่วม',
  recipientsTitle: 'ผู้รับการดูแลในกลุ่ม',
  recipientsSubtitle: 'โปรไฟล์ที่สมาชิกแชร์ไว้เพื่อจองแทนกัน',
  recipientsEmpty: 'ยังไม่มีใครแชร์โปรไฟล์ผู้รับการดูแลในกลุ่มนี้',
  addedByYou: 'คุณเพิ่ม',
  addedByMember: 'สมาชิกเพิ่ม',
  addRecipient: 'เพิ่มผู้รับบริการ',
  editRecipient: 'แก้ไขข้อมูล',
  removeRecipient: 'นำออกจากกลุ่ม',
  recipientMenu: 'ตัวเลือกผู้รับบริการ',
  recipientNameLabel: 'ชื่อ-นามสกุล',
  recipientNamePlaceholder: 'เช่น สมศรี วงศ์ดี',
  nicknameLabel: 'ชื่อเล่น (ถ้ามี)',
  nicknamePlaceholder: 'เช่น ยายศรี',
  addRecipientTitle: 'เพิ่มผู้รับบริการเข้ากลุ่ม',
  addRecipientSubtitle: 'แชร์โปรไฟล์ให้สมาชิกในกลุ่มจองผู้ดูแลแทนกันได้',
  editRecipientTitle: 'แก้ไขข้อมูลผู้รับบริการ',
  removeRecipientTitle: (name) => `นำ ${name} ออกจากกลุ่ม?`,
  removeRecipientBody:
    'สมาชิกในกลุ่มจะจองแทนโปรไฟล์นี้ไม่ได้อีก โปรไฟล์จะยังอยู่เป็นของคุณ และนัดหมายที่จองไปแล้วยังอยู่ในประวัติ',
  add: 'เพิ่ม',
  busyAdding: 'กำลังเพิ่ม…',
  toastRecipientAdded: 'เพิ่มผู้รับบริการเข้ากลุ่มแล้ว',
  toastRecipientUpdated: 'แก้ไขข้อมูลผู้รับบริการแล้ว',
  toastRecipientRemoved: (name) => `นำ ${name} ออกจากกลุ่มแล้ว`,
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
  today: 'วันนี้',
  yesterday: 'เมื่อวาน',
  activityTitle: 'ความเคลื่อนไหวของกลุ่ม',
  activitySubtitle: 'สิ่งที่เกิดขึ้นในกลุ่ม เรียงจากใหม่ไปเก่า',
  activityRefresh: 'รีเฟรช',
  activityEmptyTitle: 'ยังไม่มีความเคลื่อนไหว',
  activityEmptyBody:
    'เมื่อมีคนเข้าร่วมกลุ่ม แชร์โปรไฟล์ผู้รับการดูแล หรือจองผู้ดูแลแทนกัน รายการจะแสดงที่นี่',
  activityLoadMore: 'ดูรายการเก่ากว่านี้',
  activityLoadingMore: 'กำลังโหลด…',
  activityEnd: 'แสดงครบทุกรายการแล้ว',
  activityErrorTitle: 'โหลดความเคลื่อนไหวไม่สำเร็จ',
  activityErrorBody: 'กรุณาลองใหม่อีกครั้ง',
  activityRetry: 'ลองใหม่',
  activityUnavailableTitle: 'ยังดูความเคลื่อนไหวไม่ได้ในตอนนี้',
  activityUnavailableBody:
    'ระบบบันทึกความเคลื่อนไหวของกลุ่มยังไม่เปิดใช้งานบนเซิร์ฟเวอร์ ส่วนอื่นของหน้านี้ใช้งานได้ตามปกติ',
  activityMemberOnlyTitle: 'เฉพาะสมาชิกในกลุ่ม',
  activityMemberOnlyBody: 'เฉพาะสมาชิกของกลุ่มนี้เท่านั้นที่ดูความเคลื่อนไหวได้',
  activityActorUnknown: 'สมาชิกที่ออกจากกลุ่มแล้ว',
  activityActorYou: 'คุณ',
};
