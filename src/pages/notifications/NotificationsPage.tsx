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
import type {
  NotificationItem,
  FilterTab,
} from '../../components/notifications/notificationMeta';
import {
  UNREAD_DOT_COLOR,
  FILTER_TABS,
  deriveSource,
  getSubtitle,
  notificationIcon,
  relativeTimeTH,
  resolveDeepLink,
} from '../../components/notifications/notificationMeta';

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

export default function NotificationsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadingPage, setLoadingPage] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

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

        const next = result.data?.notifications ?? [];

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

    navigate(resolveDeepLink(item));
  };

  const handleToggleEmailPreference = async () => {
    const nextValue = !emailEnabled;
    await updateEmailPreference({ variables: { enabled: nextValue } });
    await client.refetchQueries({ include: [GET_USER] });
  };

  const visibleItems = useMemo(
    () => (activeTab === 'all' ? items : items.filter((item) => deriveSource(item) === activeTab)),
    [items, activeTab],
  );

  const empty = useMemo(
    () => visibleItems.length === 0 && !loadingPage,
    [visibleItems.length, loadingPage],
  );

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
          className="cursor-pointer rounded-lg bg-[#228B55] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1f7d4d]"
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
            className={`cursor-pointer relative h-[22px] w-10 rounded-full transition-colors ${
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

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`cursor-pointer shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-[#14554F] text-white'
                  : 'bg-[#F0F2F1] text-[#6B7773] hover:bg-[#E4E8E6]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {empty && (
        <div className="rounded-xl border border-dashed border-[#DDE3E0] bg-white px-6 py-14 text-center">
          <p className="text-[14px] font-semibold text-[#1A2422]">ยังไม่มีการแจ้งเตือน</p>
          <p className="mt-1 text-[12px] text-[#8B9591]">
            {activeTab === 'all'
              ? 'เมื่อมีการอัปเดตข้อมูลจะแสดงที่นี่'
              : 'ยังไม่มีการแจ้งเตือนในหมวดนี้'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibleItems.map((item) => {
          const iconStyle = notificationIcon(item.type);
          const cardStateClass = item.isRead
            ? 'border-[#DDE3E0] bg-white'
            : 'border-[#2563EB] border-l-[3px] bg-[#EFF6FF]';

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => handleClickNotification(item)}
              className={`cursor-pointer w-full rounded-[12px] border p-4 text-left transition-colors ${cardStateClass}`}
            >
              <div className="flex items-start gap-[14px]">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: iconStyle.bg, color: iconStyle.color }}
                >
                  <span className="material-icons text-[22px] leading-none">{iconStyle.icon}</span>
                </span>

                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block text-[13px] font-semibold text-[#1A2422]">{item.title}</span>
                  <span className="block truncate text-[12px] text-[#6B7773]">{getSubtitle(item)}</span>
                  <span className="inline-flex items-center gap-2 text-[10px] text-[#8B9591]">
                    {relativeTimeTH(item.createdAt)}
                    {!item.isRead && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: UNREAD_DOT_COLOR }}
                      />
                    )}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div ref={loadMoreRef} className="h-10 w-full" />
      {loadingPage && <p className="text-center text-[12px] text-[#8B9591]">กำลังโหลด...</p>}
      {!hasMore && visibleItems.length > 0 && (
        <p className="text-center text-[12px] text-[#8B9591]">แสดงครบทั้งหมดแล้ว</p>
      )}
    </div>
  );
}
