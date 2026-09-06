/**
 * Logger กลางสำหรับ error ของ GraphQL — ตัดข้อมูลอ่อนไหวออกเสมอ
 *
 * ทำไมต้องมี: ตอน validation ล้มเหลว server จะสะท้อนค่า variables กลับมาใน
 * error message ตรง ๆ เช่น
 *   Variable "$input" got invalid value { idCardNumber: "1234567890123", ... }
 * ถ้า log error object (หรือแม้แต่ error.message ดิบ ๆ) เลขบัตรประชาชนกับ
 * เลขบัญชีธนาคารจะไปโผล่ใน console และไหลต่อไปยัง log service ทั้งหมด
 *
 * กติกา: log แค่ operation name กับ message ที่ redact แล้ว
 * ห้ามส่ง error object, variables หรือ response payload เข้า console
 */

/** field ที่ห้ามหลุดออก console ไม่ว่ากรณีใด */
const SENSITIVE_KEYS = [
  'idCardNumber',
  'accountNumber',
  'accountName',
  'dateOfBirth',
  'phone',
  'password',
  'accessToken',
  'refreshToken',
] as const;

/** จับทั้งรูปแบบ GraphQL (key: "value") และ JSON ("key":"value") */
const SENSITIVE_VALUE_PATTERN = new RegExp(
  String.raw`(["']?(?:${SENSITIVE_KEYS.join('|')})["']?\s*:\s*)` +
    String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^,}\]\s]+)`,
  'gi',
);

/** เลขบัตรประชาชน 13 หลัก / เลขบัญชี 10 หลัก ที่หลุดมาแบบไม่มี key กำกับ */
const BARE_LONG_DIGITS_PATTERN = /\b\d{10,16}\b/g;

/**
 * ลบค่าของ field อ่อนไหวออกจากข้อความ
 * export ไว้เผื่อ log จุดอื่นที่ไม่ใช่ GraphQL ต้องใช้ซ้ำ
 */
export function redactSensitive(text: string): string {
  return text
    .replace(SENSITIVE_VALUE_PATTERN, '$1"[redacted]"')
    .replace(BARE_LONG_DIGITS_PATTERN, '[redacted]');
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

/**
 * log error ของ GraphQL แบบปลอดภัย
 *
 * @param operationName ชื่อ operation เช่น 'SubmitKyc' — ใช้ไล่ต้นตอใน console
 * @param error error ที่ catch มา (Apollo error, Error, หรืออะไรก็ได้)
 */
export function logGraphQLError(operationName: string, error: unknown): void {
  console.error(`[GraphQL] ${operationName} failed: ${redactSensitive(extractMessage(error))}`);
}
