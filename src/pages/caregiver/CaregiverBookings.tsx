import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import Icon from '../../components/ui/Icon';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { BookingCard } from '../../components/ui/BookingCard';
import { DeclineModal } from '../../components/ui/DeclineModal';
import { CancelAcceptanceModal } from '../../components/ui/CancelAcceptanceModal';
import { AcceptBookingModal } from '../../components/ui/AcceptBookingModal';
import Skeleton from '../../components/ui/Skeleton';
import {
  GET_CAREGIVER_BOOKINGS,
  GET_CAREGIVER_BOOKING_HISTORY,
  ACCEPT_BOOKING,
  DECLINE_BOOKING,
  CANCEL_ACCEPTANCE,
} from '../../graphql/queries';

export interface Booking {
  id: string;
  bookingDate: string;
  time: string;
  serviceType: string;
  patientName: string;
  price: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'declined' | 'completed' | 'cancelled';
  declineReason?: string;
  createdAt: string;
  relation?: string;
  locationName?: string;
  serviceFormat?: string;
  durationText?: string;
  tasks?: string[];
  receivedTimeText?: string;
  careRecipientName?: string;
  dayOfContactName?: string;
  dayOfContactPhone?: string;
  dayOfContactRelationship?: string;
}

type TabType = 'scheduled' | 'action_required' | 'history';

function serviceLocationLabel(loc: string): string {
  switch (loc) {
    case 'at_home': return 'ดูแลที่บ้านผู้ป่วย';
    case 'outside': return 'สถานพยาบาลภายนอก';
    default: return loc;
  }
}

// Helper to convert backend booking summary to frontend Booking model
function mapToBooking(summary: any): Booking {
  const durationHours = summary.durationHours;
  const startTime = summary.startTime; // "HH:mm"
  
  let time = startTime || '';
  if (startTime && durationHours) {
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = startMinutes + Math.round(durationHours * 60);
      const eh = Math.floor(endMinutes / 60) % 24;
      const em = endMinutes % 60;
      const ehStr = String(eh).padStart(2, '0');
      const emStr = String(em).padStart(2, '0');
      time = `${startTime} - ${ehStr}:${emStr}`;
    } catch (e) {
      time = startTime;
    }
  }

  // receivedTimeText relative time helper
  let receivedTimeText = undefined;
  if (summary.createdAt) {
    try {
      const created = new Date(summary.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours >= 24) {
        const diffDays = Math.floor(diffHours / 24);
        receivedTimeText = `ได้รับเมื่อ ${diffDays} วันที่แล้ว`;
      } else if (diffHours <= 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        receivedTimeText = diffMinutes <= 1 ? 'ได้รับเมื่อสักครู่' : `ได้รับเมื่อ ${diffMinutes} นาทีที่แล้ว`;
      } else {
        receivedTimeText = `ได้รับเมื่อ ${diffHours} ชม. ที่แล้ว`;
      }
    } catch {
      receivedTimeText = undefined;
    }
  }

  const statusLower = (summary.status || '').toLowerCase();
  const status = statusLower === 'rejected' ? 'declined' : statusLower;

  return {
    id: summary.id,
    bookingDate: summary.bookingDate,
    time,
    serviceType: summary.serviceType,
    patientName: summary.patient?.displayName ?? 'ผู้ใช้บริการ',
    price: summary.estimatedCost ?? 0,
    status: status as any,
    declineReason: summary.rejectionReason ?? undefined,
    createdAt: summary.createdAt,
    relation: summary.careRecipientName ? `สำหรับ: ${summary.careRecipientName}` : 'สำหรับตัวเอง',
    locationName: summary.locationAddress || undefined,
    serviceFormat: summary.serviceLocations?.[0] ? serviceLocationLabel(summary.serviceLocations[0]) : undefined,
    durationText: `${durationHours} ชม.`,
    tasks: summary.tasks && summary.tasks.length > 0 ? summary.tasks : undefined,
    receivedTimeText,
    notes: summary.notes ?? undefined,
    careRecipientName: summary.patientName || summary.careRecipientName || undefined,
    dayOfContactName: summary.dayOfContactName ?? undefined,
    dayOfContactPhone: summary.dayOfContactPhone ?? undefined,
    dayOfContactRelationship: summary.dayOfContactRelationship ?? undefined,
  };
}


