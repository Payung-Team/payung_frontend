import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApolloClient } from '@apollo/client/react';
import { supabase } from '../../lib/supabase';
import { GET_USER, CONFIRM_OAUTH_ROLE } from '../../graphql/queries';
import {
  ACCEPT_SIGNUP_CONSENTS,
  CONSENT_POLICY,
  MY_CONSENTS,
  type ConsentPolicyData,
  type MyConsentsData,
} from '../../graphql/consent';
import { useAuth } from '../../context/AuthContext';
import { getPostLoginRedirect } from '../../utils/getRedirectPath';
import { takePendingJoinPath } from '../family/joinRedirect';
import { logGraphQLError } from '../../lib/logGraphQLError';
import { consentErrorMessage } from '../../lib/consentErrors';
import ConsentModal from '../../components/consent/ConsentModal';

interface MeResult {
  me: {
    id: string;
    email: string | null;
    phone: string | null;
    role: number;
  };
}

type Policy = ConsentPolicyData['consentPolicy'];

const ROLE_PATIENT = 1;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function AuthCallback() {
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const { setUserRole, setMustChangePassword, logout } = useAuth();

  // ความยินยอมตอนสมัคร — บัญชี Google ถูกสร้างก่อนกลับมาถึงหน้านี้ จึงขอความยินยอมที่นี่
  // แทนหน้า Register (ดู needsSignupConsent) · มีค่า = กำลังแสดงกล่องความยินยอม
  const [consentPolicy, setConsentPolicy] = useState<Policy | null>(null);
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
  // ★ เริ่มจาก "ไม่ติ๊ก" เสมอ ห้ามติ๊กมาให้ล่วงหน้า — กติกาเดียวกับ Register.tsx
  const [grantedConsents, setGrantedConsents] = useState<Set<string>>(new Set());
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [consentError, setConsentError] = useState('');

  /**
   * ยังไม่ได้ยินยอมข้อบังคับของหน้าสมัคร (ข้อกำหนด / ประกาศความเป็นส่วนตัว) ใช่ไหม
   * คืน policy ที่ต้องแสดงถ้าต้องขอ ไม่ต้องขอคืน null
   *
   * ★ เช็คทุกครั้งที่กลับจาก Google ไม่ใช่เฉพาะตอนกด "สมัคร" — กด "เข้าสู่ระบบด้วย Google"
   *   ด้วยบัญชีใหม่ก็สร้างบัญชีได้เหมือนกัน และคนที่ปิดหน้าไปก่อนกดยินยอมต้องโดนถามอีกรอบ
   * ★ โหลดไม่สำเร็จ = ปล่อยผ่าน (ไม่ให้ผู้ใช้ติดค้างที่หน้าโหลด) — หน้าความเป็นส่วนตัวยังให้ความยินยอมได้
   */
  const needsSignupConsent = async (): Promise<Policy | null> => {
    try {
      const [policyRes, mineRes] = await Promise.all([
        apolloClient.query<ConsentPolicyData>({
          query: CONSENT_POLICY,
          variables: { source: 'register' },
          fetchPolicy: 'network-only',
        }),
        apolloClient.query<MyConsentsData>({ query: MY_CONSENTS, fetchPolicy: 'network-only' }),
      ]);
      const policy = policyRes.data?.consentPolicy;
      const mine = mineRes.data?.myConsents;
      if (!policy || !mine) return null;

      const granted = new Set(mine.filter((s) => s.granted).map((s) => s.type));
      return policy.items.some((item) => item.required && !granted.has(item.type)) ? policy : null;
    } catch (err) {
      logGraphQLError('SignupConsentCheck', err);
      return null;
    }
  };

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }

      // อ่าน flag ที่ Register.tsx เซ็ตไว้ก่อน redirect ไป Google แล้วลบทิ้งทันที
      // (ไม่งั้นถ้า login ครั้งถัดไปจะเข้าใจผิดว่าเป็นการสมัครใหม่)
      const isRegistering = localStorage.getItem('is_registering') === 'true';
      const pendingOAuthRole = localStorage.getItem('oauth_role');
      localStorage.removeItem('is_registering');
      localStorage.removeItem('oauth_role');

      // ต้องแก้ role ให้ตรงกับที่เลือกไว้ "ก่อน" ไปเรียก GET_USER รอบแรก ไม่งั้นจะได้ role
      // เก่า (default = patient) ติดไปแสดงผล/ตัดสินใจ redirect ผิด
      //
      // Retry เหมือน GET_USER ด้านล่าง — public.users row อาจยังไม่ถูกสร้างตอนที่เรามาถึงหน้านี้
      if (isRegistering && (pendingOAuthRole === '1' || pendingOAuthRole === '2')) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await apolloClient.mutate({
              mutation: CONFIRM_OAUTH_ROLE,
              variables: { role: Number(pendingOAuthRole) },
            });
            break;
          } catch (err) {
            logGraphQLError(`ConfirmOAuthRole (attempt ${attempt})`, err);
            // ไม่ throw ต่อหลัง attempt สุดท้าย — ผู้ใช้ยังเข้าระบบได้ (แค่ role อาจไม่ตรงที่เลือก)
            if (attempt < 3) await sleep(1000);
          }
        }
      }

      // Retry up to 3x with 1s delay — Supabase trigger may not have created
      // the public.users row by the time we land here
      let userData: MeResult['me'] | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data } = await apolloClient.query<MeResult>({
            query: GET_USER,
            fetchPolicy: 'network-only',
          });
          if (data?.me) {
            userData = data.me;
            break;
          }
        } catch (err) {
          logGraphQLError(`GetUser (attempt ${attempt})`, err);
          if (attempt < 3) await sleep(1000);
        }
      }

      if (!userData) {
        navigate('/login', { replace: true });
        return;
      }

      const role = userData.role ?? 1;
      setUserRole(role);
      setMustChangePassword(false); // Google OAuth users never have temp passwords

      // isRegistering (อ่านไว้ด้านบนแล้ว): ถ้ามี → user ใหม่ (เพิ่งสมัคร) → ส่งไป onboarding/kyc
      // ถ้าไม่มี → user เดิม (ล็อกอิน) → ส่งไป dashboard ปกติ
      let targetPath: string;
      if (isRegistering) {
        // New user: onboarding/kyc will consume any pending invite-link join afterwards.
        targetPath = role === ROLE_PATIENT ? '/onboarding' : '/kyc';
      } else {
        // Returning user: if they arrived via an invite link, go straight to /join.
        targetPath =
          takePendingJoinPath() ?? getPostLoginRedirect({ role, mustChangePassword: false });
      }

      // ยังไม่ได้ยินยอมข้อบังคับ → แสดงกล่องความยินยอมก่อน แล้วค่อยไป targetPath ตอนกดยินยอม
      const policy = await needsSignupConsent();
      if (policy) {
        setPendingTarget(targetPath);
        setConsentPolicy(policy);
        return;
      }

      navigate(targetPath, { replace: true });
    };

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleConsent = (type: string, next: boolean) => {
    setGrantedConsents((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(type);
      else updated.delete(type);
      return updated;
    });
  };

  const acceptConsents = async () => {
    if (!consentPolicy || !pendingTarget) return;
    setConsentSubmitting(true);
    setConsentError('');
    try {
      await apolloClient.mutate({
        mutation: ACCEPT_SIGNUP_CONSENTS,
        // ★ ส่งคำตอบของทุกข้อที่แสดง รวมข้อที่ไม่ติ๊ก (granted: false) — กติกาเดียวกับ Register.tsx
        variables: {
          consents: consentPolicy.items.map((item) => ({
            type: item.type,
            granted: grantedConsents.has(item.type),
            policyVersion: consentPolicy.version,
          })),
        },
        refetchQueries: [{ query: MY_CONSENTS }],
      });
      navigate(pendingTarget, { replace: true });
    } catch (err) {
      logGraphQLError('AcceptSignupConsents', err);
      setConsentError(consentErrorMessage(err));
      // ★ ไม่ปิดกล่อง — ปิดไปแล้วผู้ใช้ต้องติ๊กใหม่ทั้งหมด
      setConsentSubmitting(false);
    }
  };

  /** ไม่ยินยอมข้อบังคับ = ใช้บริการไม่ได้ → ออกจากระบบแล้วกลับหน้าเข้าสู่ระบบ */
  const declineConsents = async () => {
    setConsentSubmitting(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6F7]">
      {!consentPolicy && (
        <div className="flex flex-col items-center gap-4">
          <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#52B69A] border-t-transparent" />
          <p
            className="text-sm text-[#8A8C8E]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            กำลังเข้าสู่ระบบ...
          </p>
        </div>
      )}
      {consentPolicy && (
        <ConsentModal
          open
          items={consentPolicy.items}
          granted={grantedConsents}
          onToggle={toggleConsent}
          screen={consentPolicy.screen}
          rightsNote={consentPolicy.rightsNoteTh}
          termsOfService={{ th: consentPolicy.termsOfServiceTh, en: consentPolicy.termsOfServiceEn }}
          privacyNotice={{ th: consentPolicy.privacyNoticeTh, en: consentPolicy.privacyNoticeEn }}
          policyVersion={consentPolicy.version}
          effectiveDate={consentPolicy.effectiveDate}
          submitting={consentSubmitting}
          error={consentError}
          onCancel={() => void declineConsents()}
          onAccept={() => void acceptConsents()}
        />
      )}
    </div>
  );
}
