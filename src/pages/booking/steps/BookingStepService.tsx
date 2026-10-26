import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useBooking, type BookingRequest } from '../../../context/BookingContext';
import CareActivityPicker from '../../../components/booking/CareActivityPicker';
import type { BookingActivity } from '../../../graphql/careActivities';
import { MY_FAMILY_GROUPS, type FamilyGroup } from '../../../graphql/familyGroup';
import type { ServicePackage } from '../../../graphql/servicePackages';
import RecommendedPackages from '../../../components/booking/RecommendedPackages';
import { usePackageTarget } from '../../../components/booking/usePackageTarget';
import { hourlyRateFor } from '../../../lib/bookingPrice';
import {
  PHYSIOTHERAPY_SERVICE_TYPE,
  SERVICE_TYPE_MAP,
  bookingServiceType,
} from '../../../lib/bookingServiceType';
import BookingMemberPicker from './BookingMemberPicker';

const LOC_OPTIONS = [
  {
    id: 'at_home' as const,
    icon: 'home',
    title: 'ที่บ้านผู้ป่วย',
    desc: 'ผู้ดูแลเดินทางไปที่บ้าน',
  },
  {
    id: 'accompany_outside' as const,
    icon: 'directions_walk',
    title: 'พาไปข้างนอก',
    desc: 'พาไปพบแพทย์ หรือทำธุระ',
  },
  {
    id: 'both' as const,
    icon: 'home_work',
    title: 'ทั้งสองแบบ',
    desc: 'ดูแลที่บ้านและพาออกไปด้วย',
  },
];

type LocOptionId = (typeof LOC_OPTIONS)[number]['id'];

// code = รหัส bookings.service_type (ชุดเดียวกับ SERVICE_TYPE_MAP ใน buildBookingPayload)
//   ใช้แปลงบริการในชุดที่แนะนำ (S14) ซึ่ง BE ส่งมาเป็นรหัส ให้ตรงกับตัวเลือกของหน้านี้
const SERVICE_OPTIONS = [
  { id: 'ดูแลทั่วไป', code: 'general_care', desc: 'อาบน้ำ แต่งตัว ป้อนอาหาร พยุงเดิน' },
  {
    id: 'ดูแลผู้ป่วยติดเตียง',
    code: 'bedridden_care',
    desc: 'พลิกตัว ป้องกันแผลกดทับ ดูแลสายให้อาหาร',
    homeOnly: true,
  },
  // PYG-698: id ภาษาไทยใช้เป็น key (SERVICE_TYPE_MAP ฯลฯ) ห้ามแก้ — แก้แค่ desc
  { id: 'กายภาพบำบัด', code: 'physiotherapy', desc: 'ฟื้นฟูร่างกายและการเคลื่อนไหว โดยนักกายภาพบำบัด' },
  { id: 'ช่วยจัดการยา', code: 'medication', desc: 'จัดยา เตือนเวลาทานตามแพทย์สั่ง' },
  { id: 'เป็นเพื่อน/พูดคุย', code: 'companion', desc: 'พูดคุย ทำกิจกรรม ลดความเหงา' },
];

const OPTION_ID_BY_CODE = new Map(SERVICE_OPTIONS.map((o) => [o.code, o.id]));
const CODE_BY_OPTION_ID = new Map(SERVICE_OPTIONS.map((o) => [o.id, o.code]));

const TASK_MAP: Record<string, string[]> = {
  'ดูแลทั่วไป': [
    'ช่วยอาบน้ำ แต่งตัว ทำความสะอาดร่างกาย',
    'ช่วยพยุงเดินและเคลื่อนย้าย',
    'จัดเตรียมอาหารและเครื่องดื่ม',
  ],
  'ดูแลผู้ป่วยติดเตียง': [
    'พลิกตัวป้องกันแผลกดทับ',
    'เช็ดตัวทำความสะอาดบนเตียง',
    'ดูแลสายให้อาหาร / สายปัสสาวะ',
  ],
  'กายภาพบำบัด': [
    'ประเมินร่างกายและการเคลื่อนไหวก่อนเริ่ม',
    'ทำกายภาพฟื้นฟูตามสภาพร่างกาย (บนเตียงหรือนอกเตียง)',
    'แนะนำท่าบริหารให้ญาติทำต่อที่บ้าน',
  ],
  'ช่วยจัดการยา': ['จัดยาตามมื้อที่แพทย์สั่ง', 'เตือนและดูแลการทานยาให้ครบ'],
  'เป็นเพื่อน/พูดคุย': ['พูดคุยเป็นเพื่อน คลายเหงา', 'ทำกิจกรรมยามว่าง เช่น อ่านหนังสือ'],
};

