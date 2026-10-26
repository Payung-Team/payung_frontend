import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { fetchCareRecipients } from '../../lib/careRecipientsApi';
import { GROUP_BOOKING_RECIPIENTS, type GroupBookingRecipient } from '../../graphql/familyGroup';

/** ผู้สูงอายุที่กำลังจองให้ — ชุดที่แนะนำดูจากกลุ่มของคนนี้ (S14 R2) */
export type PackageTarget =
  | { kind: 'recipient'; key: string; careRecipientId: string; name: string }
  /**
   * จองแทนสมาชิกกลุ่ม: groupBookingRecipients คืน memberUserId ไม่คืน id ของโปรไฟล์
   * → ขอชุดด้วย recommendedServicePackagesForMember (BE หาโปรไฟล์ใบเดียวกับที่จะจองจริงเอง)
   * name ว่างได้ (ยังโหลดรายชื่อไม่เสร็จ) — หัวข้อจะไม่มีชื่อ
   */
  | { kind: 'member'; key: string; groupId: string; memberUserId: string; name: string }
  | { kind: 'resolving' }
  | { kind: 'resolveFailed'; retry: () => void }
  /** ไม่มีโปรไฟล์ให้ขอชุด (เช่น ยังไม่ผ่าน Onboarding) */
  | { kind: 'none' }
  /** ยังไม่รู้ว่าจองให้ใคร (โหมดจองแทนที่ยังไม่เลือกสมาชิก) — ไม่แสดงส่วนชุดที่แนะนำ */
  | { kind: 'hidden' };

/**
 * หาผู้สูงอายุที่ใช้ขอชุดที่แนะนำ
 *   จองแทนสมาชิก → สมาชิกที่เลือกในขั้นแรก
 *   จองเอง → โปรไฟล์ที่เลือกไว้ในขั้นผู้รับบริการ (ย้อนกลับมาแก้) ถ้าไม่มีใช้ใบ "ตัวเอง" จาก Onboarding
 */
export function usePackageTarget({
  memberMode,
  groupId,
  memberUserId,
  preferredRecipientId,
}: {
  memberMode: boolean;
  groupId?: string;
  memberUserId?: string;
  preferredRecipientId?: string | null;
}): PackageTarget {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; list: Awaited<ReturnType<typeof fetchCareRecipients>> }
  >({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  // ชื่อสมาชิกสำหรับหัวข้อ — BookingMemberPicker โหลดรายการเดียวกันไว้แล้ว ส่วนใหญ่ได้จาก cache
  const pickedMember = memberMode && !!groupId && !!memberUserId;
  const { data: membersData } = useQuery<{ groupBookingRecipients: GroupBookingRecipient[] }>(
    GROUP_BOOKING_RECIPIENTS,
    { variables: { groupId: groupId ?? '' }, skip: !pickedMember, fetchPolicy: 'cache-first' },
  );

  useEffect(() => {
    if (memberMode) return;
    let cancelled = false;
    fetchCareRecipients()
      .then((list) => {
        if (!cancelled) setState({ status: 'ready', list });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [memberMode, attempt]);

  if (memberMode) {
    if (!groupId || !memberUserId) return { kind: 'hidden' };
    const member = membersData?.groupBookingRecipients.find(
      (m) => m.memberUserId === memberUserId,
    );
    return {
      kind: 'member',
      // สมาชิกคนเดียวกันอยู่ต่างกลุ่มอาจได้โปรไฟล์คนละใบ → key ต้องมีกลุ่มด้วย
      key: `member:${groupId}:${memberUserId}`,
      groupId,
      memberUserId,
      name: member?.nickname || member?.name || '',
    };
  }
  if (state.status === 'loading') return { kind: 'resolving' };
  if (state.status === 'error') {
    return {
      kind: 'resolveFailed',
      retry: () => {
        setState({ status: 'loading' });
        setAttempt((n) => n + 1);
      },
    };
  }
  const picked =
    state.list.find((r) => r.id === preferredRecipientId) ?? state.list.find((r) => r.isSelf);
  if (!picked) return { kind: 'none' };
  return {
    kind: 'recipient',
    key: `recipient:${picked.id}`,
    careRecipientId: picked.id,
    name: picked.nickname || picked.name,
  };
}
