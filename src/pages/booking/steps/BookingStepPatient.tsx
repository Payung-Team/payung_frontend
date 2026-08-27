import { useEffect, useMemo, useRef, useState } from 'react';
import { useBooking } from '../../../context/BookingContext';

const PREDEFINED_CONDITIONS = ['เบาหวาน', 'ความดันสูง', 'โรคหัวใจ', 'สมองเสื่อม'];

const SUPPORT_LEVELS = [
  {
    id: 'ช่วยเหลือตัวเองได้ดี',
    icon: 'directions_walk',
    label: 'ช่วยเหลือตัวเองได้ดี',
    desc: 'เดิน กินข้าว เข้าห้องน้ำได้เอง',
  },
  {
    id: 'ช่วยเหลือตัวเองได้เล็กน้อย / ต้องการการช่วยพยุงเดิน',
    icon: 'accessible',
    label: 'ต้องมีคนช่วยพยุง',
    desc: 'เดินได้ช้า ต้องช่วยประคอง',
  },
  {
    id: 'ช่วยเหลือตัวเองไม่ได้ / ติดเตียง',
    icon: 'bed',
    label: 'ช่วยเหลือตัวเองไม่ได้ / ติดเตียง',
    desc: 'ต้องพลิกตัวและป้อนอาหาร',
  },
];

const BLOOD_GROUPS = ['A', 'B', 'AB', 'O', 'A+', 'B+', 'AB+', 'O+'];

const SAVED_PROFILE = {
  name: 'สมศรี วงศ์ดี',
  age: '65',
  gender: 'หญิง' as const,
  weight: '58',
  height: '155',
  supportLevel: 'ช่วยเหลือตัวเองได้เล็กน้อย / ต้องการการช่วยพยุงเดิน',
  conditions: ['เบาหวาน', 'ความดันสูง'],
  medicines: 'ยาลดความดัน, ยาเบาหวาน',
  allergies: 'แพ้ยาเพนิซิลิน',
  bloodGroup: 'B',
  careInstructions:
    'เพิ่งผ่าตัดเปลี่ยนสะโพก 2 สัปดาห์ ยังช่วยพยุงเดินช้า จำเป็นต้องพลิกตัวสม่ำเสมอ',
  regularHospital: 'รพ.รามาธิบดี',
};

