import { useReducer, useState } from 'react';
import { CHIP_SEPARATOR, EMPTY_RESULT, REMARK_MAX, type CheckResult, type ReviewItem } from './kycReviewItems';

interface State {
  results: Record<string, CheckResult>;
  viewing: string;
  /** รายการที่โหลดรูป/ไฟล์ไม่ขึ้น → กดผ่านไม่ได้จนกว่าจะโหลดใหม่สำเร็จ */
  loadErr: Record<string, true>;
}

type Action =
  | { type: 'reset'; state: State }
  | { type: 'pass'; id: string; next: string }
  | { type: 'fail'; id: string }
  | { type: 'remark'; id: string; value: string }
  | { type: 'chip'; id: string; chip: string }
  | { type: 'blur'; id: string }
  | { type: 'passMany'; ids: string[] }
  | { type: 'view'; id: string }
  | { type: 'loadErr'; id: string; on: boolean };

function patch(state: State, id: string, fn: (r: CheckResult) => CheckResult): State {
  return { ...state, results: { ...state.results, [id]: fn(state.results[id] ?? EMPTY_RESULT) } };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return action.state;
    case 'pass': {
      const was = state.results[action.id]?.s === 'pass';
      const next = patch(state, action.id, (r) => ({ ...r, s: was ? null : 'pass' }));
      // ผ่านแล้วไปรายการถัดไปที่ยังไม่ได้ตรวจ (เฉพาะเมื่อกำลังดูรายการนี้อยู่)
      return !was && state.viewing === action.id ? { ...next, viewing: action.next } : next;
    }
    case 'fail': {
      const was = state.results[action.id]?.s === 'fail';
      // ยกเลิก "ไม่ผ่าน" → กลับเป็นยังไม่ตรวจ แต่เก็บเหตุผลไว้เผื่อกดกลับ
      return { ...patch(state, action.id, (r) => ({ ...r, s: was ? null : 'fail', touched: false })), viewing: action.id };
    }
    case 'remark':
      return patch(state, action.id, (r) => ({ ...r, remark: action.value.slice(0, REMARK_MAX) }));
    case 'chip':
      return patch(state, action.id, (r) => {
        const parts = r.remark ? r.remark.split(CHIP_SEPARATOR) : [];
        const at = parts.indexOf(action.chip);
        if (at >= 0) parts.splice(at, 1);
        else parts.unshift(action.chip);
        return { ...r, remark: parts.join(CHIP_SEPARATOR).slice(0, REMARK_MAX), touched: true };
      });
    case 'blur':
      return patch(state, action.id, (r) => ({ ...r, touched: true }));
    case 'passMany': {
      const results = { ...state.results };
      for (const id of action.ids) results[id] = { ...(results[id] ?? EMPTY_RESULT), s: 'pass' };
      return { ...state, results };
    }
    case 'view':
      return { ...state, viewing: action.id };
    case 'loadErr': {
      const loadErr = { ...state.loadErr };
      if (!action.on) {
        delete loadErr[action.id];
        return { ...state, loadErr };
      }
      loadErr[action.id] = true;
      // เคยกดผ่านไว้แต่ตอนนี้มองไม่เห็นเอกสาร → ต้องตรวจใหม่หลังโหลดได้
      const next = { ...state, loadErr };
      return state.results[action.id]?.s === 'pass' ? patch(next, action.id, (r) => ({ ...r, s: null })) : next;
    }
  }
}

export interface ChecklistRow {
  item: ReviewItem;
  result: CheckResult;
  isPass: boolean;
  isFail: boolean;
  isPending: boolean;
  /** BE ตัดสินใบนี้ไปแล้ว — แก้ไม่ได้ */
  locked: boolean;
  viewing: boolean;
  /** ไม่มีไฟล์ */
  missing: boolean;
  loadErr: boolean;
  /** ข้อความเมื่อกดผ่านไม่ได้ · undefined = กดได้ */
  passBlocked?: string;
  /** ไม่ผ่านแต่ยังไม่มีเหตุผล */
  emptyRemark: boolean;
  /** แสดง error เหตุผลว่าง (หลัง blur / กด chip) */
  remarkError: boolean;
}

