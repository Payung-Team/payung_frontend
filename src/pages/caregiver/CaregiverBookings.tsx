import React, { useState } from 'react';
import Icon from '../../components/ui/Icon';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { BookingCard } from '../../components/ui/BookingCard';
import { DeclineModal } from '../../components/ui/DeclineModal';
import { CancelAcceptanceModal } from '../../components/ui/CancelAcceptanceModal';
import { BookingDetailModal } from '../../components/ui/BookingDetailModal';
import { AcceptBookingModal } from '../../components/ui/AcceptBookingModal';

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
  condition?: string;
  locationName?: string;
  serviceFormat?: string;
  durationText?: string;
  tasks?: string[];
  receivedTimeText?: string;
}

type TabType = 'scheduled' | 'action_required' | 'history';

const initialBookings: Booking[] = [
  {
    id: 'REF-B1',
    bookingDate: '2026-06-12',
    time: '09:00 - 12:00',
    serviceType: 'กายภาพบำบัด',
    patientName: 'สมศรี วงศ์ดี',
    price: 1140,
    notes: 'กายภาพบำบัดฟื้นฟูหลังผ่าตัดเข่า คอยช่วยพยุงและประคบเย็นตามแผนการรักษา',
    status: 'confirmed',
    createdAt: '2026-06-01T10:00:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'ผ่าตัดเปลี่ยนเข่าขวา',
    locationName: 'วัฒนา, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '3 ชม.',
    tasks: ['กายภาพบำบัดเบื้องต้น', 'ช่วยพยุงเดิน', 'ประคบเย็น']
  },
  {
    id: 'REF-J1',
    bookingDate: '2026-06-15',
    time: '09:00 - 12:00',
    serviceType: 'กายภาพบำบัด',
    patientName: 'สมศรี วงศ์ดี',
    price: 1140,
    notes: 'กายภาพบำบัดฟื้นฟูหลังผ่าตัดเข่า คอยช่วยพยุงและประคบเย็นตามแผนการรักษา',
    status: 'pending',
    createdAt: '2026-06-03T08:00:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'ผ่าตัดเปลี่ยนเข่าขวา',
    locationName: 'วัฒนา, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '3 ชม.',
    tasks: ['กายภาพบำบัดเบื้องต้น', 'ช่วยพยุงเดิน', 'ประคบเย็น'],
    receivedTimeText: 'ได้รับเมื่อ 1 ชม. ที่แล้ว'
  },
  {
    id: 'REF-J2',
    bookingDate: '2026-06-18',
    time: '08:00 - 16:00',
    serviceType: 'ดูแลผู้ป่วยและผู้สูงอายุระยะยาว',
    patientName: 'นัทธวรรณ เจริญกุล',
    price: 3420,
    notes: 'ต้องการคนดูแลอย่างใกล้ชิดและจัดเตรียมอาหารเตือนทานยาตามเวลา',
    status: 'pending',
    createdAt: '2026-06-03T08:15:00Z',
    relation: 'สำหรับมารดา',
    condition: 'โรคสมองเสื่อมระยะกลาง',
    locationName: 'ห้วยขวาง, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '8 ชม.',
    tasks: ['เตรียมอาหาร', 'เตือนทานยา', 'ช่วยพยุงเดิน', 'ทำความสะอาดที่นอน'],
    receivedTimeText: 'ได้รับเมื่อ 1 ชม. ที่แล้ว'
  },
  {
    id: 'REF-J3',
    bookingDate: '2026-06-20',
    time: '13:00 - 17:00',
    serviceType: 'ดูแลผู้สูงอายุระยะสั้น',
    patientName: 'ธีระ บุญพร',
    price: 1520,
    notes: 'ช่วยพยุงออกกำลังกายเบื้องต้นและดูแลเวลาเดินไปห้องน้ำ',
    status: 'pending',
    createdAt: '2026-06-03T08:30:00Z',
    relation: 'สำหรับบิดา',
    condition: 'โรคพาร์กินสันระยะแรก',
    locationName: 'พญาไท, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '4 ชม.',
    tasks: ['ช่วยพยุงเดิน', 'เตรียมของว่าง', 'เตือนทานยา'],
    receivedTimeText: 'ได้รับเมื่อ 1 ชม. ที่แล้ว'
  },
  {
    id: 'REF-A1',
    bookingDate: '2026-06-22',
    time: '08:00 - 12:00',
    serviceType: 'กายภาพบำบัด',
    patientName: 'มนัสชัย แก้วตา',
    price: 1520,
    notes: 'ขอคนดูแลที่เข้าใจผู้สูงอายุที่มีปัญหาการพูดและเคลื่อนไหวช้า',
    status: 'accepted',
    createdAt: '2026-06-02T11:00:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'โรคหลอดเลือดสมองระยะฟื้นตัว',
    locationName: 'ดินแดง, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '4 ชม.',
    tasks: ['ทำกายภาพบำบัดตามกำหนด', 'ช่วยฝึกพูดเบื้องต้น', 'ดูแลเรื่องความปลอดภัย']
  },
  {
    id: 'REF-A2',
    bookingDate: '2026-06-25',
    time: '13:00 - 18:00',
    serviceType: 'ร่วมเดินทางภายนอก',
    patientName: 'วิชุดา สุขสันต์',
    price: 2000,
    notes: 'พาไปตรวจสายตาและตัดแว่นที่คลินิกตามแพทย์นัด',
    status: 'accepted',
    createdAt: '2026-06-03T14:30:00Z',
    relation: 'สำหรับมารดา',
    condition: 'ผู้สูงอายุสายตาเลือนราง',
    locationName: 'พญาไท, กรุงเทพมหานคร',
    serviceFormat: 'ร่วมเดินทางภายนอก',
    durationText: '5 ชม.',
    tasks: ['พาเดินทางไปคลินิก', 'ดูแลระหว่างรอแพทย์', 'ช่วยบันทึกคำแนะนำแพทย์']
  },
  {
    id: 'REF-H1',
    bookingDate: '2026-06-05',
    time: '09:00 - 13:00',
    serviceType: 'ดูแลผู้สูงอายุระยะสั้น',
    patientName: 'ปราณี พรหมใจ',
    price: 1520,
    notes: 'ผู้สูงอายุมีอาการปวดข้อเข่า ต้องการการดูแลและช่วยเดิน',
    status: 'completed',
    createdAt: '2026-05-28T09:00:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'โรคข้อเข่าเสื่อม',
    locationName: 'ลาดพร้าว, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '4 ชม.',
    tasks: ['ช่วยพยุงเดิน', 'ประคบร้อน', 'เตือนทานยา', 'เตรียมอาหาร']
  },
  {
    id: 'REF-H2',
    bookingDate: '2026-05-18',
    time: '10:00 - 14:00',
    serviceType: 'ดูแลผู้สูงอายุระยะสั้น',
    patientName: 'ปราณี พรหมใจ',
    price: 1520,
    notes: 'ต้องการพาไปโรงพยาบาลเพื่อตรวจร่างกายประจำปี',
    status: 'completed',
    createdAt: '2026-05-10T11:00:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'โรคข้อเข่าเสื่อม',
    locationName: 'ลาดพร้าว, กรุงเทพมหานคร',
    serviceFormat: 'ร่วมเดินทางภายนอก',
    durationText: '4 ชม.',
    tasks: ['ช่วยพยุงเดิน', 'บันทึกคำแนะนำแพทย์', 'ดูแลระหว่างรอ']
  },
  {
    id: 'REF-H3',
    bookingDate: '2026-05-10',
    time: '09:00 - 13:00',
    serviceType: 'กายภาพบำบัด',
    patientName: 'สมศรี วงศ์ดี',
    price: 1520,
    notes: 'กายภาพบำบัดฟื้นฟูหลังผ่าตัดเข่า',
    status: 'completed',
    createdAt: '2026-05-01T08:00:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'ผ่าตัดเปลี่ยนเข่าขวา',
    locationName: 'วัฒนา, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '4 ชม.',
    tasks: ['กายภาพบำบัดเบื้องต้น', 'ช่วยพยุงเดิน', 'ประคบเย็น']
  },
  {
    id: 'REF-H4',
    bookingDate: '2026-04-12',
    time: '09:00 - 13:00',
    serviceType: 'กายภาพบำบัด',
    patientName: 'สมศรี วงศ์ดี',
    price: 1520,
    notes: 'กายภาพบำบัดครั้งแรกหลังผ่าตัด',
    status: 'completed',
    createdAt: '2026-04-05T09:00:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'ผ่าตัดเปลี่ยนเข่าขวา',
    locationName: 'วัฒนา, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '4 ชม.',
    tasks: ['กายภาพบำบัดเบื้องต้น', 'ช่วยพยุงเดิน', 'ประคบเย็น', 'นวดผ่อนคลายกล้ามเนื้อ']
  },
  {
    id: 'REF-H5',
    bookingDate: '2026-05-20',
    time: '09:00 - 17:00',
    serviceType: 'ดูแลผู้สูงอายุประจำวัน',
    patientName: 'วิชัย ใจงาม',
    price: 2000,
    notes: 'ดูแลพาเดินรับลมช่วงเย็น ป้อนข้าวเที่ยง และเตือนกินยาตามแพทย์สั่ง',
    status: 'completed',
    createdAt: '2026-05-15T08:00:00Z',
    relation: 'สำหรับบิดา',
    condition: 'สมองเสื่อมระยะแรก',
    locationName: 'บางนา, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '8 ชม.',
    tasks: ['ป้อนข้าวเที่ยง', 'พาเดินออกกำลังกาย', 'เตือนกินยา']
  },
  {
    id: 'REF-H6',
    bookingDate: '2026-05-18',
    time: '10:00 - 12:00',
    serviceType: 'ร่วมเดินทางภายนอก',
    patientName: 'นารี มีสุข',
    price: 800,
    notes: 'ช่วยพาไปซื้อของใช้ส่วนตัวที่ห้างสรรพสินค้าใกล้บ้าน',
    status: 'declined',
    declineReason: 'ติดภารกิจดูแลผู้ป่วยรายอื่นในช่วงเวลาดังกล่าว',
    createdAt: '2026-05-14T14:20:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'ปกติ/เพื่อความอุ่นใจ',
    locationName: 'ห้วยขวาง, กรุงเทพมหานคร',
    serviceFormat: 'ร่วมเดินทางภายนอก',
    durationText: '2 ชม.',
    tasks: ['ช่วยพยุงช้อปปิ้ง', 'ช่วยสังเกตอาการภายนอก']
  },
  {
    id: 'REF-H7',
    bookingDate: '2026-05-15',
    time: '13:00 - 16:00',
    serviceType: 'ดูแลผู้สูงอายุระยะสั้น',
    patientName: 'สมใจ รักสงบ',
    price: 1140,
    notes: 'ผู้ป่วยยกเลิกเนื่องจากติดธุระด่วนกับครอบครัว',
    status: 'cancelled',
    createdAt: '2026-05-12T10:00:00Z',
    relation: 'สำหรับตัวเอง',
    condition: 'ผ่าตัดสะโพกขวา',
    locationName: 'ปทุมวัน, กรุงเทพมหานคร',
    serviceFormat: 'ดูแลที่บ้านผู้ป่วย',
    durationText: '3 ชม.',
    tasks: ['ช่วยพยุงเดิน', 'เตรียมน้ำดื่มและยา']
  }
];

