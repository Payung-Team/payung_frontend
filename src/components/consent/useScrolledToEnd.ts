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
 *
 * ★ เก็บ element ใน state ไม่ใช่ ref: component ที่ใช้ hook นี้อาจ mount ก่อนกล่องจะมีจริง
 *   (ConsentModal ตอน open=false คืน null) ถ้าเก็บใน ref แล้วผูก listener ใน effect ที่รันครั้งเดียว
 *   effect จะเจอ null แล้วไม่รันอีกเลย → ไม่มี scroll listener → ปุ่มยินยอมค้าง disabled ตลอด
 */
import { useCallback, useEffect, useState } from 'react';

/** ระยะเผื่อจากท้ายกล่อง (px) ที่ยังนับว่า "ถึงท้ายแล้ว" */
const END_THRESHOLD_PX = 8;

export function useScrolledToEnd(): [boolean, (el: HTMLElement | null) => void] {
  const [reachedEnd, setReachedEnd] = useState(false);
  const [el, setEl] = useState<HTMLElement | null>(null);

  const check = useCallback((target: HTMLElement) => {
    const atEnd =
      target.scrollTop + target.clientHeight >= target.scrollHeight - END_THRESHOLD_PX;
    if (atEnd) setReachedEnd(true);
  }, []);

  useEffect(() => {
    if (!el) return;

    const onScroll = () => check(el);
    el.addEventListener('scroll', onScroll, { passive: true });

    // ResizeObserver เรียก callback ทันทีหนึ่งครั้งหลัง observe() → ใช้เป็นการตรวจครั้งแรกด้วย
    // (กรณีเนื้อหาสั้นกว่ากล่อง) แล้วตรวจซ้ำเมื่อขนาดเปลี่ยน (เนื้อหาโหลดทีหลัง, ย่อ/ขยายหน้าต่าง)
    // ดูทั้งตัวกล่องและลูกชั้นแรก: เนื้อหาข้างในสูงขึ้นไม่ทำให้ขนาดของกล่องเลื่อนเปลี่ยน
    const observer = new ResizeObserver(() => check(el));
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));

    return () => {
      el.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [el, check]);

  // setEl คงที่ตลอดอายุ component → ใช้เป็น callback ref ได้ตรง ๆ
  return [reachedEnd, setEl];
}
