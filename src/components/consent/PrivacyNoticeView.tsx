/**
 * PrivacyNoticeView — ประกาศความเป็นส่วนตัวฉบับเต็ม สลับ TH/EN ได้
 *
 * เนื้อหามาจาก consentPolicy.privacyNoticeTh/En (ไฟล์ .md ฝั่ง BE) — ที่นี่แค่แสดงผล
 * แยกเป็นชิ้น (hook / ปุ่มสลับภาษา / เนื้อหา) ให้ PrivacyNoticeDialog วางปุ่มสลับไว้ที่หัว popup ได้
 *
 * ★ BE คืน '' เมื่อหาไฟล์ไม่เจอ (ดู ConsentPolicyService.readNotice)
 *   - ภาษาไหนว่าง → ซ่อนปุ่มสลับ แล้วแสดงภาษาที่มี
 *   - ว่างทั้งคู่ → แสดงช่องทางขอสำเนาทางอีเมล ไม่ใช่กล่องว่างเปล่า
 */
import { PRIVACY_EMAIL } from '../../lib/consentErrors';
import { SimpleMarkdown } from './SimpleMarkdown';
import { useNoticeLanguage, type NoticeLang, type PrivacyNoticeText } from './useNoticeLanguage';

export type { NoticeLang, PrivacyNoticeText };

const LANG_LABEL: Record<NoticeLang, string> = { th: 'ไทย', en: 'English' };

const UNAVAILABLE: Record<NoticeLang, string> = {
  th: 'ขณะนี้ไม่สามารถแสดงประกาศฉบับเต็มได้ ขอสำเนาประกาศความเป็นส่วนตัวได้ทางอีเมล',
  en: 'The full notice cannot be displayed right now. You can request a copy by email at',
};

export function NoticeLanguageToggle({
  available,
  shown,
  onChange,
}: {
  available: readonly NoticeLang[];
  shown: NoticeLang | null;
  onChange: (lang: NoticeLang) => void;
}) {
  if (available.length < 2) return null;

  return (
    <div
      role="group"
      aria-label="ภาษาของประกาศ / Notice language"
      className="inline-flex shrink-0 rounded-full border border-[#E0E2E5] bg-[#F6F7F8] p-1"
    >
      {available.map((l) => {
        const active = l === shown;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={active}
            onClick={() => onChange(l)}
            className={`min-w-[76px] cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-white text-[#064E3B] shadow-sm'
                : 'bg-transparent text-[#8A8C8E] hover:text-[#374151]'
            }`}
          >
            {LANG_LABEL[l]}
          </button>
        );
      })}
    </div>
  );
}

export function NoticeContent({
  notice,
  shown,
  lang,
  size = 'md',
}: {
  notice: PrivacyNoticeText;
  shown: NoticeLang | null;
  lang: NoticeLang;
  size?: 'md' | 'sm';
}) {
  if (!shown) {
    return (
      <p className={size === 'sm' ? 'text-[13px] leading-6 text-[#374151]' : 'text-[15px] leading-7 text-[#374151]'}>
        {UNAVAILABLE[lang]}{' '}
        <a
          href={`mailto:${PRIVACY_EMAIL}`}
          className="font-semibold text-[#009265] underline underline-offset-2"
        >
          {PRIVACY_EMAIL}
        </a>
      </p>
    );
  }

  // lang= ให้ screen reader อ่านออกเสียงถูกภาษา
  return (
    <div lang={shown}>
      <SimpleMarkdown source={notice[shown]} size={size} />
    </div>
  );
}

/** ปุ่มสลับภาษาอยู่เหนือเนื้อหา — ใช้ในที่ที่ไม่มีหัว popup ให้วาง (เช่น modal ในหน้าตั้งค่า) */
export function PrivacyNoticeView({
  notice,
  size = 'md',
  initialLang = 'th',
}: {
  notice: PrivacyNoticeText;
  size?: 'md' | 'sm';
  initialLang?: NoticeLang;
}) {
  const { lang, setLang, available, shown } = useNoticeLanguage(notice, initialLang);

  return (
    <div>
      {available.length > 1 && (
        <div className="mb-4">
          <NoticeLanguageToggle available={available} shown={shown} onChange={setLang} />
        </div>
      )}
      <NoticeContent notice={notice} shown={shown} lang={lang} size={size} />
    </div>
  );
}
