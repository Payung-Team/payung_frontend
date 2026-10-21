// PYG-460 — payload ของ POST /api/v1/bookings
//
// เคยมีโค้ดชุดนี้อยู่สองที่ (SearchPage + CaregiverProfilePage) เกือบเหมือนกันบรรทัดต่อบรรทัด
// ซึ่งเป็นต้นเหตุของบั๊กรอบนี้เอง: ฟอร์มกรอก 15 ช่อง แต่ payload ใส่มา 4 ช่อง และแก้ที่เดียว
// ก็ยังผิดอีกที่ → รวมมาไว้ที่นี่ ใครจะเพิ่มฟิลด์ให้แก้ตรงนี้ที่เดียว

import type { BookingRequest } from '../context/BookingContext';
import { toPatientProfilePayload } from './patientProfile';
import type { PatientProfile } from './patientProfile';

const SERVICE_TYPE_MAP: Record<string, string> = {
  'ดูแลทั่วไป': 'general_care',
  'ดูแลผู้ป่วยติดเตียง': 'bedridden_care',
  'กายภาพบำบัด': 'physiotherapy',
  'ช่วยจัดการยา': 'medication',
  'เป็นเพื่อน/พูดคุย': 'companion',
};

export interface BookingPayload {
  /**
   * PYG-648 · S18 — ไม่ส่งแล้วในเส้นทางหลัก: สร้าง booking แบบ unmatched ก่อน แล้วเลือกผู้ดูแลด้วย
   * selectBookingCaregiver (รายชื่อกรองตามระดับ/ทักษะได้ต้องมี booking ก่อน) · คงไว้ให้ type ของ BE ตรงกัน
   */
  caregiverId?: string;
  tasks: string[];
  serviceLocations: string[];
  serviceType: string;
  /** "HH:mm" */
  startTime: string;
  /**
   * PYG-525 — "HH:mm" · BE คำนวณ durationHours + timeSlot เองจากสองเวลานี้
   * (เลิกส่ง timeSlot / durationHours แล้ว — BE รับไว้แค่ช่วงเปลี่ยนผ่านของ FE เก่า)
   */
  endTime: string;
  locationAddress: string;
  lat?: number;
  lng?: number;
  bookingDate: string;
  notes?: string;
  dayOfContactName?: string;
  dayOfContactPhone?: string;
  dayOfContactRelationship?: string;
  patientName?: string;
  careRecipientId?: string;
  patientProfile?: PatientProfile;
  saveAsProfile?: boolean;
  /**
   * PYG-635 — id ของกิจกรรมจากรายการกลาง (careActivities) · ไม่เลือก = ไม่ส่ง
   * BE ตอบ CARE_ACTIVITY_INACTIVE / NOT_FOUND ถ้ามีรายการที่ถูกปิดใช้งาน/ลบไปแล้ว (ดู rejectedBookingActivityIds)
   */
  activityIds?: string[];
}

/**
 * ⚠ ทุกค่าต้องอ่านจาก `draft` ไม่ใช่ state ของฟอร์ม — หน้าที่ยิง API
 *   (SearchPage / CaregiverProfilePage) เป็นคนละหน้ากับหน้าที่กรอก
 *   (BookingStepPatient) ค่าที่ไม่ได้เก็บลง draft จะหายไปเงียบ ๆ ตอนมาถึงตรงนี้
 */
