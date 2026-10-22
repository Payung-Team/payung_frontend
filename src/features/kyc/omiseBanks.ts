/**
 * OMISE_BANK_OPTIONS — รายชื่อธนาคารสำรอง (fallback) + label สำหรับแสดงผล
 *
 * ★ source of truth อยู่ที่ backend: query `payoutBankOptions`
 *   (payung_backend/src/common/constants/omise-banks.constant.ts)
 *   ฟอร์มบัญชีรับเงินดึงรายการ + กฎความยาวจาก query นั้น — รายการนี้ใช้เฉพาะ
 *   ตอน query ยังโหลดไม่เสร็จ/ล้มเหลว และสำหรับ getBankLabel เท่านั้น
 *
 * ⚠️ รหัสต้องตรง BE เป๊ะ — เคยใช้ 'tmb'/'lhbank' (รหัสเก่า) จน submitKyc โดน
 *   "ธนาคารที่เลือกไม่รองรับ" ตอนนี้คือ 'ttb'/'lhb'
 */
export interface OmiseBankOption {
  code: string;
  label: string;
  /** จำนวนหลักต่ำสุด/สูงสุดที่ยอมรับ — ค่าจาก payoutBankOptions */
  minDigits: number;
  maxDigits: number;
  /** ความยาวที่ BE ยืนยันแล้ว — null = ใช้ช่วง min–max */
  exactDigits?: number[] | null;
}

/** ช่วงเริ่มต้น ตรงกับ PAYOUT_ACCOUNT_DIGITS_MIN/MAX ฝั่ง BE */
export const DEFAULT_MIN_DIGITS = 10;
export const DEFAULT_MAX_DIGITS = 15;

const bank = (code: string, label: string): OmiseBankOption => ({
  code,
  label,
  minDigits: DEFAULT_MIN_DIGITS,
  maxDigits: DEFAULT_MAX_DIGITS,
  exactDigits: null,
});

export const OMISE_BANK_OPTIONS: OmiseBankOption[] = [
  bank('bbl', 'ธนาคารกรุงเทพ (BBL)'),
  bank('kbank', 'ธนาคารกสิกรไทย (KBank)'),
  bank('ktb', 'ธนาคารกรุงไทย (KTB)'),
  bank('scb', 'ธนาคารไทยพาณิชย์ (SCB)'),
  bank('bay', 'ธนาคารกรุงศรีอยุธยา (BAY)'),
  bank('ttb', 'ธนาคารทหารไทยธนชาต (TTB)'),
  bank('kk', 'ธนาคารเกียรตินาคินภัทร (KKP)'),
  bank('citi', 'ธนาคารซิตี้แบงก์ (Citi)'),
  bank('cimb', 'ธนาคารซีไอเอ็มบี ไทย (CIMB)'),
  bank('uob', 'ธนาคารยูโอบี (UOB)'),
  bank('gsb', 'ธนาคารออมสิน (GSB)'),
  bank('baac', 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)'),
  bank('ghb', 'ธนาคารอาคารสงเคราะห์ (GHB)'),
  bank('tisco', 'ธนาคารทิสโก้ (TISCO)'),
  bank('lhb', 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)'),
  bank('icbc', 'ธนาคารไอซีบีซี (ICBC)'),
  bank('sc', 'ธนาคารสแตนดาร์ดชาร์เตอร์ด (SC)'),
  bank('ibank', 'ธนาคารอิสลามแห่งประเทศไทย (iBank)'),
];

export function getBankLabel(code: string | undefined | null): string {
  if (!code) return '-';
  return OMISE_BANK_OPTIONS.find((b) => b.code === code)?.label ?? code;
}

/** แปลงผลจาก query payoutBankOptions → OmiseBankOption (label ใช้ชื่อไทยจาก BE) */
export function fromPayoutBankOptions(
  options: { code: string; nameTh: string; minDigits: number; maxDigits: number; exactDigits?: number[] | null }[],
): OmiseBankOption[] {
  return options.map((o) => ({
    code: o.code,
    label: o.nameTh,
    minDigits: o.minDigits,
    maxDigits: o.maxDigits,
    exactDigits: o.exactDigits ?? null,
  }));
}

/**
 * validateAccountNumber — mirror ของ validateAccountNumberForBank ฝั่ง BE
 * @returns ข้อความ error หรือ null ถ้าผ่าน
 */
export function validateAccountNumber(bankOption: OmiseBankOption | undefined, value: string): string | null {
  if (!/^\d+$/.test(value)) return 'เลขบัญชีต้องเป็นตัวเลขเท่านั้น';
  if (!bankOption) {
    if (value.length < DEFAULT_MIN_DIGITS || value.length > DEFAULT_MAX_DIGITS) {
      return `เลขบัญชีต้องมี ${DEFAULT_MIN_DIGITS}–${DEFAULT_MAX_DIGITS} หลัก`;
    }
    return null;
  }
  if (bankOption.exactDigits?.length) {
    if (!bankOption.exactDigits.includes(value.length)) {
      return `เลขบัญชี${bankOption.label}ต้องมี ${bankOption.exactDigits.join(' หรือ ')} หลัก`;
    }
    return null;
  }
  if (value.length < bankOption.minDigits || value.length > bankOption.maxDigits) {
    return `เลขบัญชีต้องมี ${bankOption.minDigits}–${bankOption.maxDigits} หลัก`;
  }
  return null;
}
