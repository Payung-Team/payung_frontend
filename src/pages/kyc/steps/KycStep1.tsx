import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useKyc } from '../../../context/KycContext';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/ui/Icon';

// ── Validation helpers ────────────────────────────────────────────────────
function isValidThaiId(id: string): boolean {
  if (!/^[0-9]{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i], 10) * (13 - i);
  }
  return (11 - (sum % 11)) % 10 === parseInt(id[12], 10);
}

function isValidThaiPhone(phone: string): boolean {
  return /^0[0-9]{8,9}$/.test(phone.replace(/-/g, ''));
}

// ── Zod schema ────────────────────────────────────────────────────────────
const step1Schema = z.object({
  firstName: z
    .string()
    .min(1, 'กรุณากรอกชื่อจริง')
    .max(50, 'ชื่อจริงต้องไม่เกิน 50 ตัวอักษร'),
  lastName: z
    .string()
    .min(1, 'กรุณากรอกนามสกุล')
    .max(50, 'นามสกุลต้องไม่เกิน 50 ตัวอักษร'),
  birthDate: z
    .string()
    .min(1, 'กรุณาเลือกวันเกิด')
    .refine((val) => {
      const birth = new Date(val);
      const today = new Date();
      return birth < today;
    }, 'วันเกิดต้องไม่เป็นอนาคต'),
  gender: z
    .string()
    .min(1, 'กรุณาเลือกเพศ')
    .refine((val) => ['male', 'female', 'other'].includes(val), {
      message: 'กรุณาเลือกเพศ',
    }),
  idCardNumber: z
    .string()
    .refine(isValidThaiId, 'เลขบัตรประชาชนไม่ถูกต้อง (ต้องเป็นตัวเลข 13 หลักที่ถูกต้อง)'),
  phone: z
    .string()
    .refine(isValidThaiPhone, 'เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678)'),
  skills: z.array(z.string()).min(1, 'กรุณาเลือกทักษะอย่างน้อย 1 รายการ'),
  experienceYears: z.coerce
    .number({ message: 'กรุณากรอกจำนวนปีประสบการณ์' })
    .int('จำนวนปีต้องเป็นจำนวนเต็ม')
    .min(0, 'จำนวนปีต้องไม่น้อยกว่า 0')
    .max(50, 'จำนวนปีต้องไม่เกิน 50 ปี'),
  hourlyRate: z.coerce
    .number()
    .min(1, 'กรุณาเลือกค่าบริการต่อชั่วโมง'),
  bio: z.string().max(500, 'แนะนำตัวต้องไม่เกิน 500 ตัวอักษร').optional(),
});

type Step1Form = z.infer<typeof step1Schema>;

// ── Options ───────────────────────────────────────────────────────────────
const SKILL_OPTIONS = [
  { value: 'mobility', label: 'ช่วยเคลื่อนไหว' },
  { value: 'medication', label: 'ดูแลยา' },
  { value: 'bathing', label: 'อาบน้ำ / สุขอนามัย' },
  { value: 'cooking', label: 'ทำอาหาร' },
  { value: 'companionship', label: 'เป็นเพื่อนคุย' },
  { value: 'wound_care', label: 'ดูแลแผล' },
  { value: 'physical_therapy', label: 'กายภาพบำบัด' },
  { value: 'dementia_care', label: 'ดูแลสมองเสื่อม' },
];

const GENDER_OPTIONS = [
  { label: 'ชาย', value: 'male' },
  { label: 'หญิง', value: 'female' },
  { label: 'อื่นๆ', value: 'other' },
];

const HOURLY_RATE_OPTIONS = [
  { label: 'น้อยกว่า 100 บาท/ชม.', value: 80 },
  { label: '100 – 150 บาท/ชม.', value: 125 },
  { label: '151 – 200 บาท/ชม.', value: 175 },
  { label: '201 – 250 บาท/ชม.', value: 225 },
  { label: '251 – 300 บาท/ชม.', value: 275 },
  { label: 'มากกว่า 300 บาท/ชม.', value: 350 },
];

