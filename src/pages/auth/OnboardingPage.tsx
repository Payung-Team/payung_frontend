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
import { takePendingJoinPath } from '../family/joinRedirect';
import ThaiAddressSelector from '../../components/ui/ThaiAddressSelector';
// PYG-500: ฟอร์มผู้รับบริการชุดเดียวกับหน้า Booking
import PatientDetailsFields, {
  type PatientDetailsValues,
  type PatientFieldErrors,
} from '../../components/patient/PatientDetailsFields';
import {
  COMPLETE_ONBOARDING,
  type CompleteOnboardingData,
  type CompleteOnboardingVars,
} from '../../graphql/onboarding';
// PYG-539: ข้อความความยินยอมมาจาก BE ที่เดียว (PYG-472) ห้ามเขียนเองฝั่งนี้
import ConsentBox from '../../components/consent/ConsentBox';
import {
  CONSENT_ERROR,
  CONSENT_POLICY,
  type ConsentPolicyData,
} from '../../graphql/consent';

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

/** role ผู้สูงอายุ — มีเฉพาะ role นี้ที่เป็นผู้รับบริการเอง */
const ROLE_ELDER = 1;

const API_BASE = ((import.meta.env.VITE_GRAPHQL_URL as string) || 'http://localhost:3000/graphql')
  .replace('/graphql', '');

const EMPTY_PATIENT: PatientDetailsValues = {
  name: '',
  firstName: '',
  lastName: '',
  age: '',
  gender: '',
  weight: '',
  height: '',
  supportLevel: '',
  bloodGroup: '',
  conditions: [],
  medicines: '',
  allergies: '',
  careInstructions: '',
  regularHospital: '',
};

/**
 * อัปรูปโปรไฟล์ผ่าน backend — PYG-507
 *
 * ไม่คืนค่าอะไรกลับ เพราะหน้านี้ไปต่อที่หน้าหลักทันที และรูปของผู้ดูแลต้องรอแอดมินอนุมัติ
 * ก่อนแสดงอยู่แล้ว (BE ตัดสินตาม role ให้เอง) ที่นี่สนใจแค่ "สำเร็จหรือไม่"
 */