interface CaregiverBookingsData {
  caregiverBookings: {
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface CaregiverBookingHistoryData {
  caregiverBookingHistory: {
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}


export const CaregiverBookings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('scheduled');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Action Required Sub-filter state
  const [actionSubFilter, setActionSubFilter] = useState<'all' | 'new' | 'waiting'>('all');

  // Scheduled tab Sub-filter state (due vs upcoming)
  const [scheduledSubTab, setScheduledSubTab] = useState<'due' | 'upcoming'>('due');

  // Decline Modal state
  const [declineModalId, setDeclineModalId] = useState<string | null>(null);

  // Cancel Acceptance Modal state
  const [cancelAcceptanceModalId, setCancelAcceptanceModalId] = useState<string | null>(null);

  // History tab filter state
  const [historySubFilter, setHistorySubFilter] = useState<'all' | 'completed' | 'cancelled' | 'declined'>('all');
  const [historySortBy, setHistorySortBy] = useState<string>('newest');

  // Accept Booking Modal state
  const [acceptModalBooking, setAcceptModalBooking] = useState<Booking | null>(null);

  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  // Parallel Apollo Queries
  const {
    data: pendingData,
    loading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = useQuery<CaregiverBookingsData>(GET_CAREGIVER_BOOKINGS, {
    variables: { input: { status: 'PENDING', limit: 50 } },
  });

  const {
    data: acceptedData,
    loading: acceptedLoading,
    error: acceptedError,
    refetch: refetchAccepted,
  } = useQuery<CaregiverBookingsData>(GET_CAREGIVER_BOOKINGS, {
    variables: { input: { status: 'ACCEPTED', limit: 50 } },
  });

  const {
    data: confirmedData,
    loading: confirmedLoading,
    error: confirmedError,
    refetch: refetchConfirmed,
  } = useQuery<CaregiverBookingsData>(GET_CAREGIVER_BOOKINGS, {
    variables: { input: { status: 'CONFIRMED', limit: 50 } },
  });

  // History tab variables
  const [historyPage] = useState(1);
  const historyLimit = 50;

  const mappedHistoryStatus =
    historySubFilter === 'all'
      ? undefined
      : historySubFilter === 'declined'
      ? 'REJECTED'
      : historySubFilter.toUpperCase();

  // Always-running minimal query for badge count accuracy (limit:1 = minimal bandwidth)
  const { data: historyCountData } = useQuery<CaregiverBookingHistoryData>(GET_CAREGIVER_BOOKING_HISTORY, {
    variables: { input: { page: 1, limit: 1 } },
  });

  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery<CaregiverBookingHistoryData>(GET_CAREGIVER_BOOKING_HISTORY, {
    variables: {
      input: {
        status: mappedHistoryStatus,
        page: historyPage,
        limit: historyLimit,
      },
    },
    skip: activeTab !== 'history',
  });

  // Apollo Mutations
  const [acceptBooking] = useMutation(ACCEPT_BOOKING);
  const [declineBooking] = useMutation(DECLINE_BOOKING);
  const [cancelAcceptance] = useMutation(CANCEL_ACCEPTANCE);

  // Lists mapped through adapter
  const pendingList = pendingData?.caregiverBookings?.data?.map(mapToBooking) ?? [];
  const acceptedList = acceptedData?.caregiverBookings?.data?.map(mapToBooking) ?? [];
  const confirmedList = confirmedData?.caregiverBookings?.data?.map(mapToBooking) ?? [];
  const historyList = historyData?.caregiverBookingHistory?.data?.map(mapToBooking) ?? [];

  const findBookingById = (id: string): Booking | null => {
    return (
      (pendingList as Booking[]).find((b: Booking) => b.id === id) ||
      (acceptedList as Booking[]).find((b: Booking) => b.id === id) ||
      (confirmedList as Booking[]).find((b: Booking) => b.id === id) ||
      (historyList as Booking[]).find((b: Booking) => b.id === id) ||
      null
    );
  };

  const handleToggleExpand = (id: string) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const handleAccept = (id: string) => {
    const booking = findBookingById(id);
    if (booking) {
      setAcceptModalBooking(booking);
    }
  };

  const handleConfirmAccept = async () => {
    if (!acceptModalBooking) return;
    const booking = acceptModalBooking;
    setAcceptModalBooking(null);

    try {
      await acceptBooking({
        variables: { bookingId: booking.id },
        refetchQueries: [
          { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'PENDING', limit: 50 } } },
          { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'ACCEPTED', limit: 50 } } },
          { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'CONFIRMED', limit: 50 } } },
        ],
        awaitRefetchQueries: true,
      });

      const msg = (
        <>
          ยอมรับคำขอของ <strong className="font-bold text-[#1A1A1A]">{booking.patientName}</strong> แล้ว{"\n"}
          รอผู้ป่วยชำระเงินเพื่อยืนยันการจอง
        </>
      );
      showSuccess(msg, 4000, 'booking-toast');
    } catch (err: unknown) {
      const gqlMsg = (err as any)?.graphQLErrors?.[0]?.message ?? '';
      if (gqlMsg.includes('ซ้อนทับ')) {
        showError('ช่วงเวลาของงานนี้ซ้อนทับกับงานที่คุณยืนยันไปแล้ว');
      } else {
        showError('ไม่สามารถยอมรับการจองได้ กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

  const handleDeclineClick = (id: string) => {
    setDeclineModalId(id);
  };

  const handleCancelAcceptanceClick = (id: string) => {
    setCancelAcceptanceModalId(id);
  };

  const getAcceptedTimeText = (booking: Booking) => {
    try {
      const created = new Date(booking.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours >= 24) {
        const diffDays = Math.floor(diffHours / 24);
        return `ตอบรับเมื่อ ${diffDays} วันที่แล้ว`;
      }
      if (diffHours <= 0) {
        return 'ตอบรับเมื่อ 2 ชม. ที่แล้ว'; // Sensible mock default if time calculation is <= 0
      }
      return `ตอบรับเมื่อ ${diffHours} ชม. ที่แล้ว`;
    } catch {
      return 'ตอบรับเมื่อ 2 ชม. ที่แล้ว';
    }
  };

  // Date formatted for Thai
  const formatThaiDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parseInt(parts[0]) + 543;
      const monthNames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const month = monthNames[parseInt(parts[1]) - 1];
      const day = parseInt(parts[2]);
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Shared date-diff helper (bookingDate vs. today), used both for the "days until" label
  // and for splitting the scheduled tab into due / upcoming buckets.
  const getDiffDays = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysUntil = (dateStr: string) => {
    const diffDays = getDiffDays(dateStr);

    if (diffDays < 0) return 'ผ่านแล้ว';
    if (diffDays === 0) return 'วันนี้';
    if (diffDays === 1) return 'พรุ่งนี้';
    return `อีก ${diffDays} วัน`;
  };

  // Scheduled tab: split confirmed bookings into "due" (today or overdue) and "upcoming"
  const dueList = confirmedList.filter((b) => getDiffDays(b.bookingDate) <= 0);
  const upcomingList = confirmedList.filter((b) => getDiffDays(b.bookingDate) > 0);

  // Helper to filter and sort bookings
  const getFilteredBookings = () => {
    let list: Booking[] = [];
    if (activeTab === 'scheduled') {
      list = scheduledSubTab === 'due' ? dueList : upcomingList;
    } else if (activeTab === 'action_required') {
      if (actionSubFilter === 'all') {
        list = [...pendingList, ...acceptedList];
      } else if (actionSubFilter === 'new') {
        list = pendingList;
      } else if (actionSubFilter === 'waiting') {
        list = acceptedList;
      }
    } else {
      // History List is already pre-filtered by query variables, but we keep the fallback filter
      list = historyList;
    }

    if (activeTab === 'scheduled') {
      // Chronological order: most overdue first in "due", soonest first in "upcoming"
      return [...list].sort((a, b) => new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime());
    }

    if (activeTab === 'history') {
      return [...list].sort((a, b) => {
        const aTime = new Date(a.bookingDate).getTime();
        const bTime = new Date(b.bookingDate).getTime();
        return historySortBy === 'oldest' ? aTime - bTime : bTime - aTime;
      });
    }

    return [...list].sort((a, b) => {
      return new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
    });
  };

  const filteredBookings = getFilteredBookings();

  const scheduledCount = confirmedData?.caregiverBookings?.pagination?.total ?? confirmedList.length;
  const newRequestsCount = pendingData?.caregiverBookings?.pagination?.total ?? pendingList.length;
  const waitingConfirmCount = acceptedData?.caregiverBookings?.pagination?.total ?? acceptedList.length;
  const pendingCount = newRequestsCount + waitingConfirmCount;
  const historyCount =
    historyData?.caregiverBookingHistory?.pagination?.total
    ?? historyCountData?.caregiverBookingHistory?.pagination?.total
    ?? historyList.length;

  const isLoading = pendingLoading || acceptedLoading || confirmedLoading || (activeTab === 'history' && historyLoading);
  const isError = !!(pendingError || acceptedError || confirmedError || (activeTab === 'history' && historyError));

  // Style helper based on status badge
  const getStatusBadgeStyle = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed':
        return {
          bg: 'bg-[#ECFDF5]',
          dot: 'bg-[#10B981]',
          text: 'text-[#047857]',
          label: 'ยืนยันแล้ว'
        };
      case 'accepted':
        return {
          bg: 'bg-[#FFFBEB]',
          dot: 'bg-[#F59E0B]',
          text: 'text-[#B45309]',
          label: 'รอคนไข้ชำระเงิน'
        };
      case 'pending':
        return {
          bg: 'bg-[#EFF6FF]',
          dot: 'bg-[#3B82F6]',
          text: 'text-[#1D4ED8]',
          label: 'คำขอใหม่'
        };
      case 'declined':
        return {
          bg: 'bg-[#FEF2F2]',
          dot: 'bg-[#EF4444]',
          text: 'text-[#B91C1C]',
          label: 'ปฏิเสธแล้ว'
        };
      case 'completed':
        return {
          bg: 'bg-[#E6F5ED]',
          dot: 'bg-[#52B69A]',
          text: 'text-[#3A9A7E]',
          label: 'เสร็จสิ้น'
        };
      case 'cancelled':
      default:
        return {
          bg: 'bg-[#F3F4F6]',
          dot: 'bg-[#6B7280]',
          text: 'text-[#374151]',
          label: 'ยกเลิกแล้ว'
        };
    }
  };

  // Header Details based on tab
  const getHeaderDetails = () => {
    switch (activeTab) {
      case 'scheduled':
        return {
          icon: 'event_available',
          iconColor: 'text-[#52B69A]',
          title: 'งานในกำหนดเวลา',
          subtitle: 'การนัดหมายที่ยืนยันและชำระเงินแล้ว รอไปทำงานตามนัดหมาย',
          badgeBg: 'bg-[#E6F5ED]',
          badgeText: 'text-[#1B5C48]',
          countText: `${scheduledCount} งาน`
        };
      case 'action_required':
        return {
          icon: 'pending_actions',
          iconColor: 'text-[#F08C00]',
          title: 'งานที่ต้องดำเนินการ',
          subtitle: 'คำขอรับบริการใหม่และรอผู้ป่วยชำระเงินยืนยัน',
          badgeBg: 'bg-[#FFF3E0]',
          badgeText: 'text-[#F08C00]',
          countText: `${pendingCount} รายการ`
        };
      case 'history':
      default:
        return {
          icon: 'history',
          iconColor: 'text-[#575859]',
          title: 'ประวัติงาน',
          subtitle: 'ประวัติการดูแลคนไข้เสร็จสิ้น การยกเลิก และปฏิเสธงาน',
          badgeBg: 'bg-[#F0F1F3]',
          badgeText: 'text-[#575859]',
          countText: `${historyCount} งาน`
        };
    }
  };

  const headerDetails = getHeaderDetails();

  return (
    <>
      <div
        className="min-h-screen bg-[#F6FAF9] text-[#1A1A1A] antialiased w-full max-w-[1534.4px] mx-auto flex flex-col items-center p-0"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <div className="w-full max-w-[1100px] flex flex-col items-start px-4 sm:px-5 pt-4 sm:pt-6 pb-[100px]">

          {/* Header section */}
          <div className="w-full max-w-[1060px] self-stretch flex flex-row justify-between items-center p-0 h-auto mb-6">
            <div className="flex flex-col items-start p-0 w-auto max-w-full h-auto">
              <div className="flex flex-col items-start p-0 self-stretch h-auto">
                <h1 className="font-bold text-2xl text-[#1A1A1A] leading-9">งานของฉัน</h1>
              </div>
              <div className="pt-1 self-stretch h-auto flex flex-col items-start">
                <p className="font-normal text-[13px] text-[#8A8C8E] leading-5">
                  จัดการนัดหมาย ตอบรับคำขอจอง และดูประวัติการดูแลผู้ป่วย
                </p>
              </div>
            </div>
          </div>

          {/* Container & Tabs */}
          <div className="pt-6 w-full max-w-[1060px] self-stretch flex flex-col items-start">
            <div className="w-full flex flex-col items-start gap-6 self-stretch">

              {/* Tab selector bar */}
              <div className="pb-6 w-full self-stretch flex flex-col items-start">
                <div className="box-border w-full flex flex-row items-start p-1.5 gap-1.5 bg-white border-[0.8px] border-[#E5E7EB] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-xl self-stretch">

                  {/* Tab 1: Scheduled */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('scheduled');
                      setExpandedCardId(null);
                      setScheduledSubTab('due');
                    }}
                    className={`flex flex-row justify-center items-center py-2.5 px-2 sm:py-3 sm:px-4 gap-1.5 h-[38px] sm:h-[45px] flex-1 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${activeTab === 'scheduled'
                        ? 'bg-[#52B69A] shadow-[0px_4px_12px_rgba(82,182,154,0.25)] text-white'
                        : 'text-[#575859] hover:bg-gray-50'
                      }`}
                  >
                    <Icon
                      name="event_available"
                      className="text-[18px] flex-shrink-0"
                      color={activeTab === 'scheduled' ? '#FFFFFF' : '#575859'}
                    />
                    <span className="hidden sm:inline">งานในกำหนดเวลา</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold font-['Inter'] min-w-[20px] h-[20px] flex items-center justify-center ${activeTab === 'scheduled'
                          ? 'bg-white/20 text-white'
                          : 'bg-[#E6F5ED] text-[#1B5C48]'
                        }`}
                    >
                      {scheduledCount}
                    </span>
                  </button>

                  {/* Tab 2: Action Required */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('action_required');
                      setExpandedCardId(null);
                    }}
                    className={`flex flex-row justify-center items-center py-2.5 px-2 sm:py-3 sm:px-4 gap-1.5 h-[38px] sm:h-[45px] flex-1 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${activeTab === 'action_required'
                        ? 'bg-[#52B69A] shadow-[0px_4px_12px_rgba(82,182,154,0.25)] text-white'
                        : 'text-[#575859] hover:bg-gray-50'
                      }`}
                  >
                    <Icon
                      name="pending_actions"
                      className="text-[18px] flex-shrink-0"
                      color={activeTab === 'action_required' ? '#FFFFFF' : '#575859'}
                    />
                    <span className="hidden sm:inline">งานที่ต้องดำเนินการ</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold font-['Inter'] min-w-[20px] h-[20px] flex items-center justify-center ${activeTab === 'action_required'
                          ? 'bg-white/20 text-white'
                          : 'bg-[#FEF2F2] text-[#DC2626]'
                        }`}
                    >
                      {pendingCount}
                    </span>
                  </button>

                  {/* Tab 3: History */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('history');
                      setExpandedCardId(null);
                    }}
                    className={`flex flex-row justify-center items-center py-2.5 px-2 sm:py-3 sm:px-4 gap-1.5 h-[38px] sm:h-[45px] flex-1 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${activeTab === 'history'
                        ? 'bg-[#52B69A] shadow-[0px_4px_12px_rgba(82,182,154,0.25)] text-white'
                        : 'text-[#575859] hover:bg-gray-50'
                      }`}
                  >
                    <Icon
                      name="history"
                      className="text-[18px] flex-shrink-0"
                      color={activeTab === 'history' ? '#FFFFFF' : '#575859'}
                    />
                    <span className="hidden sm:inline">ประวัติงาน</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold font-['Inter'] min-w-[20px] h-[20px] flex items-center justify-center ${activeTab === 'history'
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F0F1F3] text-[#575859]'
                        }`}
                    >
                      {historyCount}
                    </span>
                  </button>

                </div>
              </div>

              {/* Main Jobs Listing Box */}
              <div className="box-border w-full max-w-[1060px] bg-white border-[0.8px] border-[#E5E7EB] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-[20px] flex flex-col items-start p-0 self-stretch overflow-hidden">

                {/* Box Header */}
                <div className="box-border w-full flex flex-row justify-between items-center px-4 sm:px-6 py-[18px] bg-white border-b border-[#F0F1F3] self-stretch">
                  <div className="flex flex-row items-center gap-3 w-auto h-auto">
                    <Icon
                      name={headerDetails.icon}
                      className={`text-[22px] flex-shrink-0 ${headerDetails.iconColor}`}
                    />
                    <div className="flex flex-col items-start p-0 w-auto h-auto">
                      <span className="font-bold text-base leading-[22px] text-[#1A1A1A]">
                        {headerDetails.title}
                      </span>
                      <span className="font-normal text-xs leading-[18px] text-[#8A8C8E]">
                        {headerDetails.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className={`h-auto min-h-[22px] px-2.5 py-0.5 flex-shrink-0 ${headerDetails.badgeBg} rounded-full flex flex-row items-center justify-center gap-1.5`}>
                    <span className={`font-bold text-xs leading-[18px] whitespace-nowrap ${headerDetails.badgeText}`}>
                      {headerDetails.countText}
                    </span>
                    {activeTab === 'action_required' && (
                      <span className="w-1.5 h-1.5 bg-[#DC2626] rounded-full flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* Box Body List */}
                <div className="w-full flex flex-col items-start p-6 gap-4 bg-[#FDFDFD] self-stretch min-h-[150px]">

                  {/* Scheduled Sub-tabs (Due vs Upcoming) */}
                  {activeTab === 'scheduled' && (
                    <div className="w-full pb-2 flex flex-row items-center gap-1.5 p-1.5 bg-[#F3F4F6] rounded-xl self-stretch">
                      <button
                        type="button"
                        onClick={() => setScheduledSubTab('due')}
                        className={`flex-1 flex flex-row items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                          scheduledSubTab === 'due'
                            ? 'bg-white text-[#1A1A1A] shadow-sm'
                            : 'text-[#6B7280] hover:text-[#1A1A1A]'
                        }`}
                      >
                        ถึงกำหนดแล้ว
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold font-['Inter'] min-w-[20px] h-[20px] flex items-center justify-center ${
                            scheduledSubTab === 'due' ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'bg-white text-[#6B7280]'
                          }`}
                        >
                          {dueList.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduledSubTab('upcoming')}
                        className={`flex-1 flex flex-row items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                          scheduledSubTab === 'upcoming'
                            ? 'bg-white text-[#1A1A1A] shadow-sm'
                            : 'text-[#6B7280] hover:text-[#1A1A1A]'
                        }`}
                      >
                        ที่กำลังจะถึง
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold font-['Inter'] min-w-[20px] h-[20px] flex items-center justify-center ${
                            scheduledSubTab === 'upcoming' ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'bg-white text-[#6B7280]'
                          }`}
                        >
                          {upcomingList.length}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* History Sub-filters */}
                  {activeTab === 'history' && (
                    <div className="w-full pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 self-stretch">
                      {/* Filter chips */}
                      <div className="flex flex-row flex-wrap items-center gap-2">
                        {(
                          [
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'completed', label: 'เสร็จสิ้น' },
                            { key: 'cancelled', label: 'ยกเลิกแล้ว' },
                            { key: 'declined', label: 'ปฏิเสธแล้ว' },
                          ] as const
                        ).map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setHistorySubFilter(key)}
                            className={`h-8 px-3.5 flex flex-row items-center justify-center rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 ${
                              historySubFilter === key
                                ? 'bg-[#52B69A] text-white shadow-sm'
                                : 'bg-[#E6F5ED] text-[#3A9A7E] hover:bg-[#d5ecd1]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Sort dropdown */}
                      <div className="w-full sm:w-[140px] flex-shrink-0 relative">
                        <select
                          value={historySortBy}
                          onChange={e => setHistorySortBy(e.target.value)}
                          className="box-border h-9 w-full bg-white border-[0.8px] border-[#E0E2E5] rounded-lg text-xs text-[#575859] pl-3 pr-7 font-['Bai_Jamjuree'] cursor-pointer focus:outline-none appearance-none"
                        >
                          <option value="newest">ล่าสุดก่อน</option>
                          <option value="oldest">เก่าสุดก่อน</option>
                        </select>
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#AAB2BA] flex items-center">
                          <span className="material-icons text-[20px]">expand_more</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Required Sub-filters (Chips) */}
                  {activeTab === 'action_required' && (
                    <div className="w-full pb-2 flex flex-row flex-wrap items-center gap-2 self-stretch">
                      <button
                        type="button"
                        onClick={() => setActionSubFilter('all')}
                        className={`h-8 px-3.5 flex flex-row items-center justify-center rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 ${actionSubFilter === 'all'
                            ? 'bg-[#52B69A] text-white shadow-sm font-semibold'
                            : 'bg-[#E6F5ED] text-[#3A9A7E] hover:bg-[#d5ecd1] font-semibold'
                          }`}
                      >
                        ทั้งหมด
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionSubFilter('new')}
                        className={`h-8 px-3.5 flex flex-row items-center justify-center rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 ${actionSubFilter === 'new'
                            ? 'bg-[#52B69A] text-white shadow-sm font-semibold'
                            : 'bg-[#E6F5ED] text-[#3A9A7E] hover:bg-[#d5ecd1] font-semibold'
                          }`}
                      >
                        คำขอใหม่ ({newRequestsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionSubFilter('waiting')}
                        className={`h-8 px-3.5 flex flex-row items-center justify-center rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 ${actionSubFilter === 'waiting'
                            ? 'bg-[#52B69A] text-white shadow-sm font-semibold'
                            : 'bg-[#E6F5ED] text-[#3A9A7E] hover:bg-[#d5ecd1] font-semibold'
                          }`}
                      >
                        รอคนไข้ชำระเงิน ({waitingConfirmCount})
                      </button>
                    </div>
                  )}

                  {isLoading ? (
                    <div className="w-full flex flex-col gap-4">
                      <Skeleton height={140} borderRadius={16} className="w-full" />
                      <Skeleton height={140} borderRadius={16} className="w-full" />
                      <Skeleton height={140} borderRadius={16} className="w-full" />
                    </div>
                  ) : isError ? (
                    <div className="w-full py-12 flex flex-col items-center justify-center text-center">
                      <Icon name="error" className="text-5xl text-red-500 mb-3" />
                      <p className="text-red-700 font-semibold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                      <button
                        type="button"
                        onClick={() => {
                          refetchPending();
                          refetchAccepted();
                          refetchConfirmed();
                          if (activeTab === 'history') refetchHistory();
                        }}
                        className="mt-4 px-4 py-2 bg-[#52B69A] text-white text-sm font-semibold rounded-lg hover:bg-[#3A9A7E] transition-colors"
                      >
                        ลองใหม่อีกครั้ง
                      </button>
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="w-full py-12 flex flex-col items-center justify-center text-center">
                      <Icon name="work_off" className="text-5xl text-gray-300 mb-3" />
                      <p className="text-gray-500 font-semibold">ไม่มีรายการนัดหมายในหน้านี้</p>
                      <p className="text-gray-400 text-xs mt-1">คุณสามารถตรวจสอบสถานะนัดหมายได้ในแท็บอื่น</p>
                    </div>
                  ) : (
                    filteredBookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isExpanded={expandedCardId === booking.id}
                        onToggleExpand={() => handleToggleExpand(booking.id)}
                        onAccept={handleAccept}
                        onDeclineClick={handleDeclineClick}
                        onCancelAcceptanceClick={handleCancelAcceptanceClick}
                        onViewDetails={(b) => navigate(`/caregiver/bookings/${b.id}`, { state: { booking: b } })}
                        formatThaiDate={formatThaiDate}
                        getDaysUntil={getDaysUntil}
                        getAcceptedTimeText={getAcceptedTimeText}
                        getStatusBadgeStyle={getStatusBadgeStyle}
                        isDueSection={activeTab === 'scheduled' && scheduledSubTab === 'due'}
                      />
                    ))
                  )}
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      <AcceptBookingModal
        isOpen={!!acceptModalBooking}
        booking={acceptModalBooking}
        onClose={() => setAcceptModalBooking(null)}
        onConfirm={handleConfirmAccept}
        formatThaiDate={formatThaiDate}
      />

      <DeclineModal
        isOpen={!!declineModalId}
        booking={declineModalId ? findBookingById(declineModalId) : null}
        onClose={() => setDeclineModalId(null)}
        onSubmit={async (reason) => {
          if (!declineModalId) return;
          const targetBooking = findBookingById(declineModalId);
          setDeclineModalId(null);
          try {
            await declineBooking({
              variables: {
                input: {
                  bookingId: declineModalId,
                  reason,
                },
              },
              refetchQueries: [
                { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'PENDING', limit: 50 } } },
                { query: GET_CAREGIVER_BOOKING_HISTORY, variables: { input: { status: mappedHistoryStatus, page: historyPage, limit: historyLimit } } },
              ],
              awaitRefetchQueries: true,
            });

            if (targetBooking) {
              const msg = (
                <>
                  ปฏิเสธคำขอจองของ <strong className="font-bold">{targetBooking.patientName}</strong> แล้ว
                </>
              );
              showSuccess(msg, 4000, 'decline-toast');
            } else {
              showSuccess('ปฏิเสธการจองนัดหมายเรียบร้อยแล้ว');
            }
          } catch (err) {
            showError('ไม่สามารถปฏิเสธคำขอจองได้ กรุณาลองใหม่อีกครั้ง');
          }
        }}
      />

      <CancelAcceptanceModal
        isOpen={!!cancelAcceptanceModalId}
        booking={cancelAcceptanceModalId ? findBookingById(cancelAcceptanceModalId) : null}
        onClose={() => setCancelAcceptanceModalId(null)}
        onSubmit={async (reason) => {
          if (!cancelAcceptanceModalId) return;
          const targetBooking = findBookingById(cancelAcceptanceModalId);
          setCancelAcceptanceModalId(null);
          try {
            await cancelAcceptance({
              variables: {
                input: {
                  bookingId: cancelAcceptanceModalId,
                  reason,
                },
              },
              refetchQueries: [
                { query: GET_CAREGIVER_BOOKINGS, variables: { input: { status: 'ACCEPTED', limit: 50 } } },
                { query: GET_CAREGIVER_BOOKING_HISTORY, variables: { input: { status: mappedHistoryStatus, page: historyPage, limit: historyLimit } } },
              ],
              awaitRefetchQueries: true,
            });

            if (targetBooking) {
              const msg = (
                <>
                  ยกเลิกการตอบรับงานของ <strong className="font-bold">{targetBooking.patientName}</strong> แล้ว
                </>
              );
              showSuccess(msg, 4000, 'decline-toast');
            } else {
              showSuccess('ยกเลิกการตอบรับงานเรียบร้อยแล้ว');
            }
          } catch (err) {
            showError('ไม่สามารถยกเลิกการตอบรับงานได้ กรุณาลองใหม่อีกครั้ง');
          }
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
    </>
  );
};

export default CaregiverBookings;
