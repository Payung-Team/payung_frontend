import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  GET_USER,
  GET_CAREGIVER_PROFILE,
  GET_NOTIFICATIONS,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  MARK_NOTIFICATION_AS_READ,
  SET_CAREGIVER_SEARCHABLE,
  UPDATE_EMAIL_PREFERENCE,
} from '../../graphql/queries';
import { Icon } from '../../components/ui/Icon';
import Avatar from '../../components/ui/Avatar';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';

interface SettingsMenuItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SettingsTab: React.FC<SettingsMenuItemProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 md:w-full md:flex-shrink flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg transition-colors text-left whitespace-nowrap ${
      isActive
        ? 'bg-[#E7F5EE] text-[#197A4A]'
        : 'text-[#0A0A0A] hover:bg-gray-100'
    }`}
  >
    <Icon name={icon} size="small" color={isActive ? '#197A4A' : 'currentColor'} />
    <span className="font-medium text-[14px] hidden md:inline">{label}</span>
  </button>
);

type NotificationFilter = 'all' | 'unread' | 'kyc' | 'job' | 'system';
type NotificationSection = 'today' | 'yesterday' | 'earlier';
type NotificationType = 'kyc_submitted' | 'kyc_verified' | 'kyc_rejected' | 'kyc_resubmitted';
type NotificationState = 'pending' | 'verified' | 'rejected' | 'resubmit';
type JobReceptionChecklistKey = 'profileVisible' | 'jobAlerts' | 'pauseAnytime';
type SettingsMenu = 'account' | 'jobReception' | 'notifications' | 'language' | 'billing';

const SETTINGS_TAB_PATHS: Record<SettingsMenu, string> = {
  account: '/caregiver/settings/account',
  jobReception: '/caregiver/settings/job-reception',
  notifications: '/caregiver/settings/notifications',
  language: '/caregiver/settings/language',
  billing: '/caregiver/settings/billing',
};

function resolveSettingsMenu(pathname: string, search: string): SettingsMenu {
  const tabParam = new URLSearchParams(search).get('tab');
  if (tabParam === 'notifications') {
    return 'notifications';
  }

  if (pathname === '/caregiver/availability' || pathname === '/caregiver/settings/job-reception') {
    return 'jobReception';
  }
  if (pathname === '/caregiver/settings/notifications') {
    return 'notifications';
  }
  if (pathname === '/caregiver/settings/language') {
    return 'language';
  }
  if (pathname === '/caregiver/settings/billing') {
    return 'billing';
  }

  return 'account';
}

interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  section: NotificationSection;
  category: Exclude<NotificationFilter, 'all' | 'unread'>;
  state: NotificationState;
  timeLabel: string;
  unread: boolean;
}

function relativeTimeTH(dateText: string): string {
  const now = Date.now();
  const then = new Date(dateText).getTime();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return 'เมื่อสักครู่';
  }
  if (minutes < 60) {
    return `${minutes} นาทีที่แล้ว`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ชั่วโมงที่แล้ว`;
  }

  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

function resolveNotificationState(type: NotificationType): NotificationState {
  switch (type) {
    case 'kyc_verified':
      return 'verified';
    case 'kyc_rejected':
      return 'rejected';
    case 'kyc_resubmitted':
      return 'resubmit';
    case 'kyc_submitted':
    default:
      return 'pending';
  }
}

