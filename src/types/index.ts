/**
 * Shared type definitions for the Payung application.
 */

export interface User {
  id: string;
  /** null เมื่อบัญชีสมัครด้วยเบอร์โทรศัพท์อย่างเดียว (PYG-604) */
  email: string | null;
  displayName?: string;
  role?: number; // 1 = patient, 2 = caregiver, 3 = admin
}

