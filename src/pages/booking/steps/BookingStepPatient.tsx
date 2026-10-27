import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../../context/BookingContext';
import { supabase } from '../../../lib/supabase';
import { type PatientProfile } from '../../../lib/patientProfile';
import { assessmentPath } from '../../../lib/assessmentNav';
import { useAssessmentStrings } from '../../../lib/assessmentStrings';
import BookingAssessmentGate from '../../../components/assessment/BookingAssessmentGate';
import InfectionDisclosureEditor from '../../../components/infection/InfectionDisclosureEditor';
import { readRecipientInfection } from '../../../lib/infectionDisclosure';
import { useInfectionStrings } from '../../../lib/infectionStrings';
import {
  MY_FAMILY_GROUPS,
  GROUP_BOOKING_RECIPIENTS,
  type FamilyGroup,
  type GroupBookingRecipient,
} from '../../../graphql/familyGroup';
import { GroupAvatar } from '../../family/components/familyUi';
// PYG-500: ตัวเลือกย้ายไปอยู่ที่เดียวแล้ว — หน้า Onboarding ใช้ชุดเดียวกันนี้
import { REL_OPTIONS, type GenderOption } from '../../../components/patient/patientFieldOptions';
import PatientDetailsFields from '../../../components/patient/PatientDetailsFields';

const API_BASE = ((import.meta.env.VITE_GRAPHQL_URL as string) || 'http://localhost:3000/graphql')
  .replace('/graphql', '');

/** โปรไฟล์ผู้รับบริการที่ผู้ใช้เคยบันทึกไว้ — GET /api/v1/patient/care-recipients */
interface SavedRecipient {
  id: string;
  name: string;
  nickname?: string | null;
  /**
   * PYG-502 — โปรไฟล์ "ของตัวเอง" ที่สร้างตอน Onboarding
   *
   * ⚠ optional เพราะ BE เพิ่งเริ่มคืนค่านี้ (PYG-502) — ระหว่างที่ FE ขึ้นก่อน BE
   *   ทุกใบจะเป็น undefined แล้วหน้าจอกลับไปเป็นลิสต์ธรรมดาแบบเดิม ไม่พัง
   */
  isSelf?: boolean;
  /**
   * S08 · PYG-610 — มีแบบประเมิน ADL แล้วหรือยัง (ไม่มี = BE ไม่ให้จอง, R11)
   * undefined = BE ไม่ได้ส่งมา (เช่น ใบที่ยืมจากโหมดจองแทน) → ไม่กันที่หน้านี้ ปล่อยให้ BE ตัดสิน
   */
  hasAssessment?: boolean;
  /** S10 · PYG-620 — อ่านผ่าน readRecipientInfection เท่านั้น · ห้ามคัดลอกลง draft (sessionStorage) */
  hasInfectiousDisease?: boolean | null;
  /**
   * ข้อมูลสุขภาพที่จะเติมให้อัตโนมัติเมื่อเลือกโปรไฟล์นี้
   *
   * ⚠ อาจไม่มีคีย์นี้เลย (ไม่ใช่ `{}`) ในโปรไฟล์ที่ไม่เคยกรอกข้อมูลสุขภาพ
   * ⚠ age / weight / height เป็น number ตาม API — ไม่ใช่ string เหมือน input state
   *   จึงต้อง String() ก่อนใส่ลงช่องกรอก (ดู handleSelectRecipient)
   */
  details?: PatientProfile | null;
}



/**
 * Step 4 "ผู้รับบริการ".
 *   Started from the family group page ("จองแทนสมาชิก") → pick any other ACTIVE member,
 *   booking on their behalf (MemberBookingSection).
 *   Any other booking (or a user in no group) → the standard patient form (SelfPatientForm).
 */
export default function BookingStepPatient() {
  const { bookingDraft } = useBooking();
  const gc = bookingDraft?.groupContext;

  const { data } = useQuery<{ myFamilyGroups: FamilyGroup[] }>(MY_FAMILY_GROUPS, {
    fetchPolicy: 'cache-and-network',
  });
  const groups = data?.myFamilyGroups ?? [];
  // The chooser only belongs to the family-group entry ("จองแทนสมาชิก"); a normal booking
  // goes straight to the self form even when the user happens to be in a group.
  const fromGroup = !!(gc || bookingDraft?.onBehalf);
  // The "จองแทนสมาชิก" flow goes straight to member selection — no self/member chooser.
  const memberFlow = fromGroup && groups.length > 0;

  return (
    <div className="space-y-4">
      {memberFlow ? (
        <MemberBookingSection groups={groups} gc={gc} />
      ) : (
        <SelfPatientForm />
      )}
    </div>
  );
}


