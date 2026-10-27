/**
 * SignupConsentGate — ขอความยินยอมหน้าสมัครให้บัญชี Google ก่อนเข้าหน้าในแอป
 *
 * สมัครด้วยอีเมล/เบอร์: Register เปิด ConsentModal ก่อน แล้วส่ง consents ไปพร้อมการสร้างบัญชี
 * สมัครด้วย Google: บัญชีถูก trigger ของ auth.users สร้างก่อนกลับมาถึงแอป — ขอก่อนสร้างไม่ได้
 *   → ด่านนี้เปิดกล่องเดียวกันหลังเข้าระบบ แล้วส่งคำตอบไป acceptSignupConsents
 *
 * ★ อยู่ใน ProtectedRoute (ไม่ใช่แค่ AuthCallback) — ปิดแท็บระหว่างกล่องเปิดแล้วเข้า URL อื่น
 *   หรือกด "เข้าสู่ระบบด้วย Google" ทั้งที่ยังไม่เคยสมัคร (trigger สร้างบัญชีให้) ก็ต้องเจอด่านนี้
 * ★ ตรวจเฉพาะบัญชีที่ผูก Google — ผู้ใช้อีเมลที่สมัครก่อนมีระบบ consent ยังไม่มีแถวความยินยอม
 *   การขอย้อนหลังของกลุ่มนั้นเป็นงานของ PYG-504 ไม่ใช่ของด่านนี้
 * ★ ต้องให้ความยินยอม = ข้อ required ของ consentPolicy(register) ที่ myConsents มีแต่ยังไม่ granted
 *   role ที่ไม่มีข้อเหล่านี้ใน myConsents (แอดมิน) จึงผ่านไปเอง ไม่ต้องเช็ค role ซ้ำ
 * ★ query ล้ม → ปล่อยผ่าน (เหตุผลเดียวกับ useNeedsOnboarding: ถ้ากันไว้ผู้ใช้จะติดอยู่ที่ด่านนี้)
 */
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import type { Session } from '@supabase/supabase-js';
import ConsentModal from './ConsentModal';
import PageSkeleton from '../ui/PageSkeleton';
import { useAuth } from '../../context/AuthContext';
import { consentRegisterError } from '../../hooks/useRegister';
import { extractGraphQLErrorCode } from '../../lib/apolloErrors';
import { logGraphQLError } from '../../lib/logGraphQLError';
import {
  ACCEPT_SIGNUP_CONSENTS,
  CONSENT_POLICY,
  MY_CONSENTS,
  type AcceptSignupConsentsData,
  type AcceptSignupConsentsVars,
  type ConsentPolicyData,
  type MyConsentsData,
} from '../../graphql/consent';

function hasGoogleIdentity(session: Session): boolean {
  const { provider, providers } = session.user.app_metadata ?? {};
  return provider === 'google' || (Array.isArray(providers) && providers.includes('google'));
}

export default function SignupConsentGate({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isGoogle = hasGoogleIdentity(session);

  const { data: policyData, loading: policyLoading } = useQuery<ConsentPolicyData>(CONSENT_POLICY, {
    variables: { source: 'register' },
    skip: !isGoogle,
  });
  const { data: myData, loading: myLoading } = useQuery<MyConsentsData>(MY_CONSENTS, {
    skip: !isGoogle,
  });

  // ★ เริ่มจาก "ไม่ติ๊ก" เสมอ — กติกาเดียวกับ Register
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [acceptSignupConsents] = useMutation<AcceptSignupConsentsData, AcceptSignupConsentsVars>(
    ACCEPT_SIGNUP_CONSENTS,
    {
      // คืนสถานะทุกข้อของฉัน → เขียนทับ myConsents ใน cache ให้ด่านนี้เห็นทันทีว่ายินยอมแล้ว
      update: (cache, { data }) => {
        if (!data) return;
        cache.writeQuery<MyConsentsData>({
          query: MY_CONSENTS,
          data: { myConsents: data.acceptSignupConsents },
        });
      },
    },
  );

  if (!isGoogle) return <>{children}</>;
  if (policyLoading || myLoading) return <PageSkeleton />;

  const policy = policyData?.consentPolicy;
  const statuses = myData?.myConsents;
  if (!policy || !statuses) return <>{children}</>;

  const needsConsent = policy.items.some((item) => {
    if (!item.required) return false;
    const status = statuses.find((s) => s.type === item.type);
    return !!status && !status.granted;
  });
  if (!needsConsent) return <>{children}</>;

  const toggle = (type: string, next: boolean) => {
    setGranted((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(type);
      else updated.delete(type);
      return updated;
    });
  };

  const accept = async () => {
    setSubmitting(true);
    setError('');
    try {
      await acceptSignupConsents({
        variables: {
          // ★ ส่งทุกข้อที่แสดง รวมข้อที่ไม่ติ๊ก — การปฏิเสธก็ต้องพิสูจน์ได้ว่าเราถามแล้ว
          consents: policy.items.map((item) => ({
            type: item.type,
            granted: granted.has(item.type),
            policyVersion: policy.version,
          })),
        },
      });
      // สำเร็จ → cache อัปเดตแล้ว needsConsent เป็น false ในรอบ render ถัดไป
    } catch (err) {
      logGraphQLError('AcceptSignupConsents', err);
      setSubmitting(false);
      // ★ แสดง error ในกล่อง ไม่ปิด — ปิดไปแล้วผู้ใช้ต้องติ๊กใหม่ทั้งหมด
      setError(
        consentRegisterError(extractGraphQLErrorCode(err)) ??
          'บันทึกความยินยอมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      );
    }
  };

  // ไม่ยินยอม = ใช้บริการไม่ได้ → ออกจากระบบแล้วกลับหน้าสมัคร (แบบเดียวกับปุ่มกลับใน Onboarding)
  const cancel = async () => {
    if (submitting) return;
    await logout();
    navigate('/register', { replace: true });
  };

  return (
    <>
      <PageSkeleton />
      <ConsentModal
        open
        items={policy.items}
        granted={granted}
        onToggle={toggle}
        screen={policy.screen}
        rightsNote={policy.rightsNoteTh}
        termsOfService={{ th: policy.termsOfServiceTh, en: policy.termsOfServiceEn }}
        privacyNotice={{ th: policy.privacyNoticeTh, en: policy.privacyNoticeEn }}
        policyVersion={policy.version}
        effectiveDate={policy.effectiveDate}
        submitting={submitting}
        error={error}
        dismissible={false}
        // บัญชีมีอยู่แล้ว (trigger สร้างให้) และอาจเป็นคนที่แค่เข้าสู่ระบบ — "สมัครสมาชิก" ไม่ตรง
        acceptLabel="ยินยอมและดำเนินการต่อ"
        submittingLabel="กำลังบันทึก..."
        onCancel={cancel}
        onAccept={accept}
      />
    </>
  );
}