/**
 * state ผลตรวจรายรายการของหน้า KYC review
 * resetKey เปลี่ยน (เช่น สถานะ KYC เปลี่ยน / ส่งใหม่) → เริ่มผลตรวจใหม่จาก initial
 */
export function useKycChecklist(items: ReviewItem[], initial: Record<string, CheckResult>, resetKey: string, readOnly: boolean) {
  const fresh = (): State => ({ results: initial, viewing: items[0]?.id ?? '', loadErr: {} });
  const [state, dispatch] = useReducer(reducer, undefined, fresh);
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    dispatch({ type: 'reset', state: fresh() });
  }

  const rows: ChecklistRow[] = items.map((item) => {
    const missing = item.needsFile && !item.file?.url;
    const loadErr = !missing && !!state.loadErr[item.id] && item.kind !== 'info';
    const passBlocked = missing
      ? 'ไม่มีไฟล์ให้ตรวจ — กดผ่านไม่ได้'
      : loadErr
        ? 'ต้องเห็นเอกสารก่อนจึงกดผ่านได้'
        : item.passBlockedReason;
    const stored = state.results[item.id] ?? EMPTY_RESULT;
    const result: CheckResult = item.locked
      ? { s: item.locked.s, remark: item.locked.remark, touched: false }
      : // กดผ่านไว้แล้วแต่ภายหลังกดผ่านไม่ได้ (รูปโหลดไม่ขึ้น / หมดอายุ) → กลับเป็นยังไม่ตรวจ
        !readOnly && passBlocked && stored.s === 'pass'
        ? { ...stored, s: null }
        : stored;
    const isFail = result.s === 'fail';
    const emptyRemark = isFail && !result.remark.trim();
    return {
      item,
      result,
      isPass: result.s === 'pass',
      isFail,
      isPending: !result.s,
      locked: !!item.locked,
      viewing: state.viewing === item.id,
      missing,
      loadErr,
      passBlocked,
      emptyRemark,
      remarkError: emptyRemark && result.touched && !item.locked,
    };
  });

  const viewIndex = Math.max(0, rows.findIndex((r) => r.viewing));
  const viewRow = rows[viewIndex];

  const canPass = (r: ChecklistRow) => !r.locked && !r.passBlocked;
  const nextPending = (fromId: string) => {
    const from = rows.findIndex((r) => r.item.id === fromId);
    for (let k = 1; k < rows.length; k++) {
      const r = rows[(from + k) % rows.length];
      if (r.isPending && canPass(r)) return r.item.id;
    }
    return fromId;
  };

  const total = rows.length;
  const passRows = rows.filter((r) => r.isPass);
  const failRows = rows.filter((r) => r.isFail);
  const pendRows = rows.filter((r) => r.isPending);
  const emptyRows = failRows.filter((r) => r.emptyRemark);
  const passAllEligible = pendRows.filter(canPass);

  return {
    rows,
    total,
    viewRow,
    viewIndex,
    passCount: passRows.length,
    checkedCount: passRows.length + failRows.length,
    failRows,
    pendRows,
    emptyRows,
    passAllEligible,
    allPass: total > 0 && passRows.length === total,
    canReject: failRows.length > 0 && emptyRows.length === 0,
    pass: (id: string) => dispatch({ type: 'pass', id, next: nextPending(id) }),
    fail: (id: string) => dispatch({ type: 'fail', id }),
    setRemark: (id: string, value: string) => dispatch({ type: 'remark', id, value }),
    toggleChip: (id: string, chip: string) => dispatch({ type: 'chip', id, chip }),
    blur: (id: string) => dispatch({ type: 'blur', id }),
    passAll: () => dispatch({ type: 'passMany', ids: passAllEligible.map((r) => r.item.id) }),
    view: (id: string) => dispatch({ type: 'view', id }),
    step: (k: number) => {
      if (!total) return;
      dispatch({ type: 'view', id: rows[(viewIndex + k + total) % total].item.id });
    },
    setLoadErr: (id: string, on: boolean) => dispatch({ type: 'loadErr', id, on }),
  };
}

export type KycChecklist = ReturnType<typeof useKycChecklist>;
