import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import ConsentBox from '../../../components/consent/ConsentBox';
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
  if (!shouldAsk || !policy) return null;

  return (
    <section className="mt-5 text-left">
      {policy.screen && (
        <>
          <h3 className="text-[15px] font-bold text-[#1A1A1A]">{policy.screen.titleTh}</h3>
          <p className="mt-1 text-[13px] leading-6 text-[#8A8C8E]">{policy.screen.introTh}</p>
        </>
      )}
      <div className="mt-3">
        <ConsentBox
          items={policy.items}
          granted={granted}
          onToggle={toggle}
          rightsNote={policy.rightsNoteTh}
          privacyNotice={policy.privacyNoticeTh}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
