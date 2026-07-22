/**
 * OMISE_BANK_OPTIONS — รายชื่อธนาคารที่ Omise Recipients API รองรับ (bank_account.brand)
 *
 * ต้อง sync กับ backend: payung_backend/src/common/constants/omise-banks.constant.ts
 * TODO: verify รายการนี้กับ Omise dashboard/API docs ล่าสุดก่อนใช้งานจริง
 */
export interface OmiseBankOption {
  code: string;
  label: string;
}

export const OMISE_BANK_OPTIONS: OmiseBankOption[] = [
  { code: 'bbl', label: 'ธนาคารกรุงเทพ (BBL)' },
  { code: 'kbank', label: 'ธนาคารกสิกรไทย (KBank)' },
  { code: 'ktb', label: 'ธนาคารกรุงไทย (KTB)' },
  { code: 'scb', label: 'ธนาคารไทยพาณิชย์ (SCB)' },
  { code: 'bay', label: 'ธนาคารกรุงศรีอยุธยา (BAY)' },
  { code: 'tmb', label: 'ธนาคารทหารไทยธนชาต (TTB)' },
  { code: 'kk', label: 'ธนาคารเกียรตินาคินภัทร (KKP)' },
  { code: 'citi', label: 'ธนาคารซิตี้แบงก์ (Citi)' },
  { code: 'cimb', label: 'ธนาคารซีไอเอ็มบี ไทย (CIMB)' },
  { code: 'uob', label: 'ธนาคารยูโอบี (UOB)' },
  { code: 'gsb', label: 'ธนาคารออมสิน (GSB)' },
  { code: 'baac', label: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)' },
  { code: 'ghb', label: 'ธนาคารอาคารสงเคราะห์ (GHB)' },
  { code: 'tisco', label: 'ธนาคารทิสโก้ (TISCO)' },
  { code: 'lhbank', label: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)' },
  { code: 'icbc', label: 'ธนาคารไอซีบีซี (ICBC)' },
  { code: 'sc', label: 'ธนาคารสแตนดาร์ดชาร์เตอร์ด (SC)' },
  { code: 'ibank', label: 'ธนาคารอิสลามแห่งประเทศไทย (iBank)' },
];

export function getBankLabel(code: string | undefined | null): string {
  if (!code) return '-';
  return OMISE_BANK_OPTIONS.find((b) => b.code === code)?.label ?? code;
}
