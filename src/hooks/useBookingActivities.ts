import { useQuery } from '@apollo/client/react';
import {
  CAREGIVER_BOOKING_ACTIVITIES,
  MY_BOOKING_ACTIVITIES,
  type BookingActivity,
} from '../graphql/careActivities';

/**
 * snapshot กิจกรรมของการจอง — query แยกจากตัวรายละเอียดการจอง (ดูเหตุผลใน graphql/careActivities.ts)
 * error / ยังไม่มี field → [] เงียบ ๆ (การจองก่อน PYG-634 ก็ได้ [] เหมือนกัน)
 */
export function useBookingActivities(bookingId: string | undefined, as: 'patient' | 'caregiver', skip = false) {
  const { data } = useQuery<{
    myBooking?: { activities?: BookingActivity[] } | null;
    caregiverBooking?: { activities?: BookingActivity[] } | null;
  }>(as === 'patient' ? MY_BOOKING_ACTIVITIES : CAREGIVER_BOOKING_ACTIVITIES, {
    variables: { id: bookingId },
    skip: skip || !bookingId,
    fetchPolicy: 'cache-and-network',
  });
  return (as === 'patient' ? data?.myBooking?.activities : data?.caregiverBooking?.activities) ?? [];
}
