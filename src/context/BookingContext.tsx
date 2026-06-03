import React, { createContext, useContext, useState } from 'react';

export interface BookingRequest {
  serviceLocation: ('at_home' | 'accompany_outside')[];
  serviceTypes: string[];
  locationDetails?: {
    province?: string;
    district?: string;
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
    patientDetails?: {
      name: string;
      age: number;
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
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookingDraft, setBookingDraft] = useState<BookingRequest | null>(null);
  const [step, setStep] = useState(1);
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

  const addRecipient = (newRec: Omit<Recipient, 'id'>): Recipient => {
    const created: Recipient = {
      ...newRec,
      id: `member-${Date.now()}`
    };
    setRecipients(prev => [...prev, created]);
    return created;
  };

  return (
    <BookingContext.Provider value={{ bookingDraft, setBookingDraft, recipients, addRecipient, step, goToStep: setStep }}>
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
