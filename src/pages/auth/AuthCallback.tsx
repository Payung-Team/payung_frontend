import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApolloClient } from '@apollo/client/react';
import { supabase } from '../../lib/supabase';
import { GET_USER } from '../../graphql/queries';
import { useAuth } from '../../context/AuthContext';
import { getPostLoginRedirect } from '../../utils/getRedirectPath';

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
      console.log('[AuthCallback] session:', session);

      if (!session) {
        console.log('[AuthCallback] no session → /login');
        navigate('/login', { replace: true });
        return;
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
          console.warn(`[AuthCallback] GET_USER attempt ${attempt} failed:`, err);
          if (attempt < 3) await sleep(1000);
        }
      }

      console.log('[AuthCallback] userData:', userData);

      if (!userData) {
        console.log('[AuthCallback] could not fetch user after retries → /login');
        navigate('/login', { replace: true });
        return;
      }

      const role = userData.role ?? 1;
      setUserRole(role);
      setMustChangePassword(false); // Google OAuth users never have temp passwords

      const targetPath =
        role === ROLE_PATIENT && !userData.phone
          ? '/onboarding'
          : getPostLoginRedirect({ role, mustChangePassword: false });

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
