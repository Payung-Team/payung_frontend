/**
 * Shared type definitions for the Payung application.
 */

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role?: number; // 1 = patient, 2 = caregiver, 3 = admin
}

