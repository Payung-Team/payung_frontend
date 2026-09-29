import { useState } from 'react';

export type NoticeLang = 'th' | 'en';

export interface PrivacyNoticeText {
  th: string;
  en: string;
}

/**
 * ภาษาที่แสดงของประกาศความเป็นส่วนตัว
 *
 * ★ BE คืน '' ให้ภาษาที่หาไฟล์ไม่เจอ → ภาษาที่เลือกไม่มีเนื้อหา ใช้ภาษาที่มีแทน (ไม่ให้เจอกล่องว่าง)
 *
 * @returns available = ภาษาที่มีเนื้อหา · shown = ภาษาที่แสดงจริง (null = ไม่มีสักภาษา)
 *          lang = ภาษาที่ผู้ใช้เลือก (ใช้เลือกภาษาของข้อความ fallback)
 */
export function useNoticeLanguage(notice: PrivacyNoticeText, initialLang: NoticeLang = 'th') {
  const [lang, setLang] = useState<NoticeLang>(initialLang);
  const available = (['th', 'en'] as const).filter((l) => notice[l].trim() !== '');
  const shown: NoticeLang | null = available.includes(lang) ? lang : (available[0] ?? null);
  return { lang, setLang, available, shown };
}
