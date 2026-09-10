import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { BookingStatus } from '../utils/bookingStatus';

export interface BookingRequest {
  serviceLocation: ('at_home' | 'accompany_outside')[];
  serviceTypes: string[];
  locationDetails?: {
    province?: string;
    district?: string;
    subDistrict?: string;
    postalCode?: string;
    at_home?: {
      address: string;
      lat: number;
      lng: number;
    };
    accompany_outside?: {
      hospitalName: string;
      meetingPoint: string;
      lat?: number;
      lng?: number;
    };
  };
  dateTime?: {
    date: string;
    slot: string;
    startTime: string;
    duration: number;
    endTime: string;
  };
  recipient?: {
    type: 'self' | 'member';
    selectedMemberId?: string;
    /**
     * PYG-460 — id ของโปรไฟล์ที่ผู้ใช้เลือกจากลิสต์ใน BookingStepPatient
     * (undefined/null = กรอกเอง ไม่ได้เลือกใบไหน) ส่งต่อเป็น careRecipientId
     * ตอนยิง POST /bookings ซึ่งอยู่คนละหน้ากับหน้าที่กรอก
     */
    selectedRecipientId?: string | null;
    /**
     * PYG-460 — ผู้ใช้ติ๊ก "บันทึกผู้รับบริการรายนี้ไว้" หรือไม่
     * BE จะสร้างโปรไฟล์ใน transaction เดียวกับ booking
     */
    saveAsProfile?: boolean;
    patientDetails?: {
      name: string;
      /**
       * PYG-460 — เดิมเป็น `age: number` แล้ว BookingStepPatient เขียน
       * `Number(age) || 0` ทำให้ช่องที่ว่างกลายเป็น 0 ซึ่ง BE รับเป็นอายุที่ถูกต้อง
       * → เปลี่ยนเป็น optional เพื่อให้ "ไม่ได้กรอก" ต่างจาก "อายุ 0"
       */
      age?: number;
      nickname?: string;
      gender?: 'ชาย' | 'หญิง' | '';
      weight?: number;
      height?: number;
      supportLevel?: string;
      conditions?: string[];
      medicines?: string;
      allergies?: string;
      bloodGroup?: string;
      careInstructions?: string;
      regularHospital?: string;
    };
  };
  contactPerson?: {
    name: string;
    phone: string;
    relationship: string;
  };
  jobDetails?: {
    tasks?: { id: string; name: string; timeNote?: string }[];
    customTasks?: { id: string; name: string; timeNote?: string }[];
    notes?: string;
  };
  estimatedCost?: {
    hourlyRate: number;
    hours: number;
    platformFee: number;
    total: number;
  };
}

export interface SavedCaregiver {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  hourlyRate: number;
  avgRating?: number | null;
  skills: string[];
  province: string;
  district?: string;
}

export interface ConfirmedBooking {
  id: string;
  ref: string;
  caregiverId: string;
  caregiverName: string;
  caregiverAvatarUrl?: string | null;
  caregiverHourlyRate: number;
  caregiverProvince?: string;
  draft: BookingRequest;
  confirmedAt: string;
  status: BookingStatus;
}

export interface Recipient {
  id: string;
  name: string;
  relationship: string;
  gender: string;
  dateOfBirth: string;
  medicalConditions?: string;
  address?: string;
}

