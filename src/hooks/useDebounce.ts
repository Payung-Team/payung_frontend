import { useEffect, useState } from 'react';

// คืนค่า value ที่หน่วงเวลา — ใช้กับ search input เพื่อลดการยิง query ถี่เกินไป
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export default useDebounce;
