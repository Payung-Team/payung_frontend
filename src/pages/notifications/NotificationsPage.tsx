import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_COUNT,
  GET_USER,
  MARK_ALL_NOTIFICATIONS_AS_READ,
  MARK_NOTIFICATION_AS_READ,
  UPDATE_EMAIL_PREFERENCE,
} from '../../graphql/queries';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

type NotificationType = 'kyc_submitted' | 'kyc_verified' | 'kyc_rejected' | 'kyc_resubmitted';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsQueryResult {
  notifications: NotificationItem[];
}

interface UserQueryResult {
  me: {
    id: string;
    emailPreferences?: boolean;
  };
}

interface UnreadQueryResult {
  unreadCount: number;
}

const PAGE_SIZE = 20;

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

function notificationIconByType(type: NotificationType): { icon: string; bg: string; color: string } {
  switch (type) {
    case 'kyc_verified':
      return { icon: '✓', bg: '#F0FDF4', color: '#16A34A' };
    case 'kyc_rejected':
      return { icon: '✗', bg: '#FEF2F2', color: '#DC2626' };
    case 'kyc_resubmitted':
      return { icon: '↻', bg: '#EFF6FF', color: '#2563EB' };
    case 'kyc_submitted':
    default:
      return { icon: '⏳', bg: '#FFFBEB', color: '#F59E0B' };
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadingPage, setLoadingPage] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { data: userData } = useQuery<UserQueryResult>(GET_USER);
  const { data: unreadData, refetch: refetchUnread } = useQuery<UnreadQueryResult>(GET_UNREAD_COUNT, {
    pollInterval: 30000,
  });

  const [markAsRead] = useMutation(MARK_NOTIFICATION_AS_READ);
  const [markAllAsRead] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ);
  const [updateEmailPreference, { loading: updatingEmailPreference }] = useMutation(UPDATE_EMAIL_PREFERENCE);

  const unreadCount = unreadData?.unreadCount ?? items.filter((item) => !item.isRead).length;
  const emailEnabled = Boolean(userData?.me?.emailPreferences ?? true);

  const loadPage = useCallback(
    async (offset: number) => {
      if (loadingPage) {
        return;
      }

      setLoadingPage(true);
      try {
        const result = await client.query<NotificationsQueryResult>({
          query: GET_NOTIFICATIONS,
          variables: { limit: PAGE_SIZE, offset, unreadOnly: false },
          fetchPolicy: 'network-only',
        });

        const next = result.data.notifications ?? [];

        setItems((prev) => {
          if (offset === 0) {
            return next;
          }

          const map = new Map(prev.map((entry) => [entry.id, entry]));
          next.forEach((entry) => map.set(entry.id, entry));
          return Array.from(map.values());
        });

        setHasMore(next.length === PAGE_SIZE);
      } finally {
        setLoadingPage(false);
      }
    },
    [client, loadingPage],
  );

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  useEffect(() => {
    if (!userData?.me?.id) {
      return;
    }

    const channel = supabase
      .channel(`notifications-page-${userData.me.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userData.me.id}`,
        },
        () => {
          loadPage(0);
          refetchUnread();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPage, refetchUnread, userData?.me?.id]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && !loadingPage) {
          loadPage(items.length);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, items.length, loadPage, loadingPage]);

  const handleMarkAll = async () => {
    await markAllAsRead();
    await loadPage(0);
    await refetchUnread();
  };

  const handleClickNotification = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markAsRead({ variables: { id: item.id } });
    }

    await refetchUnread();
    setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, isRead: true } : entry)));
    navigate('/kyc/status');
  };

  const handleToggleEmailPreference = async () => {
    const nextValue = !emailEnabled;
    await updateEmailPreference({ variables: { enabled: nextValue } });
    await client.refetchQueries({ include: [GET_USER] });
  };

  const empty = useMemo(() => items.length === 0 && !loadingPage, [items.length, loadingPage]);

  return (
    <div className="mx-auto max-w-[980px] px-6 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A2422]">การแจ้งเตือนทั้งหมด</h1>
          <p className="text-[13px] text-[#6B7773]">อัปเดตล่าสุดแบบเรียลไทม์</p>
        </div>

        <button
          type="button"
          onClick={handleMarkAll}
          className="rounded-lg bg-[#228B55] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7d4d]"
        >
          อ่านทั้งหมด ({unreadCount})
        </button>
      </div>

      <div className="mb-5 rounded-xl border border-[#E5E7E9] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-[#293138]">รับอีเมลแจ้งเตือน</p>
            <p className="text-[12px] text-[#89949B]">ส่งอีเมลเมื่อสถานะ KYC เปลี่ยน</p>
          </div>

          <button
            type="button"
            disabled={updatingEmailPreference}
            onClick={handleToggleEmailPreference}
            className={`relative h-[22px] w-10 rounded-full transition-colors ${
              emailEnabled ? 'bg-[#228B55]' : 'bg-[#D2D7DA]'
            }`}
            aria-label="สลับการรับอีเมลแจ้งเตือน"
          >
            <span
              className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-all ${
                emailEnabled ? 'left-[21px]' : 'left-[3px]'
              }`}
            />
          </button>
        </div>
      </div>

      {empty && (
        <div className="rounded-xl border border-dashed border-[#DDE3E0] bg-white px-6 py-14 text-center">
          <p className="text-[14px] font-semibold text-[#1A2422]">ยังไม่มีการแจ้งเตือน</p>
          <p className="mt-1 text-[12px] text-[#8B9591]">เมื่อมีการอัปเดตสถานะ KYC ข้อมูลจะแสดงที่นี่</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const iconStyle = notificationIconByType(item.type);
          const cardStateClass = item.isRead
            ? 'border-[#DDE3E0] bg-white'
            : 'border-[#F58634] border-l-[3px] bg-[#E6F4F3]';

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => handleClickNotification(item)}
              className={`w-full rounded-[12px] border p-4 text-left transition-colors ${cardStateClass}`}
            >
              <div className="flex items-start gap-[14px]">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[18px] font-bold"
                  style={{ backgroundColor: iconStyle.bg, color: iconStyle.color }}
                >
                  {iconStyle.icon}
                </span>

                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block text-[13px] font-semibold text-[#1A2422]">{item.title}</span>
                  <span className="block truncate text-[12px] text-[#6B7773]">{item.body}</span>
                  <span className="inline-flex items-center gap-2 text-[10px] text-[#8B9591]">
                    {relativeTimeTH(item.createdAt)}
                    {!item.isRead && <span className="h-2 w-2 rounded-full bg-[#F58634]" />}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div ref={loadMoreRef} className="h-10 w-full" />
      {loadingPage && <p className="text-center text-[12px] text-[#8B9591]">กำลังโหลด...</p>}
      {!hasMore && items.length > 0 && (
        <p className="text-center text-[12px] text-[#8B9591]">แสดงครบทั้งหมดแล้ว</p>
      )}
    </div>
  );
}
