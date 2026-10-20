/**
 * โรคติดเชื้อในคำขอรับงาน — S10 · PYG-620 (BE PYG-619 · contract PYG-617)
 *
 * ★ แยกจาก GET_CAREGIVER_BOOKING / CAREGIVER_BOOKING_SUMMARY_FIELDS ตั้งใจ:
 *   เป็นข้อมูลสุขภาพ ไม่ให้ไปปนใน fragment กลางที่หน้า List ใช้ร่วม
 * ★ เรียกด้วย fetchPolicy 'no-cache' เท่านั้น — ไม่ให้ค่าค้างใน Apollo cache
 */
import { gql } from '@apollo/client';

export const CAREGIVER_BOOKING_INFECTION = gql`
  query CaregiverBookingInfection($id: ID!) {
    caregiverBooking(id: $id) {
      id
      infectionDisclosure {
        hasInfectiousDisease
        acknowledgedAt
      }
    }
  }
`;

export interface CaregiverBookingInfectionData {
  caregiverBooking: {
    id: string;
    /** null = ผู้ดูแลคนนี้เห็นไม่ได้ (ไม่ใช่เจ้าของคำขอ / สถานะไม่อยู่ในช่วงที่เห็นได้ · E5, E7) */
    infectionDisclosure: {
      hasInfectiousDisease: boolean | null;
      acknowledgedAt: string | null;
    } | null;
  } | null;
}

/** รับงานพร้อมการรับทราบ — BE ไม่ผ่านตอบ INFECTION_ACK_REQUIRED (422) */
export const ACCEPT_BOOKING_WITH_INFECTION_ACK = gql`
  mutation AcceptBookingWithInfectionAck($bookingId: ID!, $infectionAcknowledged: Boolean) {
    acceptBooking(bookingId: $bookingId, infectionAcknowledged: $infectionAcknowledged) {
      id
      status
      acceptedAt
    }
  }
`;

export const INFECTION_ACK_REQUIRED = 'INFECTION_ACK_REQUIRED';