export function buildBookingPayload(
  draft: BookingRequest,
  caregiverId?: string,
): BookingPayload {
  const tasksList = [
    ...(draft.jobDetails?.tasks?.map((t) => t.name) ?? []),
    ...(draft.jobDetails?.customTasks?.map((t) => t.name) ?? []),
  ];
  const serviceLocs = draft.serviceLocation ?? [];
  const atHomeAddress = draft.locationDetails?.at_home?.address ?? '';
  const hospitalName = draft.locationDetails?.accompany_outside?.hospitalName ?? '';
  const meetingPoint = draft.locationDetails?.accompany_outside?.meetingPoint ?? '';

  // หมุดที่ผู้ป่วยปักไว้ใน BookingStep1 — เคยสร้างตัวแปรทิ้งไว้แต่ไม่ได้ส่ง ทำให้
  // location_lat/lng เป็น NULL ทุกใบ เอาของ at_home ก่อน (มีหมุดจริง)
  // ส่วน accompany_outside เป็น optional
  const pinLat =
    draft.locationDetails?.at_home?.lat ?? draft.locationDetails?.accompany_outside?.lat;
  const pinLng =
    draft.locationDetails?.at_home?.lng ?? draft.locationDetails?.accompany_outside?.lng;

  const addrParts: string[] = [];
  if (serviceLocs.includes('at_home') && atHomeAddress) addrParts.push(atHomeAddress);
  if (serviceLocs.includes('accompany_outside') && hospitalName) {
    const meetingSuffix = meetingPoint ? ` (จุดนัดพบ: ${meetingPoint})` : '';
    addrParts.push(`ปลายทาง: ${hospitalName}${meetingSuffix}`);
  }

  return {
    caregiverId,
    tasks: tasksList.length > 0 ? tasksList : ['ดูแลทั่วไป'],
    serviceLocations: serviceLocs.length > 0 ? serviceLocs : ['at_home'],
    serviceType: SERVICE_TYPE_MAP[draft.serviceTypes?.[0] ?? ''] ?? 'general_care',
    // ★ ไม่เติมค่าเริ่มต้นเอง (เดิม '09:00:00' / 4 ชม.) — ขั้นวันเวลาบังคับเลือกครบก่อนไปต่อแล้ว
    //   ถ้ายังว่างอยู่ให้ BE ปฏิเสธพร้อมข้อความ ดีกว่าจองเวลาที่ผู้ใช้ไม่ได้เลือกไปเงียบ ๆ
    startTime: draft.dateTime?.startTime ?? '',
    endTime: draft.dateTime?.endTime ?? '',
    locationAddress: addrParts.length > 0 ? addrParts.join(' / ') : '-',
    lat: pinLat,
    lng: pinLng,
    bookingDate: draft.dateTime?.date ?? new Date().toISOString().slice(0, 10),
    notes: draft.jobDetails?.notes || undefined,
    activityIds: draft.jobDetails?.activities?.length
      ? draft.jobDetails.activities.map((a) => a.activityId)
      : undefined,
    dayOfContactName: draft.contactPerson?.name ?? undefined,
    dayOfContactPhone: draft.contactPerson?.phone ?? undefined,
    dayOfContactRelationship: draft.contactPerson?.relationship ?? undefined,
    patientName: draft.recipient?.patientDetails?.name ?? undefined,

    // ★ เดิมเขียนว่า `recipient?.type === 'member' ? recipient.selectedMemberId : undefined`
    //   ซึ่งเป็น dead branch เพราะ BookingStepPatient ตั้ง `type: 'self'` ตายตัวเสมอ
    //   ผลคือ booking ไม่เคยผูกกับโปรไฟล์ที่ผู้ใช้เลือก (staging: 0 จาก 101 ใบ)
    //   ตอนนี้ส่ง id ของโปรไฟล์ที่เลือกจากลิสต์จริง ๆ (undefined = กรอกเอง ไม่ได้เลือก)
    careRecipientId: draft.recipient?.selectedRecipientId ?? undefined,

    patientProfile: toPatientProfilePayload(draft.recipient?.patientDetails),

    // ให้ BE สร้างโปรไฟล์ใน transaction เดียวกับ booking — ห้ามยิง
    // POST /care-recipients แยกตอนจอง ไม่งั้นมีช่องที่โปรไฟล์ถูกสร้างสำเร็จแล้ว
    // booking พัง เหลือโปรไฟล์ค้างที่ผู้ใช้ไม่ได้ตั้งใจสร้าง แล้วกดจองใหม่ได้ซ้ำอีกใบ
    saveAsProfile: draft.recipient?.saveAsProfile ?? false,
  };
}

/**
 * PYG-385 — input ของ createBookingOnBehalf (จองแทนสมาชิกในกลุ่ม) จาก payload เดียวกัน
 * เดิมคัดลอกไว้ทั้ง SearchPage + CaregiverProfilePage · ตอนนี้สร้าง booking ที่เดียว (useMatchingBooking)
 */
export function buildOnBehalfInput(
  draft: BookingRequest,
  onBehalf: NonNullable<BookingRequest['onBehalf']>,
  payload: BookingPayload,
) {
  const pd = draft.recipient?.patientDetails;
  const memberDetails = {
    age: pd?.age,
    gender: pd?.gender || undefined,
    weight: pd?.weight,
    height: pd?.height,
    supportLevel: pd?.supportLevel || undefined,
    bloodGroup: pd?.bloodGroup || undefined,
    conditions: pd?.conditions?.length ? pd.conditions : undefined,
    medicines: pd?.medicines || undefined,
    allergies: pd?.allergies || undefined,
    careInstructions: pd?.careInstructions || undefined,
    regularHospital: pd?.regularHospital || undefined,
  };
  const hasDetails = Object.values(memberDetails).some((v) => v != null);
  return {
    groupId: onBehalf.familyGroupId,
    // PYG-500: โมเดล "สมาชิก = patient" — ส่ง memberUserId (backend หา/สร้างโปรไฟล์ให้)
    memberUserId: onBehalf.memberUserId,
    careRecipientId: onBehalf.careRecipientId,
    // ★ PYG-519: ไม่ส่ง patientName อีกแล้ว — ชื่อ-นามสกุลมาจากบัญชีของสมาชิกเสมอ
    //   BE ปฏิเสธด้วย 400 PATIENT_NAME_NOT_ALLOWED ถ้าส่งมา (PYG-516)
    caregiverId: payload.caregiverId,
    tasks: payload.tasks,
    activityIds: payload.activityIds,
    serviceLocations: payload.serviceLocations,
    serviceType: payload.serviceType,
    // PYG-525: ส่งเวลาเริ่ม + สิ้นสุด — BE คำนวณ durationHours / timeSlot เอง
    startTime: payload.startTime,
    endTime: payload.endTime,
    locationAddress: payload.locationAddress,
    lat: payload.lat,
    lng: payload.lng,
    bookingDate: payload.bookingDate,
    notes: payload.notes,
    dayOfContactName: payload.dayOfContactName,
    dayOfContactPhone: payload.dayOfContactPhone,
    dayOfContactRelationship: payload.dayOfContactRelationship,
    ...(hasDetails ? { memberDetails } : {}),
  };
}