// ── Stepper ───────────────────────────────────────────────────────────────
const STEPS = ['ข้อมูลส่วนตัว', 'เอกสาร', 'ตรวจสอบ'];

function KycStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${done || active ? 'bg-[#2D6A58] text-white' : 'bg-[#E2E8F0] text-[#717182]'
                  }`}
              >
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : n}
              </div>
              <span
                className={`text-xs font-medium ${active ? 'text-[#2D6A58]' : 'text-[#717182]'}`}
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-24 h-0.5 mb-5 ${done ? 'bg-[#2D6A58]' : 'bg-[#E2E8F0]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function KycStep1({ mode = 'create' }: { mode?: 'create' | 'resubmit' }) {
  const { goToStep, step1Data, saveStep1, initialStep1Data } = useKyc();
  const navigate = useNavigate();

  const checkEdited = (fieldName: keyof Step1Form) => {
    if (mode !== 'resubmit' || !initialStep1Data) return false;
    return JSON.stringify(watch(fieldName)) !== JSON.stringify(initialStep1Data[fieldName]);
  };

  const getFieldProps = (fieldName: keyof Step1Form) => {
    if (mode !== 'resubmit') return {};
    return {
      isResubmitMode: true,
      isEdited: checkEdited(fieldName),
    };
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: step1Data
      ? { ...step1Data }
      : {
        firstName: '',
        lastName: '',
        birthDate: '',
        gender: '' as unknown as string,
        idCardNumber: '',
        phone: '',
        skills: [],
        experienceYears: '' as unknown as number,
        hourlyRate: '' as unknown as number,
        bio: '',
      },
  });

  const isNextDisabled = false;

  const birthDate = watch('birthDate');
  const calculateAge = (dateString: string) => {
    if (!dateString) return null;
    const today = new Date();
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };
  const age = calculateAge(birthDate);

  // Reset form when step1Data is updated (for resubmit pre-fill)
  useEffect(() => {
    if (step1Data) {
      reset(step1Data);
    }
  }, [step1Data, reset]);

  const selectedSkills = watch('skills') ?? [];

  function toggleSkill(value: string) {
    if (selectedSkills.includes(value)) {
      setValue('skills', selectedSkills.filter((s) => s !== value), { shouldValidate: true });
    } else {
      setValue('skills', [...selectedSkills, value], { shouldValidate: true });
    }
  }

  const onSubmit = (data: Step1Form) => {
    saveStep1({ ...data, bio: data.bio ?? '' });
    goToStep(2);
  };

  // Destructure register results so we can override onChange
  const idCardReg = register('idCardNumber');
  const phoneReg = register('phone');
  const expReg = register('experienceYears');

  return (
    <div className={mode === 'resubmit' ? '' : 'min-h-[calc(100vh-64px)] bg-[#F2F4F6] flex items-center justify-center px-4 py-10'}>
      <div
        className={mode === 'resubmit' ? 'w-full flex flex-col gap-5' : 'w-full max-w-[780px] bg-white rounded-3xl border border-[#F1F5F9] px-12 py-10'}
        style={mode === 'resubmit' ? {} : {
          boxShadow: '0 12px 28px -6px rgba(15,23,43,0.06), 0 1px 2px 0 rgba(15,23,43,0.04)',
        }}
      >
        <KycStepper current={1} />

        <h2
          className="text-2xl font-bold text-[#0A0A0A] mb-1"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          ข้อมูลส่วนตัว
        </h2>
        <p className="text-sm text-[#717182] mb-8" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          กรอกข้อมูลให้ตรงกับบัตรประชาชนของคุณ
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          {/* ชื่อจริง - นามสกุล */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ชื่อจริง"
              placeholder={mode === 'resubmit' ? initialStep1Data?.firstName : "สมชาย"}
              error={errors.firstName?.message}
              {...getFieldProps('firstName')}
              {...register('firstName')}
            />
            <Input
              label="นามสกุล"
              placeholder={mode === 'resubmit' ? initialStep1Data?.lastName : "ใจดี"}
              error={errors.lastName?.message}
              {...getFieldProps('lastName')}
              {...register('lastName')}
            />
          </div>

          {/* เลขบัตรประชาชน — ตัวเลขเท่านั้น 13 หลัก */}
          <div>
            <Input
              label="เลขบัตรประชาชน 13 หลัก"
              placeholder={mode === 'resubmit' ? initialStep1Data?.idCardNumber : "1-2345-67890-12-3"}
              inputMode="numeric"
              maxLength={13}
              error={errors.idCardNumber?.message}
              {...getFieldProps('idCardNumber')}
              {...idCardReg}
              onChange={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 13);
                idCardReg.onChange(e);
              }}
            />
          </div>

          {/* วันเกิด - เพศ */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={
                <div className="flex justify-between items-center w-full">
                  <span>วันเกิด</span>
                  {age !== null && age >= 0 && (
                    <span className="text-xs font-medium text-[#2D6A58]">อายุ {age} ปี</span>
                  )}
                </div>
              }
              type="date"
              error={errors.birthDate?.message}
              {...getFieldProps('birthDate')}
              {...register('birthDate')}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>เพศ</label>
              <div className="relative flex items-center">
                <select
                  {...register('gender')}
                  className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors text-sm appearance-none pr-10 ${
                    mode === 'resubmit'
                      ? checkEdited('gender')
                        ? 'bg-white border-[#10B981] text-gray-900 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]'
                        : 'bg-gray-200 border-transparent text-[#9CA3AF] focus:border-[#2D6A58]'
                      : errors.gender
                        ? 'border-red-500'
                        : 'border-gray-300 focus:border-[#2D6A58] focus:ring-1 focus:ring-[#2D6A58]'
                  }`}
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  <option value="" disabled>เลือกเพศ</option>
                  {GENDER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                  <Icon name="expand_more" color="#717182" style={{ fontSize: '20px' }} />
                </div>
              </div>
              {errors.gender && (
                <span className="text-sm text-red-500" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{errors.gender.message}</span>
              )}
            </div>
          </div>

          {/* เบอร์โทร — ตัวเลขและขีด */}
          <Input
            label="เบอร์โทรศัพท์"
            placeholder={mode === 'resubmit' ? initialStep1Data?.phone : "+66 81-234-5678"}
            inputMode="tel"
            maxLength={12}
            error={errors.phone?.message}
            {...getFieldProps('phone')}
            {...phoneReg}
            onChange={(e) => {
              e.target.value = e.target.value.replace(/[^0-9-]/g, '').slice(0, 12);
              phoneReg.onChange(e);
            }}
          />

          {/* ประสบการณ์ + ค่าบริการ */}
          <div className="grid grid-cols-2 gap-4">
            {/* ประสบการณ์ — ตัวเลขเท่านั้น ไม่มี spinner */}
            <Input
              label="ประสบการณ์ (ปี)"
              type="text"
              inputMode="numeric"
              placeholder={mode === 'resubmit' ? String(initialStep1Data?.experienceYears || 0) : "0"}
              error={errors.experienceYears?.message}
              {...getFieldProps('experienceYears')}
              {...expReg}
              onChange={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
                expReg.onChange(e);
              }}
            />

            {/* ค่าบริการ — dropdown range */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ค่าบริการต่อชั่วโมง</label>
              <div className="relative flex items-center">
                <select
                  {...register('hourlyRate')}
                  className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors text-sm appearance-none pr-10 ${
                    mode === 'resubmit'
                      ? checkEdited('hourlyRate')
                        ? 'bg-white border-[#10B981] text-gray-900 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]'
                        : 'bg-gray-200 border-transparent text-[#9CA3AF] focus:border-[#2D6A58]'
                      : errors.hourlyRate
                        ? 'border-red-500'
                        : 'border-gray-300 focus:border-[#2D6A58] focus:ring-1 focus:ring-[#2D6A58]'
                  }`}
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  <option value="" disabled>เลือกช่วงราคา</option>
                  {HOURLY_RATE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
                  <Icon name="expand_more" color="#717182" style={{ fontSize: '20px' }} />
                </div>
              </div>
              {errors.hourlyRate && (
                <span className="text-sm text-red-500" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{errors.hourlyRate.message}</span>
              )}
            </div>
          </div>

          {/* ทักษะ */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ทักษะการดูแล</label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => {
                const selected = selectedSkills.includes(skill.value);
                return (
                  <button
                    key={skill.value}
                    type="button"
                    onClick={() => toggleSkill(skill.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      mode === 'resubmit'
                        ? checkEdited('skills')
                          ? selected
                            ? 'bg-[#10B981] text-white border-[#10B981]'
                            : 'bg-white text-[#0A0A0A] border-[#E2E8F0] hover:border-[#10B981] hover:text-[#10B981]'
                          : selected
                            ? 'bg-gray-200 text-[#9CA3AF] border-transparent'
                            : 'bg-white text-[#0A0A0A] border-[#E2E8F0]'
                        : selected
                          ? 'bg-[#2D6A58] text-white border-[#2D6A58]'
                          : 'bg-white text-[#0A0A0A] border-[#E2E8F0] hover:border-[#2D6A58] hover:text-[#2D6A58]'
                      } cursor-pointer`}
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                  >
                    {skill.label}
                  </button>
                );
              })}
            </div>
            {errors.skills && (
              <span className="text-sm text-red-500" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {errors.skills.message}
              </span>
            )}
          </div>

          {/* แนะนำตัว */}
          {(!(mode === 'resubmit' && !step1Data?.bio)) && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    แนะนำตัว <span className="text-[#717182] font-normal">(ไม่บังคับ)</span>
                  </label>
                </div>
              </div>
              
              <div className="relative flex items-center">
                <textarea
                  rows={4}
                  placeholder={mode === 'resubmit' && initialStep1Data?.bio ? initialStep1Data.bio : "เล่าสั้นๆ เกี่ยวกับประสบการณ์และความเชี่ยวชาญของคุณ..."}
                  className={`w-full px-3 py-2 border rounded-lg outline-none resize-none transition-colors text-sm ${
                    mode === 'resubmit'
                      ? checkEdited('bio')
                        ? 'bg-white border-[#10B981] text-gray-900 focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]'
                        : 'bg-gray-200 border-transparent text-[#9CA3AF] focus:border-[#2D6A58]'
                      : errors.bio 
                        ? 'border-red-500' 
                        : 'border-gray-300 focus:border-[#2D6A58] focus:ring-1 focus:ring-[#2D6A58]'
                  }`}
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                  {...register('bio')}
                />
              </div>
              {errors.bio && (
                <span className="text-sm text-red-500">{errors.bio.message}</span>
              )}
            </div>
          )}

          {/* Warning Info */}
          {mode === 'resubmit' && (
            <div className="flex flex-row items-center p-[12px_16px] gap-[10px] bg-[#FEF6E9] border border-[#BB7E1C] rounded-[10px]">
              <div className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0">
                <Icon name="info" color="#F9A825" style={{ fontSize: '20px' }} />
              </div>
              <p className="text-[15px] text-[#0F172A] leading-[19px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                ข้อมูลที่แก้ไขจะถูกบันทึกอัตโนมัติ และส่งให้ทีมตรวจสอบเมื่อกด "ส่งใหม่"
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => mode === 'resubmit' ? navigate('/kyc/status') : goToStep(0)}
              className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ← {mode === 'resubmit' ? 'ยกเลิก' : 'ย้อนกลับ'}
            </button>
            <button
              type="submit"
              disabled={isNextDisabled}
              className={`px-8 py-2.5 rounded-lg text-white text-sm font-bold active:scale-[0.98] transition-all duration-150 ${
                isNextDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2D6A58] hover:bg-[#255a4a] cursor-pointer'
              }`}
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ถัดไป →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
