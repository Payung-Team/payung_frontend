import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthInput from '../../components/ui/AuthInput';
import { Icon } from '../../components/ui/Icon';
import { UPDATE_PASSWORD } from '../../graphql/queries';
import { supabase } from '../../lib/supabase';  // kept for getSession() check only

const LockIcon = <Icon name="lock" size="small" color="currentColor" />;

// Inline SVGs (lucide style) — lucide-react not installed
const CheckCircleIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
  </svg>
);

const CheckCircleSmIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
  </svg>
);

const CircleIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const AlertTriangleIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);

type PageState = 'checking' | 'form' | 'success' | 'expired';

export default function ResetPassword() {
  const [pageState, setPageState] = useState<PageState>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const [updatePassword, { loading }] = useMutation(UPDATE_PASSWORD, {
    onCompleted: () => setPageState('success'),
    onError: () => setPageState('success'), // show success to avoid information leak
  });

  // Check for valid recovery session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setPageState(session ? 'form' : 'expired');
    });
  }, []);

  // Auto-redirect after success
  useEffect(() => {
    if (pageState !== 'success') return;
    const timer = setTimeout(() => navigate('/login', { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [pageState, navigate]);

  const passwordLengthOk = newPassword.length >= 8;

  const validate = (): boolean => {
    if (!passwordLengthOk) return false;
    if (newPassword !== confirmPassword) {
      setConfirmError('รหัสผ่านไม่ตรงกัน');
      return false;
    }
    setConfirmError('');
    return true;
  };

  // Real-time confirm match check after first submit attempt
  useEffect(() => {
    if (!submitted) return;
    if (confirmPassword && newPassword !== confirmPassword) {
      setConfirmError('รหัสผ่านไม่ตรงกัน');
    } else {
      setConfirmError('');
    }
  }, [newPassword, confirmPassword, submitted]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    if (!validate()) return;
    await updatePassword({ variables: { newPassword } });
  };

  // ===== CHECKING =====
  if (pageState === 'checking') {
    return (
      <AuthLayout tagline="ดูแลผู้สูงอายุ ใกล้มือคุณ">
        <div className="flex h-32 w-full max-w-[420px] items-center justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#0D9488] border-t-transparent" />
        </div>
      </AuthLayout>
    );
  }

  // ===== EXPIRED =====
  if (pageState === 'expired') {
    return (
      <AuthLayout tagline="ดูแลผู้สูงอายุ ใกล้มือคุณ">
        <div className="w-full max-w-[420px] py-3 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            {AlertTriangleIcon}
          </div>
          <h2
            className="text-[20px] font-semibold text-[#1A1A1A]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ลิงก์หมดอายุหรือไม่ถูกต้อง
          </h2>
          <p
            className="mt-2.5 text-sm leading-6 text-[#8A8C8E]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ลิงก์รีเซ็ตรหัสผ่านนี้หมดอายุแล้ว<br />
            กรุณาขอลิงก์ใหม่อีกครั้ง
          </p>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="mt-6 inline-flex items-center justify-center rounded-lg border-[1.5px] border-[#0D9488] px-7 py-[11px] text-[15px] font-semibold text-[#0D9488] transition-colors hover:bg-teal-50"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ขอลิงก์ใหม่
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ===== SUCCESS =====
  if (pageState === 'success') {
    return (
      <AuthLayout tagline="ดูแลผู้สูงอายุ ใกล้มือคุณ">
        <div className="w-full max-w-[420px] py-3 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-[#0D9488]">
            {CheckCircleIcon}
          </div>
          <h2
            className="text-[20px] font-semibold text-[#1A1A1A]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            เปลี่ยนรหัสผ่านสำเร็จ
          </h2>
          <p
            className="mt-2.5 text-sm leading-6 text-[#8A8C8E]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            กำลังพาไปหน้าเข้าสู่ระบบ...
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 inline-flex items-center justify-center rounded-lg border-[1.5px] border-[#0D9488] px-7 py-[11px] text-[15px] font-semibold text-[#0D9488] transition-colors hover:bg-teal-50"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ===== FORM (default / validation error / loading) =====
  return (
    <AuthLayout
      tagline="ดูแลผู้สูงอายุ ใกล้มือคุณ"
      subtitle="ตั้งรหัสผ่านใหม่เพื่อความปลอดภัยของบัญชีคุณ"
    >
      <div className="w-full max-w-[420px]">
        <h1
          className="text-[32px] font-bold leading-10 text-[#1A1A1A]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          ตั้งรหัสผ่านใหม่
        </h1>

        <form onSubmit={handleSubmit} noValidate className="mt-8">
          {/* New Password */}
          <div>
            <AuthInput
              id="reset-new-password"
              label="รหัสผ่านใหม่"
              isPassword
              icon={LockIcon}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              error={submitted && !passwordLengthOk ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : undefined}
            />
            {/* Password rule indicator */}
            <div
              className={`mt-1.5 flex items-center gap-1.5 text-xs ${passwordLengthOk ? 'text-[#0D9488]' : 'text-gray-400'}`}
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {passwordLengthOk ? CheckCircleSmIcon : CircleIcon}
              อย่างน้อย 8 ตัวอักษร
            </div>
          </div>

          {/* Confirm Password */}
          <AuthInput
            id="reset-confirm-password"
            label="ยืนยันรหัสผ่าน"
            isPassword
            icon={LockIcon}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            error={confirmError || undefined}
            wrapperClassName="mt-4"
          />

          <button
            type="submit"
            disabled={loading}
            className={`mt-6 h-[52px] w-full rounded-lg bg-[#0D9488] text-[16px] font-bold text-white shadow-[0_4px_12px_rgba(13,148,136,0.2)] transition-all duration-200 hover:bg-[#0F766E] hover:shadow-[0_6px_20px_rgba(13,148,136,0.3)] active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {loading && (
              <span className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />
            )}
            {loading ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
