/**
 * ข้อความของประเภทงานในหน้าตั้งค่าการรับงาน (PYG-593 · S04) — ไทยและอังกฤษ
 *
 * ข้อความทุกจุดของการจำกัดประเภทงานอยู่ที่นี่ที่เดียว ห้ามเขียนแทรกใน component
 * แอปยังไม่มีตัวสลับภาษา useJobTypeStrings จึงคืนภาษาไทยเสมอ (แบบเดียวกับ licenseStrings)
 */
import type { JobTypeBlockedReason, JobTypeId } from './jobTypeEligibility';

interface JobTypeCopy {
  label: string;
  desc: string;
}

const TH = {
  jobTypes: {
    general_care: { label: 'ดูแลทั่วไป', desc: 'พยุง / ทานข้าว / กิจวัตรประจำวัน' },
    bedridden_care: { label: 'ดูแลผู้ป่วยติดเตียง', desc: 'ดูแลผู้ป่วยช่วยเหลือตัวเองไม่ได้' },
    physiotherapy: { label: 'กายภาพบำบัด', desc: 'ช่วยออกกำลังกาย / กายภาพฟื้นฟู' },
    // S04-AC3 (เคาะ 7 ต.ค. 2026): ไม่ผูกวิชาชีพ · ไม่รวมฉีดยา
    medication: { label: 'จัดยาตามแพทย์สั่ง (ไม่รวมฉีดยา)', desc: 'ช่วยเตือนและจัดยาตามที่แพทย์สั่ง' },
    companion: { label: 'เป็นเพื่อน/พูดคุย', desc: 'พูดคุยเป็นเพื่อน ดูแลสภาพจิตใจผู้สูงอายุ' },
  } satisfies Record<JobTypeId, JobTypeCopy>,

  // เหตุผลที่เลือกไม่ได้ (blockedReason จาก API) + ทางไปต่อ
  reason: {
    PROFESSION_MISMATCH: 'เฉพาะนักกายภาพบำบัดที่ใบประกอบวิชาชีพผ่านการตรวจ',
    LICENSE_NOT_APPROVED: 'ใบประกอบวิชาชีพของคุณยังรอการตรวจ เลือกได้เมื่อผ่านการตรวจแล้ว',
    LICENSE_EXPIRED: 'ใบประกอบวิชาชีพของคุณหมดอายุแล้ว อัปโหลดใบใหม่เพื่อเลือกได้อีกครั้ง',
  } satisfies Record<JobTypeBlockedReason, string>,
  reasonUnknown: 'ตอนนี้ยังเลือกประเภทนี้ไม่ได้',
  action: {
    PROFESSION_MISMATCH: 'แจ้งวิชาชีพ',
    LICENSE_NOT_APPROVED: 'ดูสถานะใบประกอบฯ',
    LICENSE_EXPIRED: 'อัปโหลดใบใหม่',
  } satisfies Record<JobTypeBlockedReason, string>,
  lockedLabel: 'เลือกไม่ได้',

  // เคยเลือกไว้แต่ตอนนี้เลือกไม่ได้ (E2/E3 · BE ไม่ให้บันทึกจนกว่าจะเอาออก)
  selectedButBlocked: 'เลือกไม่ได้แล้ว เอาออกก่อนจึงจะบันทึกได้',
  noneSelected: 'ยังไม่ได้เลือกประเภทบริการ ผู้รับบริการจะยังจองคุณไม่ได้',

  // error JOB_TYPE_NOT_ALLOWED ตอนบันทึก
  saveBlocked: (labels: string) => `บันทึกไม่ได้: ${labels} เลือกไม่ได้สำหรับบัญชีของคุณ เอาออกแล้วบันทึกอีกครั้ง`,
};

export type JobTypeStrings = typeof TH;

const EN: JobTypeStrings = {
  jobTypes: {
    general_care: { label: 'General care', desc: 'Mobility, meals and daily routines' },
    bedridden_care: { label: 'Bedridden care', desc: 'Care for patients who can’t help themselves' },
    physiotherapy: { label: 'Physiotherapy', desc: 'Exercise and rehabilitation' },
    medication: { label: 'Medication as prescribed (no injections)', desc: 'Reminders and sorting medicines as the doctor prescribed' },
    companion: { label: 'Companionship', desc: 'Conversation and emotional support' },
  },
  reason: {
    PROFESSION_MISMATCH: 'Only for physiotherapists with a verified professional license',
    LICENSE_NOT_APPROVED: 'Your professional license is still being reviewed. You can select this once it’s approved',
    LICENSE_EXPIRED: 'Your professional license has expired. Upload a new one to select this again',
  },
  reasonUnknown: 'You can’t select this type right now',
  action: {
    PROFESSION_MISMATCH: 'Update profession',
    LICENSE_NOT_APPROVED: 'View license status',
    LICENSE_EXPIRED: 'Upload a new license',
  },
  lockedLabel: 'Unavailable',
  selectedButBlocked: 'No longer available. Remove it to save',
  noneSelected: 'No service types selected. Care recipients can’t book you yet',
  saveBlocked: (labels: string) => `Couldn’t save: ${labels} isn’t available for your account. Remove it and save again`,
};

export const JOB_TYPE_STRINGS = { th: TH, en: EN };

export function useJobTypeStrings(): JobTypeStrings {
  return TH;
}
