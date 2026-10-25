import { kycDate, kycDateTime } from '../kycDate';

export const genderLabel: Record<string, string> = {
  male: 'ชาย',
  female: 'หญิง',
  other: 'อื่นๆ',
};

/** 1509966392215 → 1-5099-66392-21-5 (รูปแบบเดียวกับบนบัตร ช่วยให้เทียบกับเอกสารง่าย) */
export function formatIdCard(value?: string | null) {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 13) return value;
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
}

export function formatPhone(value?: string | null) {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  return value;
}

/** PYG-711: วันที่ของ KYC ใช้รูปแบบเดียวกันทุกจุด — ดู kycDate.ts */
export function formatThaiDate(value?: string | null) {
  return kycDate(value);
}

export function formatThaiDateTime(value?: string | null) {
  return kycDateTime(value);
}

export function getAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return '-';
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return '-';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age} ปี`;
}

/** วันเกิด + อายุ เช่น "15 ต.ค. 2541 (28 ปี)" */
export function formatBirthDate(dateOfBirth?: string | null) {
  const age = getAge(dateOfBirth);
  return age !== '-' ? `${formatThaiDate(dateOfBirth)} (${age})` : formatThaiDate(dateOfBirth);
}

/** ชื่อเต็ม → ชื่อ / นามสกุล (คำแรก = ชื่อ) */
export function splitName(fullName?: string | null) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '-', lastName: parts.slice(1).join(' ') || '-' };
}
