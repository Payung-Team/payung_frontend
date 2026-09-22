import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../../context/BookingContext';
import { supabase } from '../../../lib/supabase';
import type { PatientProfile } from '../../../lib/patientProfile';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  MY_FAMILY_GROUPS,
  GROUP_CARE_RECIPIENTS,
  type FamilyGroup,
  type GroupCareRecipient,
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
   * ข้อมูลสุขภาพที่จะเติมให้อัตโนมัติเมื่อเลือกโปรไฟล์นี้
   *
   * ⚠ อาจไม่มีคีย์นี้เลย (ไม่ใช่ `{}`) ในโปรไฟล์ที่ไม่เคยกรอกข้อมูลสุขภาพ
   * ⚠ age / weight / height เป็น number ตาม API — ไม่ใช่ string เหมือน input state
   *   จึงต้อง String() ก่อนใส่ลงช่องกรอก (ดู handleSelectRecipient)
   */
  details?: PatientProfile | null;
}

/** หนึ่งแถวในลิสต์ "ผู้รับบริการคือใคร" — วงกลมเลือก + ชื่อ + ปุ่มลบ */
function RecipientRow({
  selected,
  title,
  onSelect,
  onDelete,
}: {
  selected: boolean;
  title: string;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`flex items-center rounded-xl border-2 transition ${
        selected
          ? 'border-[#1B5C48] bg-[#F0FAF4]'
          : 'border-[#E0E2E5] bg-white hover:border-gray-300'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
      >
        <span
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
            selected ? 'border-[#1B5C48]' : 'border-[#C7CDD2]'
          }`}
        >
          {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#1B5C48]" />}
        </span>
        <span className="flex-1 min-w-0 text-sm font-bold text-[#1A1A1A] truncate">{title}</span>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`ลบ ${title}`}
          title="ลบรายชื่อนี้"
          className="shrink-0 px-4 py-3.5 text-sm font-semibold text-red-600 hover:text-red-700 hover:underline transition cursor-pointer"
        >
          ลบ
        </button>
      )}
    </div>
  );
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

// ── Book on behalf of a group member ─────────────────────────────────────────
// PYG-500: every other ACTIVE member is bookable. The backend resolves their care-recipient
// profile by memberUserId: reuse the group profile, copy their personal profile, or create one
// from the member name and per-booking details when neither exists.

