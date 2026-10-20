import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useBooking } from '../../../context/BookingContext';
import {
  GROUP_BOOKING_RECIPIENTS,
  type FamilyGroup,
  type GroupBookingRecipient,
} from '../../../graphql/familyGroup';
import { GroupAvatar } from '../../family/components/familyUi';

/**
 * เลือกสมาชิกที่จะจองแทน — อยู่ขั้นแรกของการจอง (ย้ายมาจากขั้นผู้รับบริการ)
 *
 * ★ ขั้นนี้แค่ "เลือกคน" แล้วเก็บลง draft.groupContext — การกรอกข้อมูลสุขภาพยังอยู่ขั้นผู้รับบริการ
 *   รู้ตั้งแต่ขั้นแรกว่าจองให้ใคร ส่วนชุดบริการที่แนะนำ (S14) จึงผูกกับคนที่ถูกต้องได้
 * ★ PYG-500: สมาชิก ACTIVE คนอื่นทุกคนจองแทนได้ — BE หาโปรไฟล์จาก memberUserId เอง
 */
export default function BookingMemberPicker({ groups }: { groups: FamilyGroup[] }) {
  const { bookingDraft, setBookingDraft } = useBooking();
  const gc = bookingDraft?.groupContext;

  const groupId = gc?.groupId ?? bookingDraft?.onBehalf?.familyGroupId ?? groups[0]?.id ?? '';
  const group = groups.find((g) => g.id === groupId) ?? groups[0] ?? null;
  const selectedUserId = gc?.memberUserId ?? '';

  // PYG-519: ใช้ query ของ PYG-517 — คืน "คน" ไม่ใช่ "โปรไฟล์" สมาชิกทุกคนได้หนึ่งรายการ
  //   แม้ยังไม่มีโปรไฟล์ในกลุ่ม จึงมีปุ่มให้กดครบทุกคน
  const { data, loading } = useQuery<{ groupBookingRecipients: GroupBookingRecipient[] }>(
    GROUP_BOOKING_RECIPIENTS,
    { variables: { groupId: group?.id ?? '' }, skip: !group, fetchPolicy: 'cache-and-network' },
  );
  const members = useMemo(
    () => data?.groupBookingRecipients ?? [],
    [data?.groupBookingRecipients],
  );

  // จองแทน = จองให้ "คนอื่น" — ตัวเองออกจากลิสต์ (จองให้ตัวเองใช้ flow ปกติ)
  const myUserId = (group?.members ?? []).find((m) => m.isMe)?.userId;
  // groupBookingRecipients ไม่มีรูป — ยืมจากรายชื่อสมาชิกของกลุ่ม (backend sign URL ให้แล้ว)
  const avatarByUserId = useMemo(
    () => new Map((group?.members ?? []).map((m) => [m.userId, m.avatarUrl])),
    [group?.members],
  );
  const options = useMemo(
    () => members.filter((m) => m.memberUserId !== myUserId),
    [members, myUserId],
  );

  /**
   * PYG-519 — สลับคน/กลุ่ม: ถามยืนยันก่อนถ้ากรอกข้อมูลของคนเดิมไว้แล้ว
   *
   * ★ ข้อมูลที่กรอกค้างเป็นของคนเดิม ถ้าพาไปต่อกับคนใหม่เงียบ ๆ จะกลายเป็นการส่ง
   *   ข้อมูลสุขภาพของคนหนึ่งไปให้ผู้ดูแลในนามของอีกคน → ล้าง recipient / onBehalf ทิ้ง
   *   ขั้นผู้รับบริการจะเติมข้อมูลของคนใหม่ให้เองตอนเปิด
   */
  const switchTo = (next: { groupId: string; memberUserId?: string }) => {
    const hasEdits = selectedUserId !== '' && !!bookingDraft?.recipient?.patientDetails;
    if (
      hasEdits &&
      !window.confirm('เปลี่ยนสมาชิกแล้วข้อมูลที่กรอกไว้จะถูกล้าง ต้องการเปลี่ยนหรือไม่?')
    ) {
      return;
    }
    setBookingDraft((prev) => ({
      ...(prev || { serviceLocation: [], serviceTypes: [] }),
      groupContext: next,
      recipient: undefined,
      onBehalf: undefined,
    }));
  };

  const handlePickMember = (nextUserId: string) => {
    if (!group || nextUserId === selectedUserId) return;
    switchTo({ groupId: group.id, memberUserId: nextUserId });
  };

  const handlePickGroup = (nextGroupId: string) => {
    if (nextGroupId === group?.id) return;
    switchTo({ groupId: nextGroupId });
  };

  return (
    <section className="bg-white p-6 rounded-2xl border border-gray-100">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#1A1A1A]">เลือกสมาชิกที่จะจองให้</h2>
        {groups.length > 1 && (
          <select
            value={group?.id ?? ''}
            onChange={(e) => handlePickGroup(e.target.value)}
            aria-label="เลือกกลุ่ม"
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
      <p className="text-sm text-[#8A8C8E] mt-1">กรอกข้อมูลของสมาชิกได้ที่ขั้นผู้รับบริการ</p>

      {loading && members.length === 0 ? (
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
          {options.map((member) => {
            const active = selectedUserId === member.memberUserId;
            return (
              <label
                key={member.memberUserId}
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
                  onChange={() => handlePickMember(member.memberUserId)}
                />
                <GroupAvatar
                  name={member.name}
                  seed={member.memberUserId}
                  src={avatarByUserId.get(member.memberUserId)}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#1A1A1A]">
                    {member.name || 'สมาชิกที่ยังไม่ได้กรอกชื่อ'}
                  </p>
                  <p className="truncate text-[12px] text-[#8A8C8E]">
                    {member.hasProfile
                      ? 'มีข้อมูลผู้รับบริการแล้ว — เติมให้อัตโนมัติในขั้นผู้รับบริการ'
                      : 'ยังไม่มีข้อมูลในกลุ่ม — กรอกได้ในขั้นผู้รับบริการ'}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