function resolveNotificationSection(createdAt: string): NotificationSection {
  const created = new Date(createdAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const createdTime = created.getTime();

  if (createdTime >= startOfToday) {
    return 'today';
  }
  if (createdTime >= startOfYesterday) {
    return 'yesterday';
  }
  return 'earlier';
}

const notificationStateClasses: Record<
  NotificationState,
  {
    iconSymbol: string;
    statusLabel: string;
    iconWrap: string;
    iconColor: string;
    statusWrap: string;
    statusText: string;
  }
> = {
  pending: {
    iconSymbol: '⏳',
    statusLabel: 'PENDING',
    iconWrap: 'bg-[#FFFBEB]',
    iconColor: '#F59E0B',
    statusWrap: 'bg-[#FFFBEB]',
    statusText: 'text-[#F59E0B]',
  },
  verified: {
    iconSymbol: '✓',
    statusLabel: 'VERIFIED',
    iconWrap: 'bg-[#F0FDF4]',
    iconColor: '#16A34A',
    statusWrap: 'bg-[#F0FDF4]',
    statusText: 'text-[#16A34A]',
  },
  rejected: {
    iconSymbol: '✕',
    statusLabel: 'REJECTED',
    iconWrap: 'bg-[#FEF2F2]',
    iconColor: '#DC2626',
    statusWrap: 'bg-[#FEF2F2]',
    statusText: 'text-[#DC2626]',
  },
  resubmit: {
    iconSymbol: '↻',
    statusLabel: 'RESUBMIT',
    iconWrap: 'bg-[#EFF6FF]',
    iconColor: '#2563EB',
    statusWrap: 'bg-[#EFF6FF]',
    statusText: 'text-[#2563EB]',
  },
};

const CaregiverSettings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const activeMenu = useMemo<SettingsMenu>(
    () => resolveSettingsMenu(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const [activeNotificationFilter, setActiveNotificationFilter] =
    useState<NotificationFilter>('all');
  const [jobReceptionChecklist, setJobReceptionChecklist] = useState<
    Record<JobReceptionChecklistKey, boolean>
  >({
    profileVisible: true,
    jobAlerts: true,
    pauseAnytime: true,
  });
  const { data: userData, loading: userLoading } = useQuery<{
    me: {
      id: string;
      email: string;
      displayName?: string;
      phone?: string;
      address?: string;
      bio?: string;
      avatarUrl?: string;
      role: number;
      createdAt?: string;
      emailPreferences?: boolean;
    };
  }>(GET_USER);

  const {
    data: notificationData,
    refetch: refetchNotifications,
  } = useQuery<{
    notifications: NotificationListItem[];
  }>(GET_NOTIFICATIONS, {
    variables: { limit: 100, offset: 0, unreadOnly: false },
    fetchPolicy: 'cache-and-network',
  });

  const { data: caregiverData, loading: caregiverLoading } = useQuery<{
    myCaregiverProfile: {
      id: string;
      fullName?: string;
      kycStatus: string;
      kycSubmittedAt?: string;
      kycVerifiedAt?: string;
      isSearchable: boolean;
      idCardNumber?: string;
      dateOfBirth?: string;
    };
  }>(GET_CAREGIVER_PROFILE);

  const [jobReceptionError, setJobReceptionError] = useState<string | null>(null);
  const [optimisticIsSearchable, setOptimisticIsSearchable] = useState<boolean | null>(null);

  const [setCaregiverSearchable, { loading: updatingSearchable }] = useMutation(
    SET_CAREGIVER_SEARCHABLE,
  );
  const [markAllNotificationsAsReadMutation] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);
  const [markNotificationAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);
  const [updateEmailPreference] = useMutation(UPDATE_EMAIL_PREFERENCE);

  const user = userData?.me;
  const caregiver = caregiverData?.myCaregiverProfile;
  const notifications = useMemo<NotificationItem[]>(() => {
    const source = notificationData?.notifications ?? [];
    return source.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.body,
      section: resolveNotificationSection(item.createdAt),
      category: 'kyc',
      state: resolveNotificationState(item.type),
      timeLabel: relativeTimeTH(item.createdAt),
      unread: !item.isRead,
    }));
  }, [notificationData?.notifications]);
  const emailEnabled = Boolean(user?.emailPreferences ?? true);
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const serverIsSearchable = Boolean(caregiver?.isSearchable);
  const effectiveIsSearchable = optimisticIsSearchable ?? serverIsSearchable;

  const isLoading = userLoading || caregiverLoading;
  const isKycVerified = caregiver?.kycStatus === 'verified';
  const isAcceptingJobs = Boolean(effectiveIsSearchable && isKycVerified);
  const showKycWarning = !isKycVerified;

  const receptionCardClass = isKycVerified
    ? isAcceptingJobs
      ? 'border-[#52B69A] bg-[#E8F5F1]'
      : 'border-[#E0E0E5] bg-[#F3F3F5]'
    : 'border-[#E0E0E5] bg-[#F3F3F5]';

  const receptionBadgeClass = isKycVerified
    ? isAcceptingJobs
      ? 'bg-[#52B69A] text-white'
      : 'bg-[#A0A0AB] text-white'
    : 'bg-[#A0A0AB] text-white';

  const receptionToggleClass = isKycVerified
    ? isAcceptingJobs
      ? 'bg-[#52B69A]'
      : 'bg-[#CBCED4]'
    : 'cursor-not-allowed bg-[#CBCED4]';

  const receptionStatusLabel = isKycVerified
    ? isAcceptingJobs
      ? 'กำลังรับงาน'
      : 'ไม่รับงาน'
    : 'ยังไม่พร้อม';

  const receptionTitle = isKycVerified
    ? isAcceptingJobs
      ? 'คุณกำลังรับงาน'
      : 'คุณไม่รับงานอยู่ตอนนี้'
    : 'เริ่มต้นเปิดใช้งานการรับงาน';

  const receptionDescription = isKycVerified
    ? isAcceptingJobs
      ? 'ผู้ดูแลจะเห็นโปรไฟล์ของคุณและสามารถจองได้'
      : 'โปรไฟล์จะไม่ปรากฏในการค้นหา เปิดเมื่อพร้อม'
    : 'พร้อมใช้งานหลังยืนยันตัวตน';

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel(`caregiver-settings-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchNotifications, user?.id]);

  const handleToggleReception = async () => {
    if (!isKycVerified || updatingSearchable) {
      return;
    }

    const previousValue = isAcceptingJobs;
    const nextValue = !previousValue;

    setOptimisticIsSearchable(nextValue);
    setJobReceptionError(null);

    try {
      await setCaregiverSearchable({
        variables: { isSearchable: nextValue },
        refetchQueries: [{ query: GET_CAREGIVER_PROFILE }],
        awaitRefetchQueries: true,
      });
      setOptimisticIsSearchable(null);
      showSuccess(nextValue ? 'เปิดรับงานแล้ว' : 'ปิดรับงานแล้ว');
    } catch (error) {
      setOptimisticIsSearchable(previousValue);
      const fallbackMessage = 'ไม่สามารถอัปเดตสถานะการรับงานได้';
      const errorMessage = error instanceof Error ? error.message : fallbackMessage;
      setJobReceptionError(errorMessage || fallbackMessage);
      showError(fallbackMessage);
    }
  };

  // Role name mapping
  const roleNames: Record<number, string> = {
    1: 'ผู้ป่วย',
    2: 'ผู้ดูแล',
    3: 'ผู้ดูแลระบบ'
  };

  const notificationCounts = {
    all: notifications.length,
    unread: notifications.filter((item) => item.unread).length,
    kyc: notifications.filter((item) => item.category === 'kyc').length,
    job: notifications.filter((item) => item.category === 'job').length,
    system: notifications.filter((item) => item.category === 'system').length,
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeNotificationFilter === 'all') {
      return true;
    }
    if (activeNotificationFilter === 'unread') {
      return item.unread;
    }
    return item.category === activeNotificationFilter;
  });

  const groupedNotifications: Record<NotificationSection, NotificationItem[]> = {
    today: filteredNotifications.filter((item) => item.section === 'today'),
    yesterday: filteredNotifications.filter((item) => item.section === 'yesterday'),
    earlier: filteredNotifications.filter((item) => item.section === 'earlier'),
  };

  const notificationFilters: Array<{
    key: NotificationFilter;
    label: string;
  }> = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'unread', label: 'ยังไม่อ่าน' },
    { key: 'kyc', label: 'KYC' },
    { key: 'job', label: 'งาน' },
    { key: 'system', label: 'ระบบ' },
  ];

  const sectionLabels: Record<NotificationSection, string> = {
    today: 'วันนี้',
    yesterday: 'เมื่อวาน',
    earlier: 'ก่อนหน้านี้',
  };

  const kycStatusCard = useMemo(() => {
    const status = caregiver?.kycStatus ?? 'none';
    const submittedAt = caregiver?.kycSubmittedAt;
    const verifiedAt = caregiver?.kycVerifiedAt;

    if (status === 'verified') {
      return {
        title: 'ยืนยันตัวตนแล้ว',
        titleClass: 'text-[#228B55]',
        wrapperClass: 'bg-[#E7F5EE]',
        iconWrapClass: 'bg-[#228B55]',
        iconName: 'check',
        updatedAtLabel: verifiedAt ? `อัปเดตเมื่อ ${relativeTimeTH(verifiedAt)}` : 'อัปเดตเมื่อ -',
      };
    }

    if (status === 'rejected') {
      return {
        title: 'ไม่ผ่านการยืนยันตัวตน',
        titleClass: 'text-[#B42318]',
        wrapperClass: 'bg-[#FEF3F2]',
        iconWrapClass: 'bg-[#D92D20]',
        iconName: 'close',
        updatedAtLabel: 'อัปเดตเมื่อ -',
      };
    }

    if (status === 'pending' || status === 'resubmitted' || status === 'submitted') {
      return {
        title: 'กำลังตรวจสอบข้อมูล',
        titleClass: 'text-[#B54708]',
        wrapperClass: 'bg-[#FFFAEB]',
        iconWrapClass: 'bg-[#F79009]',
        iconName: 'schedule',
        updatedAtLabel: submittedAt ? `อัปเดตเมื่อ ${relativeTimeTH(submittedAt)}` : 'อัปเดตเมื่อ -',
      };
    }

    return {
      title: 'ยังไม่ได้ยืนยันตัวตน',
      titleClass: 'text-[#667085]',
      wrapperClass: 'bg-[#F2F4F7]',
      iconWrapClass: 'bg-[#98A2B3]',
      iconName: 'person',
      updatedAtLabel: 'อัปเดตเมื่อ -',
    };
  }, [caregiver?.kycStatus, caregiver?.kycSubmittedAt, caregiver?.kycVerifiedAt]);

  const markAllNotificationsAsRead = async () => {
    await markAllNotificationsAsReadMutation();
    await refetchNotifications();
  };

  const handleNotificationAction = async (item: NotificationItem) => {
    if (item.unread) {
      await markNotificationAsRead({ variables: { id: item.id } });
      await refetchNotifications();
    }

    navigate('/kyc/status');
  };

  const handleNotificationCardClick = async (item: NotificationItem) => {
    await handleNotificationAction(item);
  };

  const toggleEmailPreference = async () => {
    await updateEmailPreference({
      variables: { enabled: !emailEnabled },
      refetchQueries: [{ query: GET_USER }],
      awaitRefetchQueries: true,
    });
  };

  const toggleJobReceptionChecklist = (key: JobReceptionChecklistKey) => {
    if (!isAcceptingJobs) {
      return;
    }

    setJobReceptionChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const navigateToMenu = (menu: SettingsMenu) => {
    navigate(SETTINGS_TAB_PATHS[menu]);
  };

  return (
    <div
      className="min-h-screen bg-[#F6F8F9] flex flex-col md:flex-row"
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
      {/* ═══ Tab Navigation (Left Sidebar) ═══ */}
      <div className="w-full md:w-[250px] bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        {/* Tab Header */}
        <div className="bg-gray-100 px-6 py-4">
          <h3 className="text-[16px] font-bold text-[#0A0A0A]">ตั้งค่าบัญชี</h3>
        </div>

        {/* Tab Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex md:flex-col gap-1 md:gap-2 overflow-x-auto md:overflow-x-visible">
          <div className="flex md:flex-col gap-1 md:gap-2 w-max md:w-full">
            <SettingsTab
              icon="account_circle"
              label="บัญชี"
              isActive={activeMenu === 'account'}
              onClick={() => navigateToMenu('account')}
            />
            <SettingsTab
              icon="toggle_on"
              label="การรับงาน"
              isActive={activeMenu === 'jobReception'}
              onClick={() => navigateToMenu('jobReception')}
            />
            <SettingsTab
              icon="notifications"
              label="การแจ้งเตือน"
              isActive={activeMenu === 'notifications'}
              onClick={() => navigateToMenu('notifications')}
            />
            <SettingsTab
              icon="language"
              label="ภาษา"
              isActive={activeMenu === 'language'}
              onClick={() => navigateToMenu('language')}
            />
            <SettingsTab
              icon="payment"
              label="Billing"
              isActive={activeMenu === 'billing'}
              onClick={() => navigateToMenu('billing')}
            />
          </div>
        </div>

        {/* Help Center at bottom */}
        <div className="border-t border-gray-200 px-3 hidden md:block">
          <button className="w-full px-4 py-3 text-left text-[#0A0A0A] hover:bg-gray-100 transition-colors rounded-lg text-[14px] font-medium">
            Help Center
          </button>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 overflow-y-auto bg-[#F6F8F9]">
          <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-4 md:py-7">
            {activeMenu === 'account' && (
              <div className="space-y-6">
                {/* Profile Card Section */}
                <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
                  {/* Header with title and badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-[20px] font-semibold text-[#0A0A0A] mb-1">โปรไฟล์ของฉัน</h2>
                      <p className="text-[12px] text-[#717182]">
                        {`${roleNames[user?.role ?? 0] || 'ไม่ระบุ'} • เข้าร่วมระบบ ${user?.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}`}
                      </p>
                    </div>
                  </div>

                  {/* Profile Avatar and Info */}
                  {isLoading ? (
                    <Skeleton height={120} borderRadius={16} className="mb-7" />
                  ) : (
                    <div className="flex items-center gap-6">
                      <Avatar
                        name={displayName}
                        size={96}
                        fallbackColor="#52B69A"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-[20px] font-medium text-[#0A0A0A]">
                            {displayName}
                          </h3>
                          <span className="px-3 py-1 bg-[#00A63E] text-white rounded-lg text-[12px] font-semibold">
                            ✓ ยืนยันตัวตน
                          </span>
                        </div>
                        <p className="text-[14px] text-[#717182] mb-2">ผู้ดูแลผู้สูงอายุ</p>
                        <p className="text-[12px] text-[#B8C2CC]">สมัครเมื่อ 22/08/2024</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Profile Button */}
                <button
                  onClick={() => navigate('/caregiver/edit-profile')}
                  className="w-full px-6 py-3 bg-[#52B69A] text-white rounded-lg text-[14px] font-medium hover:bg-[#4a9d87] transition-colors"
                >
                  แก้ไขโปรไฟล์
                </button>

                {/* Personal Info Section */}
                {!isLoading && (
                  <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
                    <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">ข้อมูลส่วนตัว</h3>
                    <p className="text-[12px] text-[#717182] mb-6">หากต้องการแก้ไขกรุณาติดต่อศูนย์บริการให้ความช่วยเหลือ</p>

                    <div className="space-y-6">
                      {/* Caregiver ID */}
                      <div>
                        <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">หมายเลขประจำตัวผู้ดูแล</label>
                        <input
                          type="text"
                          value={caregiver?.id || '-'}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                        />
                      </div>

                      {/* Name and Surname */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ชื่อ</label>
                          <input
                            type="text"
                            value={caregiver?.fullName?.split(' ')[0] || '-'}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)] flex items-center justify-between"
                          />
                        </div>
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">นามสกุล</label>
                          <input
                            type="text"
                            value={caregiver?.fullName?.split(' ').slice(1).join(' ') || '-'}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                          />
                        </div>
                      </div>

                      {/* Gender and DOB */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เพศ</label>
                          <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)] flex items-center justify-between">
                            <span>-</span>
                            <Icon name="expand_more" size="small" color="currentColor" />
                          </button>
                        </div>
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">วันเกิด</label>
                          <input
                            type="date"
                            value={caregiver?.dateOfBirth || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                            placeholder="-"
                          />
                        </div>
                      </div>

                      {/* Citizen ID */}
                      <div>
                        <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เลขประจำตัวประชาชน</label>
                        <input
                          type="text"
                          value={caregiver?.idCardNumber || '-'}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Info Section */}
                {!isLoading && (
                  <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
                    <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-6">ข้อมูลติดต่อ</h3>

                    <div className="space-y-6">
                      {/* Phone and Email */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เบอร์โทรศัพท์</label>
                          <input
                            type="tel"
                            value={user?.phone || '-'}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#0A0A0A]"
                          />
                        </div>
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">อีเมล</label>
                          <input
                            type="email"
                            value={user?.email || '-'}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#0A0A0A]"
                          />
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ที่อยู่</label>
                        <textarea
                          value={user?.address || '-'}
                          readOnly
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#717182] resize-none"
                        />
                      </div>

                      {/* Province, District, Postal */}
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">จังหวัด</label>
                          <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)] flex items-center justify-between">
                            <span>-ยังไม่ได้เลือก-</span>
                            <Icon name="expand_more" size="small" color="currentColor" />
                          </button>
                        </div>
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">เขต/อำเภอ</label>
                          <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)] flex items-center justify-between">
                            <span>-ยังไม่ได้เลือก-</span>
                            <Icon name="expand_more" size="small" color="currentColor" />
                          </button>
                        </div>
                        <div>
                          <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">รหัสไปรษณีย์</label>
                          <input
                            type="text"
                            placeholder="-ยังไม่ได้เลือก-"
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bio Section */}
                {!isLoading && (
                  <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
                    <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">แนะนำตัว</h3>
                    <p className="text-[14px] text-[#717182] mb-6">เขียนข้อความแนะนำตัวที่จะแสดงในโปรไฟล์ของคุณ</p>

                    <textarea
                      value={user?.bio || '-'}
                      readOnly
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[#717182] resize-none"
                    />
                  </div>
                )}

                {/* Professional Info Section */}
                {!isLoading && (
                  <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
                    <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-6">ข้อมูลวิชาชีพ</h3>

                    <div className="space-y-6">
                      <div>
                        <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ประสบการณ์ทำงาน (ปี)</label>
                        <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)] flex items-center justify-between">
                          <span>ยังไม่ได้เลือก</span>
                          <Icon name="expand_more" size="small" color="currentColor" />
                        </button>
                      </div>

                      <div>
                        <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ประเภทการดูแล</label>
                        <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)] flex items-center justify-between">
                          <span>ยังไม่ได้เลือก</span>
                          <Icon name="expand_more" size="small" color="currentColor" />
                        </button>
                      </div>

                      <div>
                        <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ทักษะความสามารถ</label>
                        <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)] flex items-center justify-between">
                          <span>ยังไม่ได้เลือก</span>
                          <Icon name="expand_more" size="small" color="currentColor" />
                        </button>
                      </div>

                      <div>
                        <label className="text-[14px] font-semibold text-[#0A0A0A] mb-2 block">ภาษาที่สามารถสื่อสารได้</label>
                        <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[14px] bg-[#F3F3F5] text-[rgba(0,0,0,0.5)] flex items-center justify-between">
                          <span>ยังไม่ได้เลือก</span>
                          <Icon name="expand_more" size="small" color="currentColor" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Certificate/Credentials Section */}
                {!isLoading && (
                  <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
                    <div className="mb-6">
                      <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">ใบรับรอง / ความน่าเชื่อถือ</h3>
                      <p className="text-[14px] text-[#717182]">อัปโหลดเอกสารและใบรับรองเพื่อเพิ่มความน่าเชื่อถือ</p>
                    </div>

                    {/* Documents Container */}
                    <div className="bg-[#ECECF0] rounded-xl p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[16px] font-semibold text-[#0A0A0A]">เอกสารที่อัปโหลดแล้ว</h4>
                        <a href="#" className="text-[14px] font-medium text-[#52B69A] underline">ติดตามสถานะ</a>
                      </div>

                      {/* Document Item 1 */}
                      <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Icon name="description" size="medium" color="currentColor" />
                          <div className="flex-1">
                            <p className="text-[14px] font-semibold text-[#0A0A0A]">ใบรับรองผู้ช่วยพยาบาล.pdf</p>
                            <p className="text-[12px] text-[#717182]">อัปโหลดเมื่อ 15 ม.ค. 2564</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-[#00A63E] text-white rounded-lg text-[12px] font-semibold">ยืนยันแล้ว</span>
                      </div>

                      {/* Document Item 2 */}
                      <div className="bg-white rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Icon name="description" size="medium" color="currentColor" />
                          <div className="flex-1">
                            <p className="text-[14px] font-semibold text-[#0A0A0A]">สำเนาบัตรประชาชน.pdf</p>
                            <p className="text-[12px] text-[#717182]">อัปโหลดเมื่อ 15 ม.ค. 2564</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-[#00A63E] text-white rounded-lg text-[12px] font-semibold">ยืนยันแล้ว</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeMenu === 'language' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-6">ภาษา</h2>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      defaultChecked
                      className="w-4 h-4"
                    />
                    <span className="text-[14px] text-[#0A0A0A]">ไทย</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      className="w-4 h-4"
                    />
                    <span className="text-[14px] text-[#0A0A0A]">English</span>
                  </label>
                </div>
              </div>
            )}

            {activeMenu === 'notifications' && (
              <div className="flex flex-col gap-6 xl:flex-row">
                <section className="w-full xl:max-w-[720px]">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-[26px] font-bold leading-[31px] text-[#12181B]">การแจ้งเตือน</h2>
                      <p className="text-[14px] text-[#89949B]">
                        ติดตามสถานะ KYC และกิจกรรมในบัญชีของคุณ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={markAllNotificationsAsRead}
                      className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#228B55] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1f7d4d]"
                    >
                      <Icon name="done_all" variant="outlined" size="small" color="white" />
                      อ่านทั้งหมด
                    </button>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-2">
                    {notificationFilters.map((filter) => {
                      const isActive = activeNotificationFilter === filter.key;
                      const pillCount = notificationCounts[filter.key];

                      return (
                        <button
                          type="button"
                          key={filter.key}
                          onClick={() => setActiveNotificationFilter(filter.key)}
                          className={`inline-flex items-center gap-2 rounded-full border px-[14px] py-[8px] text-[13px] font-semibold transition-colors ${
                            isActive
                              ? 'border-[#12181B] bg-[#12181B] text-white'
                              : 'border-[#E5E7E9] bg-white text-[#414A52] hover:bg-[#F8F9FA]'
                          }`}
                        >
                          {filter.label}
                          <span
                            className={`rounded-full px-[6px] py-[1px] text-[11px] font-bold ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#F3F4F5] text-[#616B73]'
                            }`}
                          >
                            {pillCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    {(Object.keys(groupedNotifications) as NotificationSection[]).map((section) => {
                      const sectionItems = groupedNotifications[section];
                      if (sectionItems.length === 0) {
                        return null;
                      }

                      return (
                        <div key={section} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#89949B]">
                              {sectionLabels[section]}
                            </span>
                            <div className="h-px flex-1 bg-[#E5E7E9]" />
                          </div>

                          {sectionItems.map((item) => {
                            const theme = notificationStateClasses[item.state];
                            const cardStateClass = item.unread
                              ? 'bg-[#E6F4F3] border-[1px] border-l-[3px] border-[#F58634]'
                              : 'bg-white border border-[#DDE3E0]';

                            return (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => handleNotificationCardClick(item)}
                                className={`w-full rounded-[12px] p-4 text-left transition-colors ${cardStateClass} cursor-pointer`}
                              >
                                <div className="flex items-start gap-[14px]">
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${theme.iconWrap}`}
                                  >
                                    <span className="text-[18px] font-bold leading-[22px]" style={{ color: theme.iconColor }}>
                                      {theme.iconSymbol}
                                    </span>
                                  </div>

                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-[13px] font-semibold leading-4 text-[#1A2422]">{item.title}</h3>
                                      <span
                                        className={`rounded-[4px] px-[6px] py-[2px] text-[9px] font-bold tracking-[0.08em] ${theme.statusWrap} ${theme.statusText}`}
                                      >
                                        {theme.statusLabel}
                                      </span>
                                    </div>

                                    <p className="truncate text-[12px] leading-[15px] text-[#6B7773]">{item.description}</p>

                                    <div className="flex items-center gap-2 pt-[2px]">
                                      <span className="text-[10px] font-medium leading-3 text-[#8B9591]">
                                        {item.timeLabel}
                                      </span>
                                      {item.unread && <span className="h-2 w-2 rounded-full bg-[#F58634]" />}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}

                    {filteredNotifications.length === 0 && (
                      <div className="rounded-[12px] border border-[#E5E7E9] bg-white p-8 text-center text-[14px] text-[#89949B]">
                        ไม่พบรายการแจ้งเตือนในหมวดนี้
                      </div>
                    )}
                  </div>
                </section>

                <aside className="w-full space-y-5 xl:max-w-[320px]">
                  <h3 className="text-[16px] font-semibold text-[#293138]">ภาพรวม</h3>

                  <div className="rounded-[14px] border border-[#E5E7E9] bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#616B73]">สถานะ KYC ปัจจุบัน</span>
                      <button
                        type="button"
                        onClick={() => navigate('/kyc/status')}
                        className="inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-[#F3F4F5]"
                        aria-label="เปิดหน้าสถานะ KYC"
                      >
                        <Icon name="open_in_new" variant="outlined" size="small" color="#ABB4BA" />
                      </button>
                    </div>

                    <div className={`inline-flex items-center gap-3 rounded-[10px] px-4 py-3 ${kycStatusCard.wrapperClass}`}>
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${kycStatusCard.iconWrapClass}`}>
                        <Icon name={kycStatusCard.iconName} size="small" color="white" />
                      </span>
                      <div>
                        <p className={`text-[15px] font-bold ${kycStatusCard.titleClass}`}>{kycStatusCard.title}</p>
                        <p className="text-[11px] text-[#89949B]">{kycStatusCard.updatedAtLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#E5E7E9] bg-white p-5">
                    <div className="mb-4">
                      <p className="text-[15px] font-semibold text-[#293138]">การตั้งค่าแจ้งเตือน</p>
                      <p className="text-[12px] text-[#89949B]">
                        เลือกช่องทางที่คุณต้องการรับแจ้งเตือน
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-[10px] py-1">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F3F4F5]">
                          <Icon
                            name="notifications"
                            variant="outlined"
                            size="small"
                            color="#197A4A"
                          />
                        </span>

                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-[#293138]">แจ้งเตือนในแอป</p>
                          <p className="text-[11px] text-[#89949B]">แสดงที่ bell icon ด้านบน</p>
                        </div>

                        <button
                          type="button"
                          disabled
                          className="relative h-[22px] w-10 rounded-full bg-[#228B55]"
                          aria-label="แจ้งเตือนในแอปเปิดใช้งานเสมอ"
                        >
                          <span className="absolute left-[21px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 rounded-[10px] py-1">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F3F4F5]">
                          <Icon
                            name="mail"
                            variant="outlined"
                            size="small"
                            color="#396FD8"
                          />
                        </span>

                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-[#293138]">อีเมล KYC</p>
                          <p className="text-[11px] text-[#89949B]">ส่งเมื่อสถานะเปลี่ยน</p>
                        </div>

                        <button
                          type="button"
                          onClick={toggleEmailPreference}
                          className={`relative h-[22px] w-10 rounded-full transition-colors ${
                            emailEnabled ? 'bg-[#228B55]' : 'bg-[#D2D7DA]'
                          }`}
                          aria-label="สลับอีเมล KYC"
                        >
                          <span
                            className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-all ${
                              emailEnabled ? 'left-[21px]' : 'left-[3px]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-[#12181B] p-5 text-white">
                    <div className="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold">
                      <Icon name="calendar_today" variant="outlined" size="small" color="#D3ECDD" />
                      7 วันที่ผ่านมา
                    </div>

                    <div className="space-y-2 text-[12px]">
                      <div className="flex items-center justify-between text-[#B3BABF]">
                        <span>แจ้งเตือนทั้งหมด</span>
                        <span className="text-[16px] font-bold text-white">{notificationCounts.all}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#B3BABF]">
                        <span>ยังไม่อ่าน</span>
                        <span className="text-[16px] font-bold text-[#F58634]">{notificationCounts.unread}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#B3BABF]">
                        <span>อีเมลที่ส่งออก</span>
                        <span className="text-[16px] font-bold text-white">
                          {emailEnabled ? notifications.length : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {activeMenu === 'billing' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-6">Billing</h2>
                <p className="text-[14px] text-gray-600">ข้อมูล Billing จะแสดงที่นี่</p>
              </div>
            )}

            {activeMenu === 'jobReception' && (
              <div className="space-y-6">
                {showKycWarning && (
                  <div className="relative overflow-hidden rounded-[10px] border border-[#F2D2A4] bg-white p-5">
                    <div className="absolute inset-y-0 left-0 w-2.5 bg-[#E09721]" />
                    <div className="flex items-center justify-between gap-4 pl-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF6E8] text-[#E09721]">
                          <Icon name="warning" variant="outlined" size="medium" color="currentColor" />
                        </span>
                        <div>
                          <p className="text-[20px] font-semibold text-[#0A0A0A]">ยังไม่ได้ยืนยันตัวตน</p>
                          <p className="text-[15px] text-[#717182]">คุณต้องยืนยันตัวตนก่อนจึงจะเปิดรับงานได้</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/kyc')}
                        className="rounded-[10px] bg-[#0D9488] px-6 py-3 text-[16px] font-bold text-white transition-colors hover:bg-[#0b7f74]"
                      >
                        เริ่มยืนยันตัวตน
                      </button>
                    </div>
                  </div>
                )}

                <div className={`rounded-[10px] border p-6 ${receptionCardClass}`}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold ${receptionBadgeClass}`}>
                      {isKycVerified && isAcceptingJobs && (
                        <span className="h-2 w-2 rounded-full bg-white/80" />
                      )}
                      {receptionStatusLabel}
                    </span>

                    <button
                      type="button"
                      onClick={handleToggleReception}
                      disabled={!isKycVerified || updatingSearchable}
                      aria-label="สลับสถานะการรับงาน"
                      className={`relative h-8 w-14 rounded-full transition-colors ${receptionToggleClass}`}
                    >
                      <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                          isKycVerified && isAcceptingJobs ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <h2 className="text-[24px] font-semibold text-[#0A0A0A]">{receptionTitle}</h2>
                  <p className="mt-2 text-[14px] text-[#717182]">{receptionDescription}</p>
                </div>

                {isKycVerified && (
                  <div className="rounded-[10px] border border-[#E8EBEF] bg-white p-6">
                    <div className="space-y-4">
                      {[
                        { key: 'profileVisible' as const, label: 'โปรไฟล์แสดงในหน้าค้นหา' },
                        { key: 'jobAlerts' as const, label: 'รับการแจ้งเตือนเมื่อมีงาน' },
                        { key: 'pauseAnytime' as const, label: 'ปิดรับงานได้ทุกเมื่อ' },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className={`flex items-center gap-3 ${
                            isAcceptingJobs ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={jobReceptionChecklist[item.key]}
                            onChange={() => toggleJobReceptionChecklist(item.key)}
                            disabled={!isAcceptingJobs}
                            className="h-5 w-5 rounded border-[#CBCED4] text-[#52B69A] accent-[#52B69A]"
                            aria-label={item.label}
                          />
                          <span
                            className={`text-[16px] ${
                              jobReceptionChecklist[item.key] ? 'text-[#0A0A0A]' : 'text-[#919497]'
                            }`}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {jobReceptionError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-600">
                    {jobReceptionError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-center"
        variant="soft-card"
      />
      </div>
  );
};

export default CaregiverSettings;
