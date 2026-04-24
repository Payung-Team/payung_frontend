import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useKyc } from '../../../context/KycContext';
import Input from '../../../components/ui/Input';

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
  fullName: z
    .string()
    .min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร')
    .max(100, 'ชื่อต้องไม่เกิน 100 ตัวอักษร'),
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
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  done || active ? 'bg-[#2D6A58] text-white' : 'bg-[#E2E8F0] text-[#717182]'
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
export default function KycStep1() {
  const { goToStep, step1Data, saveStep1 } = useKyc();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: step1Data
      ? { ...step1Data }
      : {
          fullName: '',
          idCardNumber: '',
          phone: '',
          skills: [],
          experienceYears: undefined as unknown as number,
          hourlyRate: 0,
          bio: '',
        },
  });

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
    <div className="min-h-[calc(100vh-64px)] bg-[#F2F4F6] flex items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-[780px] bg-white rounded-3xl border border-[#F1F5F9] px-12 py-10"
        style={{
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
          {/* ชื่อ-สกุล */}
          <Input
            label="ชื่อ-นามสกุล"
            placeholder="ชื่อ นามสกุล (ตามบัตรประชาชน)"
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          {/* เลขบัตรประชาชน — ตัวเลขเท่านั้น 13 หลัก */}
          <Input
            label="เลขบัตรประชาชน"
            placeholder="1234567890123"
            inputMode="numeric"
            maxLength={13}
            error={errors.idCardNumber?.message}
            {...idCardReg}
            onChange={(e) => {
              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 13);
              idCardReg.onChange(e);
            }}
          />

          {/* เบอร์โทร — ตัวเลขและขีด */}
          <Input
            label="เบอร์โทรศัพท์"
            placeholder="081-234-5678"
            inputMode="tel"
            maxLength={12}
            error={errors.phone?.message}
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
              placeholder="0"
              error={errors.experienceYears?.message}
              {...expReg}
              onChange={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
                expReg.onChange(e);
              }}
            />

            {/* ค่าบริการ — dropdown range */}
            <div className="flex flex-col gap-1">
              <label
                className="text-sm font-medium text-gray-700"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                ค่าบริการต่อชั่วโมง
              </label>
              <select
                className={`px-3 py-2 border rounded-lg outline-none transition-colors focus:border-[#2D6A58] focus:ring-1 focus:ring-[#2D6A58] text-sm bg-white ${
                  errors.hourlyRate ? 'border-red-500' : 'border-gray-300'
                }`}
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                defaultValue={step1Data?.hourlyRate ?? ''}
                {...register('hourlyRate')}
              >
                <option value="">เลือกช่วงราคา</option>
                {HOURLY_RATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.hourlyRate && (
                <span className="text-sm text-red-500" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  {errors.hourlyRate.message}
                </span>
              )}
            </div>
          </div>

          {/* ทักษะ */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-gray-700"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ทักษะการดูแล
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => {
                const selected = selectedSkills.includes(skill.value);
                return (
                  <button
                    key={skill.value}
                    type="button"
                    onClick={() => toggleSkill(skill.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#2D6A58] text-white border-[#2D6A58]'
                        : 'bg-white text-[#0A0A0A] border-[#E2E8F0] hover:border-[#2D6A58] hover:text-[#2D6A58]'
                    }`}
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
          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-gray-700"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              แนะนำตัว <span className="text-[#717182] font-normal">(ไม่บังคับ)</span>
            </label>
            <textarea
              rows={4}
              placeholder="เล่าสั้นๆ เกี่ยวกับประสบการณ์และความเชี่ยวชาญของคุณ..."
              className={`px-3 py-2 border rounded-lg outline-none resize-none transition-colors focus:border-[#2D6A58] focus:ring-1 focus:ring-[#2D6A58] text-sm ${
                errors.bio ? 'border-red-500' : 'border-gray-300'
              }`}
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              {...register('bio')}
            />
            {errors.bio && (
              <span className="text-sm text-red-500">{errors.bio.message}</span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => goToStep(0)}
              className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ← ย้อนกลับ
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 rounded-lg bg-[#2D6A58] text-white text-sm font-bold hover:bg-[#255a4a] active:scale-[0.98] transition-all duration-150 cursor-pointer"
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