export const CaregiverBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [activeTab, setActiveTab] = useState<TabType>('scheduled');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Action Required Sub-filter state
  const [actionSubFilter, setActionSubFilter] = useState<'all' | 'new' | 'waiting'>('all');

  // Decline Modal state
  const [declineModalId, setDeclineModalId] = useState<string | null>(null);

  // Cancel Acceptance Modal state
  const [cancelAcceptanceModalId, setCancelAcceptanceModalId] = useState<string | null>(null);

  // History tab filter state
  const [historySubFilter, setHistorySubFilter] = useState<'all' | 'completed' | 'cancelled' | 'declined'>('all');
  const [historySortBy, setHistorySortBy] = useState<string>('newest');

  // Detail Modal state
  const [detailModalBooking, setDetailModalBooking] = useState<Booking | null>(null);

  // Accept Booking Modal state
  const [acceptModalBooking, setAcceptModalBooking] = useState<Booking | null>(null);

  const { toasts, removeToast, success: showSuccess } = useToast();

  const handleToggleExpand = (id: string) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const handleAccept = (id: string) => {
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      setAcceptModalBooking(booking);
    }
  };

  const handleConfirmAccept = () => {
    if (!acceptModalBooking) return;
    const booking = acceptModalBooking;
    setBookings(prev =>
      prev.map(b => (b.id === booking.id ? { ...b, status: 'accepted' } : b))
    );
    setAcceptModalBooking(null);
    
    // Show system toast notifications with bold patient name and multi-line message
    const msg = (
      <>
        ยอมรับคำขอของ <strong className="font-bold text-[#1A1A1A]">{booking.patientName}</strong> แล้ว{"\n"}
        ส่งตารางเวลาให้ผู้ป่วยยืนยันขั้นตอนต่อไป
      </>
    );
    showSuccess(msg, 4000, 'booking-toast');
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

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'ผ่านแล้ว';
    if (diffDays === 0) return 'วันนี้';
    if (diffDays === 1) return 'พรุ่งนี้';
    return `อีก ${diffDays} วัน`;
  };

  // Helper to filter and sort bookings
  const getFilteredBookings = () => {
    let list: Booking[] = [];
    if (activeTab === 'scheduled') {
      list = bookings.filter(b => b.status === 'confirmed');
    } else if (activeTab === 'action_required') {
      if (actionSubFilter === 'all') {
        list = bookings.filter(b => b.status === 'pending' || b.status === 'accepted');
      } else if (actionSubFilter === 'new') {
        list = bookings.filter(b => b.status === 'pending');
      } else if (actionSubFilter === 'waiting') {
        list = bookings.filter(b => b.status === 'accepted');
      }
    } else {
      // History: completed, cancelled, declined only
      list = bookings.filter(b => ['completed', 'cancelled', 'declined'].includes(b.status));
      if (historySubFilter !== 'all') {
        list = list.filter(b => b.status === historySubFilter);
      }
    }

    if (activeTab === 'scheduled') {
      return [...list].sort((a, b) => {
        const diffA = Math.abs(new Date(a.bookingDate).getTime() - new Date().getTime());
        const diffB = Math.abs(new Date(b.bookingDate).getTime() - new Date().getTime());
        return diffA - diffB;
      });
    }

    if (activeTab === 'history') {
      return [...list].sort((a, b) => {
        const aTime = new Date(a.bookingDate).getTime();
        const bTime = new Date(b.bookingDate).getTime();
        return historySortBy === 'oldest' ? aTime - bTime : bTime - aTime;
      });
    }

    return [...list].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const filteredBookings = getFilteredBookings();

  const scheduledCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'pending' || b.status === 'accepted').length;
  const newRequestsCount = bookings.filter(b => b.status === 'pending').length;
  const waitingConfirmCount = bookings.filter(b => b.status === 'accepted').length;
  const historyCount = bookings.filter(b => ['completed', 'cancelled', 'declined'].includes(b.status)).length;

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
          label: 'รอคนไข้ยืนยัน'
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
          subtitle: 'การนัดหมายปัจจุบันที่ยืนยันแล้ว',
          badgeBg: 'bg-[#E6F5ED]',
          badgeText: 'text-[#1B5C48]',
          countText: `${scheduledCount} งาน`
        };
      case 'action_required':
        return {
          icon: 'pending_actions',
          iconColor: 'text-[#F08C00]',
          title: 'งานที่ต้องดำเนินการ',
          subtitle: 'คำขอรับบริการและรอตรวจสอบเวลาจอง',
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
                        รอคนไข้ยืนยัน ({waitingConfirmCount})
                      </button>
                    </div>
                  )}

                  {filteredBookings.length === 0 ? (
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
                        onViewDetails={setDetailModalBooking}
                        formatThaiDate={formatThaiDate}
                        getDaysUntil={getDaysUntil}
                        getAcceptedTimeText={getAcceptedTimeText}
                        getStatusBadgeStyle={getStatusBadgeStyle}
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
        booking={bookings.find(b => b.id === declineModalId) || null}
        onClose={() => setDeclineModalId(null)}
        onSubmit={(reason) => {
          if (!declineModalId) return;
          const targetBooking = bookings.find(b => b.id === declineModalId);
          setBookings(prev =>
            prev.map(b =>
              b.id === declineModalId
                ? { ...b, status: 'declined', declineReason: reason }
                : b
            )
          );
          setDeclineModalId(null);
          
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
        }}
      />

      <CancelAcceptanceModal
        isOpen={!!cancelAcceptanceModalId}
        booking={bookings.find(b => b.id === cancelAcceptanceModalId) || null}
        onClose={() => setCancelAcceptanceModalId(null)}
        onSubmit={(reason) => {
          if (!cancelAcceptanceModalId) return;
          const targetBooking = bookings.find(b => b.id === cancelAcceptanceModalId);
          setBookings(prev =>
            prev.map(b =>
              b.id === cancelAcceptanceModalId
                ? { ...b, status: 'declined', declineReason: `ยกเลิกการตอบรับ: ${reason}` }
                : b
            )
          );
          setCancelAcceptanceModalId(null);
          
          if (targetBooking) {
            const msg = (
              <>
                ยกเลิกการตอบรับงานของ <strong className="font-bold">{targetBooking.patientName}</strong> แล้ว
              </>
            );
            showSuccess(msg, 4000, 'cancel-toast');
          } else {
            showSuccess('ยกเลิกการตอบรับงานเรียบร้อยแล้ว');
          }
        }}
      />

      <BookingDetailModal
        isOpen={!!detailModalBooking}
        booking={detailModalBooking}
        onClose={() => setDetailModalBooking(null)}
        onCancelAcceptanceClick={handleCancelAcceptanceClick}
        formatThaiDate={formatThaiDate}
        getDaysUntil={getDaysUntil}
        getStatusBadgeStyle={getStatusBadgeStyle}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
    </>
  );
};

export default CaregiverBookings;
