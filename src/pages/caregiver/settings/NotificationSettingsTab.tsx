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
import type { FilterTab, NotificationSource, NotificationType } from '../../../components/notifications/notificationMeta';
import {
  FILTER_TABS,
  UNREAD_DOT_COLOR,
  deriveSource,
  getSubtitle,
  notificationIcon,
  relativeTimeTH,
  resolveDeepLink,
} from '../../../components/notifications/notificationMeta';

type NotificationSection = 'today' | 'yesterday' | 'earlier';

interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  section: NotificationSection;
  category: NotificationSource;
  timeLabel: string;
  unread: boolean;
  rawData?: string | null;
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

export const NotificationSettingsTab: React.FC = () => {
  const navigate = useNavigate();
  const [activeNotificationFilter, setActiveNotificationFilter] =
    useState<FilterTab>('all');

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
      description: getSubtitle(item),
      section: resolveNotificationSection(item.createdAt),
      category: deriveSource(item),
      timeLabel: relativeTimeTH(item.createdAt),
      unread: !item.isRead,
      rawData: item.data,
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
    navigate(resolveDeepLink({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.description,
      data: item.rawData,
      isRead: !item.unread,
      createdAt: '',
    }));
  };

  const toggleEmailPreference = async () => {
    await updateEmailPreference({
      variables: { enabled: !emailEnabled },
      refetchQueries: [{ query: GET_USER }],
      awaitRefetchQueries: true,
    });
  };

  const notificationCounts = useMemo(() => ({
    all: notifications.length,
    booking: notifications.filter((n) => n.category === 'booking').length,
    finance: notifications.filter((n) => n.category === 'finance').length,
    system: notifications.filter((n) => n.category === 'system').length,
  }), [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications],
  );

  const filteredNotifications = useMemo(
    () => activeNotificationFilter === 'all'
      ? notifications
      : notifications.filter((n) => n.category === activeNotificationFilter),
    [notifications, activeNotificationFilter],
  );

  const groupedNotifications: Record<NotificationSection, NotificationItem[]> = {
    today: filteredNotifications.filter((item) => item.section === 'today'),
    yesterday: filteredNotifications.filter((item) => item.section === 'yesterday'),
    earlier: filteredNotifications.filter((item) => item.section === 'earlier'),
  };

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
            className="cursor-pointer inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#228B55] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#1f7d4d]"
          >
            <Icon name="done_all" variant="outlined" size="small" color="white" />
            อ่านทั้งหมด
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const isActive = activeNotificationFilter === tab.key;
            const pillCount = notificationCounts[tab.key];

            return (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveNotificationFilter(tab.key)}
                className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-[14px] py-[8px] text-[13px] font-semibold transition-colors ${
                  isActive
                    ? 'border-[#12181B] bg-[#12181B] text-white'
                    : 'border-[#E5E7E9] bg-white text-[#414A52] hover:bg-[#F8F9FA]'
                }`}
              >
                {tab.label}
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
                  const visual = notificationIcon(item.type);
                  const cardStateClass = item.unread
                    ? 'bg-[#E6F4F3] border-[1px] border-l-[3px] border-[#2563EB]'
                    : 'bg-white border border-[#DDE3E0]';

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleNotificationAction(item)}
                      className={`cursor-pointer w-full rounded-[12px] p-4 text-left transition-colors ${cardStateClass}`}
                    >
                      <div className="flex items-start gap-[14px]">
                        <span
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                          style={{ backgroundColor: visual.bg, color: visual.color }}
                        >
                          <span className="material-icons text-[22px] leading-none">{visual.icon}</span>
                        </span>

                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="text-[13px] font-semibold leading-4 text-[#1A2422]">{item.title}</h3>
                          <p className="truncate text-[12px] leading-[15px] text-[#6B7773]">{item.description}</p>
                          <div className="flex items-center gap-2 pt-[2px]">
                            <span className="text-[10px] font-medium leading-3 text-[#8B9591]">
                              {item.timeLabel}
                            </span>
                            {item.unread && (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: UNREAD_DOT_COLOR }}
                              />
                            )}
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
              className="cursor-pointer inline-flex items-center justify-center rounded-md p-1 transition-colors hover:bg-[#F3F4F5]"
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
                className={`cursor-pointer relative h-[22px] w-10 rounded-full transition-colors ${
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
              <span className="text-[16px] font-bold text-[#F58634]">{unreadCount}</span>
            </div>
            <div className="flex items-center justify-between text-[#B3BABF]">
              <span>อีเมลที่ส่งออก</span>
              <span className="text-[16px] font-bold text-white">
                {emailEnabled ? notificationCounts.all : 0}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
