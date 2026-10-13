import { useState, useEffect, useCallback } from 'react';
import { logGraphQLError } from '../../lib/logGraphQLError';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthInput from '../../components/ui/AuthInput';
import Alert from '../../components/ui/AlertInvalid';
import OrDivider from '../../components/ui/OrDivider';
import GoogleAuthButton from '../../components/ui/GoogleAuthButton';
import { LOGIN_USER } from '../../graphql/queries';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { getPostLoginRedirect } from '../../utils/getRedirectPath';
import MethodTabs, { type AuthMethod } from '../../components/auth/MethodTabs';
import PhoneEntryForm from '../../components/auth/PhoneEntryForm';
import PhoneOtpStep from '../../components/auth/PhoneOtpStep';
import { usePhoneAuth } from '../../hooks/usePhoneAuth';
import { PHONE_AUTH_ENABLED } from '../../lib/phone';
import type { PhoneAuthResult } from '../../lib/phoneAuthErrors';
import { usePhoneAuthStrings } from '../../lib/phoneAuthStrings';

// Icons
const EmailIcon = <Icon name="email" size="small" color="currentColor" />;

const PasswordIcon = <Icon name="lock" size="small" color="currentColor" />;

interface FormErrors {
  email?: string;
  password?: string;
}

/** ส่วนของ response ที่ใช้เริ่ม session — รูปเดียวกันทั้ง login เดิมและ loginWithPhone (S07-AC5) */
interface LoginPayload {
  accessToken?: string | null;
  refreshToken?: string | null;
  user?: { role?: number | null; isActive?: boolean | null; mustChangePassword?: boolean | null } | null;
}

