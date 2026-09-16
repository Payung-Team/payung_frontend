import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { SCAN_JOB_QR } from '../../graphql/queries';
import { extractGraphQLErrorMessage } from '../../lib/apolloErrors';

/** ผลการสแกนที่ backend คืนมา — ชื่อฟิลด์ตรงกับ type JobScanResult ใน schema.gql */
export interface JobScanResult {
  ok: boolean;
  result: string;
  action: 'CHECK_IN' | 'CHECK_OUT' | 'NONE';
  bookingId: string | null;
  sessionStatus: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | null;
  message: string;
  scannedAt: string;
  jobEvent: { serverTs: string; distanceM: number | null; reviewReasons: string[] } | null;
}

/** สีของกล่องผลลัพธ์ — เขียว = งานขยับจริง, ส้ม = ถูกปฏิเสธแต่เข้าใจได้, แดง = อ่านรูป/ระบบพัง */
export type ResultTone = 'success' | 'rejected' | 'error';

export const TONE_STYLE: Record<ResultTone, { bg: string; border: string; text: string; icon: string; iconColor: string }> = {
  success: { bg: '#ECFDF5', border: 'rgba(16,185,129,.3)', text: '#047857', icon: 'check_circle', iconColor: '#047857' },
  rejected: { bg: '#FFFBEB', border: 'rgba(245,158,11,.35)', text: '#B45309', icon: 'error_outline', iconColor: '#B45309' },
  error: { bg: '#FEF2F2', border: 'rgba(220,38,38,.25)', text: '#B91C1C', icon: 'report', iconColor: '#DC2626' },
};

const ACTION_LABEL: Record<JobScanResult['action'], string> = {
  CHECK_IN: 'เช็คอิน (เริ่มงาน)',
  CHECK_OUT: 'เช็คเอาท์ (ปิดงาน)',
  NONE: 'ไม่มีการเปลี่ยนแปลง',
};

export interface ScanFeedback {
  tone: ResultTone;
  title: string;
  detail: string;
  /** true = โทเค็นที่ได้มาเป็นของงานใบอื่น (backend ทำ action ให้งานใบนั้นไปแล้ว) */
  wrongBooking?: boolean;
}

export interface JobQrScanController {
  busy: boolean;
  setBusy: (value: boolean) => void;
  state: ScanFeedback | null;
  setState: (value: ScanFeedback | null) => void;
  /** คืนผลที่ตีความแล้ว เพื่อให้ผู้เรียกทำต่อได้ทันที (เช่น ล้างช่องกรอกเมื่อสำเร็จ) */
  runScan: (token: string) => Promise<ScanFeedback>;
}

/**
 * ตรรกะการส่งโทเค็นให้ backend ตัดสิน — ใช้ร่วมกันระหว่างกล้องสแกน (CheckOutScanModal)
 * และช่องกรอกโทเค็น/อัปโหลดรูปในโหมดทดสอบ (QrTokenFallback)
 *
 * แยกออกมาเป็น hook เพราะทั้งสองทางต่างกันแค่ "วิธีได้สตริงมา" ปลายทางคือ
 * mutation scanJobQr ตัวเดียวกัน การตีความผลลัพธ์จึงต้องเหมือนกันเป๊ะทุกทาง
 */
export function useJobQrScan(bookingId: string, onScanned: (result: JobScanResult) => void): JobQrScanController {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ScanFeedback | null>(null);
  const [scanJobQr] = useMutation<{ scanJobQr: JobScanResult }>(SCAN_JOB_QR);

  /**
   * ★ ส่ง `token` ตามที่ได้มาเป๊ะ ๆ ไม่แปลงตัวพิมพ์ ไม่ตัดอะไรตรงกลาง
   *   เพราะ backend จะ hash ทั้งสตริงแล้วเทียบกับดีบี
   */
  async function runScan(token: string): Promise<ScanFeedback> {
    setBusy(true);
    setState(null);

    // ตัวช่วยเดียวสำหรับทุกทางออก — ทั้งตั้ง state และคืนค่าเดียวกันให้ผู้เรียก
    const settle = (feedback: ScanFeedback): ScanFeedback => {
      setState(feedback);
      return feedback;
    };

    try {
      const { data } = await scanJobQr({
        variables: { input: { token, deviceTs: new Date().toISOString() } },
      });

      const result = data?.scanJobQr;
      if (!result) {
        return settle({ tone: 'error', title: 'ไม่ได้รับผลลัพธ์จากระบบ', detail: 'กรุณาลองใหม่อีกครั้ง' });
      }

      // ★ ถูกปฏิเสธไม่ใช่ error — backend ตั้งใจคืน ok=false พร้อมเหตุผล
      //   ข้อความไทยใน message เจาะจงกว่าที่เราจะเขียนเองมาก จึงแสดงตรง ๆ
      if (!result.ok) {
        return settle({ tone: 'rejected', title: `สแกนไม่ผ่าน · ${result.result}`, detail: result.message });
      }

      const wrongBooking = result.bookingId !== null && result.bookingId !== bookingId;

      const feedback = settle({
        tone: 'success',
        title: `${ACTION_LABEL[result.action]} สำเร็จ`,
        detail: result.message,
        wrongBooking,
      });

      // แจ้งหน้าแม่เฉพาะตอนที่โทเค็นเป็นของงานใบนี้จริง — ถ้าเป็นงานใบอื่น
      // การสลับหน้าใบนี้ตามจะยิ่งทำให้เข้าใจผิดว่างานใบนี้เริ่มแล้ว
      if (!wrongBooking) onScanned(result);
      return feedback;
    } catch (err) {
      return settle({
        tone: 'error',
        title: 'ส่งผลการสแกนไม่สำเร็จ',
        detail: extractGraphQLErrorMessage(err) ?? 'เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่',
      });
    } finally {
      setBusy(false);
    }
  }

  return { busy, setBusy, state, setState, runScan };
}
