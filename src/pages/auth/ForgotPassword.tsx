import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthInput from '../../components/ui/AuthInput';
import { Icon } from '../../components/ui/Icon';
import { REQUEST_PASSWORD_RESET } from '../../graphql/queries';

const MailIcon = <Icon name="mail" size="small" color="currentColor" />;

// Inline SVG icons (lucide style) — lucide-react not installed
const ArrowLeftIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
  </svg>
);

const CheckCircleIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
  </svg>
);

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const [requestReset, { loading }] = useMutation(REQUEST_PASSWORD_RESET, {
    onCompleted: () => {
      setSuccess(true);
    },
    onError: () => {
      // Always show success to avoid email enumeration
      setSuccess(true);
    },
  });

  const validateEmail = useCallback((): string => {
    if (!email.trim()) return 'กรุณากรอกอีเมล';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'กรุณากรอกอีเมลให้ถูกต้อง';
    return '';
  }, [email]);

  useEffect(() => {
    if (submitted) {
      setEmailError(validateEmail());
    }
  }, [validateEmail, submitted]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validateEmail();
    setEmailError(err);
    setSubmitted(true);
    if (err) return;
    await requestReset({ variables: { email } });
  };

  return (
    <AuthLayout
      tagline="ดูแลผู้สูงอายุ ใกล้มือคุณ"
      subtitle="ระบบดูแลและจัดการการนัดหมายผู้ดูแลผู้สูงอายุ"
    >
      <div className="w-full max-w-[420px]">

        {/* Heading */}
        {!success && (
          <>
            <h1
              className="text-[32px] font-bold leading-10 text-[#1A1A1A]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ลืมรหัสผ่าน?
            </h1>
            <p
              className="mt-2 text-[15px] leading-6 text-[#8A8C8E]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              กรอกอีเมลเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
            </p>
          </>
        )}

        {/* ===== FORM STATE ===== */}
        {!success && (
          <form onSubmit={handleSubmit} noValidate className="mt-8">
            <AuthInput
              id="forgot-email"
              label="อีเมล"
              icon={MailIcon}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              error={submitted ? emailError : undefined}
            />

            <button
              type="submit"
              disabled={loading}
              className={`mt-6 h-[52px] w-full rounded-lg bg-[#0D9488] text-[16px] font-bold text-white shadow-[0_4px_12px_rgba(13,148,136,0.2)] transition-all duration-200 hover:bg-[#0F766E] hover:shadow-[0_6px_20px_rgba(13,148,136,0.3)] active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {loading && (
                <span className="inline-block w-[18px] h-[18px] border-[2.5px] border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-[#0D9488] hover:text-[#0F766E] hover:underline transition-colors"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {ArrowLeftIcon}
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </form>
        )}

        {/* ===== SUCCESS STATE ===== */}
        {success && (
          <div className="mt-2 text-center py-3">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-[#0D9488]">
              {CheckCircleIcon}
            </div>
            <h2
              className="text-[20px] font-semibold text-[#1A1A1A]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ส่งลิงก์เรียบร้อยแล้ว
            </h2>
            <p
              className="mt-2.5 text-sm leading-6 text-[#8A8C8E]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              กรุณาตรวจสอบอีเมลของคุณ<br />
              (อาจอยู่ในโฟลเดอร์สแปม)
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-6 inline-flex items-center justify-center rounded-lg border-[1.5px] border-[#0D9488] px-7 py-[11px] text-[15px] font-semibold text-[#0D9488] transition-colors hover:bg-teal-50"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        )}

      </div>
    </AuthLayout>
  );
}