const SUSPENDED_MESSAGE = 'บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserRole, setMustChangePassword } = useAuth();

  // Only honour internal same-origin paths (guards against open-redirect via ?redirect=).
  const safeRedirect = (() => {
    const r = searchParams.get('redirect');
    return r && r.startsWith('/') && !r.startsWith('//') ? r : null;
  })();

  // PYG-604: ทางเลือกเบอร์โทรศัพท์ — ค่าเริ่มต้นเป็นเบอร์โทร ทางอีเมลยังอยู่ครบ
  const s = usePhoneAuthStrings();
  const phoneAuth = usePhoneAuth();
  const [method, setMethod] = useState<AuthMethod>(PHONE_AUTH_ENABLED ? 'phone' : 'email');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otp, setOtp] = useState<{ resendAfterSeconds: number } | null>(null);

  /**
   * เริ่ม session แล้วพาไปหน้าแรกของ role — ใช้ร่วมกันทั้งล็อกอินด้วยอีเมลและเบอร์โทร
   * @returns false เมื่อบัญชีถูกระงับ (ยังไม่ set session)
   */
  const finishLogin = async (login: LoginPayload | null | undefined): Promise<boolean> => {
    const loginUser = login?.user;

    // ตรวจสอบบัญชีถูกระงับก่อน set session
    if (loginUser?.isActive === false) return false;

    if (login?.accessToken && login?.refreshToken) {
      await supabase.auth.setSession({
        access_token: login.accessToken,
        refresh_token: login.refreshToken,
      });
    }

    const role = loginUser?.role ?? 1;
    const mustChangePassword = loginUser?.mustChangePassword ?? false;

    setUserRole(role);
    setMustChangePassword(mustChangePassword);

    // Return to a pending invite link (or other internal target) when one was passed,
    // unless the account still has to change its password first.
    if (safeRedirect && !mustChangePassword) {
      navigate(safeRedirect, { replace: true });
    } else {
      navigate(getPostLoginRedirect({ role, mustChangePassword }));
    }
    return true;
  };

  const [loginMutation, { loading: isSubmitting }] = useMutation<{ login: LoginPayload }>(LOGIN_USER, {
    onCompleted: async (data) => {
      if (await finishLogin(data?.login)) return;
      setFormError(SUSPENDED_MESSAGE);
      setErrorCount(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error) => {
      // ห้าม log error object / graphQLErrors — message สะท้อน variables (อีเมล+รหัสผ่าน) กลับมาได้
      logGraphQLError('Login', error);
      setFormError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      setErrorCount(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!email.trim()) {
      errs.email = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'กรุณากรอกอีเมลที่ถูกต้อง';
    }
    if (!password) {
      errs.password = 'กรุณากรอกรหัสผ่าน';
    }
    return errs;
  }, [email, password]);

  useEffect(() => {
    if (submitted) {
      setErrors(validate());
    }
  }, [validate, submitted]);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const errs = validate();
    setErrors(errs);
    setSubmitted(true);

    if (Object.keys(errs).length === 0) {
      try {
        await loginMutation({
          variables: {
            email,
            password,
          },
        });
      } catch (err) {
        logGraphQLError('Login', err);
      }
    } else {
      setErrorCount(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setFormError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      setErrorCount(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /** ตรวจรหัสแล้วเข้าสู่ระบบด้วย session ทางเดียวกับอีเมล */
  const verifyPhoneLogin = async (code: string): Promise<PhoneAuthResult<unknown>> => {
    const result = await phoneAuth.login(phoneDigits, code);
    if (!result.ok) return result;
    if (await finishLogin(result.data)) return result;
    return { ok: false, failure: { message: SUSPENDED_MESSAGE } };
  };

  const hasValidationError = submitted && Object.keys(errors).length > 0;
  const hasErrors = hasValidationError || formError;

  const layoutProps = {
    tagline: 'การดูแลที่ดี เริ่มต้นจากความใส่ใจ',
    subtitle: 'ยินดีต้อนรับกลับ เข้าสู่ระบบเพื่อจัดการนัดหมาย และบริการดูแลผู้สูงอายุของคุณ',
    showBackToHome: true,
  };

  if (otp) {
    return (
      <AuthLayout {...layoutProps}>
        <PhoneOtpStep
          digits={phoneDigits}
          purpose="LOGIN"
          resendAfterSeconds={otp.resendAfterSeconds}
          onVerify={verifyPhoneLogin}
          onEditPhone={() => setOtp(null)}
          successMessage={s.otpLoginSuccess}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout {...layoutProps}>
      <div className="w-full max-w-[420px]">
        {/* Heading */}
        <h1 className="text-[32px] font-bold leading-10 text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เข้าสู่ระบบ
        </h1>
        <p className="mt-2 text-lg leading-[27px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {PHONE_AUTH_ENABLED ? s.loginLead : 'กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน Payung'}
        </p>

        {PHONE_AUTH_ENABLED && (
          <MethodTabs
            idPrefix="login"
            ariaLabel={s.loginMethodsLabel}
            active={method}
            onChange={setMethod}
            disabled={isSubmitting}
          />
        )}

        {method === 'phone' ? (
          <div role="tabpanel" id="login-panel-phone" aria-labelledby="login-tab-phone" className="mt-5">
            <PhoneEntryForm
              purpose="LOGIN"
              inputId="login-phone"
              hint={s.phoneHintLogin}
              submitLabel={s.requestCode}
              initialDigits={phoneDigits}
              onRequested={(digits, resendAfterSeconds) => {
                setPhoneDigits(digits);
                setOtp({ resendAfterSeconds });
              }}
              onAlternative={() => navigate('/register')}
              alternativeLabel={s.goRegister}
            />
          </div>
        ) : (
      <form
        onSubmit={handleSubmit}
        id="login-form"
        noValidate
        {...(PHONE_AUTH_ENABLED && { role: 'tabpanel', id: 'login-panel-email', 'aria-labelledby': 'login-tab-email' })}
      >
        {/* Global Error Banner */}
        <Alert 
          key={errorCount} 
          message={formError || (hasValidationError ? 'กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน' : '')} 
          id="login-error-banner" 
        />

        {/* Email Field */}
        <AuthInput
          id="login-email"
          label="อีเมล"
          icon={EmailIcon}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          error={submitted ? errors.email : undefined}
          wrapperClassName={hasErrors ? 'mt-4' : 'mt-6'}
        />

        {/* Password Field */}
        <AuthInput
          id="login-password"
          label="รหัสผ่าน"
          isPassword
          icon={PasswordIcon}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="กรอกรหัสผ่าน"
          error={submitted ? errors.password : undefined}
          wrapperClassName="mt-4"
        />

        {/* Forgot Password Link */}
        <div className="text-right mt-2 mb-6">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-[#52B69A] text-xs font-semibold hover:underline transition"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ลืมรหัสผ่าน?
          </button>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          id="login-submit"
          disabled={isSubmitting}
          className={`h-[52px] w-full rounded-lg bg-[#52B69A] text-xl font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition-all duration-200 hover:bg-[#45a085] hover:shadow-[0_6px_20px_rgba(82,182,154,0.35)] active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
        )}

        <OrDivider />

        <GoogleAuthButton label="เข้าสู่ระบบด้วย Google" onClick={handleGoogleSignIn} disabled={isSubmitting} />

        {/* Sign Up Link */}
        <p className="mt-5 text-center text-base font-bold leading-6 text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          ยังไม่มีบัญชี?{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate('/register');
            }}
            className="text-lg font-semibold text-[#52B69A] hover:underline transition bg-none border-none cursor-pointer p-0"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            สมัครสมาชิก
          </button>
        </p>

        {/* Terms */}
        <p className="mt-2 text-center text-xs leading-6 text-[#C6C8CB]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          การเข้าสู่ระบบถือว่ายอมรับ{' '}
          <span className="cursor-pointer underline hover:text-[#8A8C8E]">ข้อกำหนดการใช้งาน</span> และ{' '}
          <span className="cursor-pointer underline hover:text-[#8A8C8E]">นโยบายความเป็นส่วนตัว</span>
        </p>
      </div>
    </AuthLayout>
  );
}
