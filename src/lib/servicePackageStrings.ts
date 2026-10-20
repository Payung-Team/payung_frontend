/**
 * ชุดบริการที่แนะนำในหน้าจอง (S14 · PYG-629) — ข้อความไทย/อังกฤษทั้งหมด
 *
 * ข้อความทุกจุดของส่วนชุดที่แนะนำอยู่ที่นี่ที่เดียว (DoD: ไม่มีข้อความ hardcode นอกไฟล์ข้อความกลาง)
 * ชื่อชุดและชื่อบริการในชุดมาจาก API (nameTh / nameEn) ไม่อยู่ในไฟล์นี้
 *
 * แอปยังไม่มีตัวสลับภาษา useServicePackageStrings จึงคืนภาษาไทยเสมอ (แบบเดียวกับ assessmentStrings)
 */

export type PackageLang = 'th' | 'en';

interface ServicePackageStrings {
  lang: PackageLang;
  sectionTitle: (name: string) => string;
  sectionTitleNoName: string;
  groupReason: (group: string) => string;
  optionalHint: string;
  /** ชื่อกลุ่มตาม ElderCareGroup ของ S09 */
  careGroups: Record<string, string>;
  unknownGroup: string;
  loading: string;
  loadFailed: string;
  loadFailedBody: string;
  retry: string;
  noGroupTitle: (name: string) => string;
  noGroupBody: string;
  noPackagesTitle: string;
  noPackagesBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  memberUnavailableBody: string;
  servicesInPackage: string;
  pick: string;
  picked: string;
  pickedAdjusted: string;
  adjustedHint: string;
  unpick: string;
  missingSelected: (serviceName: string) => string;
  pickAria: (packageName: string) => string;
}

const TH: ServicePackageStrings = {
  lang: 'th',
  sectionTitle: (name) => `ชุดบริการที่แนะนำสำหรับ ${name}`,
  sectionTitleNoName: 'ชุดบริการที่แนะนำ',
  groupReason: (group) => `แนะนำตามผลประเมินล่าสุด: ${group}`,
  optionalHint: 'เป็นคำแนะนำเท่านั้น จะเลือกชุด หรือเลือกบริการเองด้านล่างก็ได้',
  careGroups: {
    SOCIAL: 'กลุ่มติดสังคม',
    HOMEBOUND: 'กลุ่มติดบ้าน',
    BEDRIDDEN: 'กลุ่มติดเตียง',
  },
  unknownGroup: 'กลุ่มตามผลประเมิน',
  loading: 'กำลังโหลดชุดบริการที่แนะนำ…',
  loadFailed: 'โหลดชุดบริการที่แนะนำไม่สำเร็จ',
  loadFailedBody: 'เลือกบริการเองด้านล่างเพื่อจองต่อได้เลย หรือลองโหลดอีกครั้ง',
  retry: 'ลองอีกครั้ง',
  noGroupTitle: (name) => `ยังไม่มีชุดแนะนำสำหรับ ${name}`,
  noGroupBody: 'ระบบแนะนำชุดจากผลแบบประเมิน ซึ่งยังไม่มีสำหรับคนนี้ เลือกบริการเองด้านล่างได้ตามปกติ',
  noPackagesTitle: 'ยังไม่มีชุดบริการที่แนะนำ',
  noPackagesBody: 'ยังไม่มีชุดที่ตรงกับผลประเมินของคนนี้ เลือกบริการเองด้านล่างได้ตามปกติ',
  unavailableTitle: 'ยังไม่มีชุดบริการที่แนะนำในตอนนี้',
  unavailableBody: 'เลือกบริการเองด้านล่างได้ตามปกติ',
  memberUnavailableBody: 'ยังแนะนำชุดบริการตอนจองแทนสมาชิกกลุ่มไม่ได้ เลือกบริการเองด้านล่างได้ตามปกติ',
  servicesInPackage: 'บริการในชุด',
  pick: 'เลือกชุดนี้',
  picked: 'เลือกชุดนี้แล้ว',
  pickedAdjusted: 'เลือกชุดนี้แล้ว · ปรับบริการเอง',
  adjustedHint: 'บริการที่เลือกด้านล่างไม่ตรงกับชุดนี้ทั้งหมด ระบบจองตามบริการที่เลือกจริง',
  unpick: 'ยกเลิกการเลือกชุด',
  missingSelected: (serviceName) => `ไม่มี “${serviceName}” ที่คุณเลือก`,
  pickAria: (packageName) => `เลือก ${packageName}`,
};

const EN: ServicePackageStrings = {
  lang: 'en',
  sectionTitle: (name) => `Recommended packages for ${name}`,
  sectionTitleNoName: 'Recommended packages',
  groupReason: (group) => `Based on the latest assessment: ${group}`,
  optionalHint: 'These are suggestions only. Pick a package, or choose services yourself below.',
  careGroups: {
    SOCIAL: 'Socially active',
    HOMEBOUND: 'Mostly at home',
    BEDRIDDEN: 'Mostly in bed',
  },
  unknownGroup: 'Assessment group',
  loading: 'Loading recommended packages…',
  loadFailed: 'Couldn’t load recommended packages',
  loadFailedBody: 'You can choose services yourself below and keep booking, or try again.',
  retry: 'Try again',
  noGroupTitle: (name) => `No recommended packages for ${name} yet`,
  noGroupBody: 'Packages are based on the care assessment, which this person doesn’t have yet. You can choose services yourself below.',
  noPackagesTitle: 'No recommended packages yet',
  noPackagesBody: 'There’s no package for this person’s assessment yet. You can choose services yourself below.',
  unavailableTitle: 'No recommended packages right now',
  unavailableBody: 'You can choose services yourself below.',
  memberUnavailableBody: 'Packages can’t be recommended when booking for a group member yet. You can choose services yourself below.',
  servicesInPackage: 'Services in this package',
  pick: 'Choose this package',
  picked: 'Package chosen',
  pickedAdjusted: 'Package chosen · services adjusted',
  adjustedHint: 'Your services below don’t fully match this package. The booking uses the services you chose.',
  unpick: 'Remove package',
  missingSelected: (serviceName) => `Doesn’t include “${serviceName}”, which you chose`,
  pickAria: (packageName) => `Choose ${packageName}`,
};

export const SERVICE_PACKAGE_STRINGS = { th: TH, en: EN };

export function useServicePackageStrings(): ServicePackageStrings {
  return TH;
}

/** ชื่อกลุ่มสำหรับแสดงผล — ค่าที่ไม่รู้จัก (S09 เพิ่มทีหลัง) ต้องไม่ทำให้หน้าจอพัง */
export function careGroupLabel(s: ServicePackageStrings, group: string): string {
  return s.careGroups[group] ?? s.unknownGroup;
}
