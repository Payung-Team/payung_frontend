/**
 * useScrolledToEnd — "ผู้ใช้เลื่อนอ่านจนจบแล้วหรือยัง" (PYG-539 / PYG-541)
 *
 * ใช้เป็นเงื่อนไขปลดล็อกปุ่มยินยอม เพื่อให้แน่ใจว่าผู้ใช้ได้เลื่อนผ่านข้อความทั้งหมด
 * ก่อนกดยอมรับ — ไม่ใช่กดผ่านทันทีโดยไม่เห็นเนื้อหา
 *
 * ★ กลับเป็น false ไม่ได้: พออ่านจบแล้วถือว่าจบตลอด ถ้าเลื่อนกลับขึ้นไปแล้วปุ่มล็อกใหม่
 *   ผู้ใช้จะงงว่าทำอะไรผิด
 *
 * ★ เผื่อ 8px ไม่เทียบเท่ากันเป๊ะ — ความสูงจริงของ element เป็นทศนิยม การเทียบ
 *   scrollTop + clientHeight === scrollHeight จะไม่มีวันจริงในบางเบราว์เซอร์/ระดับซูม
 *   แล้วปุ่มจะค้าง disabled ตลอดกาลโดยไม่มีอะไรบอกผู้ใช้
 *
 * ★ เนื้อหาสั้นกว่ากล่อง (ไม่มีอะไรให้เลื่อน) = ถือว่าอ่านจบแล้ว ไม่งั้นผู้ใช้ติดตาย
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** ระยะเผื่อจากท้ายกล่อง (px) ที่ยังนับว่า "ถึงท้ายแล้ว" */
const END_THRESHOLD_PX = 8;

export function useScrolledToEnd(): [boolean, (el: HTMLElement | null) => void] {
  const [reachedEnd, setReachedEnd] = useState(false);
  const elRef = useRef<HTMLElement | null>(null);

  const check = useCallback((el: HTMLElement) => {
    const atEnd =
      el.scrollTop + el.clientHeight >= el.scrollHeight - END_THRESHOLD_PX;
    if (atEnd) setReachedEnd(true);
  }, []);

  const attach = useCallback(
    (el: HTMLElement | null) => {
      elRef.current = el;
      if (el) check(el);
    },
    [check],
  );

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onScroll = () => check(el);
    el.addEventListener('scroll', onScroll, { passive: true });

    // เนื้อหามาทีหลัง (โหลดจาก query) → ขนาดเปลี่ยนหลัง mount ต้องตรวจซ้ำ
    const observer = new ResizeObserver(() => check(el));
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [check]);

  return [reachedEnd, attach];
}