interface BookingContextType {
  bookingDraft: BookingRequest | null;
  setBookingDraft: React.Dispatch<React.SetStateAction<BookingRequest | null>>;
  recipients: Recipient[];
  addRecipient: (recipient: Omit<Recipient, 'id'>) => Recipient;
  step: number;
  goToStep: (step: number) => void;
  confirmedBookings: ConfirmedBooking[];
  addConfirmedBooking: (booking: Omit<ConfirmedBooking, 'id' | 'confirmedAt'>) => ConfirmedBooking;
  savedCaregivers: SavedCaregiver[];
  toggleSaveCaregiver: (caregiver: SavedCaregiver) => void;
  isCaregiverSaved: (id: string) => boolean;
  cancelBooking: (id: string) => void;
  resetBooking: () => void;
  // Sticky nav — each step registers its own submit handler; parent's sticky
  // bottom "Next" button invokes it via stepSubmit().
  stepSubmit: (() => void) | null;
  setStepSubmit: (fn: (() => void) | null) => void;
  // Sticky nav — each step reports which required fields are still empty so the
  // parent can disable "Next" and show what is missing.
  stepMissing: string[];
  setStepMissing: React.Dispatch<React.SetStateAction<string[]>>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

// ── REST API helpers ──────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_GRAPHQL_URL as string || 'http://localhost:3000/graphql')
  .replace('/graphql', '');

interface BackendSavedItem {
  id: string;
  caregiverId: string;
  savedAt: string;
  caregiver: {
    fullName?: string;
    avatarUrl?: string;
    hourlyRate?: number;
    skills: string[];
    province?: string;
    district?: string;
  };
}

function mapBackendToSaved(item: BackendSavedItem): SavedCaregiver {
  return {
    id: item.caregiverId,
    fullName: item.caregiver.fullName || '',
    avatarUrl: item.caregiver.avatarUrl ?? null,
    hourlyRate: item.caregiver.hourlyRate ?? 0,
    avgRating: null,
    skills: item.caregiver.skills,
    province: item.caregiver.province || '',
    district: item.caregiver.district,
  };
}

const ROLE_PATIENT = 1;

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, userRole } = useAuth();
  const userId = session?.user?.id ?? null;

  const [bookingDraft, setBookingDraft] = useState<BookingRequest | null>(null);
  const [step, setStep] = useState(1);
  const [confirmedBookings, setConfirmedBookings] = useState<ConfirmedBooking[]>([]);
  const [savedCaregivers, setSavedCaregivers] = useState<SavedCaregiver[]>([]);
  const [stepSubmit, setStepSubmitState] = useState<(() => void) | null>(null);
  const [stepMissing, setStepMissing] = useState<string[]>([]);
  const setStepSubmit = useCallback((fn: (() => void) | null) => {
    // wrap so useState doesn't invoke `fn` as a state updater
    setStepSubmitState(() => fn);
  }, []);
  const [recipients, setRecipients] = useState<Recipient[]>([
    {
      id: 'member-1',
      name: 'สมชาย มีสุข',
      relationship: 'บิดา',
      gender: 'ชาย',
      dateOfBirth: '1955-08-12',
      medicalConditions: 'ความดันโลหิตสูง',
      address: '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ'
    }
  ]);

  // Load saved caregivers from backend; clear when no patient is signed in.
  // Endpoint is @Roles(PATIENT) on the backend — caregiver/admin sessions get 403,
  // so gate on role instead of firing and swallowing the error.
  // Keyed on user id (not an onAuthStateChange subscription) so a GoTrue token
  // refresh, which re-emits SIGNED_IN, doesn't re-fetch on every refresh tick.
  useEffect(() => {
    if (!userId || userRole !== ROLE_PATIENT) { setSavedCaregivers([]); return; }

    let cancelled = false;

    (async () => {
      const token = await getAuthToken();
      if (!token) { if (!cancelled) setSavedCaregivers([]); return; }
      try {
        const res = await fetch(`${API_BASE}/api/v1/patient/saved-caregivers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!res.ok) { setSavedCaregivers([]); return; }
        const data: BackendSavedItem[] = await res.json();
        if (!cancelled) setSavedCaregivers(data.map(mapBackendToSaved));
      } catch {
        if (!cancelled) setSavedCaregivers([]);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, userRole]);

  const addRecipient = (newRec: Omit<Recipient, 'id'>): Recipient => {
    const created: Recipient = { ...newRec, id: `member-${Date.now()}` };
    setRecipients(prev => [...prev, created]);
    return created;
  };

  const addConfirmedBooking = (booking: Omit<ConfirmedBooking, 'id' | 'confirmedAt'>): ConfirmedBooking => {
    const created: ConfirmedBooking = {
      ...booking,
      id: `booking-${Date.now()}`,
      confirmedAt: new Date().toISOString(),
    };
    setConfirmedBookings(prev => [created, ...prev]);
    return created;
  };

  const toggleSaveCaregiver = async (caregiver: SavedCaregiver) => {
    const isSaved = savedCaregivers.some(c => c.id === caregiver.id);
    const token = await getAuthToken();

    if (!token) {
      // Not logged in — update in-memory only
      setSavedCaregivers(prev =>
        isSaved ? prev.filter(c => c.id !== caregiver.id) : [caregiver, ...prev]
      );
      return;
    }

    if (isSaved) {
      // Optimistic remove → DELETE
      setSavedCaregivers(prev => prev.filter(c => c.id !== caregiver.id));
      try {
        const res = await fetch(`${API_BASE}/api/v1/patient/saved-caregivers/${caregiver.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok && res.status !== 204) {
          setSavedCaregivers(prev => [caregiver, ...prev]); // revert
        }
      } catch {
        setSavedCaregivers(prev => [caregiver, ...prev]); // revert
      }
    } else {
      // Optimistic add → POST
      setSavedCaregivers(prev => [caregiver, ...prev]);
      try {
        const res = await fetch(`${API_BASE}/api/v1/patient/saved-caregivers`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ caregiverId: caregiver.id }),
        });
        if (!res.ok) {
          setSavedCaregivers(prev => prev.filter(c => c.id !== caregiver.id)); // revert
        }
      } catch {
        setSavedCaregivers(prev => prev.filter(c => c.id !== caregiver.id)); // revert
      }
    }
  };

  const isCaregiverSaved = (id: string) => savedCaregivers.some(c => c.id === id);

  const cancelBooking = (id: string) => {
    setConfirmedBookings(prev =>
      prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b)
    );
  };

  const resetBooking = () => {
    setBookingDraft(null);
    setStep(1);
  };

  const value = useMemo(() => ({
    bookingDraft, setBookingDraft,
    recipients, addRecipient,
    step, goToStep: setStep,
    confirmedBookings, addConfirmedBooking,
    savedCaregivers, toggleSaveCaregiver, isCaregiverSaved,
    cancelBooking, resetBooking,
    stepSubmit, setStepSubmit,
    stepMissing, setStepMissing,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [bookingDraft, recipients, step, confirmedBookings, savedCaregivers, stepSubmit, stepMissing]);

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
