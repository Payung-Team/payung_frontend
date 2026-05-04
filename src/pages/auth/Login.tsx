import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthInput from '../../components/ui/AuthInput';
import Alert from '../../components/ui/AlertInvalid';
import { LOGIN_USER } from '../../graphql/queries';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';

// Icons
const EmailIcon = <Icon name="email" size="small" color="currentColor" />;

const PasswordIcon = <Icon name="lock" size="small" color="currentColor" />;

interface FormErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const navigate = useNavigate();
  const { setUserRole } = useAuth();

  const [loginMutation, { loading: isSubmitting }] = useMutation(LOGIN_USER, {
    onCompleted: async (data) => {
      // Set Supabase session with tokens from backend
      if (data?.login?.accessToken && data?.login?.refreshToken) {
        await supabase.auth.setSession({
          access_token: data.login.accessToken,
          refresh_token: data.login.refreshToken,
        });
      }
      
      if (data?.login?.user?.role) {
        setUserRole(data.login.user.role);
      }
      
      // Redirect to home
      navigate('/');
    },
    onError: (error) => {
      console.error('Login mutation error details:', error);
      console.error('Error message:', error.message);
      console.error('GraphQL errors:', error.graphQLErrors);
      console.error('Network error:', error.networkError);
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
        console.error('Login error:', err);
      }
    } else {
      setErrorCount(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hasValidationError = submitted && Object.keys(errors).length > 0;
  const hasErrors = hasValidationError || formError;

  return (
    <AuthLayout
      tagline="การดูแลที่ดี เริ่มต้นจากความใส่ใจ"
      subtitle="ยินดีต้อนรับกลับ เข้าสู่ระบบเพื่อจัดการนัดหมาย และบริการดูแลผู้สูงอายุของคุณ"
    >
      <form onSubmit={handleSubmit} className="w-full max-w-[420px]" id="login-form" noValidate>
        {/* Heading */}
        <h1 className="text-[32px] font-bold leading-10 text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เข้าสู่ระบบ
        </h1>
        <p className="mt-2 text-lg leading-[27px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งาน Payung
        </p>

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

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-[#E0E2E5]" />
          <span
            className="text-[#C6C8CB] text-sm"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            หรือ
          </span>
          <div className="flex-1 h-px bg-[#E0E2E5]" />
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          className="w-full bg-white border-[1.5px] border-[#E0E2E5] text-[#575859] font-medium text-sm py-3 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EB4335"
            />
          </svg>
          เข้าสู่ระบบด้วย Google
        </button>

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
      </form>
    </AuthLayout>
  );
}
