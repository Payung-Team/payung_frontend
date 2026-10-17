import { useSyncExternalStore } from 'react';
import type { CareLevel } from '../lib/careLevels';
import type { CareLevelActor, CareLevelHistoryEntry } from '../graphql/careLevel';

/**
 * MOCK (PYG-557 · S02) — แทน BE ระหว่างที่ยังไม่มี field careLevel และ setCaregiverCareLevel (PYG-579 / PYG-581)
 *
 * ข้อมูลอยู่ใน localStorage ของเบราว์เซอร์นี้เท่านั้น ไม่ไปถึง BE และเครื่องอื่นไม่เห็น
 * (เปิดหน้าแอดมินคู่กับหน้าผู้ดูแลในเบราว์เซอร์เดียวกันจะเห็นค่าตรงกัน)
 * ★ เมื่อ BE พร้อม: เชื่อม useCareLevel กับ graphql/careLevel.ts ตาม TODO(PYG-582) แล้วลบไฟล์นี้
 */

export interface CareLevelRecord {
  level: CareLevel;
  /** null = ค่าเริ่มต้นจาก migration ยังไม่ผ่านการทบทวน */
  setBy: CareLevelActor | null;
  setAt: string | null;
  /** ใหม่ไปเก่า */
  history: CareLevelHistoryEntry[];
}

type MockState = Record<string, CareLevelRecord>;

const STORAGE_KEY = 'payung.mock.pyg557';
const listeners = new Set<() => void>();

function load(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    // private window / storage ถูกบล็อก / JSON เสีย — เริ่มใหม่
  }
  return {};
}

let state: MockState = load();

function commit(next: MockState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // เก็บไม่ได้ก็ยังใช้ในหน้านี้ต่อได้ แค่ reload แล้วหาย
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      listeners.forEach((fn) => fn());
    }
  });
}

export function useCareLevelMockState(): MockState {
  return useSyncExternalStore(subscribe, () => state);
}

/** ผู้ดูแลที่ KYC อนุมัติแล้วแต่ยังไม่มีข้อมูลใน mock = จำลองค่าเริ่มต้นจาก migration (R6) */
export function migrationDefault(): CareLevelRecord {
  return {
    level: 'BASIC',
    setBy: null,
    setAt: null,
    history: [{ id: 'migration', oldLevel: null, newLevel: 'BASIC', reason: null, createdAt: null, changedBy: null }],
  };
}

/**
 * บันทึกระดับ · ค่าเดิมไม่สร้างประวัติ (E4)
 * ยืนยันค่าเริ่มต้นที่ยังไม่ทบทวน (ค่าเดิม) = บันทึกผู้กำหนดและเวลา แต่ไม่เพิ่มแถวประวัติ
 */
export function saveMockCareLevel(
  caregiverId: string,
  base: CareLevelRecord | null,
  level: CareLevel,
  actor: CareLevelActor,
  reason: string | null,
): { changed: boolean } {
  const now = new Date().toISOString();
  if (base && base.level === level) {
    if (base.setBy) return { changed: false };
    commit({ ...state, [caregiverId]: { ...base, setBy: actor, setAt: now } });
    return { changed: false };
  }
  const entry: CareLevelHistoryEntry = {
    id: `mock-${Date.now()}`,
    oldLevel: base?.level ?? null,
    newLevel: level,
    reason,
    createdAt: now,
    changedBy: actor,
  };
  commit({
    ...state,
    [caregiverId]: { level, setBy: actor, setAt: now, history: [entry, ...(base?.history ?? [])] },
  });
  return { changed: true };
}

/** หน่วงเวลาให้เห็นสถานะกำลังบันทึกเหมือนเรียก API จริง */
export function mockDelay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
