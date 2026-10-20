import { useQuery } from '@apollo/client/react';
import {
  CAREGIVER_BOOKING_INFECTION,
  type CaregiverBookingInfectionData,
} from '../../graphql/infectionDisclosure';
import type { InfectionDisclosure } from '../../lib/infectionDisclosure';

export interface CaregiverInfectionState {
  /** null = ผู้ดูแลคนนี้ไม่ได้รับข้อมูล (สถานะคำขอเลยช่วงที่เห็นได้ หรือไม่ใช่เจ้าของคำขอ) */
  disclosure: InfectionDisclosure | null;
  loading: boolean;
  error: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * ข้อมูลโรคติดเชื้อของคำขอรับงาน (S10 · PYG-620)
 * ★ no-cache: ค่าไม่ค้างใน Apollo cache และโหลดใหม่ทุกครั้งที่เปิดหน้า (E2 · E5)
 */
export function useCaregiverInfection(bookingId: string | undefined): CaregiverInfectionState {
  const { data, loading, error, refetch } = useQuery<CaregiverBookingInfectionData>(
    CAREGIVER_BOOKING_INFECTION,
    { variables: { id: bookingId ?? '' }, skip: !bookingId, fetchPolicy: 'no-cache' },
  );
  return {
    disclosure: data?.caregiverBooking?.infectionDisclosure ?? null,
    loading,
    error: !!error,
    refetch,
  };
}