export default function BookingStepPatient() {
  const { bookingDraft, setBookingDraft, goToStep, setStepSubmit } = useBooking();

  const [name, setName] = useState(bookingDraft?.recipient?.patientDetails?.name || '');
  const [age, setAge] = useState(
    bookingDraft?.recipient?.patientDetails?.age?.toString() || '',
  );
  const [gender, setGender] = useState<'ชาย' | 'หญิง' | ''>(
    bookingDraft?.recipient?.patientDetails?.gender || '',
  );
  const [weight, setWeight] = useState(
    bookingDraft?.recipient?.patientDetails?.weight?.toString() || '',
  );
  const [height, setHeight] = useState(
    bookingDraft?.recipient?.patientDetails?.height?.toString() || '',
  );
  const [supportLevel, setSupportLevel] = useState(
    bookingDraft?.recipient?.patientDetails?.supportLevel || '',
  );
  const [bloodGroup, setBloodGroup] = useState(
    bookingDraft?.recipient?.patientDetails?.bloodGroup || '',
  );
  const [conditions, setConditions] = useState<string[]>(
    bookingDraft?.recipient?.patientDetails?.conditions || [],
  );
  const [medicines, setMedicines] = useState(
    bookingDraft?.recipient?.patientDetails?.medicines || '',
  );
  const [allergies, setAllergies] = useState(
    bookingDraft?.recipient?.patientDetails?.allergies || '',
  );
  const [careInstructions, setCareInstructions] = useState(
    bookingDraft?.recipient?.patientDetails?.careInstructions || '',
  );
  const [regularHospital, setRegularHospital] = useState(
    bookingDraft?.recipient?.patientDetails?.regularHospital || '',
  );
  const [showHealth, setShowHealth] = useState(false);

  // Contact person
  const [contactName, setContactName] = useState(bookingDraft?.contactPerson?.name || '');
  const [contactPhone, setContactPhone] = useState(bookingDraft?.contactPerson?.phone || '');
  const [contactRel, setContactRel] = useState(
    bookingDraft?.contactPerson?.relationship || '',
  );

  const [error, setError] = useState<Record<string, string>>({});

  const isProfileFilled = useMemo(() => name === SAVED_PROFILE.name, [name]);

  // Auto-save
  useEffect(() => {
    setBookingDraft((prev) => ({
      ...(prev || { serviceLocation: [], serviceTypes: [] }),
      recipient: {
        type: 'self',
        patientDetails: {
          name,
          age: Number(age) || 0,
          gender,
          weight: weight ? Number(weight) : undefined,
          height: height ? Number(height) : undefined,
          supportLevel,
          conditions,
          medicines,
          allergies,
          bloodGroup,
          careInstructions,
          regularHospital,
        },
      },
      contactPerson: { name: contactName, phone: contactPhone, relationship: contactRel },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    age,
    gender,
    weight,
    height,
    supportLevel,
    bloodGroup,
    conditions,
    medicines,
    allergies,
    careInstructions,
    regularHospital,
    contactName,
    contactPhone,
    contactRel,
  ]);

  const handleUseProfile = () => {
    setName(SAVED_PROFILE.name);
    setAge(SAVED_PROFILE.age);
    setGender(SAVED_PROFILE.gender);
    setWeight(SAVED_PROFILE.weight);
    setHeight(SAVED_PROFILE.height);
    setSupportLevel(SAVED_PROFILE.supportLevel);
    setBloodGroup(SAVED_PROFILE.bloodGroup);
    setConditions([...SAVED_PROFILE.conditions]);
    setMedicines(SAVED_PROFILE.medicines);
    setAllergies(SAVED_PROFILE.allergies);
    setCareInstructions(SAVED_PROFILE.careInstructions);
    setRegularHospital(SAVED_PROFILE.regularHospital);
  };

  const handleClearPatient = () => {
    setName('');
    setAge('');
    setGender('');
    setWeight('');
    setHeight('');
    setSupportLevel('');
    setBloodGroup('');
    setConditions([]);
    setMedicines('');
    setAllergies('');
    setCareInstructions('');
    setRegularHospital('');
    setShowHealth(true);
  };

  const toggleCondition = (cond: string) => {
    setConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond],
    );
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'กรุณากรอกชื่อคนไข้';
    if (!age.trim()) errs.age = 'กรุณากรอกอายุ';
    if (!gender) errs.gender = 'กรุณาเลือกเพศ';
    if (!supportLevel) errs.supportLevel = 'กรุณาเลือกระดับการช่วยเหลือตนเอง';
    if (!contactName.trim()) errs.contactName = 'กรุณากรอกชื่อผู้ติดต่อ';
    if (!contactPhone.trim() || contactPhone.length !== 10)
      errs.contactPhone = 'เบอร์โทรต้องมี 10 หลัก';
    if (!contactRel) errs.contactRel = 'กรุณาเลือกความสัมพันธ์';
    setError(errs);
    if (Object.keys(errs).length === 0) goToStep(5);
  };

  const submitRef = useRef<() => void>(() => {});
  submitRef.current = handleSubmit;
  useEffect(() => {
    setStepSubmit(() => submitRef.current());
    return () => setStepSubmit(null);
  }, [setStepSubmit]);

  return (
    <div className="space-y-4">
      {/* Hero: use profile vs new patient */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">ผู้รับบริการคือใคร</h2>
        <p className="text-sm text-[#8A8C8E] mt-1">
          ผู้ดูแลเห็นข้อมูลนี้ก่อนเริ่มงาน กรอกเท่าที่จำเป็นตอนนี้ก็ได้
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleUseProfile}
            className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition cursor-pointer ${
              isProfileFilled
                ? 'border-[#52B69A] bg-[#F0FAF4]'
                : 'border-[#E0E2E5] bg-white hover:border-gray-300'
            }`}
          >
            <span className="material-icons text-[#52B69A]" style={{ fontSize: 24 }}>
              badge
            </span>
            <span className="mt-2 text-sm font-bold text-[#1A1A1A]">สมศรี วงศ์ดี · 65 ปี</span>
            <span className="mt-1 text-xs text-[#8A8C8E]">
              โปรไฟล์ที่บันทึกไว้ · เติมครบทุกช่อง
            </span>
          </button>
          <button
            type="button"
            onClick={handleClearPatient}
            className="flex flex-col items-start p-4 rounded-xl border-2 border-[#E0E2E5] bg-white text-left hover:border-gray-300 transition cursor-pointer"
          >
            <span className="material-icons text-[#8A8C8E]" style={{ fontSize: 24 }}>
              person_add
            </span>
            <span className="mt-2 text-sm font-bold text-[#1A1A1A]">กรอกคนไข้รายใหม่</span>
            <span className="mt-1 text-xs text-[#8A8C8E]">ใช้เวลาประมาณ 1 นาที</span>
          </button>
        </div>
      </section>

      {/* Patient info */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h3 className="text-base font-bold text-[#1A1A1A]">ข้อมูลที่ผู้ดูแลต้องรู้</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[#575859]">
              ชื่อ-นามสกุลคนไข้ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อจริงตามบัตรประชาชน"
              className={`mt-1.5 w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
                error.name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[#E0E2E5] focus:ring-[#52B69A]'
              }`}
            />
            {error.name && (
              <p className="mt-1 text-[11px] text-red-500 font-semibold">{error.name}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#575859]">
              อายุ (ปี) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="72"
              className={`mt-1.5 w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
                error.age
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[#E0E2E5] focus:ring-[#52B69A]'
              }`}
            />
            {error.age && (
              <p className="mt-1 text-[11px] text-red-500 font-semibold">{error.age}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#575859]">
              เพศ <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 flex gap-2">
              {(['หญิง', 'ชาย'] as const).map((g) => {
                const active = gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
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
            {error.gender && (
              <p className="mt-1 text-[11px] text-red-500 font-semibold">{error.gender}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#575859]">น้ำหนัก (กก.)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="58"
              className="mt-1.5 w-full p-3 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#575859]">ส่วนสูง (ซม.)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="155"
              className="mt-1.5 w-full p-3 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
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
              const active = supportLevel === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSupportLevel(o.id)}
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
          {error.supportLevel && (
            <p className="mt-2 text-[11px] text-red-500 font-semibold">{error.supportLevel}</p>
          )}
        </div>

        {/* Health section (collapsible) */}
        <button
          type="button"
          onClick={() => setShowHealth((v) => !v)}
          aria-expanded={showHealth}
          className="mt-5 w-full flex items-center justify-between gap-3 p-4 bg-[#F6FAF9] border border-[#E0E2E5] rounded-xl text-left hover:bg-gray-50 transition cursor-pointer"
        >
          <span>
            <span className="block text-sm font-bold text-[#1A1A1A]">ข้อมูลสุขภาพเพิ่มเติม</span>
            <span className="block text-xs text-[#8A8C8E] mt-0.5">
              โรคประจำตัว ยา การแพ้ยา — ไม่บังคับ แต่ช่วยให้ดูแลปลอดภัยขึ้น
            </span>
          </span>
          <span className="material-icons text-[#575859]">
            {showHealth ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {showHealth && (
          <div className="mt-4 space-y-4">
            {/* Blood group */}
            <div>
              <label className="text-xs font-semibold text-[#575859]">กรุ๊ปเลือด</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {BLOOD_GROUPS.map((bg) => {
                  const active = bloodGroup === bg;
                  return (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
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

            {/* Conditions */}
            <div>
              <label className="text-xs font-semibold text-[#575859]">โรคประจำตัว</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PREDEFINED_CONDITIONS.map((c) => {
                  const active = conditions.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCondition(c)}
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
                <label className="text-xs font-semibold text-[#575859]">
                  ยาที่ทานประจำ
                </label>
                <input
                  type="text"
                  value={medicines}
                  onChange={(e) => setMedicines(e.target.value)}
                  placeholder="ชื่อยา · มื้อที่ทาน"
                  className="mt-1.5 w-full p-3 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#575859]">
                  แพ้ยา / แพ้อาหาร
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="เช่น แพ้เพนิซิลิน"
                  className="mt-1.5 w-full p-3 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#575859]">
                สิ่งที่ผู้ดูแลควรรู้เพิ่มเติม
              </label>
              <textarea
                value={careInstructions}
                onChange={(e) => setCareInstructions(e.target.value)}
                rows={3}
                placeholder="เช่น เพิ่งผ่าตัดสะโพก 2 สัปดาห์ ต้องพลิกตัวทุก 2 ชม."
                className="mt-1.5 w-full p-3 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A] resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#575859]">
                โรงพยาบาลที่ใช้บริการประจำ
              </label>
              <input
                type="text"
                value={regularHospital}
                onChange={(e) => setRegularHospital(e.target.value)}
                placeholder="เช่น โรงพยาบาลศิริราช"
                className="mt-1.5 w-full p-3 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
              />
            </div>
          </div>
        )}
      </section>

      {/* Contact person */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h3 className="text-base font-bold text-[#1A1A1A]">ติดต่อใครได้ในวันนัดหมาย</h3>
        <p className="text-sm text-[#8A8C8E] mt-1">ผู้ดูแลจะโทรเบอร์นี้หากมีเหตุฉุกเฉิน</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#575859]">
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="สมบูรณ์ ดีจริง"
              className={`mt-1.5 w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
                error.contactName
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[#E0E2E5] focus:ring-[#52B69A]'
              }`}
            />
            {error.contactName && (
              <p className="mt-1 text-[11px] text-red-500 font-semibold">{error.contactName}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-[#575859]">
              เบอร์โทรศัพท์ <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={contactPhone}
              onChange={(e) =>
                setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
              }
              placeholder="0891234567"
              className={`mt-1.5 w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
                error.contactPhone
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[#E0E2E5] focus:ring-[#52B69A]'
              }`}
            />
            <p className="mt-1 text-[11px] text-[#8A8C8E]">
              {error.contactPhone
                ? error.contactPhone
                : `ตัวเลข 10 หลัก · ${contactPhone.length}/10`}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[#575859]">
              ความสัมพันธ์ <span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {['บุตร', 'คู่สมรส', 'ญาติ', 'ตัวคนไข้เอง'].map((r) => {
                const active = contactRel === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setContactRel(r)}
                    className={`px-4 py-2 rounded-full border text-sm font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-[#F0FAF4] border-[#52B69A] text-[#1B5C48]'
                        : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            {error.contactRel && (
              <p className="mt-1 text-[11px] text-red-500 font-semibold">{error.contactRel}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
