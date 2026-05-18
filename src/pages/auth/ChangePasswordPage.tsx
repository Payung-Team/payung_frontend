import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthInput from '../../components/ui/AuthInput';
import Alert from '../../components/ui/AlertInvalid';
import { COMPLETE_PASSWORD_CHANGE } from '../../graphql/queries';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { getPostLoginRedirect } from '../../utils/getRedirectPath';

const PasswordIcon = <Icon name="lock" size="small" color="currentColor" />;

function validatePassword(password: string): string | undefined {
  if (password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (!/[A-Z]/.test(password)) return 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว';
  if (!/[0-9]/.test(password)) return 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว';
  if (!/[^A-Za-z0-9]/.test(password)) return 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว';
  return undefined;
}

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { userRole, setMustChangePassword } = useAuth();

  const [completePasswordChange, { loading }] = useMutation(COMPLETE_PASSWORD_CHANGE);

  const passwordError = submitted ? validatePassword(newPassword) : undefined;
  const confirmError = submitted && newPassword !== confirmPassword ? 'รหัสผ่านไม่ตรงกัน' : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitted(true);

    const pwErr = validatePassword(newPassword);
    if (pwErr || newPassword !== confirmPassword) {
      setErrorCount(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const { error: supabaseError } = await supabase.auth.updateUser({ password: newPassword });
    if (supabaseError) {
      setFormError(supabaseError.message);
      setErrorCount(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      await completePasswordChange();
    } catch (err) {
      console.error('completePasswordChange mutation error:', err);
    }

    setMustChangePassword(false);
    navigate(getPostLoginRedirect({ role: userRole ?? 1, mustChangePassword: false }), { replace: true });
  };

  return (
    <AuthLayout
      tagline="การดูแลที่ดี เริ่มต้นจากความใส่ใจ"
      subtitle="กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัยของบัญชีคุณ"
    >
      <form onSubmit={handleSubmit} className="w-full max-w-[420px]" noValidate>
        <h1
          className="text-[32px] font-bold leading-10 text-[#1A1A1A]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          กรุณาเปลี่ยนรหัสผ่าน
        </h1>
        <p
          className="mt-2 text-lg leading-[27px] text-[#8A8C8E]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          คุณต้องเปลี่ยนรหัสผ่านก่อนเข้าใช้งานระบบ
        </p>

        <Alert
          key={errorCount}
          message={formError || (submitted && (passwordError || confirmError) ? 'กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน' : '')}
          id="change-password-error-banner"
        />

        <AuthInput
          id="new-password"
          label="รหัสผ่านใหม่"
          isPassword
          icon={PasswordIcon}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="กรอกรหัสผ่านใหม่"
          error={passwordError}
          wrapperClassName="mt-6"
        />

        <AuthInput
          id="confirm-password"
          label="ยืนยันรหัสผ่านใหม่"
          isPassword
          icon={PasswordIcon}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          error={confirmError}
          wrapperClassName="mt-4"
        />

        <p
          className="mt-3 text-xs text-[#8A8C8E]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ
        </p>

        <button
          type="submit"
          disabled={loading}
          className={`mt-6 h-[52px] w-full rounded-lg bg-[#52B69A] text-xl font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition-all duration-200 hover:bg-[#45a085] hover:shadow-[0_6px_20px_rgba(82,182,154,0.35)] active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {loading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
        </button>
      </form>
    </AuthLayout>
  );
}
