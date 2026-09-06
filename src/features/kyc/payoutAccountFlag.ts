/**
 * PYG-307 — ส่ง payoutAccount ไปกับ submitKyc/resubmitKyc ได้หรือยัง
 *
 * ตอนนี้ = false เพราะ backend ยังไม่มี field `payoutAccount` ใน `KycInput`
 * (โค้ดฝั่ง BE อยู่ใน PR #37 ที่ยังไม่ merge) ถ้าส่งไปจะได้ HTTP 400:
 *   Variable "$input" got invalid value ...;
 *   Field "payoutAccount" is not defined by type "KycInput".
 *
 * วิธีเปิดกลับหลัง BE PR #37 merge เข้า dev (คาดว่าหลัง 10 ก.ย.):
 *   เปลี่ยนค่าคงที่ตัวนี้เป็น true อย่างเดียว — ฟอร์ม step 3 กับ payload
 *   ประกอบไว้ครบแล้ว ไม่ต้องแก้ที่อื่น
 *
 * ระหว่างที่เป็น false: step 3 ยังกรอกได้ตามปกติ แต่ข้อมูลจะอยู่แค่ในหน้าจอ
 * ไม่ถูกส่งขึ้น backend — UI ต้องบอกผู้ใช้ตามจริง (ห้ามบอกว่าบันทึกแล้ว)
 */
export const SEND_PAYOUT_ACCOUNT_WITH_KYC = false;

/**
 * ข้อความแจ้งผู้ใช้ระหว่างที่ยังส่งบัญชีรับเงินไม่ได้
 *
 * หมายเหตุ: ห้ามเขียนว่า "เพิ่มได้ทีหลังที่หน้าตั้งค่า" — mutation
 * `updatePayoutAccount` ที่หน้านั้นเรียกก็ยังไม่มีบน backend เหมือนกัน
 */
export const PAYOUT_NOT_SAVED_NOTICE =
  'ระบบจะเปิดให้บันทึกบัญชีรับเงินเร็ว ๆ นี้ ข้อมูลที่กรอกรอบนี้จะยังไม่ถูกบันทึก';