/**
 * PYG-519 — GroupBookingRecipient → รูปทรง SavedRecipient ที่ฟอร์มใช้เติมค่าอยู่แล้ว
 *
 * ★ คืน array ว่างเมื่อยังไม่มีโปรไฟล์ในกลุ่ม — ไม่ใช่ใบเปล่า
 *   ใบเปล่าจะทำให้ฟอร์มคิดว่า "เลือกโปรไฟล์แล้ว" แล้วส่ง careRecipientId ที่ไม่มีจริง
 *
 * ★ ที่อยู่ไม่ได้อยู่ใน SavedRecipient.details — ฟอร์มขั้นนี้ไม่มีช่องที่อยู่
 *   (อยู่คนละขั้นของ flow จอง) จึงยังไม่ส่งต่อ
 */
function toSavedRecipients(member: GroupBookingRecipient): SavedRecipient[] {
  if (!member.hasProfile || !member.details) return [];
  const d = member.details;
  return [
    {
      // ยังไม่มี id ของโปรไฟล์จาก query นี้ (BE ตั้งใจคืน "คน" ไม่ใช่ "โปรไฟล์")
      // ใช้ memberUserId เป็น key ชั่วคราว — ฟอร์มใช้แค่เติมค่า ไม่ได้ส่ง id นี้ขึ้น BE
      // เพราะเส้นทางจองแทนส่ง memberUserId ให้ BE หาโปรไฟล์เอง
      id: member.memberUserId,
      name: member.name,
      nickname: member.nickname ?? undefined,
      details: {
        age: d.age ?? undefined,
        gender: (d.gender as 'ชาย' | 'หญิง' | undefined) ?? undefined,
        weight: d.weight ?? undefined,
        height: d.height ?? undefined,
        supportLevel: d.supportLevel ?? undefined,
        bloodGroup: d.bloodGroup ?? undefined,
        conditions: d.conditions ?? undefined,
        medicines: d.medicines ?? undefined,
        allergies: d.allergies ?? undefined,
        careInstructions: d.careInstructions ?? undefined,
        regularHospital: d.regularHospital ?? undefined,
      },
    },
  ];
}

// ── Book on behalf of a group member ─────────────────────────────────────────
// PYG-500: every other ACTIVE member is bookable. The backend resolves their care-recipient
// profile by memberUserId: reuse the group profile, copy their personal profile, or create one
// from the member name and per-booking details when neither exists.
//
// PYG-629: the member is now picked in step 1 (BookingMemberPicker) and kept in
// draft.groupContext — this step only fills in that member's details.

