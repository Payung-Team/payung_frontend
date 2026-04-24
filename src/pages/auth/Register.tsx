import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthInput from '../../components/ui/AuthInput';
import Alert from '../../components/ui/AlertInvalid';
import SuccessModal from '../../components/ui/SuccessModal';
import { useRegister } from '../../hooks/useRegister';
import { useAuth } from '../../context/AuthContext';
import { Icon } from '../../components/ui/Icon';

// Icons
const EmailIcon = <Icon name="email" size="small" color="currentColor" />;

const PasswordIcon = <Icon name="lock" size="small" color="currentColor" />;


interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

type PasswordStrength = 'very_weak' | 'weak' | 'medium' | 'strong' | null;

function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return null;
  if (pw.length < 8) return 'very_weak';
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 4 && pw.length >= 10) return 'strong';
  if (score >= 3) return 'medium';
  if (score >= 2) return 'weak';
  return 'very_weak';
}

const strengthLabel: Record<string, string> = {
  very_weak : 'อ่อนมาก',
  weak: 'อ่อน',
  medium: 'ปานกลาง',
  strong: 'แข็งแรง',
};

const strengthColor: Record<string, string> = {
  very_weak: 'text-[#DC3545]',
  weak: 'text-orange-500',
  medium: 'text-yellow-500',
  strong: 'text-[#52B69A]',
};

const strengthBarColor: Record<string, string> = {
  very_weak: 'bg-[#DC3545]',
  weak: 'bg-orange-500',
  medium: 'bg-yellow-500',
  strong: 'bg-[#52B69A]',
};

// --- Local Components ---

function PasswordStrengthMeter({ password, pwStrength }: { password: string, pwStrength: PasswordStrength }) {
  if (password.length === 0 || !pwStrength) return null;

  return (
    <>
      <div className="mt-1.5 flex justify-end">
        <span
          className={`text-[11px] font-medium leading-[13px] transition-colors duration-300 ${strengthColor[pwStrength]}`}
          style={{ fontFamily: "'Inter', sans-serif" }}
          id="password-strength"
        >
          {strengthLabel[pwStrength]}
        </span>
      </div>
      <div className="mt-2 flex gap-[4px] w-full justify-between pr-8">
        <div className={`h-[4px] flex-1 rounded-[2px] transition-colors duration-300 ${pwStrength !== null ? strengthBarColor[pwStrength] : 'bg-[#E0E2E5]'}`} />
        <div className={`h-[4px] flex-1 rounded-[2px] transition-colors duration-300 ${['weak', 'medium', 'strong'].includes(pwStrength) ? strengthBarColor[pwStrength] : 'bg-[#E0E2E5]'}`} />
        <div className={`h-[4px] flex-1 rounded-[2px] transition-colors duration-300 ${['medium', 'strong'].includes(pwStrength) ? strengthBarColor[pwStrength] : 'bg-[#E0E2E5]'}`} />
        <div className={`h-[4px] flex-1 rounded-[2px] transition-colors duration-300 ${pwStrength === 'strong' ? strengthBarColor[pwStrength] : 'bg-[#E0E2E5]'}`} />
      </div>
    </>
  );
}

type Role = 'patient' | 'caregiver';

interface RoleCardProps {
  role: Role;
  selectedRole: Role;
  onClick: (role: Role) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  id: string;
  iconBg: string;
  disabled?: boolean;
}

