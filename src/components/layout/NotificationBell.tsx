import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_COUNT,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  MARK_NOTIFICATION_AS_READ,
} from '../../graphql/queries';
import { supabase } from '../../lib/supabase';

type NotificationType =
  | 'kyc_submitted'
  | 'kyc_verified'
  | 'kyc_rejected'
  | 'kyc_resubmitted'
  | 'booking_new'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_confirmed'
  | 'booking_cancelled';

interface NotificationData {
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

interface UnreadCountData {
  unreadCount: number;
}

interface NotificationBellProps {
  readonly currentUserId?: string;
  readonly externalUnreadCount?: number;
}

function formatRelativeTime(createdAt: string): string {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const diffMs = Math.max(0, now - created);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'เมื่อสักครู่';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} นาทีที่แล้ว`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} ชั่วโมงที่แล้ว`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} วันที่แล้ว`;
}

function notificationVisual(type: NotificationType): { icon: string; iconBg: string; iconColor: string } {
  switch (type) {
    case 'kyc_verified':
      return { icon: '✓', iconBg: '#F0FDF4', iconColor: '#16A34A' };
    case 'kyc_rejected':
      return { icon: '✗', iconBg: '#FEF2F2', iconColor: '#DC2626' };
    case 'kyc_resubmitted':
      return { icon: '↻', iconBg: '#EFF6FF', iconColor: '#2563EB' };
    case 'booking_new':
      return { icon: '📋', iconBg: '#EFF6FF', iconColor: '#2563EB' };
    case 'booking_accepted':
    case 'booking_confirmed':
      return { icon: '✓', iconBg: '#F0FDF4', iconColor: '#16A34A' };
    case 'booking_declined':
    case 'booking_cancelled':
      return { icon: '✗', iconBg: '#FEF2F2', iconColor: '#DC2626' };
    case 'kyc_submitted':
    default:
      return { icon: '⏳', iconBg: '#FFFBEB', iconColor: '#F59E0B' };
  }
}

function bookingNavigatePath(type: NotificationType): string {
  // caregiver-targeted types
  if (type === 'booking_new' || type === 'booking_confirmed' || type === 'booking_cancelled') {
    return '/caregiver/bookings';
  }
  // patient-targeted types
  if (type === 'booking_accepted' || type === 'booking_declined') {
    return '/bookings';
  }
  return '/kyc/status';
}

export default function NotificationBell({
  currentUserId,
  externalUnreadCount,
}: NotificationBellProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    data: unreadData,
    refetch: refetchUnreadCount,
  } = useQuery<UnreadCountData>(GET_UNREAD_COUNT, {
    pollInterval: 30000,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: notificationData,
    refetch: refetchNotifications,
  } = useQuery<NotificationData>(GET_NOTIFICATIONS, {
    variables: { limit: 5, offset: 0, unreadOnly: false },
    fetchPolicy: 'cache-and-network',
  });

  const [markAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);
  const [markAllAsRead] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const channel = supabase
      .channel(`notifications-bell-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          refetchUnreadCount();
          refetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refetchNotifications, refetchUnreadCount]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const items = notificationData?.notifications ?? [];
  const unreadCount = useMemo(() => {
    if (typeof externalUnreadCount === 'number' && externalUnreadCount >= 0) {
      return externalUnreadCount;
    }

    return unreadData?.unreadCount ?? items.filter((item) => !item.isRead).length;
  }, [externalUnreadCount, unreadData?.unreadCount, items]);

  const handleMarkAll = async () => {
    await markAllAsRead();
    await refetchUnreadCount();
    await refetchNotifications();
  };

  const handleClickBell = () => {
    if (isMobile) {
      navigate('/caregiver/settings/notifications');
    } else {
      setOpen((prev) => !prev);
    }
  };

  const handleClickItem = async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    if (!item.isRead) {
      await markAsRead({ variables: { id } });
    }

    setOpen(false);
    await refetchUnreadCount();
    await refetchNotifications();
    navigate(bookingNavigatePath(item.type));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleClickBell}
        className="relative w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:cursor-pointer transition-colors rounded-full hover:bg-gray-100"
        aria-label="เปิดการแจ้งเตือน"
      >
        <span className="material-icons text-base">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D4183D] rounded-full ring-2 ring-white" />
        )}
      </button>

      {open && !isMobile && (
        <div className="absolute right-0 top-11 z-50 w-full sm:w-[456px] max-w-[calc(100vw-16px)] overflow-hidden rounded-[10px] border border-[#DDE3E0] bg-white shadow-[0_8px_24px_rgba(10,46,43,0.12)]">
          <div className="flex h-[39px] items-center justify-between bg-[#F7F9F8] px-4 py-3">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A2422" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <p className="text-[12px] font-semibold leading-[15px] text-[#1A2422]">การแจ้งเตือน</p>
              <span className="rounded-[10px] bg-[#F58634] px-[6px] py-[2px] text-[9px] font-bold leading-[11px] text-white">
                {unreadCount} ใหม่
              </span>
            </div>

            <button
              type="button"
              onClick={handleMarkAll}
              className="text-[11px] font-medium leading-[13px] text-[#14554F] hover:underline"
            >
              อ่านทั้งหมด
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex h-[67px] items-center justify-center bg-white px-4 text-[11px] text-[#8B9591]">
              ยังไม่มีการแจ้งเตือน
            </div>
          ) : (
            <div className="max-h-[340px] overflow-y-auto">
              {items.slice(0, 5).map((item) => {
                const visual = notificationVisual(item.type);
                const rowBgClass = item.isRead ? 'bg-white' : 'bg-[#E6F4F3]';

                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => handleClickItem(item.id)}
                    className={`flex w-full h-[67px] items-start gap-[10px] px-4 py-3 text-left transition-colors ${rowBgClass}`}
                  >
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[14px] font-bold"
                      style={{
                        backgroundColor: visual.iconBg,
                        color: visual.iconColor,
                      }}
                    >
                      {visual.icon}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="text-[12px] font-semibold leading-[15px] text-[#1A2422]">{item.title}</span>
                      <span className="truncate text-[11px] font-normal leading-[13px] text-[#6B7773]">{item.body}</span>
                      <span className="text-[9px] font-medium leading-[11px] text-[#8B9591]">{formatRelativeTime(item.createdAt)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex h-[33px] items-start justify-center bg-[#F7F9F8] px-0 py-[10px]">
            <Link
              to="/caregiver/settings/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold leading-[13px] text-[#14554F] hover:underline"
            >
              ดูทั้งหมด →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