function MemberBookingSection({
  groups,
  gc,
}: {
  groups: FamilyGroup[];
  gc?: { groupId: string; memberUserId?: string };
}) {
  const { bookingDraft, goToStep } = useBooking();

  const groupId = gc?.groupId ?? bookingDraft?.onBehalf?.familyGroupId ?? groups[0]?.id ?? '';
  const group = groups.find((g) => g.id === groupId) ?? groups[0] ?? null;

  const { data, loading } = useQuery<{ groupBookingRecipients: GroupBookingRecipient[] }>(
    GROUP_BOOKING_RECIPIENTS,
    { variables: { groupId: group?.id ?? '' }, skip: !group, fetchPolicy: 'cache-and-network' },
  );
  const myUserId = (group?.members ?? []).find((m) => m.isMe)?.userId;
  const selected = (data?.groupBookingRecipients ?? []).find(
    (m) => m.memberUserId === gc?.memberUserId && m.memberUserId !== myUserId,
  );

  return (
    <>
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        {selected ? (
          <div className="flex items-center gap-3">
            <GroupAvatar
              name={selected.name}
              seed={selected.memberUserId}
              src={(group?.members ?? []).find((m) => m.userId === selected.memberUserId)?.avatarUrl}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#8A8C8E]">จองแทนสมาชิก</p>
              <p className="truncate text-base font-bold text-[#1A1A1A]">
                {selected.name || 'สมาชิกที่ยังไม่ได้กรอกชื่อ'}
              </p>
            </div>
            {/* ไม่มีปุ่มเปลี่ยนสมาชิกที่นี่ — เลือกคนแล้วตั้งแต่ขั้นแรก (BookingMemberPicker) */}
          </div>
        ) : loading ? (
          <div className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 min-w-[200px] text-sm text-[#575859]">
              ยังไม่ได้เลือกสมาชิกที่จะจองให้ — เลือกได้ที่ขั้นแรก
            </p>
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="shrink-0 min-h-[44px] px-4 rounded-xl border border-[#1B5C48] text-sm font-bold text-[#1B5C48] hover:bg-[#F0FAF4] transition cursor-pointer"
            >
              ไปเลือกสมาชิก
            </button>
          </div>
        )}
      </section>

      {selected && group && (
        <SelfPatientForm
          key={`${group.id}:${selected.memberUserId}`}
          memberContext={{
            groupId: group.id,
            memberUserId: selected.memberUserId,
            memberName: selected.name,
            // PYG-519: ชื่อมาจากบัญชีของสมาชิก แก้ไม่ได้ (BE ปฏิเสธ patientName — PYG-516)
            nameLocked: selected.nameLocked,
            savedRecipients: toSavedRecipients(selected),
          }}
        />
      )}
    </>
  );
}

// ── Shared contact-person block (used by both self & member modes) ────────────

function ContactPersonForm({
  name,
  phone,
  rel,
  error,
  onName,
  onPhone,
  onRel,
}: {
  name: string;
  phone: string;
  rel: string;
  error: Record<string, string>;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  onRel: (v: string) => void;
}) {
  return (
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
            value={name}
            onChange={(e) => onName(e.target.value)}
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
            value={phone}
            onChange={(e) => onPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="0891234567"
            className={`mt-1.5 w-full p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
              error.contactPhone
                ? 'border-red-500 focus:ring-red-500'
                : 'border-[#E0E2E5] focus:ring-[#52B69A]'
            }`}
          />
          <p className="mt-1 text-[11px] text-[#8A8C8E]">
            {error.contactPhone ? error.contactPhone : `ตัวเลข 10 หลัก · ${phone.length}/10`}
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-[#575859]">
            ความสัมพันธ์ <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {REL_OPTIONS.map((r) => {
              const active = rel === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRel(r)}
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
  );
}

// ── Self / personal patient form (the original step 4, unchanged behaviour) ───

interface MemberPatientContext {
  groupId: string;
  memberUserId: string;
  memberName: string;
  savedRecipients: SavedRecipient[];
  /** PYG-519: ชื่อ-นามสกุลมาจากบัญชีสมาชิก แก้ไม่ได้ */
  nameLocked?: boolean;
}

function SelfPatientForm({ memberContext }: { memberContext?: MemberPatientContext } = {}) {
  const { bookingDraft, setBookingDraft, goToStep, setStepSubmit, setStepMissing } = useBooking();
  const memberGroupId = memberContext?.groupId;
  const memberUserId = memberContext?.memberUserId;
  const isMemberBooking = !!memberContext;
  const previousPatient =
    !memberUserId || bookingDraft?.recipient?.selectedMemberId === memberUserId
      ? bookingDraft?.recipient?.patientDetails
      : undefined;
  const initialSavedRecipient = memberContext?.savedRecipients.find(
    (recipient) => recipient.id === bookingDraft?.recipient?.selectedRecipientId,
  ) ?? memberContext?.savedRecipients[0];
  const initialPatient = previousPatient ?? initialSavedRecipient?.details;

  const [name, setName] = useState(
    previousPatient?.name || initialSavedRecipient?.name || memberContext?.memberName || '',
  );
  // PYG-502: ชื่อเล่นเก็บอยู่ในโปรไฟล์แต่เดิมไม่เคยถูกเติมกลับเข้าฟอร์ม/draft
  //   ไม่มีช่องกรอกในหน้านี้ — พกไว้เพื่อส่งต่อค่าที่มาจากโปรไฟล์เท่านั้น
  const [nickname, setNickname] = useState(
    previousPatient?.nickname || initialSavedRecipient?.nickname || '',
  );
  const [age, setAge] = useState(
    initialPatient?.age?.toString() || '',
  );
  const [gender, setGender] = useState<'ชาย' | 'หญิง' | ''>(
    initialPatient?.gender || '',
  );
  const [weight, setWeight] = useState(
    initialPatient?.weight?.toString() || '',
  );
  const [height, setHeight] = useState(
    initialPatient?.height?.toString() || '',
  );
  const [supportLevel, setSupportLevel] = useState(
    initialPatient?.supportLevel || '',
  );
  const [bloodGroup, setBloodGroup] = useState(
    initialPatient?.bloodGroup || '',
  );
  const [conditions, setConditions] = useState<string[]>(
    initialPatient?.conditions || [],
  );
  const [medicines, setMedicines] = useState(
    initialPatient?.medicines || '',
  );
  const [allergies, setAllergies] = useState(
    initialPatient?.allergies || '',
  );
  const [careInstructions, setCareInstructions] = useState(
    initialPatient?.careInstructions || '',
  );
  const [regularHospital, setRegularHospital] = useState(
    initialPatient?.regularHospital || '',
  );

  // Contact person
  const [contactName, setContactName] = useState(bookingDraft?.contactPerson?.name || '');
  const [contactPhone, setContactPhone] = useState(bookingDraft?.contactPerson?.phone || '');
  const [contactRel, setContactRel] = useState(
    bookingDraft?.contactPerson?.relationship || '',
  );

  const [error, setError] = useState<Record<string, string>>({});

  // โปรไฟล์ผู้รับบริการที่เคยบันทึกไว้ + ใบไหนที่ถูกเลือกอยู่
  // S08: จองให้ตัวเอง/คนที่บันทึกไว้ → คืนใบที่เลือกจาก draft (กลับมาจากแบบประเมินต้องเลือกคนนี้ไว้ให้)
  //   ค่าในฟอร์มคืนมาจาก draft อยู่แล้ว (previousPatient) เหลือแค่ใบที่เลือกที่เคยหายไป
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    initialSavedRecipient?.id ??
      (memberContext ? null : bookingDraft?.recipient?.selectedRecipientId ?? null),
  );
  // กรอกเองโดยไม่ได้เลือกจากลิสต์ → ถามว่าจะบันทึกโปรไฟล์ไว้ใช้ครั้งหน้าไหม (เฉพาะจองแทนสมาชิก)
  const [saveAsProfile, setSaveAsProfile] = useState(!!memberContext);

  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>(
    memberContext?.savedRecipients ?? [],
  );
  // จองให้ตัวเอง: โหลดรายชื่อเสร็จแล้วหรือยัง — แยก "ยังโหลดอยู่" กับ "ไม่พบโปรไฟล์ของตัวเอง"
  const [recipientsLoaded, setRecipientsLoaded] = useState(isMemberBooking);
  useEffect(() => {
    if (isMemberBooking) return;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      try {
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/v1/patient/care-recipients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data: SavedRecipient[] = await res.json();
        if (!cancelled) setSavedRecipients(data);
      } catch {
        // ดึงไม่ได้ → แสดงข้อความ "ไม่พบข้อมูลของคุณ" ด้านล่าง
      } finally {
        if (!cancelled) setRecipientsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMemberBooking]);

  // Auto-save. Clears any on-behalf context so a self booking never submits as booking-on-behalf.
  //
  // ⚠ ต้องเก็บ selectedRecipientId / saveAsProfile ลง draft ด้วย ไม่ใช่แค่ state ในหน้านี้
  //   เพราะขั้นยิง POST /bookings อยู่คนละหน้า (SearchPage / CaregiverProfilePage)
  //   สองค่านี้เคยตายอยู่ในหน้านี้ ทำให้ติ๊ก "บันทึกไว้" แล้วไม่เกิดอะไรขึ้น
  //   และ booking ไม่เคยผูกกับโปรไฟล์ที่เลือก
  const buildPatientDetails = () => ({
    name,
    // PYG-502: ส่งต่อชื่อเล่นจากโปรไฟล์ — ว่าง = ไม่ส่ง ไม่ใช่ส่งสตริงว่าง
    nickname: nickname.trim() || undefined,
    // เดิมเป็น `Number(age) || 0` — ช่องที่ว่างกลายเป็นอายุ 0 ปีซึ่ง BE รับเป็น
    // ค่าที่ถูกต้อง (0-130 เพราะผู้รับบริการอาจเป็นทารก) แล้วบันทึกไปเงียบ ๆ
    age: age.trim() ? Number(age) : undefined,
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
  });

  useEffect(() => {
    setBookingDraft((prev) => ({
      ...(prev || { serviceLocation: [], serviceTypes: [] }),
      onBehalf: memberGroupId && memberUserId
        ? {
            familyGroupId: memberGroupId,
            memberUserId,
            // ★ ไม่ส่ง careRecipientId: ในโหมดจองแทน selectedRecipientId คือ memberUserId
            //   ที่ toSavedRecipients ยืมมาเป็น key ชั่วคราว ไม่ใช่ id ของโปรไฟล์จริง
            //   ส่งคู่กับ memberUserId แล้ว BE หาโปรไฟล์ด้วย id นั้นไม่เจอ → RECIPIENT_NOT_IN_GROUP
            //   BE หาโปรไฟล์ให้เองจาก memberUserId (PYG-500)
            recipientName: name,
          }
        : undefined,
      recipient: {
        type: isMemberBooking ? 'member' : 'self',
        selectedMemberId: memberUserId,
        selectedRecipientId,
        saveAsProfile,
        patientDetails: buildPatientDetails(),
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
    selectedRecipientId,
    saveAsProfile,
    memberGroupId,
    memberUserId,
    isMemberBooking,
  ]);

  // เลือกโปรไฟล์ที่บันทึกไว้ — เติมทุกช่องที่โปรไฟล์นั้นมี ที่เหลือล้างให้ว่าง
  const handleSelectRecipient = (recipient: SavedRecipient) => {
    setSelectedRecipientId(recipient.id);
    setSaveAsProfile(false);
    setName(recipient.name);
    // PYG-502: ชื่อเล่นเคยตกหล่น — โปรไฟล์เก็บไว้แต่ไม่เคยถูกเติมกลับเข้า draft
    setNickname(recipient.nickname ?? '');

    // ⚠ API คืน age/weight/height เป็น number แต่ช่องกรอกเป็น controlled input
    //   ที่รับ string — ต้อง String() ก่อน ไม่งั้น React เตือนเรื่องชนิดของ value
    //   หรือช่องขึ้นว่างแบบไม่มี error ให้เห็น
    //   ใช้ != null เพื่อให้อายุ 0 (ทารก) ที่บันทึกไว้แล้วยังเติมกลับได้
    const d = recipient.details;
    setAge(d?.age != null ? String(d.age) : '');
    setGender(d?.gender ?? '');
    setWeight(d?.weight != null ? String(d.weight) : '');
    setHeight(d?.height != null ? String(d.height) : '');
    // 'ใช้รถเข็น' ไม่มีปุ่มในฟอร์ม → ไม่มีปุ่มไหนถูกไฮไลต์ เป็นพฤติกรรมที่ตั้งใจ
    // validation จะบังคับให้ผู้ใช้เลือกใหม่เอง ห้ามเดาแทน
    setSupportLevel(d?.supportLevel ?? '');
    setBloodGroup(d?.bloodGroup ?? '');
    setConditions(d?.conditions ? [...d.conditions] : []);
    setMedicines(d?.medicines ?? '');
    setAllergies(d?.allergies ?? '');
    setCareInstructions(d?.careInstructions ?? '');
    setRegularHospital(d?.regularHospital ?? '');
  };

  // ── จองแบบบุคคล (ไม่ได้จองแทนสมาชิกกลุ่ม) — ผู้รับบริการคือ "ตัวเอง" เท่านั้น ──────────
  //   ไม่มีการ์ดเลือกผู้รับบริการ / เพิ่มชื่อใหม่ / ลบรายชื่อ · ชื่อล็อกไว้
  //   ใช้โปรไฟล์ของตัวเอง (isSelf — สร้างตอน Onboarding) เติมฟอร์มให้อัตโนมัติ
  //   ★ draft เลือกใบของตัวเองไว้แล้ว (กลับมาจากแบบประเมิน / ย้อนขั้น) → ไม่เติมทับค่าที่แก้ไว้
  const selfRecipient = isMemberBooking ? undefined : savedRecipients.find((r) => r.isSelf);
  useEffect(() => {
    if (selfRecipient && selectedRecipientId !== selfRecipient.id) handleSelectRecipient(selfRecipient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfRecipient?.id]);
  const selfMissing = !isMemberBooking && recipientsLoaded && !selfRecipient;

  // แก้ชื่อเองเมื่อไหร่ = หลุดจากใบที่เลือกไว้
  const handleNameChange = (value: string) => {
    setName(value);
    const picked = savedRecipients.find((r) => r.id === selectedRecipientId);
    if (picked && picked.name !== value) setSelectedRecipientId(null);
  };

  // กรอกเอง (ไม่ได้เลือกจากลิสต์) และมีชื่อแล้ว → ค่อยถามเรื่องบันทึกโปรไฟล์
  const isManualEntry = !selectedRecipientId && name.trim().length > 0;

  // ── S08 · PYG-610: กันจองเมื่อผู้รับบริการยังไม่มีแบบประเมิน (AC9, AC10) ──────────
  // BE กันซ้ำอีกชั้นตอนส่งคำขอ (ASSESSMENT_REQUIRED) — ที่นี่พาไปประเมินก่อนเสียเวลาเลือกผู้ดูแล
  //   ★ โหมดจองแทน: query ของกลุ่มไม่มี hasAssessment จึงไม่กันที่นี่ (ดู onBehalfBookingErrorMessage)
  //   ★ จองให้ตัวเอง: ยังไม่ได้โปรไฟล์ของตัวเอง (กำลังโหลด / ไม่พบ) ก็ยังไปต่อไม่ได้
  const navigate = useNavigate();
  const assessmentText = useAssessmentStrings();
  const selectedRecipient = savedRecipients.find((r) => r.id === selectedRecipientId);
  const needsAssessment = !isMemberBooking && selectedRecipient?.hasAssessment === false;
  const assessmentBlocked = needsAssessment || (!isMemberBooking && !selectedRecipient);

  // ── S10 · PYG-620: โรคติดเชื้อที่ผู้ดูแลควรรู้ ────────────────────────────────
  // แก้ได้เฉพาะโปรไฟล์ที่ผู้ใช้เป็นเจ้าของ (BE ตรวจ patientId) → จองแทนสมาชิกไม่มีช่องนี้
  // ยังไม่ได้ระบุ = ไปขั้นถัดไปไม่ได้ (Design PYG-616) · ค่าถูกบันทึกตรงไป BE ไม่ผ่าน draft
  const infectionText = useInfectionStrings();
  const showInfection = !isMemberBooking && !!selectedRecipient && !assessmentBlocked;
  const infectionMissing =
    showInfection && !!selectedRecipient && readRecipientInfection(selectedRecipient) === null;
  const startAssessment = (recipientId: string) => {
    // เขียน draft ทันที ไม่รอ effect — หน้านี้ถูกถอดออกก่อน effect รอบถัดไปจะทำงาน
    setBookingDraft((prev) =>
      prev?.recipient
        ? { ...prev, recipient: { ...prev.recipient, selectedRecipientId: recipientId, saveAsProfile: false } }
        : prev,
    );
    navigate(assessmentPath(recipientId, 'booking'));
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
    if (Object.keys(errs).length === 0 && !assessmentBlocked && !infectionMissing) goToStep(5);
  };

  // Report missing required fields so the sticky "Next" button can disable itself
  useEffect(() => {
    const missing: string[] = [];
    if (!name.trim()) missing.push('ชื่อคนไข้');
    if (!age.trim()) missing.push('อายุ');
    if (!gender) missing.push('เพศ');
    if (!supportLevel) missing.push('ระดับการช่วยเหลือตนเอง');
    if (!contactName.trim()) missing.push('ชื่อผู้ติดต่อ');
    if (!contactPhone.trim() || contactPhone.length !== 10) missing.push('เบอร์โทรผู้ติดต่อ');
    if (!contactRel) missing.push('ความสัมพันธ์');
    if (assessmentBlocked) missing.push(assessmentText.gateMissing);
    if (infectionMissing) missing.push(infectionText.bookingMissing);
    setStepMissing(missing);
    return () => setStepMissing([]);
  }, [
    infectionMissing,
    infectionText,
    name,
    age,
    gender,
    supportLevel,
    contactName,
    contactPhone,
    contactRel,
    assessmentBlocked,
    assessmentText,
    setStepMissing,
  ]);

  const submitRef = useRef<() => void>(() => {});
  submitRef.current = handleSubmit;
  useEffect(() => {
    setStepSubmit(() => submitRef.current());
    return () => setStepSubmit(null);
  }, [setStepSubmit]);

  return (
    <div className="space-y-4">
      {/* จองแบบบุคคล — ไม่มีการ์ดเลือกผู้รับบริการ (ผู้รับบริการคือตัวเองเท่านั้น)
          เหลือแค่: โปรไฟล์ของตัวเองยังไม่ได้ประเมิน → พาไปประเมิน / หาโปรไฟล์ของตัวเองไม่เจอ */}
      {needsAssessment && selectedRecipient && (
        <BookingAssessmentGate
          variant="existing"
          name={selectedRecipient.name}
          onStart={() => startAssessment(selectedRecipient.id)}
        />
      )}
      {selfMissing && (
        <section className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-5">
          <span className="material-icons text-red-500" style={{ fontSize: 20 }}>error_outline</span>
          <div>
            <p className="m-0 text-sm font-bold text-red-700">ไม่พบข้อมูลผู้รับบริการของคุณ</p>
            <p className="m-0 mt-0.5 text-xs text-red-600">กรุณาโหลดหน้าใหม่อีกครั้ง หากยังพบปัญหาให้ติดต่อเจ้าหน้าที่</p>
          </div>
        </section>
      )}

      {/* Patient info */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h3 className="text-base font-bold text-[#1A1A1A]">ข้อมูลที่ผู้ดูแลต้องรู้</h3>
        {/* PYG-500: ฟอร์มชุดนี้ใช้ร่วมกับหน้า Onboarding — แก้ช่อง/ตัวเลือกที่ PatientDetailsFields */}
        <PatientDetailsFields
          nameMode="single"
          // จองแบบบุคคล: ชื่อล็อกเป็นของตัวเองเสมอ · จองแทนสมาชิก: ตามที่โหมดนั้นกำหนด
          nameReadOnly={isMemberBooking ? (memberContext?.nameLocked ?? false) : true}
          values={{
            name,
            firstName: '',
            lastName: '',
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
          }}
          errors={error}
          onChange={(field, value) => {
            switch (field) {
              // แก้ชื่อเองเมื่อไหร่ = หลุดจากใบที่เลือกไว้ (พฤติกรรมเดิมของหน้า Booking)
              case 'name':
                handleNameChange(value as string);
                break;
              case 'age':
                setAge(value as string);
                break;
              case 'gender':
                setGender(value as GenderOption);
                break;
              case 'weight':
                setWeight(value as string);
                break;
              case 'height':
                setHeight(value as string);
                break;
              case 'supportLevel':
                setSupportLevel(value as string);
                break;
              case 'bloodGroup':
                setBloodGroup(value as string);
                break;
              case 'conditions':
                setConditions(value as string[]);
                break;
              case 'medicines':
                setMedicines(value as string);
                break;
              case 'allergies':
                setAllergies(value as string);
                break;
              case 'careInstructions':
                setCareInstructions(value as string);
                break;
              case 'regularHospital':
                setRegularHospital(value as string);
                break;
              // firstName / lastName ใช้เฉพาะ nameMode='split' (หน้า Onboarding) — ที่นี่ไม่มี
              default:
                break;
            }
          }}
        />

        {isManualEntry && isMemberBooking && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#B7D9CD] bg-[#F0FAF4] p-4">
            <span className="material-icons text-[#009265]" style={{ fontSize: 20 }}>
              save
            </span>
            <span>
              <span className="block text-sm font-bold text-[#1A1A1A]">
                บันทึกเป็นโปรไฟล์ของสมาชิกเมื่อยืนยันการจอง
              </span>
              <span className="mt-0.5 block text-xs text-[#5B7A70]">
                ครั้งถัดไปสมาชิกในกลุ่มสามารถเลือกโปรไฟล์นี้ได้ทันที
              </span>
            </span>
          </div>
        )}
      </section>

      {showInfection && selectedRecipient && (
        <section className="bg-white p-6 rounded-2xl border border-gray-100">
          <InfectionDisclosureEditor
            // เปลี่ยนคน = เริ่มใหม่ทั้งช่อง (ไม่พาตัวเลือก/การรับทราบของคนเดิมไป)
            key={selectedRecipient.id}
            recipientId={selectedRecipient.id}
            recipientName={selectedRecipient.name}
            value={readRecipientInfection(selectedRecipient)}
            variant="booking"
            onSaved={(value) =>
              setSavedRecipients((prev) =>
                prev.map((r) => (r.id === selectedRecipient.id ? { ...r, hasInfectiousDisease: value } : r)),
              )
            }
          />
        </section>
      )}

      <ContactPersonForm
        name={contactName}
        phone={contactPhone}
        rel={contactRel}
        error={error}
        onName={setContactName}
        onPhone={setContactPhone}
        onRel={setContactRel}
      />
    </div>
  );
}
