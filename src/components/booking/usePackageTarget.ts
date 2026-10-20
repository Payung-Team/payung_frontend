import { useEffect, useState } from 'react';
import { fetchCareRecipients } from '../../lib/careRecipientsApi';

/** ผู้สูงอายุที่กำลังจองให้ — ชุดที่แนะนำดูจากกลุ่มของคนนี้ (S14 R2) */
export type PackageTarget =
  | { kind: 'recipient'; key: string; careRecipientId: string; name: string }
  /**
   * จองแทนสมาชิกกลุ่ม: groupBookingRecipients คืน memberUserId ไม่คืน id ของโปรไฟล์
   * แต่ query ต้องใช้ careRecipientId (contract PYG-626 §1) → ยังขอชุดให้ไม่ได้ ต้องรอ BE เพิ่มทางให้
   */
  | { kind: 'member'; key: string }
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
  memberUserId,
  preferredRecipientId,
}: {
  memberMode: boolean;
  memberUserId?: string;
  preferredRecipientId?: string | null;
}): PackageTarget {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; list: Awaited<ReturnType<typeof fetchCareRecipients>> }
  >({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

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
    return memberUserId ? { kind: 'member', key: `member:${memberUserId}` } : { kind: 'hidden' };
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
