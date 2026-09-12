import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApolloClient } from '@apollo/client/react';
import { supabase } from '../../lib/supabase';
import { GET_USER, CONFIRM_OAUTH_ROLE } from '../../graphql/queries';
import { useAuth } from '../../context/AuthContext';
import { getPostLoginRedirect } from '../../utils/getRedirectPath';
import { takePendingJoinPath } from '../family/joinRedirect';
import { logGraphQLError } from '../../lib/logGraphQLError';

interface MeResult {
  me: {
    id: string;
    email: string;
    phone: string | null;
    role: number;
  };
}

const ROLE_PATIENT = 1;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function AuthCallback() {
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const { setUserRole, setMustChangePassword } = useAuth();

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // ไม่ log session object — มี access token อยู่ในนั้น
      console.log('[AuthCallback] session:', session ? 'present' : 'none');

      if (!session) {
        console.log('[AuthCallback] no session → /login');
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

      // ไม่ log userData ทั้งก้อน — มี phone/email อยู่ในนั้น
      console.log('[AuthCallback] user role:', userData?.role ?? 'unknown');

      if (!userData) {
        console.log('[AuthCallback] could not fetch user after retries → /login');
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

      console.log('[AuthCallback] navigating to:', targetPath);
      navigate(targetPath, { replace: true });
    };

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6F7]">
      <div className="flex flex-col items-center gap-4">
        <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#52B69A] border-t-transparent" />
        <p
          className="text-sm text-[#8A8C8E]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          กำลังเข้าสู่ระบบ...
        </p>
      </div>
    </div>
  );
}