function RoleCard({ role, selectedRole, onClick, icon, title, description, id, iconBg, disabled }: RoleCardProps) {
  const isSelected = selectedRole === role;
  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      onClick={() => !disabled && onClick(role)}
      className={`relative flex w-1/2 flex-col items-center rounded-xl border-2 px-4 py-4 transition-all duration-200 ${
        disabled ? 'cursor-not-allowed opacity-50 bg-[#F5F6F7]' : 'cursor-pointer'
      } ${
        isSelected
          ? 'border-[#52B69A] bg-[#E6F5ED]'
          : (!disabled ? 'border-[#E0E2E5] bg-white hover:border-[#52B69A]/40' : 'border-[#E0E2E5]')
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#52B69A" />
          </svg>
        </div>
      )}
      <div className={`flex h-12 w-12 items-center justify-center rounded-[10px] ${isSelected ? 'border border-[#76C893] bg-[#E6F5ED]' : iconBg}`}>
        {icon}
      </div>
      <span className="mt-2 text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {title}
      </span>
      <span className="mt-0.5 text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {description}
      </span>
    </button>
  );
}

function PasswordConditions({ password }: { password: string }) {
  if (!password) return null;

  const conditions = [
    { label: 'ความยาวอย่างน้อย 8 ตัวอักษร', met: password.length >= 8 },
    { label: 'ประกอบด้วยตัวอักษรพิมพ์ใหญ่ (A-Z) และพิมพ์เล็ก (a-z)', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'ประกอบด้วยตัวเลขอย่างน้อย 1 ตัว (0-9)', met: /[0-9]/.test(password) },
    { label: 'ประกอบด้วยอักขระพิเศษ (เช่น !@#$%)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <ul className="mt-4 text-xs space-y-2 text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      {conditions.map((c, i) => (
        <li key={i} className={`flex items-center gap-2.5 transition-colors duration-200 ${c.met ? 'text-[#52B69A]' : ''}`}>
          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${c.met ? 'border-[#52B69A] bg-[#52B69A] text-white' : 'border-[#C6C8CB] text-transparent'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

// --- Main Component ---

export default function Register() {
  const [selectedRole, setSelectedRole] = useState<Role>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validation & Auth state
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  const navigate = useNavigate();

  const { registerUser } = useRegister();
  const { user, loading } = useAuth();

  // Redirect after registration: caregiver → /kyc, patient → /
  useEffect(() => {
    if (showSuccessModal && !loading && user) {
      const timer = setTimeout(() => {
        navigate(selectedRole === 'caregiver' ? '/kyc' : '/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, user, loading, navigate, selectedRole]);

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!email.trim()) {
      errs.email = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'กรุณากรอกอีเมลที่ถูกต้อง';
    }
    if (!password) {
      errs.password = 'กรุณากรอกรหัสผ่าน';
    } else if (password.length < 8) {
      errs.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'กรุณายืนยันรหัสผ่าน';
    } else if (confirmPassword !== password) {
      errs.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
    }
    return errs;
  }, [email, password, confirmPassword]);

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
      setIsSubmitting(true);
      // Convert role string to number: 'patient' → 1, 'caregiver' → 2
      const roleMap: Record<Role, number> = { patient: 1, caregiver: 2 };
      const result = await registerUser({
        email,
        password,
        role: roleMap[selectedRole]
      });
      setIsSubmitting(false);

      if (result.error) {
        setFormError(result.error);
        setErrorCount(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Success -> show modal
        setShowSuccessModal(true);
      }
    } else {
      setErrorCount(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hasValidationError = submitted && Object.keys(errors).length > 0;
  const hasErrors = hasValidationError || formError;
  const pwStrength = getPasswordStrength(password);

  return (
    <AuthLayout
      tagline="การดูแลที่ดี เริ่มต้นจากความใส่ใจ"
      subtitle="Payung เชื่อมต่อผู้สูงอายุกับผู้ดูแลที่เหมาะสม เพื่อคุณภาพชีวิตที่ดีขึ้นในทุกวัน"
    >
      <form onSubmit={handleSubmit} className="w-full max-w-[420px]" id="register-form" noValidate>
        {/* Heading */}
        <h1 className="text-[32px] font-bold leading-10 text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          สร้างบัญชีผู้ใช้
        </h1>
        <p className="mt-2 text-lg leading-[27px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          กรอกข้อมูลด้านล่างเพื่อเริ่มต้นใช้งาน Payung
        </p>

        {/* Global Error Banner */}
        <Alert key={errorCount} message={formError || (hasValidationError ? 'กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน' : '')} id="register-error-banner" />

        {/* Role Selection */}
        <div className={hasErrors ? 'mt-4' : 'mt-6'}>
          <label className="text-sm font-bold leading-6 text-[#575859]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ประเภทผู้ใช้
          </label>
          <div className="mt-2 flex gap-3">
            {/* RoleCard: ผู้สูงอายุ */}
            <RoleCard
              role="patient"
              id="role-patient"
              selectedRole={selectedRole}
              onClick={setSelectedRole}
              title="ผู้สูงอายุ"
              description="ค้นหาและจองผู้ดูแล"
              iconBg="border border-[#E0E2E5] bg-[#F5F6F7]"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1A1A1A]"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /></svg>}
            />
            {/* RoleCard: ผู้ดูแล */}
            <RoleCard
              role="caregiver"
              id="role-caregiver"
              selectedRole={selectedRole}
              onClick={setSelectedRole}
              title="ผู้ดูแล"
              description="ให้บริการดูแลผู้สูงอายุ"
              iconBg="bg-[#FFF3E0]"
              icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E09721" /></svg>}
            />
          </div>
        </div>

        <AuthInput
          id="register-email"
          label="อีเมล"
          icon={EmailIcon}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          error={submitted ? errors.email : undefined}
          wrapperClassName="mt-5"
        />

        <div className="relative">
          <AuthInput
            id="register-password"
            label="รหัสผ่าน"
            isPassword
            icon={PasswordIcon}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            error={submitted ? errors.password : undefined}
            wrapperClassName="mt-4"
          />
          {/* We hook into the password state here to show the meter under the input block (หลอดความแข็งแรงของพาสเวิร์ด)*/}
          <PasswordStrengthMeter password={password} pwStrength={pwStrength} />
          
          {/* Password conditions checklist */}
          <PasswordConditions password={password} />
        </div>

        <AuthInput
          id="register-confirm-password"
          label="ยืนยันรหัสผ่าน"
          isPassword
          icon={PasswordIcon}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          error={submitted ? errors.confirmPassword : undefined}
          wrapperClassName="mt-4"
        />

        <button
          type="submit"
          id="register-submit"
          disabled={isSubmitting}
          className={`mt-5 h-[52px] w-full rounded-lg bg-[#52B69A] text-xl font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition-all duration-200 hover:bg-[#45a085] hover:shadow-[0_6px_20px_rgba(82,182,154,0.35)] active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {isSubmitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
        </button>

        <p className="mt-5 text-center text-base font-bold leading-6 text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          มีบัญชีอยู่แล้ว?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-lg font-semibold text-[#52B69A] hover:underline transition bg-none border-none cursor-pointer p-0"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            เข้าสู่ระบบ
          </button>
        </p>

        <p className="mt-2 text-center text-xs leading-6 text-[#C6C8CB]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          การสมัครถือว่ายอมรับ{' '}
          <span className="cursor-pointer underline hover:text-[#8A8C8E]">ข้อกำหนดการใช้งาน</span> และ{' '}
          <span className="cursor-pointer underline hover:text-[#8A8C8E]">นโยบายความเป็นส่วนตัว</span>
        </p>
      </form>
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => navigate(selectedRole === 'caregiver' ? '/kyc' : '/')}
      />
    </AuthLayout>
  );
}
