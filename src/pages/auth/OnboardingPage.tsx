import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import AuthLayout from '../../components/layout/AuthLayout';
import AuthInput from '../../components/ui/AuthInput';
import Alert from '../../components/ui/AlertInvalid';
import ProfileImageUpload from '../../components/ui/ProfileImageUpload';
import Spinner from '../../components/ui/Spinner';
import { Icon } from '../../components/ui/Icon';
import { GET_USER, UPDATE_PROFILE } from '../../graphql/queries';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getPostLoginRedirect } from '../../utils/getRedirectPath';
import ThaiAddressSelector from '../../components/ui/ThaiAddressSelector';

const PhoneIcon = <Icon name="phone" size="small" color="currentColor" />;
const LocationIcon = <Icon name="location_on" size="small" color="currentColor" />;
const MailboxIcon = <Icon name="markunread_mailbox" size="small" color="currentColor" />;

interface MeData {
  me: {
    id: string;
    phone: string | null;
    address: string | null;
    subDistrict: string | null;
    district: string | null;
    province: string | null;
    postalCode: string | null;
    avatarUrl: string | null;
    displayName: string | null;
  };
}

interface FormErrors {
  phone?: string;
  address?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
}

const PHONE_DIGITS_REGEX = /^0[0-9]{9}$/;
const POSTAL_CODE_REGEX = /^[0-9]{5}$/;
// const ADDRESS_MAX_LENGTH = 200;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, userRole, mustChangePassword } = useAuth();

  // ลบ flag is_registering ที่ GuestRoute เซ็ตไว้ (ทำใน effect เพื่อความปลอดภัยกับ StrictMode)
  useEffect(() => {
    localStorage.removeItem('is_registering');
  }, []);

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [subDistrict, setSubDistrict] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [avatarError, setAvatarError] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: meData } = useQuery<MeData>(GET_USER, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    const me = meData?.me;
    if (!me) return;
    if (me.phone) setPhone(formatPhone(me.phone));
    if (me.avatarUrl) setAvatarPreview(me.avatarUrl);
    if (me.displayName) setDisplayName(me.displayName);
    if (me.address) setAddress(me.address);
    if (me.subDistrict) setSubDistrict(me.subDistrict);
    if (me.district) setDistrict(me.district);
    if (me.province) setProvince(me.province);
    if (me.postalCode) setPostalCode(me.postalCode);
  }, [meData]);

  const [updateProfile] = useMutation(UPDATE_PROFILE);

  const goToHome = () => {
    const target = getPostLoginRedirect({
      role: userRole ?? 1,
      mustChangePassword: mustChangePassword ?? false,
    });
    navigate(target, { replace: true });
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    const phoneDigits = phone.replace(/-/g, '');

    if (!phoneDigits) {
      errs.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    } else if (!PHONE_DIGITS_REGEX.test(phoneDigits)) {
      errs.phone = 'เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องเป็นตัวเลข 10 หลัก)';
    }

    if (!address.trim()) errs.address = 'กรุณากรอกที่อยู่';
    if (!subDistrict.trim()) errs.subDistrict = 'กรุณากรอกตำบล/แขวง';
    if (!district.trim()) errs.district = 'กรุณากรอกอำเภอ/เขต';
    if (!province.trim()) errs.province = 'กรุณากรอกจังหวัด';

    if (!postalCode.trim()) {
      errs.postalCode = 'กรุณากรอกรหัสไปรษณีย์';
    } else if (!POSTAL_CODE_REGEX.test(postalCode)) {
      errs.postalCode = 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก';
    }

    return errs;
  };

  const handleAvatarSelect = (file: File) => {
    setAvatarError('');
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSkip = () => {
    if (isSubmitting) return;
    goToHome();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const errs = validate();
    setErrors(errs);
    setSubmitted(true);

    if (Object.keys(errs).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      let avatarUrl: string | undefined;

      if (avatarFile && user?.id) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/avatar.${ext}`;

        const { error: storageError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });

        if (storageError) throw new Error(storageError.message);

        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
        // cache-bust so the new image shows up immediately even if the URL path is unchanged
        avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;
      }

      await updateProfile({
        variables: {
          phone: phone.replace(/-/g, ''),
          address: address.trim(),
          subDistrict: subDistrict.trim(),
          district: district.trim(),
          province: province.trim(),
          postalCode: postalCode.trim(),
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      });

      goToHome();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      tagline="เกือบเสร็จแล้ว!"
      subtitle="กรอกข้อมูลเพิ่มเติมเพื่อเริ่มใช้งาน Payung"
    >
      <form onSubmit={handleSubmit} className="w-full max-w-[500px]" id="onboarding-form" noValidate>
        <h1 className="text-[32px] font-bold leading-10 text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เกือบเสร็จแล้ว!
        </h1>
        <p className="mt-2 text-lg leading-[27px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          กรอกข้อมูลเพิ่มเติมเพื่อเริ่มใช้งาน
        </p>

        <p className="mt-3 text-[13px] text-[#228B55] bg-[#EEF9F5] border border-[#A7D8C2]/30 rounded-xl px-4 py-3 leading-[20px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เพื่อความสะดวกในการเรียกใช้บริการ สามารถกรอกที่อยู่เอาไว้เพื่อความรวดเร็วในการจอง โดยคุณสามารถเข้ามาอัปเดตข้อมูลที่อยู่ภายหลังได้
        </p>

        <Alert message={formError} id="onboarding-error-banner" />

        {/* Profile image upload */}
        <div className="mt-6 flex justify-center">
          <ProfileImageUpload
            previewUrl={avatarPreview}
            name={displayName || user?.email || ''}
            onFileSelect={handleAvatarSelect}
            onError={setAvatarError}
            error={avatarError}
            disabled={isSubmitting}
          />
        </div>

        <AuthInput
          id="onboarding-phone"
          label="เบอร์โทรศัพท์"
          icon={PhoneIcon}
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="0X-XXXX-XXXX"
          maxLength={12}
          error={submitted ? errors.phone : undefined}
          disabled={isSubmitting}
          wrapperClassName="mt-6"
        />

        <AuthInput
          id="onboarding-address"
          label="ที่อยู่"
          icon={LocationIcon}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="บ้านเลขที่ ถนน ซอย"
          error={submitted ? errors.address : undefined}
          disabled={isSubmitting}
          wrapperClassName="mt-4"
        />

        {/* Province / Amphoe / District cascading dropdowns */}
        <div className="mt-4">
          <ThaiAddressSelector
            provinceValue={province}
            amphoeValue={district}
            districtValue={subDistrict}
            onProvinceChange={setProvince}
            onAmphoeChange={setDistrict}
            onDistrictChange={setSubDistrict}
            onZipcodeChange={setPostalCode}
            error={submitted ? {
              province: errors.province,
              amphoe: errors.district,
              district: errors.subDistrict,
            } : undefined}
          />
        </div>

        {/* Postal Code (auto-filled) */}
        <AuthInput
          id="onboarding-postal-code"
          label="รหัสไปรษณีย์"
          icon={MailboxIcon}
          value={postalCode}
          readOnly
          placeholder="กรอกอัตโนมัติเมื่อเลือกตำบล"
          error={submitted ? errors.postalCode : undefined}
          disabled={isSubmitting}
          wrapperClassName="mt-4"
        />

        <button
          type="submit"
          id="onboarding-submit"
          disabled={isSubmitting}
          className={`mt-6 mx-auto flex h-[52px] w-[240px] items-center justify-center gap-2 rounded-lg bg-[#52B69A] text-xl font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition-all duration-200 hover:bg-[#45a085] hover:shadow-[0_6px_20px_rgba(82,182,154,0.35)] active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {isSubmitting && <Spinner size="sm" />}
          {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
        </button>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="cursor-pointer border-none bg-none p-0 text-base font-semibold text-[#52B69A] transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ข้ามขั้นตอนนี้ →
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
