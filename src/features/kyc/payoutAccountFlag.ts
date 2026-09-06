/**
 * PYG-307 — ส่ง payoutAccount ไปกับ submitKyc/resubmitKyc ได้หรือยัง
 *
 * ตอนนี้ = true แล้ว เพราะ BE PR #37 (`fix/pyg-307-restore-payout-account`)
 * merge เข้า dev เรียบร้อยและ migration รันแล้ว — `KycInput` มี field
 * `payoutAccount` และ `KycStatusPayload` / `AdminKycDetailPayload` คืน
 * summary แบบ mask กลับมาได้
 *
 * เก็บ flag ตัวนี้ไว้เป็นสวิตช์ฉุกเฉิน: ถ้า BE ต้อง revert #37 หรือเจอปัญหา
 * ตอนเดโม เปลี่ยนกลับเป็น false อย่างเดียวก็หยุดส่งได้ทันที โดย step 3
 * ยังกรอกได้เหมือนเดิม (ดู KycStep4.tsx ที่ประกอบ payload)
 *
 * ถ้าเปลี่ยนกลับเป็น false อย่าลืมว่า UI จะไม่บอกผู้ใช้เองแล้วว่าข้อมูลไม่ถูก
 * บันทึก — แบนเนอร์แจ้งเตือนถูกถอดออกไปตอนเปิด flag รอบนี้
 */
export const SEND_PAYOUT_ACCOUNT_WITH_KYC = true;
