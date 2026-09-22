/**
 * ฟอร์มข้อมูลผู้รับบริการ — ใช้ร่วมกันระหว่างหน้า Booking กับหน้า Onboarding (PYG-500)
 *
 * ★ ทำไมต้องเป็น component เดียว: การ์ด PYG-496 กำหนดว่า Onboarding ต้องเก็บ "ฟิลด์ชุดเดียวกับ
 *   ตอนเลือกผู้เข้ารับบริการ" เพื่อให้หน้า Booking เติมข้อมูลจาก Onboarding กลับมาได้ครบทุกช่อง
 *   (PYG-502) ถ้าสองหน้าต่างคนเขียนฟอร์มเอง วันหนึ่งฝั่งหนึ่งเพิ่มช่องแล้วอีกฝั่งไม่มี
 *   ข้อมูลจะหายเงียบ ๆ ตอน autofill โดยไม่มี error
 *
 * เป็น controlled component ล้วน — ไม่ถือ state เอง ไม่ยิง API เอง
 *   หน้าที่เรียกเป็นคนถือ state, ตัดสิน validation และตัดสินว่าจะส่งอะไรขึ้น BE
 *   (สองหน้ามีปลายทางคนละตัว: Booking → BookingContext, Onboarding → completeOnboarding)
 *
 * ต่างกันแค่ช่องชื่อ ซึ่งคุมด้วย `nameMode`:
 *   'single' = หน้า Booking ช่องเดียว "ชื่อ-นามสกุลคนไข้" (ของเดิม ไม่แตะ)
 *   'split'  = หน้า Onboarding แยก ชื่อ / นามสกุล ตามการ์ด PYG-496
 *              เพราะค่าที่ได้ไปลง users.first_name / users.last_name (PYG-497) ไม่ใช่แค่ชื่อแสดง
 */
import {
  BLOOD_GROUPS,
  GENDER_OPTIONS,
  PREDEFINED_CONDITIONS,
  SUPPORT_LEVELS,
} from './patientFieldOptions';

/** ข้อความ error ต่อช่อง — คีย์ที่ไม่มีค่า = ช่องนั้นไม่มี error */
export interface PatientFieldErrors {
  name?: string;
  firstName?: string;
  lastName?: string;
  age?: string;
  gender?: string;
  supportLevel?: string;
}

export interface PatientDetailsValues {
  /** ใช้เมื่อ nameMode = 'single' */
  name: string;
  /** ใช้เมื่อ nameMode = 'split' */
  firstName: string;
  lastName: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  supportLevel: string;
  bloodGroup: string;
  conditions: string[];
  medicines: string;
  allergies: string;
  careInstructions: string;
  regularHospital: string;
}

export interface PatientDetailsFieldsProps {
  nameMode: 'single' | 'split';
  /**
   * PYG-519 — ล็อกช่องชื่อ (จองแทนสมาชิกในกลุ่ม)
   *
   * ★ ชื่อ-นามสกุลเป็น "ตัวตน" ของเจ้าของบัญชี คนจองแทนแก้ไม่ได้
   *   BE ปฏิเสธ patientName อยู่แล้ว (PYG-516) — ตรงนี้คือการบอกผู้ใช้ก่อนเขาพิมพ์
   *   ไม่ใช่ด่านความปลอดภัย (ด่านจริงอยู่ที่ BE)
   */
  nameReadOnly?: boolean;
  values: PatientDetailsValues;
  errors: PatientFieldErrors;
  disabled?: boolean;
  onChange: <K extends keyof PatientDetailsValues>(
    field: K,
    value: PatientDetailsValues[K],
  ) => void;
}

const inputBase =
  'mt-1.5 w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1';
const inputOk = 'border-[#E0E2E5] focus:ring-[#52B69A]';
const inputErr = 'border-red-500 focus:ring-red-500';

/** พื้นเทา + เคอร์เซอร์ห้าม — บอกด้วยสายตาว่าช่องนี้แก้ไม่ได้ */
const inputLocked = 'bg-[#F6F7F8] text-[#575859] cursor-not-allowed';

