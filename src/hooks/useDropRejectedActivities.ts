import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useBooking } from '../context/BookingContext';
import { rejectedBookingActivityIds } from '../lib/careActivityStrings';

/**
 * PYG-635 · S15-E2 — BE ปฏิเสธการจองเพราะกิจกรรมที่เลือกถูกปิดใช้งาน / ไม่มีแล้ว
 * → เอา id พวกนั้นออกจาก draft + โหลดรายการกิจกรรมใหม่ ผู้ใช้กดยืนยันซ้ำได้เลยโดยไม่ต้องย้อนกลับไปแก้
 *
 * คืน true เมื่อ error เป็นเรื่องกิจกรรม (ข้อความ error มาจาก bookingHttpErrorMessage /
 * onBehalfBookingErrorMessage ซึ่งรู้จัก code เดียวกัน)
 */
export function useDropRejectedActivities() {
  const { setBookingDraft } = useBooking();
  const client = useApolloClient();

  return useCallback(
    (source: unknown): boolean => {
      const ids = rejectedBookingActivityIds(source);
      if (!ids) return false;
      // BE ไม่ได้บอก id มา (ไม่ควรเกิด) → ตัดทั้งหมด ดีกว่าให้กดยืนยันแล้วโดนซ้ำเรื่อย ๆ
      const rejected = new Set(ids);
      setBookingDraft((prev) => {
        if (!prev?.jobDetails?.activities) return prev;
        return {
          ...prev,
          jobDetails: {
            ...prev.jobDetails,
            activities: ids.length > 0 ? prev.jobDetails.activities.filter((a) => !rejected.has(a.activityId)) : [],
          },
        };
      });
      // ตัวเลือกกิจกรรมไม่ได้ mount อยู่ตอนกดยืนยัน → ล้าง cache ไว้ ครั้งหน้าที่เปิดขั้นบริการได้รายการใหม่
      client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'careActivities' });
      client.cache.gc();
      return true;
    },
    [setBookingDraft, client],
  );
}