const EMPTY_ACTIVITIES: BookingActivity[] = [];

export default function BookingStepService() {
  const { bookingDraft, setBookingDraft, goToStep, setStepSubmit, setStepMissing } = useBooking();

  // PYG-635: เขียนลง draft ตรง ๆ (ไม่ผ่าน effect ของ tasks ด้านล่าง ซึ่ง spread jobDetails เดิมไว้แล้ว)
  const selectedActivities = bookingDraft?.jobDetails?.activities ?? EMPTY_ACTIVITIES;
  const setSelectedActivities = useCallback(
    (activities: BookingActivity[]) => {
      setBookingDraft((prev) => ({
        ...(prev || { serviceLocation: [], serviceTypes: [] }),
        jobDetails: { ...(prev?.jobDetails || {}), activities },
      }));
    },
    [setBookingDraft],
  );

  // Derive current "location option" (at_home / accompany_outside / both)
  const initialLocOption: LocOptionId | '' = (() => {
    const locs = bookingDraft?.serviceLocation || [];
    if (locs.length === 2) return 'both';
    if (locs.includes('at_home')) return 'at_home';
    if (locs.includes('accompany_outside')) return 'accompany_outside';
    return '';
  })();

  const [locOption, setLocOption] = useState<LocOptionId | ''>(initialLocOption);
  const [selectedServices, setSelectedServices] = useState<string[]>(
    bookingDraft?.serviceTypes || [],
  );
  // Tasks that user has explicitly deselected (auto-derived = all TASK_MAP keys for selected services)
  const [tasksOff, setTasksOff] = useState<string[]>(() => {
    const currentTaskNames = bookingDraft?.jobDetails?.tasks?.map((t) => t.name) || [];
    const allDerived: string[] = [];
    (bookingDraft?.serviceTypes || []).forEach((s) =>
      (TASK_MAP[s] || []).forEach((n) => allDerived.push(n)),
    );
    // tasks in allDerived but NOT in current = off
    return allDerived.filter((n) => !currentTaskNames.includes(n));
  });
  const [customTasks, setCustomTasks] = useState<{ id: string; name: string }[]>(
    bookingDraft?.jobDetails?.customTasks || [],
  );
  const [customTaskInput, setCustomTaskInput] = useState('');
  const [notes, setNotes] = useState(bookingDraft?.jobDetails?.notes || '');
  const [error, setError] = useState<string>('');

  // ── จองแทนสมาชิกกลุ่ม: เลือกคนตั้งแต่ขั้นนี้ (PYG-629) ───────────────────────────
  // เงื่อนไขเดียวกับขั้นผู้รับบริการ — มาจากปุ่ม "จองแทนสมาชิก" และยังอยู่ในกลุ่มอย่างน้อยหนึ่งกลุ่ม
  const gc = bookingDraft?.groupContext;
  const fromGroup = !!(gc || bookingDraft?.onBehalf);
  const { data: groupsData, loading: groupsLoading } = useQuery<{ myFamilyGroups: FamilyGroup[] }>(
    MY_FAMILY_GROUPS,
    { skip: !fromGroup, fetchPolicy: 'cache-and-network' },
  );
  const groups = groupsData?.myFamilyGroups ?? [];
  const memberMode = fromGroup && groups.length > 0;
  // ระหว่างโหลดกลุ่มยังไม่ให้ผ่าน ไม่งั้นกดถัดไปได้ก่อนเห็นรายชื่อสมาชิก
  const needsMember =
    fromGroup && (memberMode || (groupsLoading && groups.length === 0)) && !gc?.memberUserId;

  // ── ชุดบริการที่แนะนำ (S14 · PYG-629) ───────────────────────────────────────
  // ไม่อยู่กลุ่มไหนแล้ว → ขั้นผู้รับบริการกลับไปเป็นฟอร์มจองเอง ส่วนนี้ก็ต้องตามไปด้วย
  const bookingForMember = memberMode || (fromGroup && groupsLoading);
  const packageTarget = usePackageTarget({
    memberMode: bookingForMember,
    groupId: gc?.groupId,
    memberUserId: gc?.memberUserId,
    // โหมดจองแทน selectedRecipientId คือ memberUserId ที่ยืมมาเป็น key ไม่ใช่ id โปรไฟล์
    preferredRecipientId: bookingForMember ? undefined : bookingDraft?.recipient?.selectedRecipientId,
  });
  const [pickedPackage, setPickedPackage] = useState<BookingRequest['servicePackage']>(
    bookingDraft?.servicePackage,
  );
  // ชุดที่เลือกไว้ของผู้สูงอายุคนเดิมต้องไม่ติดมาเมื่อเปลี่ยนคน (E3)
  //   ยังหาคนไม่เสร็จ (ไม่มี key) → ยังไม่ตัดสิน คงค่าเดิมไว้
  const targetKey = 'key' in packageTarget ? packageTarget.key : null;
  const activePackage =
    pickedPackage && targetKey && pickedPackage.recipientKey !== targetKey
      ? undefined
      : pickedPackage;

  const isAccompanyOnly = locOption === 'accompany_outside';

  // Auto-remove bedridden if location becomes accompany-only
  useEffect(() => {
    if (isAccompanyOnly && selectedServices.includes('ดูแลผู้ป่วยติดเตียง')) {
      setSelectedServices((prev) => prev.filter((s) => s !== 'ดูแลผู้ป่วยติดเตียง'));
    }
  }, [isAccompanyOnly, selectedServices]);

  // Task groups derived from selected services
  const taskGroups = useMemo(
    () =>
      selectedServices.map((svc) => ({
        title: svc,
        items: (TASK_MAP[svc] || []).map((name) => ({
          name,
          on: !tasksOff.includes(name),
        })),
      })),
    [selectedServices, tasksOff],
  );

  const activeTasksCount = useMemo(
    () =>
      taskGroups.reduce((sum, g) => sum + g.items.filter((t) => t.on).length, 0) +
      customTasks.length,
    [taskGroups, customTasks],
  );

  // Auto-save to bookingDraft
  useEffect(() => {
    const serviceLocation: ('at_home' | 'accompany_outside')[] =
      locOption === 'both'
        ? ['at_home', 'accompany_outside']
        : locOption === 'at_home'
          ? ['at_home']
          : locOption === 'accompany_outside'
            ? ['accompany_outside']
            : [];

    const tasks: { id: string; name: string }[] = [];
    selectedServices.forEach((svc) => {
      (TASK_MAP[svc] || []).forEach((name) => {
        if (!tasksOff.includes(name)) {
          tasks.push({ id: `${svc}-${name}`, name });
        }
      });
    });

    setBookingDraft((prev) => ({
      ...(prev || { serviceLocation: [], serviceTypes: [] }),
      serviceLocation,
      serviceTypes: selectedServices,
      jobDetails: {
        ...(prev?.jobDetails || {}),
        tasks,
        customTasks,
        notes,
      },
      servicePackage: activePackage,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locOption, selectedServices, tasksOff, customTasks, notes, activePackage]);

  // Submit → validate → goToStep(2)
  const handleSubmit = () => {
    if (needsMember) {
      setError('กรุณาเลือกสมาชิกที่จะจองให้');
      return;
    }
    if (!locOption) {
      setError('กรุณาเลือกสถานที่ให้บริการ');
      return;
    }
    if (selectedServices.length === 0) {
      setError('กรุณาเลือกงานที่ต้องการอย่างน้อย 1 อย่าง');
      return;
    }
    if (activeTasksCount === 0) {
      setError('แผนงานว่างอยู่ — เลือกงานย่อยไว้อย่างน้อย 1 งาน');
      return;
    }
    setError('');
    goToStep(2);
  };

  // Report missing required fields so the sticky "Next" button can disable itself
  useEffect(() => {
    const missing: string[] = [];
    if (needsMember) missing.push('สมาชิกที่จะจองให้');
    if (!locOption) missing.push('สถานที่ให้บริการ');
    if (selectedServices.length === 0) missing.push('งานที่ต้องการ');
    else if (activeTasksCount === 0) missing.push('งานย่อยอย่างน้อย 1 งาน');
    setStepMissing(missing);
    return () => setStepMissing([]);
  }, [needsMember, locOption, selectedServices, activeTasksCount, setStepMissing]);

  // Register submit for sticky bottom nav
  const submitRef = useRef<() => void>(() => {});
  submitRef.current = handleSubmit;
  useEffect(() => {
    setStepSubmit(() => submitRef.current());
    return () => setStepSubmit(null);
  }, [setStepSubmit]);

  const toggleService = (id: string, disabled: boolean) => {
    if (disabled) return;
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const toggleTask = (name: string, currentlyOn: boolean) => {
    setTasksOff((prev) => (currentlyOn ? [...prev, name] : prev.filter((n) => n !== name)));
  };

  const addCustomTask = () => {
    const trimmed = customTaskInput.trim();
    if (!trimmed) return;
    if (customTasks.some((t) => t.name === trimmed)) return;
    setCustomTasks((prev) => [...prev, { id: `custom-${Date.now()}`, name: trimmed }]);
    setCustomTaskInput('');
  };

  const removeCustomTask = (id: string) => {
    setCustomTasks((prev) => prev.filter((t) => t.id !== id));
  };

  /**
   * เลือกชุด = เติมบริการของชุดแทนที่บริการที่เลือกอยู่ (ทางลัด ไม่ใช่การล็อก)
   * หลังจากนี้เพิ่ม/เอาบริการออกเองได้ตามปกติ (E5) การ์ดชุดจะขึ้นว่า "ปรับบริการเอง"
   * ★ รหัสที่หน้านี้ไม่รู้จักถูกข้าม — BE เพิ่มประเภทใหม่ทีหลังต้องไม่ทำให้หน้าพัง
   */
  const pickPackage = (pkg: ServicePackage) => {
    if (!targetKey) return;
    const ids = pkg.items
      .map((item) => OPTION_ID_BY_CODE.get(item.serviceType))
      .filter((id): id is string => !!id);
    setSelectedServices(ids);
    setPickedPackage({
      id: pkg.id,
      serviceTypes: pkg.items.map((item) => item.serviceType),
      recipientKey: targetKey,
    });
    setError('');
  };

  const selectedCodes = selectedServices
    .map((id) => CODE_BY_OPTION_ID.get(id))
    .filter((code): code is string => !!code);
  // มติ E6: ส่งประเภทที่เลือกให้ BE คำนวณป้ายของแต่ละชุด — ตอนนี้ยังเลือกได้หลายบริการ
  //   จึงส่งเฉพาะตอนเลือกอยู่บริการเดียว (หลายบริการ = ไม่มี "ประเภทที่เลือก" ค่าเดียว → flag เป็น null)
  const singleSelected = selectedServices.length === 1 ? selectedServices[0] : null;

  // PYG-696: มีกายภาพในบริการที่ติ๊ก → จองเป็นกายภาพทั้งใบ · ใช้ helper เดียวกับ payload/ราคา
  //   กล่องแจ้งจึงขึ้นตรงกับสิ่งที่ส่งไป BE เสมอ
  const physioWholeBooking = bookingServiceType(selectedServices) === PHYSIOTHERAPY_SERVICE_TYPE;
  const servicesInPhysioPrice = selectedServices.filter(
    (name) => SERVICE_TYPE_MAP[name] !== PHYSIOTHERAPY_SERVICE_TYPE,
  );

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-[#FEF2F2] border border-red-200 rounded-xl"
        >
          <span className="material-icons text-red-600 text-lg">error</span>
          <div className="text-sm font-semibold text-red-700">{error}</div>
        </div>
      )}

      {/* จองแทนสมาชิก: เลือกคนก่อน — ข้อมูลของคนนั้นกรอกที่ขั้นผู้รับบริการ */}
      {memberMode && <BookingMemberPicker groups={groups} />}

      {/* S14: ชุดบริการที่แนะนำตามกลุ่มของผู้สูงอายุ — คำแนะนำเท่านั้น ไม่กันการไปขั้นถัดไป */}
      <RecommendedPackages
        target={packageTarget}
        selectedServiceType={singleSelected ? CODE_BY_OPTION_ID.get(singleSelected) ?? null : null}
        selectedServiceName={singleSelected}
        selectedCodes={selectedCodes}
        picked={activePackage}
        onPick={pickPackage}
        onUnpick={() => setPickedPackage(undefined)}
      />

      {/* Card 1: Service Location */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">ต้องการให้ดูแลที่ไหน</h2>
        <p className="text-sm text-[#8A8C8E] mt-1">เลือก 1 ข้อ · เปลี่ยนได้ตลอดก่อนยืนยัน</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {LOC_OPTIONS.map((opt) => {
            const active = locOption === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLocOption(opt.id)}
                className={`flex flex-col items-center text-center px-4 py-6 rounded-xl border-2 transition cursor-pointer ${
                  active
                    ? 'border-[#52B69A] bg-[#F0FAF4]'
                    : 'border-[#E0E2E5] bg-white hover:border-gray-300'
                }`}
              >
                <span
                  className={`material-icons text-[30px] ${active ? 'text-[#52B69A]' : 'text-[#8A8C8E]'}`}
                >
                  {opt.icon}
                </span>
                <span className="mt-2 text-sm font-bold text-[#1A1A1A]">{opt.title}</span>
                <span className="mt-1 text-xs text-[#8A8C8E] leading-snug">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Card 2: Service Types */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">ต้องการให้ช่วยเรื่องอะไร</h2>
        <p className="text-sm text-[#8A8C8E] mt-1">
          เลือกได้มากกว่า 1 ข้อ · เลือกแล้ว {selectedServices.length} รายการ
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {SERVICE_OPTIONS.map((opt) => {
            const disabled = opt.homeOnly && isAccompanyOnly;
            const active = selectedServices.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleService(opt.id, !!disabled)}
                disabled={disabled}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${
                  disabled
                    ? 'bg-gray-50 border-[#E0E2E5] opacity-50 cursor-not-allowed'
                    : active
                      ? 'bg-[#F0FAF4] border-[#52B69A] cursor-pointer'
                      : 'bg-white border-[#E0E2E5] hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <span
                  className={`flex-none w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                    active ? 'bg-[#52B69A] border-[#52B69A]' : 'bg-white border-[#C6C8CB]'
                  }`}
                >
                  {active && (
                    <span className="material-icons text-white" style={{ fontSize: 18 }}>
                      check
                    </span>
                  )}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-[#1A1A1A]">{opt.id}</span>
                  <span className="block text-xs text-[#8A8C8E] mt-0.5 leading-snug">
                    {opt.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {physioWholeBooking && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2.5 p-3 bg-[#F0FAF4] border border-[#BFE0D6] rounded-lg"
          >
            <span className="material-icons text-[#52B69A]" style={{ fontSize: 20 }}>
              info
            </span>
            <div className="text-xs text-[#1B5C48] leading-relaxed">
              <div className="text-sm font-bold">
                คิดราคากายภาพ {hourlyRateFor(PHYSIOTHERAPY_SERVICE_TYPE).toLocaleString()} ฿/ชม.
                ทั้งการจอง
              </div>
              <div className="mt-0.5">
                {servicesInPhysioPrice.length > 0
                  ? `${servicesInPhysioPrice.join(', ')} คิดรวมในราคานี้ และระบบจะจับคู่เฉพาะนักกายภาพบำบัด`
                  : 'ระบบจะจับคู่เฉพาะนักกายภาพบำบัด'}
              </div>
            </div>
          </div>
        )}
        {isAccompanyOnly && selectedServices.includes('ดูแลผู้ป่วยติดเตียง') && (
          <p className="mt-3 text-xs text-[#6B5A21] bg-[#FDF6E3] border border-[#E8D9A8] rounded-lg p-3 leading-relaxed">
            "ดูแลผู้ป่วยติดเตียง" ใช้ได้เฉพาะงานที่มีการดูแลที่บ้าน — เลือก "ที่บ้านผู้ป่วย" หรือ
            "ทั้งสองแบบ" เพื่อเปิดใช้
          </p>
        )}
      </section>

      {/* Card 3: Task Plan (auto-derived + custom) */}
      {selectedServices.length > 0 && (
        <section className="bg-white p-6 rounded-2xl border border-gray-100">
          <h2 className="text-lg font-bold text-[#1A1A1A]">แผนงานที่ผู้ดูแลจะทำ</h2>
          <p className="text-sm text-[#8A8C8E] mt-1 leading-relaxed">
            ระบบเลือกงานย่อยจากบริการที่คุณเลือกไว้แล้ว{' '}
            <b className="font-bold text-[#1B5C48]">{activeTasksCount} งาน</b> —
            เอาออกได้ถ้าไม่ต้องการ
          </p>

          {taskGroups.map((g) => (
            <div key={g.title} className="mt-5">
              <div className="text-xs font-bold text-[#52B69A] tracking-wide">{g.title}</div>
              <div className="mt-2 flex flex-col gap-2">
                {g.items.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => toggleTask(t.name, t.on)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                      t.on
                        ? 'bg-[#F6FBF9] border-[#BFE0D6]'
                        : 'bg-white border-[#E0E2E5] hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex-none w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                        t.on ? 'bg-[#52B69A] border-[#52B69A]' : 'bg-white border-[#C6C8CB]'
                      }`}
                    >
                      {t.on && (
                        <span className="material-icons text-white" style={{ fontSize: 16 }}>
                          check
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-[#1A1A1A] leading-snug">
                      {t.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom tasks */}
          <div className="mt-5 pt-4 border-t border-dashed border-[#E0E2E5]">
            <div className="text-xs font-bold text-[#575859]">งานพิเศษที่อยากเพิ่ม (ไม่บังคับ)</div>
            {customTasks.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {customTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2.5 bg-[#F0FAF4] border border-[#52B69A]/40 rounded-xl p-3"
                  >
                    <span className="material-icons text-[#52B69A]" style={{ fontSize: 18 }}>
                      star
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#1B5C48] leading-snug">
                      {t.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCustomTask(t.id)}
                      aria-label="ลบงานพิเศษ"
                      className="text-[#8A8C8E] hover:text-red-500 cursor-pointer"
                    >
                      <span className="material-icons" style={{ fontSize: 20 }}>
                        delete
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2.5 flex gap-2 flex-wrap">
              <input
                type="text"
                value={customTaskInput}
                onChange={(e) => setCustomTaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTask();
                  }
                }}
                placeholder="เช่น พาหัดเดินตอน 17:00 น."
                className="flex-1 min-w-[200px] p-3 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
              />
              <button
                type="button"
                onClick={addCustomTask}
                className="px-5 py-3 bg-white border border-[#52B69A] text-[#52B69A] rounded-xl text-sm font-bold hover:bg-[#F0FAF4] transition cursor-pointer"
              >
                เพิ่มงาน
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-5 pt-4 border-t border-[#E0E2E5]">
            <div className="text-xs font-bold text-[#575859]">
              ข้อควรระวังหรือหมายเหตุถึงผู้ดูแล (ไม่บังคับ)
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={
                physioWholeBooking
                  ? 'เช่น เพิ่งผ่าตัดสะโพก 2 สัปดาห์ ปวดเข่าขวา อยากกลับมาเดินเองได้'
                  : 'เช่น ระวังเรื่องการลุกนั่งจากเก้าอี้กระทันหัน, ผู้สูงอายุมีปัญหาการทรงตัว'
              }
              className="mt-2 w-full p-3 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A] resize-none"
              maxLength={500}
            />
            <div className="text-[11px] text-[#8A8C8E] text-right mt-1">
              {notes.length}/500 ตัวอักษร
            </div>
          </div>
        </section>
      )}

      {/* PYG-635: กิจกรรมจากรายการกลาง — แยกจากงานพิเศษที่พิมพ์เอง · ไม่บังคับ */}
      <CareActivityPicker value={selectedActivities} onChange={setSelectedActivities} />
    </div>
  );
}