async function uploadProfilePhoto(file: File): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');

  const body = new FormData();
  body.append('photo', file);

  const res = await fetch(`${API_BASE}/api/v1/profile/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!res.ok) {
    // BE ตอบข้อความไทยที่โชว์ได้เลย (เช่น "รองรับเฉพาะรูป JPEG") — ใช้ของ BE ก่อนเสมอ
    const detail = await res
      .json()
      .then((b: { message?: string }) => b.message)
      .catch(() => undefined);
    throw new Error(detail ?? 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }
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

  // PYG-500: ข้อมูลผู้รับบริการของตัวเอง — เฉพาะผู้สูงอายุ (role 1)
  const isElder = (userRole ?? 1) === ROLE_ELDER;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patient, setPatient] = useState<PatientDetailsValues>(EMPTY_PATIENT);
  const [patientErrors, setPatientErrors] = useState<PatientFieldErrors>({});

  const handlePatientChange = <K extends keyof PatientDetailsValues>(
    field: K,
    value: PatientDetailsValues[K],
  ) => {
    // ช่องชื่อของหน้านี้แยกออกมาเป็น state ของตัวเอง เพราะปลายทางคือ users.first_name /
    // users.last_name (PYG-497) ไม่ใช่ care_recipients.name เหมือนช่องอื่น
    if (field === 'firstName') {
      setFirstName(value as string);
      return;
    }
    if (field === 'lastName') {
      setLastName(value as string);
      return;
    }
    setPatient((prev) => ({ ...prev, [field]: value }));
  };

  // PYG-539: ความยินยอม — ★ เริ่มจาก "ไม่ติ๊ก" เสมอ ห้ามติ๊กมาให้ล่วงหน้า
  //   กฎหมายต้องการการกระทำโดยชัดแจ้ง ไม่ใช่การที่ผู้ใช้ไม่ยกเลิกค่าที่เราตั้งไว้
  const [grantedConsents, setGrantedConsents] = useState<Set<string>>(new Set());
  const [consentError, setConsentError] = useState('');

  const { data: consentData } = useQuery<ConsentPolicyData>(CONSENT_POLICY, {
    variables: { source: 'onboarding' },
    skip: !isElder,
    fetchPolicy: 'cache-and-network',
  });
  const policy = consentData?.consentPolicy;

  const toggleConsent = (type: string, next: boolean) => {
    setGrantedConsents((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(type);
      else updated.delete(type);
      return updated;
    });
  };

  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: meData } = useQuery<MeData>(GET_USER, {
    fetchPolicy: 'network-only',
  });

  // เติมค่าที่เคยบันทึกไว้ลงฟอร์มเมื่อ me มาถึง
  useEffect(() => {
    const me = meData?.me;
    if (!me) return;
    // prefill นี้เป็นโค้ดเดิมของหน้า ไม่ใช่ของ PYG-500 — กฎเพิ่งตรวจเจอหลังไฟล์ถูกแก้
    // (ก่อนหน้านี้ปลั๊กอินข้ามคอมโพเนนต์นี้ไป) การเลิกใช้ effect ต้องรื้อวิธี prefill ทั้งหน้า
    // ซึ่งเกินขอบเขตการ์ดนี้ — แยกการ์ด
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const [completeOnboarding] = useMutation<CompleteOnboardingData, CompleteOnboardingVars>(
    COMPLETE_ONBOARDING,
  );

  const goToHome = () => {
    // A registration that started from an invite link returns straight to /join.
    const pendingJoin = takePendingJoinPath();
    const target =
      pendingJoin ??
      getPostLoginRedirect({
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

  /**
   * ช่องบังคับของผู้รับบริการตาม PYG-496: ชื่อ, นามสกุล, อายุ, เพศ, ระดับการช่วยเหลือ
   * ที่เหลือข้ามได้ — BE (PYG-498) ตรวจซ้ำอีกชั้น ที่นี่ตรวจเพื่อไม่ให้ผู้ใช้เสียเที่ยว
   */
  const validatePatient = (): PatientFieldErrors => {
    if (!isElder) return {};
    const errs: PatientFieldErrors = {};

    if (!firstName.trim()) errs.firstName = 'กรุณากรอกชื่อ';
    if (!lastName.trim()) errs.lastName = 'กรุณากรอกนามสกุล';

    // ใช้ trim() ไม่ใช่ Number(age) || 0 — ช่องว่างต้องเป็น "ยังไม่กรอก" ไม่ใช่อายุ 0 ปี
    // (อายุ 0 เป็นค่าที่ถูกต้องเพราะผู้รับบริการอาจเป็นทารก)
    const age = patient.age.trim();
    if (!age) {
      errs.age = 'กรุณากรอกอายุ';
    } else if (!Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 130) {
      errs.age = 'อายุต้องเป็นจำนวนเต็ม 0-130 ปี';
    }

    if (!patient.gender) errs.gender = 'กรุณาเลือกเพศ';
    if (!patient.supportLevel) errs.supportLevel = 'กรุณาเลือกระดับการช่วยเหลือตัวเอง';

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
    const patientErrs = validatePatient();
    setErrors(errs);
    setPatientErrors(patientErrs);
    setSubmitted(true);

    // PYG-539: ข้อบังคับต้องติ๊กครบก่อน ไม่งั้นไม่ต้องยิงไปให้ BE ปฏิเสธ
    //   (BE ตรวจซ้ำอีกชั้นอยู่แล้ว — ที่นี่แค่ไม่ให้ผู้ใช้เสียเที่ยว)
    const missingConsent = isElder
      ? (policy?.items ?? []).some(
          (item) => item.required && !grantedConsents.has(item.type),
        )
      : false;
    setConsentError(
      missingConsent ? 'ต้องให้ความยินยอมข้อที่บังคับก่อนจึงจะบันทึกได้' : '',
    );

    if (
      Object.keys(errs).length > 0 ||
      Object.keys(patientErrs).length > 0 ||
      missingConsent
    ) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // PYG-507: รูปโปรไฟล์ต้องขึ้นผ่าน backend เท่านั้น
      //   เดิมหน้านี้อัปเข้า bucket 'avatars' (public) เองแล้วส่ง URL เข้า updateProfile
      //   ตอนนี้ updateProfile ตอบ 400 ทันทีถ้ามี avatarUrl → ต้องยิงที่ endpoint นี้แทน
      //   (BE ตรวจว่าเป็น JPEG จริงจาก byte, ตัด EXIF/GPS ทิ้ง, เก็บใน bucket ที่ไม่ public)
      if (avatarFile) {
        await uploadProfilePhoto(avatarFile);
      }

      await updateProfile({
        variables: {
          phone: phone.replace(/-/g, ''),
          address: address.trim(),
          subDistrict: subDistrict.trim(),
          district: district.trim(),
          province: province.trim(),
          postalCode: postalCode.trim(),
        },
      });

      // PYG-500: ผู้สูงอายุกรอกข้อมูลผู้รับบริการของตัวเองตั้งแต่ Onboarding
      //   role อื่นไม่มีส่วนนี้ (ผู้ดูแล/แอดมินไม่ได้เป็นผู้รับบริการ)
      if (isElder) {
        await completeOnboarding({
          variables: {
            input: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              // ★ policyVersion มาจาก consentPolicy ห้าม hardcode — BE ปฏิเสธถ้าไม่ตรง
              //   เพราะแปลว่าผู้ใช้อ่านข้อความคนละฉบับกับที่บังคับใช้อยู่
              consents: (policy?.items ?? []).map((item) => ({
                type: item.type,
                granted: grantedConsents.has(item.type),
                policyVersion: policy!.version,
              })),
              details: {
                age: Number(patient.age),
                gender: patient.gender,
                supportLevel: patient.supportLevel,
                ...(patient.weight ? { weight: Number(patient.weight) } : {}),
                ...(patient.height ? { height: Number(patient.height) } : {}),
                ...(patient.bloodGroup ? { bloodGroup: patient.bloodGroup } : {}),
                ...(patient.conditions.length ? { conditions: patient.conditions } : {}),
                ...(patient.medicines.trim() ? { medicines: patient.medicines.trim() } : {}),
                ...(patient.allergies.trim() ? { allergies: patient.allergies.trim() } : {}),
                ...(patient.careInstructions.trim()
                  ? { careInstructions: patient.careInstructions.trim() }
                  : {}),
                ...(patient.regularHospital.trim()
                  ? { regularHospital: patient.regularHospital.trim() }
                  : {}),
              },
            },
          },
        });
      }

      goToHome();
    } catch (err) {
      // PYG-539: BE ตอบ code เฉพาะเรื่อง consent มา — แปลเป็นข้อความที่บอกว่าต้องทำอะไรต่อ
      //   ถ้าโชว์ message ดิบของ GraphQL ผู้ใช้จะไม่รู้ว่าต้องรีเฟรชหรือต้องติ๊กอะไร
      const code = consentErrorCodeOf(err);
      if (code === CONSENT_ERROR.VERSION_MISMATCH) {
        setFormError(
          'นโยบายความเป็นส่วนตัวมีฉบับใหม่แล้ว กรุณารีเฟรชหน้าเว็บแล้วอ่านอีกครั้ง',
        );
        setIsSubmitting(false);
        return;
      }
      if (code === CONSENT_ERROR.REQUIRED) {
        setConsentError('ต้องให้ความยินยอมข้อที่บังคับก่อนจึงจะบันทึกได้');
        setFormError('');
        setIsSubmitting(false);
        return;
      }

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

        {/* PYG-500: ข้อมูลผู้รับบริการของตัวเอง — ฟิลด์ชุดเดียวกับตอนเลือกผู้เข้ารับบริการ
            เพื่อให้หน้า Booking เติมกลับมาได้ครบทุกช่อง (PYG-502) */}
        {isElder && (
          <section className="mt-8 rounded-2xl border border-[#E0E2E5] bg-white p-5">
            <h2
              className="text-xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ข้อมูลผู้รับบริการ
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[#8A8C8E]">
              กรอกครั้งเดียว ครั้งหน้าจองได้เลยไม่ต้องกรอกใหม่
            </p>

            <PatientDetailsFields
              nameMode="split"
              values={{ ...patient, firstName, lastName }}
              errors={submitted ? patientErrors : {}}
              disabled={isSubmitting}
              onChange={handlePatientChange}
            />
          </section>
        )}

        {/* PYG-539: ความยินยอม ม.26 — ต้องอยู่ "ใต้" ฟอร์มและ "เหนือ" ปุ่มบันทึก
            ผู้ใช้ควรเห็นว่าจะให้ข้อมูลอะไรก่อน แล้วค่อยตัดสินใจว่ายินยอมไหม */}
        {isElder && policy && (
          <section className="mt-6 rounded-2xl border border-[#E0E2E5] bg-white p-5">
            <h2
              className="text-xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {policy.screen?.titleTh ?? 'ความยินยอม'}
            </h2>
            {policy.screen?.introTh && (
              <p className="mt-1.5 text-sm leading-6 text-[#8A8C8E]">
                {policy.screen.introTh}
              </p>
            )}

            <div className="mt-4">
              <ConsentBox
                items={policy.items}
                granted={grantedConsents}
                onToggle={toggleConsent}
                rightsNote={policy.rightsNoteTh}
                privacyNotice={policy.privacyNoticeTh}
                disabled={isSubmitting}
                showErrors={submitted}
              />
            </div>

            {consentError && (
              <p className="mt-3 text-sm font-semibold text-red-500">{consentError}</p>
            )}

            <p className="mt-4 text-xs text-[#B0B2B5]">
              นโยบายเวอร์ชัน {policy.version} · เริ่มใช้ {policy.effectiveDate}
            </p>
          </section>
        )}

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

/**
 * ดึงรหัส error เรื่อง consent ออกจาก error ของ Apollo — PYG-539
 *
 * BE โยน BadRequest/Forbidden ที่มี body เป็น object { code, message, ... }
 * ซึ่ง Apollo ห่อไว้ใน graphQLErrors[].extensions โดยรูปทรงต่างกันได้ตามชั้นที่โยน
 * จึงค้นแบบยอมพลาด: หาไม่เจอคืน null แล้วไปใช้ข้อความทั่วไปแทน
 */
function consentErrorCodeOf(err: unknown): string | null {
  const graphQLErrors = (err as { graphQLErrors?: unknown[] })?.graphQLErrors;
  if (!Array.isArray(graphQLErrors)) return null;

  for (const gqlError of graphQLErrors) {
    const extensions = (gqlError as { extensions?: Record<string, unknown> })?.extensions;
    if (!extensions) continue;

    const direct = extensions.code;
    if (typeof direct === 'string' && direct.startsWith('CONSENT_')) return direct;

    // Nest ห่อ body ของ HttpException ไว้ใน extensions.originalError.response
    const original = extensions.originalError as
      | { response?: { code?: unknown } }
      | undefined;
    const nested = original?.response?.code;
    if (typeof nested === 'string' && nested.startsWith('CONSENT_')) return nested;
  }
  return null;
}
