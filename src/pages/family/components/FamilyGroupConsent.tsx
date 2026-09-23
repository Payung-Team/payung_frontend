import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  CONSENT_POLICY,
  MY_CONSENTS,
  type ConsentAnswer,
  type ConsentPolicyData,
  type MyConsentsData,
} from '../../../graphql/consent';

const TYPE = 'disclose_to_family_group';

/**
 * ความยินยอม "เปิดเผยให้สมาชิกกลุ่มครอบครัว" ตอนสร้าง/เข้ากลุ่ม
 *
 * ★ ถามเฉพาะคนที่ยังไม่ได้ยินยอมฉบับปัจจุบัน — คนที่ยินยอมไว้แล้วไม่ต้องเห็นกล่อง
 *   และที่สำคัญกว่า: กล่องเริ่มจาก "ไม่ติ๊ก" เสมอ (กฎหมาย) ถ้าโชว์ให้คนที่ยินยอมไว้แล้ว
 *   แล้วเขากดผ่านไปเฉย ๆ จะกลายเป็นบันทึก "ไม่ยินยอม" ทับของเดิมโดยไม่ตั้งใจ
 * ★ โหลดสถานะไม่สำเร็จ = ไม่ถาม (ด้วยเหตุผลเดียวกัน) — ยังให้ความยินยอมได้ที่หน้า "ความเป็นส่วนตัว"
 * ★ ไม่บังคับ: ไม่ติ๊กก็สร้าง/เข้ากลุ่มได้ แต่คำตอบ "ไม่ยินยอม" ก็ถูกบันทึกเป็นหลักฐานด้วย
 */
export function useFamilyGroupConsent() {
  const policyQuery = useQuery<ConsentPolicyData>(CONSENT_POLICY, {
    variables: { source: 'family_group' },
    fetchPolicy: 'cache-and-network',
  });
  const statusQuery = useQuery<MyConsentsData>(MY_CONSENTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [granted, setGranted] = useState<Set<string>>(new Set());

  const policy = policyQuery.data?.consentPolicy;
  const statuses = statusQuery.data?.myConsents;
  const current = statuses?.find((st) => st.type === TYPE);
  const alreadyGranted = !!current?.granted && current.isCurrentVersion;
  // ผู้ดูแล (role 2) ไม่มีข้อนี้ใน myConsents → current = undefined → ถาม
  const shouldAsk = !!policy && !!statuses && !alreadyGranted;

  const toggle = (type: string, next: boolean) =>
    setGranted((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(type);
      else updated.delete(type);
      return updated;
    });

  /** undefined = ไม่ต้องส่ง (ไม่ได้ถาม) · BE บันทึกเฉพาะเมื่อส่งมา */
  const answers = (): ConsentAnswer[] | undefined =>
    shouldAsk && policy
      ? policy.items.map((item) => ({
          type: item.type,
          granted: granted.has(item.type),
          // ★ ต้องเป็นเวอร์ชันที่ผู้ใช้เห็นบนจอ ห้าม hardcode — BE ปฏิเสธถ้าไม่ตรง
          policyVersion: policy.version,
        }))
      : undefined;

  return { policy, shouldAsk, granted, toggle, answers };
}

export function FamilyGroupConsentSection({
  consent,
  disabled,
}: {
  consent: ReturnType<typeof useFamilyGroupConsent>;
  disabled?: boolean;
}) {
  const { policy, shouldAsk, granted, toggle } = consent;
  const [noticeOpen, setNoticeOpen] = useState(false);
  if (!shouldAsk || !policy) return null;

  /**
   *   แบบกะทัดรัดแทน ConsentBox — จุดนี้มีข้อเดียวและข้อความสั้น 2 บรรทัด
   *   กล่องเลื่อนอ่านของ ConsentBox ออกแบบไว้กับข้อความยาว ที่นี่กินที่เกินเหตุ
   *   สิ่งที่ต้องคงไว้ตามกฎหมาย (PDPA ม.26) ยังครบ:
   *     - ไม่ติ๊กมาให้ (เริ่มจาก granted ว่างเสมอ)
   *     - เห็นข้อความเต็มของสิ่งที่ยินยอมก่อนติ๊ก (label + คำอธิบายแสดงครบ ไม่ถูกตัด)
   *     - แยกจากข้อตกลงอื่น และเปิดอ่านประกาศฉบับเต็ม + สิทธิ์ของเจ้าของข้อมูลได้
   */
  return (
    <section className="mt-5 text-left">
      {policy.items.map((item) => (
        <label
          key={item.type}
          className={`flex items-start gap-3 rounded-xl border border-[#E0E2E5] bg-white p-3.5 ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
          }`}
        >
          <input
            type="checkbox"
            checked={granted.has(item.type)}
            disabled={disabled}
            onChange={(e) => toggle(item.type, e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#009265]"
          />
          <span className="min-w-0">
            {/* ป้ายอยู่ข้างหัวข้อเสมอ — ถ้าต่อท้ายข้อความ หัวข้อยาวแล้วป้ายตกไปบรรทัดใหม่ */}
            <span className="flex items-start gap-2">
              <span className="min-w-0 text-[13px] font-semibold leading-6 text-[#1A1A1A]">
                {item.labelTh}
              </span>
              {item.sensitive && (
                <span className="mt-0.5 inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full bg-[#FFF1F2] px-2 text-[11px] font-semibold text-[#BE123C]">
                  ข้อมูลอ่อนไหว
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[12px] leading-5 text-[#8A8C8E]">
              {item.descriptionTh}
            </span>
          </span>
        </label>
      ))}

      <p className="mt-2 text-[12px] leading-5 text-[#8A8C8E]">
        {policy.rightsNoteTh}{' '}
        <button
          type="button"
          onClick={() => setNoticeOpen((open) => !open)}
          className="font-semibold text-[#009265] hover:underline"
        >
          {noticeOpen ? 'ปิดประกาศความเป็นส่วนตัว' : 'อ่านประกาศความเป็นส่วนตัว'}
        </button>
      </p>
      {noticeOpen && (
        <div className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#E0E2E5] bg-[#FAFAFA] p-3 text-[12px] leading-6 text-[#575859]">
          {policy.privacyNoticeTh}
        </div>
      )}
    </section>
  );
}
