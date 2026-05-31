import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import {
  GET_USER,
  GET_CAREGIVER_PROFILE,
  GET_NOTIFICATIONS,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  MARK_NOTIFICATION_AS_READ,
  UPDATE_EMAIL_PREFERENCE,
} from '../../../graphql/queries';
import { Icon } from '../../../components/ui/Icon';
import { supabase } from '../../../lib/supabase';

type NotificationFilter = 'all' | 'unread' | 'kyc' | 'job' | 'system';
type NotificationSection = 'today' | 'yesterday' | 'earlier';
type NotificationType = 'kyc_submitted' | 'kyc_verified' | 'kyc_rejected' | 'kyc_resubmitted';
type NotificationState = 'pending' | 'verified' | 'rejected' | 'resubmit';

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

export const NotificationSettingsTab: React.FC = () => {
  const navigate = useNavigate();
  const [activeNotificationFilter, setActiveNotificationFilter] =
    useState<NotificationFilter>('all');

  const { data: userData } = useQuery<{
    me: {
      id: string;
      email: string;
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

  const { data: caregiverData } = useQuery<{
    myCaregiverProfile: {
      id: string;
      kycStatus: string;
      kycSubmittedAt?: string;
      kycVerifiedAt?: string;
    };
  }>(GET_CAREGIVER_PROFILE);

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

  const toggleEmailPreference = async () => {
    await updateEmailPreference({
      variables: { enabled: !emailEnabled },
      refetchQueries: [{ query: GET_USER }],
      awaitRefetchQueries: true,
    });
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

  return (
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
                      onClick={() => handleNotificationAction(item)}
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
  );
};