function MemberBookingSection({
  groups,
  gc,
}: {
  groups: FamilyGroup[];
  gc?: { groupId: string; memberUserId?: string };
}) {
  const { bookingDraft } = useBooking();

  const [groupId, setGroupId] = useState<string>(
    gc?.groupId ?? bookingDraft?.onBehalf?.familyGroupId ?? groups[0]?.id ?? '',
  );
  const group = groups.find((g) => g.id === groupId) ?? groups[0] ?? null;

  const { data, loading } = useQuery<{ groupCareRecipients: GroupCareRecipient[] }>(
    GROUP_CARE_RECIPIENTS,
    { variables: { groupId: group?.id ?? '' }, skip: !group, fetchPolicy: 'cache-and-network' },
  );
  const recipients = useMemo(() => data?.groupCareRecipients ?? [], [data?.groupCareRecipients]);

  const options = useMemo(() => {
    return (group?.members ?? [])
      .filter((m) => !m.isMe)
      .map((m) => ({
        member: m,
        profiles: recipients.filter((recipient) => recipient.ownerUserId === m.userId),
      }));
  }, [group?.members, recipients]);

  const [selectedUserId, setSelectedUserId] = useState<string>(gc?.memberUserId ?? '');
  const selected = options.find((o) => o.member.userId === selectedUserId);

  return (
    <>
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#1A1A1A]">เลือกสมาชิกที่จะจองให้</h3>
          {groups.length > 1 && (
            <select
              value={group?.id ?? ''}
              onChange={(e) => {
                setGroupId(e.target.value);
                setSelectedUserId('');
              }}
              className="max-w-[200px] p-2 border border-[#E0E2E5] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading && recipients.length === 0 ? (
          <div className="mt-4 space-y-2">
            <div className="h-16 w-full animate-pulse rounded-xl bg-gray-100" />
            <div className="h-16 w-full animate-pulse rounded-xl bg-gray-100" />
          </div>
        ) : options.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[#F6FAF9] px-4 py-6 text-center text-[13px] leading-6 text-[#8A8C8E]">
            กลุ่มนี้ยังไม่มีสมาชิกคนอื่น เชิญสมาชิกเข้ากลุ่มก่อนจึงจะจองแทนได้
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {options.map(({ member, profiles }) => {
              const active = selectedUserId === member.userId;
              return (
                <label
                  key={member.userId}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    active
                      ? 'border-2 border-[#009265] bg-[#F0FAF4] cursor-pointer'
                      : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="book-member"
                    className="h-4 w-4 accent-[#009265]"
                    checked={active}
                    onChange={() => setSelectedUserId(member.userId)}
                  />
                  <GroupAvatar name={member.displayName || member.email} seed={member.userId} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#1A1A1A]">
                      {member.displayName || member.email}
                    </p>
                    <p className="truncate text-[12px] text-[#8A8C8E]">
                      {profiles.length > 0
                        ? `มีโปรไฟล์ที่บันทึกไว้ ${profiles.length} รายการ`
                        : 'ยังไม่มีโปรไฟล์ที่บันทึกไว้ — เลือกแล้วกรอกข้อมูลใหม่ได้'}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {selected && group && (
        <SelfPatientForm
          key={`${group.id}:${selected.member.userId}`}
          memberContext={{
            groupId: group.id,
            memberUserId: selected.member.userId,
            memberName: selected.member.displayName || selected.member.email,
            savedRecipients: selected.profiles,
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
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    initialSavedRecipient?.id ?? null,
  );
  // กรอกเองโดยไม่ได้เลือกจากลิสต์ → ถามว่าจะบันทึกโปรไฟล์ไว้ใช้ครั้งหน้าไหม
  const [saveAsProfile, setSaveAsProfile] = useState(!!memberContext);
  // รายชื่อที่กด "ลบ" ไว้ รอยืนยันใน modal
  const [pendingDelete, setPendingDelete] = useState<SavedRecipient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>(
    memberContext?.savedRecipients ?? [],
  );
  useEffect(() => {
    if (isMemberBooking) return;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/v1/patient/care-recipients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data: SavedRecipient[] = await res.json();
        // ตั้งค่าแม้ลิสต์ว่าง — เดิมกันด้วย data.length > 0 เพราะต้องกัน MOCK ไม่ให้หาย
        // ตอนนี้ไม่มี MOCK แล้ว ถ้ายังกันอยู่ ลบโปรไฟล์ใบสุดท้ายแล้วลิสต์จะไม่อัปเดต
        if (!cancelled) setSavedRecipients(data);
      } catch {
        // ดึงไม่ได้ก็แค่ไม่แสดงการ์ดโปรไฟล์ที่บันทึกไว้
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
  useEffect(() => {
    setBookingDraft((prev) => ({
      ...(prev || { serviceLocation: [], serviceTypes: [] }),
      onBehalf: memberGroupId && memberUserId
        ? {
            familyGroupId: memberGroupId,
            memberUserId,
            careRecipientId: selectedRecipientId ?? undefined,
            recipientName: name,
          }
        : undefined,
      recipient: {
        type: isMemberBooking ? 'member' : 'self',
        selectedMemberId: memberUserId,
        selectedRecipientId,
        saveAsProfile,
        patientDetails: {
          name,
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
    selectedRecipientId,
    saveAsProfile,
    memberGroupId,
    memberUserId,
    isMemberBooking,
  ]);

  // เลือกโปรไฟล์ที่บันทึกไว้ — เติมทุกช่องที่โปรไฟล์นั้นมี ที่เหลือล้างให้ว่าง
  // กดซ้ำที่ใบเดิม = ยกเลิกการเลือก แล้วกลับไปกรอกเอง
  const handleSelectRecipient = (recipient: SavedRecipient) => {
    if (selectedRecipientId === recipient.id) {
      if (isMemberBooking) return;
      setSelectedRecipientId(null);
      return;
    }
    setSelectedRecipientId(recipient.id);
    setSaveAsProfile(false);
    setName(recipient.name);

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

  // ลบรายชื่อที่บันทึกไว้ — ยืนยันผ่าน modal ก่อนเสมอ
  // BE ใช้ soft delete + snapshot: การจองที่ผ่านมายังอยู่และยังแสดงข้อมูลคนไข้ได้
  const confirmDeleteRecipient = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;

    setDeleting(true);
    setDeleteError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('no session');

      const res = await fetch(`${API_BASE}/api/v1/patient/care-recipients/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      // 204 = ลบแล้ว · 404 = หายไปอยู่แล้ว (กดซ้ำ / ลบจากอีกแท็บ) ถือว่าสำเร็จทั้งคู่
      // เป้าหมายของผู้ใช้คือ "ให้มันหายไป" ซึ่งบรรลุแล้วทั้งสองกรณี
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
    } catch {
      setDeleteError(`ลบ "${target.name}" ไม่สำเร็จ กรุณาลองอีกครั้ง`);
      setDeleting(false);
      return;
    }

    setSavedRecipients((prev) => prev.filter((r) => r.id !== target.id));
    if (selectedRecipientId === target.id) setSelectedRecipientId(null);
    setDeleting(false);
    setPendingDelete(null);
  };

  // แก้ชื่อเองเมื่อไหร่ = หลุดจากใบที่เลือกไว้
  const handleNameChange = (value: string) => {
    setName(value);
    const picked = savedRecipients.find((r) => r.id === selectedRecipientId);
    if (picked && picked.name !== value) setSelectedRecipientId(null);
  };

  // กรอกเอง (ไม่ได้เลือกจากลิสต์) และมีชื่อแล้ว → ค่อยถามเรื่องบันทึกโปรไฟล์
  const isManualEntry = !selectedRecipientId && name.trim().length > 0;

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
    setStepMissing(missing);
    return () => setStepMissing([]);
  }, [
    name,
    age,
    gender,
    supportLevel,
    contactName,
    contactPhone,
    contactRel,
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
      {/* เลือกจากโปรไฟล์ที่เคยบันทึกไว้ — ไม่เลือกก็กรอกเองได้ในการ์ดถัดไป */}
      {savedRecipients.length > 0 && (
        <section className="bg-white p-6 rounded-2xl border border-gray-100">
          <h2 className="text-lg font-bold text-[#1A1A1A]">
            {isMemberBooking ? `โปรไฟล์ที่ ${memberContext?.memberName} เคยบันทึกไว้` : 'ผู้รับบริการคือใคร'}
          </h2>
          <p className="text-sm text-[#8A8C8E] mt-1">
            เลือกจากรายชื่อที่บันทึกไว้ หรือกรอกข้อมูลใหม่ด้านล่าง
          </p>
          <div className="mt-4 space-y-2">
            {savedRecipients.map((r) => (
              <RecipientRow
                key={r.id}
                selected={selectedRecipientId === r.id}
                title={r.name}
                onSelect={() => handleSelectRecipient(r)}
                onDelete={
                  isMemberBooking
                    ? undefined
                    : () => {
                        setDeleteError(null);
                        setPendingDelete(r);
                      }
                }
              />
            ))}
          </div>
          {deleteError && (
            <p className="mt-3 text-[11px] font-semibold text-red-500">{deleteError}</p>
          )}
        </section>
      )}

      {/* Patient info */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h3 className="text-base font-bold text-[#1A1A1A]">ข้อมูลที่ผู้ดูแลต้องรู้</h3>
        {/* PYG-500: ฟอร์มชุดนี้ใช้ร่วมกับหน้า Onboarding — แก้ช่อง/ตัวเลือกที่ PatientDetailsFields */}
        <PatientDetailsFields
          nameMode="single"
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

        {/* กรอกเองโดยไม่ได้เลือกจากลิสต์ → ถามว่าจะเก็บโปรไฟล์นี้ไว้ใช้ครั้งหน้าไหม */}
        {isManualEntry && !isMemberBooking && (
          <label className="mt-5 flex items-start gap-3 p-4 bg-[#F6FAF9] border border-[#E0E2E5] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsProfile}
              onChange={(e) => setSaveAsProfile(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#52B69A] cursor-pointer shrink-0"
            />
            <span>
              <span className="block text-sm font-bold text-[#1A1A1A]">
                บันทึกผู้รับบริการรายนี้ไว้
              </span>
              <span className="block text-xs text-[#8A8C8E] mt-0.5">
                ครั้งหน้าจะเลือกจากรายชื่อได้เลย ไม่ต้องกรอกใหม่
              </span>
            </span>
          </label>
        )}
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

      <ContactPersonForm
        name={contactName}
        phone={contactPhone}
        rel={contactRel}
        error={error}
        onName={setContactName}
        onPhone={setContactPhone}
        onRel={setContactRel}
      />

      <ConfirmModal
        isOpen={pendingDelete !== null}
        isLoading={deleting}
        title="ลบรายชื่อนี้?"
        description={
          <>
            <span className="font-semibold text-[#1A1A1A]">{pendingDelete?.name}</span>{' '}
            จะถูกลบออกจากรายชื่อที่บันทึกไว้ การจองที่ผ่านมาไม่ได้รับผลกระทบ
          </>
        }
        confirmText="ลบ"
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDeleteRecipient}
        iconName="delete"
        iconBgColor="bg-red-500"
        confirmBtnBgColor="bg-red-600"
        confirmBtnHoverBgColor="hover:bg-red-700"
      />
    </div>
  );
}