/**
 * ★ readOnly ไม่ใช่ disabled โดยตั้งใจ — disabled ทำให้ screen reader ข้ามช่องไปเลย
 *   ผู้ใช้ที่ใช้ตัวอ่านหน้าจอจะไม่รู้ว่ามีชื่ออะไรอยู่ · readOnly ยังโฟกัสและอ่านค่าได้
 */
function LockedHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#8A8C8E]">
      <span className="material-icons" style={{ fontSize: 14 }}>
        lock
      </span>
      ชื่อจากบัญชีของสมาชิก แก้ไขไม่ได้
    </p>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] text-red-500 font-semibold">{message}</p>;
}

export default function PatientDetailsFields({
  nameMode,
  nameReadOnly = false,
  values,
  errors,
  disabled = false,
  onChange,
}: PatientDetailsFieldsProps) {
  const toggleCondition = (condition: string) => {
    const next = values.conditions.includes(condition)
      ? values.conditions.filter((c) => c !== condition)
      : [...values.conditions, condition];
    onChange('conditions', next);
  };

  return (
    <>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {nameMode === 'single' ? (
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[#575859]">
              ชื่อ-นามสกุลคนไข้ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              disabled={disabled}
              readOnly={nameReadOnly}
              placeholder="ชื่อจริงตามบัตรประชาชน"
              className={`${inputBase} ${errors.name ? inputErr : inputOk} ${
                nameReadOnly ? inputLocked : ''
              }`}
            />
            <LockedHint show={nameReadOnly} />
            <FieldError message={errors.name} />
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-semibold text-[#575859]">
                ชื่อ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={values.firstName}
                onChange={(e) => onChange('firstName', e.target.value)}
                disabled={disabled}
                readOnly={nameReadOnly}
                placeholder="ชื่อจริงตามบัตรประชาชน"
                className={`${inputBase} ${errors.firstName ? inputErr : inputOk} ${
                  nameReadOnly ? inputLocked : ''
                }`}
              />
              <FieldError message={errors.firstName} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#575859]">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={values.lastName}
                onChange={(e) => onChange('lastName', e.target.value)}
                disabled={disabled}
                readOnly={nameReadOnly}
                placeholder="นามสกุลตามบัตรประชาชน"
                className={`${inputBase} ${errors.lastName ? inputErr : inputOk} ${
                  nameReadOnly ? inputLocked : ''
                }`}
              />
              <FieldError message={errors.lastName} />
            </div>
            {nameReadOnly && (
              <div className="md:col-span-2 -mt-2">
                <LockedHint show />
              </div>
            )}
          </>
        )}

        <div>
          <label className="text-xs font-semibold text-[#575859]">
            อายุ (ปี) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={values.age}
            onChange={(e) => onChange('age', e.target.value)}
            disabled={disabled}
            placeholder="72"
            className={`${inputBase} ${errors.age ? inputErr : inputOk}`}
          />
          <FieldError message={errors.age} />
        </div>

        <div>
          <label className="text-xs font-semibold text-[#575859]">
            เพศ <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5 flex gap-2">
            {GENDER_OPTIONS.map((g) => {
              const active = values.gender === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChange('gender', g)}
                  disabled={disabled}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-[#52B69A] border-[#52B69A] text-white'
                      : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
          <FieldError message={errors.gender} />
        </div>

        <div>
          <label className="text-xs font-semibold text-[#575859]">น้ำหนัก (กก.)</label>
          <input
            type="number"
            value={values.weight}
            onChange={(e) => onChange('weight', e.target.value)}
            disabled={disabled}
            placeholder="58"
            className={`${inputBase} ${inputOk}`}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[#575859]">ส่วนสูง (ซม.)</label>
          <input
            type="number"
            value={values.height}
            onChange={(e) => onChange('height', e.target.value)}
            disabled={disabled}
            placeholder="155"
            className={`${inputBase} ${inputOk}`}
          />
        </div>
      </div>

      {/* Support level */}
      <div className="mt-5">
        <div className="text-xs font-semibold text-[#575859]">
          ช่วยเหลือตัวเองได้แค่ไหน <span className="text-red-500">*</span>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {SUPPORT_LEVELS.map((o) => {
            const active = values.supportLevel === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange('supportLevel', o.id)}
                disabled={disabled}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition cursor-pointer ${
                  active
                    ? 'bg-[#F0FAF4] border-[#52B69A]'
                    : 'bg-white border-[#E0E2E5] hover:bg-gray-50'
                }`}
              >
                <span
                  className={`material-icons ${active ? 'text-[#52B69A]' : 'text-[#8A8C8E]'}`}
                  style={{ fontSize: 20 }}
                >
                  {o.icon}
                </span>
                <span>
                  <span className="block text-sm font-bold text-[#1A1A1A]">{o.label}</span>
                  <span className="block text-xs text-[#8A8C8E] mt-0.5">{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        {errors.supportLevel && (
          <p className="mt-2 text-[11px] text-red-500 font-semibold">{errors.supportLevel}</p>
        )}
      </div>

      {/* Health section — ทุกช่องไม่บังคับ */}
      <div className="mt-6 pt-5 border-t border-[#E0E2E5]">
        <h3 className="text-base font-bold text-[#1A1A1A]">
          ข้อมูลสุขภาพเพิ่มเติม <span className="font-semibold text-[#8A8C8E]">(ไม่บังคับ)</span>
        </h3>
        <p className="text-xs text-[#8A8C8E] mt-2">
          โรคประจำตัว ยา การแพ้ยา กรอกข้อมูลเพื่อช่วยให้ผู้ดูแลดูแลคุณได้อย่างปลอดภัยมากขึ้น
        </p>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[#575859]">กรุ๊ปเลือด</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {BLOOD_GROUPS.map((bg) => {
              const active = values.bloodGroup === bg;
              return (
                <button
                  key={bg}
                  type="button"
                  onClick={() => onChange('bloodGroup', bg)}
                  disabled={disabled}
                  className={`px-4 py-2 rounded-full border text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-[#52B69A] border-[#52B69A] text-white'
                      : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
                  }`}
                >
                  {bg}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#575859]">โรคประจำตัว</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PREDEFINED_CONDITIONS.map((c) => {
              const active = values.conditions.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCondition(c)}
                  disabled={disabled}
                  className={`px-4 py-2 rounded-full border text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-[#F0FAF4] border-[#52B69A] text-[#1B5C48]'
                      : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#575859]">ยาที่ทานประจำ</label>
            <input
              type="text"
              value={values.medicines}
              onChange={(e) => onChange('medicines', e.target.value)}
              disabled={disabled}
              placeholder="ชื่อยา · มื้อที่ทาน"
              className={`${inputBase} ${inputOk}`}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#575859]">แพ้ยา / แพ้อาหาร</label>
            <input
              type="text"
              value={values.allergies}
              onChange={(e) => onChange('allergies', e.target.value)}
              disabled={disabled}
              placeholder="เช่น แพ้เพนิซิลิน"
              className={`${inputBase} ${inputOk}`}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#575859]">
            สิ่งที่ผู้ดูแลควรรู้เพิ่มเติม
          </label>
          <textarea
            value={values.careInstructions}
            onChange={(e) => onChange('careInstructions', e.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="เช่น เพิ่งผ่าตัดสะโพก 2 สัปดาห์ ต้องพลิกตัวทุก 2 ชม."
            className={`${inputBase} ${inputOk} resize-none`}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[#575859]">
            โรงพยาบาลที่ใช้บริการประจำ
          </label>
          <input
            type="text"
            value={values.regularHospital}
            onChange={(e) => onChange('regularHospital', e.target.value)}
            disabled={disabled}
            placeholder="เช่น โรงพยาบาลศิริราช"
            className={`${inputBase} ${inputOk}`}
          />
        </div>
      </div>
    </>
  );
}
