import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';

/**
 * In-memory mock backend for the Family Group demo route (`/family-demo`).
 *
 * NOT used in production — only mounted by FamilyGroupDemo so the dashboard can be clicked
 * through without a running GraphQL server or a login. A custom terminating ApolloLink
 * answers each family operation from a mutable store, so rename / remove / transfer / invite
 * / rotate / revoke / delete all actually change what you see.
 */

const ME = 'u-me';
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

interface MockMember {
  id: string;
  userId: string;
  displayName: string | null;
  email: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
}
interface MockGroup {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  members: MockMember[];
}
interface MockLink {
  id: string;
  url: string;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  memberLimit: number;
}
interface MockActivity {
  id: string;
  action: string;
  targetType: string | null;
  metadata: Record<string, string> | null;
  createdAt: string;
  actorUserId: string;
}

/** Names for activity actors — including people who have since left the group. */
const PEOPLE: Record<string, { displayName: string; email: string }> = {
  [ME]: { displayName: 'ณัฐพล วงศ์ดี', email: 'nattapon@example.com' },
  'u-parichat': { displayName: 'ปาริชาต วงศ์ดี', email: 'parichat@example.com' },
  'u-somchai': { displayName: 'สมชาย วงศ์ดี', email: 'somchai@example.com' },
  'u-aunt': { displayName: 'สมใจ ใจดี', email: 'somjai@example.com' },
  'u-wilai': { displayName: 'วิไล วงศ์ดี', email: 'wilai@example.com' },
};

// ── Seed ─────────────────────────────────────────────────────────────────────

const store: {
  groups: MockGroup[];
  recipients: Record<string, { id: string; name: string; nickname: string | null; ownerUserId: string; selfReported?: boolean }[]>;
  links: Record<string, MockLink | undefined>;
  bookings: Record<string, unknown[]>;
  activity: Record<string, MockActivity[]>;
  seq: number;
} = {
  groups: [
    {
      id: 'g1',
      name: 'ครอบครัววงศ์ดี',
      createdBy: ME,
      createdAt: iso(-27),
      members: [
        { id: 'm1', userId: ME, displayName: 'ณัฐพล วงศ์ดี', email: 'nattapon@example.com', role: 'OWNER', joinedAt: iso(-27) },
        { id: 'm2', userId: 'u-parichat', displayName: 'ปาริชาต วงศ์ดี', email: 'parichat@example.com', role: 'MEMBER', joinedAt: iso(-25) },
        { id: 'm3', userId: 'u-somchai', displayName: 'สมชาย วงศ์ดี', email: 'somchai@example.com', role: 'MEMBER', joinedAt: iso(-2) },
      ],
    },
    {
      id: 'g2',
      name: 'บ้านคุณยายสมจิตร',
      createdBy: 'u-aunt',
      createdAt: iso(-60),
      members: [
        { id: 'm4', userId: 'u-aunt', displayName: 'สมใจ ใจดี', email: 'somjai@example.com', role: 'OWNER', joinedAt: iso(-60) },
        { id: 'm5', userId: ME, displayName: 'ณัฐพล วงศ์ดี', email: 'nattapon@example.com', role: 'MEMBER', joinedAt: iso(-40) },
      ],
    },
  ],
  recipients: {
    g1: [
      { id: 'r1', name: 'สมศรี วงศ์ดี', nickname: 'ยายศรี', ownerUserId: ME, selfReported: true },
      { id: 'r2', name: 'ประยูร วงศ์ดี', nickname: null, ownerUserId: 'u-parichat', selfReported: true },
    ],
    g2: [{ id: 'r3', name: 'สมจิตร ใจดี', nickname: 'ยาย', ownerUserId: 'u-aunt', selfReported: true }],
  },
  links: {
    g1: { id: 'l1', url: 'https://payung.app/join?token=demo9f2a4c71b8', expiresAt: iso(7), maxUses: 10, usedCount: 3, memberLimit: 10 },
  },
  bookings: {
    g1: [
      // In-progress today → the expanded card with a live shift timeline.
      {
        __typename: 'GroupBookingSummary',
        id: 'b1',
        bookingDate: iso(0).slice(0, 10),
        startTime: '09:00',
        status: 'in_progress',
        serviceType: 'elderly_care',
        durationHours: 4,
        careRecipientName: 'สมศรี วงศ์ดี',
        caregiver: { __typename: 'CaregiverBrief', id: 'cg1', fullName: 'พยาบาลมาลี', avatarUrl: null },
        bookedByName: 'ณัฐพล วงศ์ดี',
        bookedByMe: true,
        bookedByUserId: 'u-me',
        estimatedCost: 1760,
        serviceLocations: ['at_home'],
        locationAddress: '123/45 ซอยลาดพร้าว 101 ถนนลาดพร้าว แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240',
        paymentStatus: 'held',
        checkInTime: '09:04',
      },
      {
        __typename: 'GroupBookingSummary',
        id: 'b2',
        bookingDate: iso(2).slice(0, 10),
        startTime: '09:00',
        status: 'confirmed',
        serviceType: 'elderly_care',
        durationHours: 4,
        careRecipientName: 'สมศรี วงศ์ดี',
        caregiver: { __typename: 'CaregiverBrief', id: 'cg2', fullName: 'ธนพร ว.', avatarUrl: null },
        bookedByName: 'ปาริชาต วงศ์ดี',
        bookedByMe: false,
        bookedByUserId: 'u-parichat',
        estimatedCost: 1760,
        serviceLocations: ['at_home'],
        locationAddress: '123/45 ซอยลาดพร้าว 101 เขตบางกะปิ',
        paymentStatus: 'held',
        checkInTime: null,
      },
      {
        __typename: 'GroupBookingSummary',
        id: 'b3',
        bookingDate: iso(-6).slice(0, 10),
        startTime: '09:00',
        status: 'confirmed',
        serviceType: 'general_care',
        durationHours: 4,
        careRecipientName: 'ปาริชาต วงศ์ดี',
        caregiver: { __typename: 'CaregiverBrief', id: 'cg3', fullName: 'มาลี ก.', avatarUrl: null },
        bookedByName: 'ปาริชาต วงศ์ดี',
        bookedByMe: false,
        bookedByUserId: 'u-parichat',
        estimatedCost: 1760,
        serviceLocations: ['at_home'],
        locationAddress: '88/12 ซอยเพชรเกษม 48 เขตภาษีเจริญ',
        paymentStatus: 'captured',
        checkInTime: null,
      },
      {
        __typename: 'GroupBookingSummary',
        id: 'b4',
        bookingDate: iso(-4).slice(0, 10),
        startTime: '13:00',
        status: 'accepted',
        serviceType: 'bedridden_care',
        durationHours: 6,
        careRecipientName: 'ประยูร วงศ์ดี',
        caregiver: { __typename: 'CaregiverBrief', id: 'cg4', fullName: 'สมหญิง ด.', avatarUrl: null },
        bookedByName: 'ณัฐพล วงศ์ดี',
        bookedByMe: true,
        bookedByUserId: 'u-me',
        estimatedCost: 2640,
        serviceLocations: ['at_home', 'accompany_outside'],
        locationAddress: '456 หมู่บ้านสุขใจ เขตประเวศ',
        paymentStatus: 'held',
        checkInTime: null,
      },
      {
        __typename: 'GroupBookingSummary',
        id: 'b5',
        bookingDate: iso(-8).slice(0, 10),
        startTime: '10:00',
        status: 'confirmed',
        serviceType: 'physiotherapy',
        durationHours: 2,
        careRecipientName: 'สมศรี วงศ์ดี',
        caregiver: { __typename: 'CaregiverBrief', id: 'cg5', fullName: 'ธีรพงษ์ น.', avatarUrl: null },
        bookedByName: 'ปาริชาต วงศ์ดี',
        bookedByMe: false,
        bookedByUserId: 'u-parichat',
        estimatedCost: 900,
        serviceLocations: ['at_home'],
        locationAddress: '123/45 ซอยลาดพร้าว 101 เขตบางกะปิ',
        paymentStatus: 'captured',
        checkInTime: null,
      },
      // Pending → "รอยืนยันการจอง" tab (no caregiver matched yet).
      {
        __typename: 'GroupBookingSummary',
        id: 'b6',
        bookingDate: iso(4).slice(0, 10),
        startTime: '13:00',
        status: 'unmatched',
        serviceType: 'general_care',
        durationHours: 3,
        careRecipientName: 'ประยูร วงศ์ดี',
        caregiver: null,
        bookedByName: 'ปาริชาต วงศ์ดี',
        bookedByMe: false,
        bookedByUserId: 'u-parichat',
        estimatedCost: 1320,
        serviceLocations: ['accompany_outside'],
        locationAddress: '88/12 ซอยเพชรเกษม 48 เขตภาษีเจริญ',
        paymentStatus: 'pending',
        checkInTime: null,
      },
      // Completed → "ประวัติ" (history icon).
      {
        __typename: 'GroupBookingSummary',
        id: 'b7',
        bookingDate: iso(-20).slice(0, 10),
        startTime: '09:00',
        status: 'completed',
        serviceType: 'elderly_care',
        durationHours: 4,
        careRecipientName: 'สมศรี วงศ์ดี',
        caregiver: { __typename: 'CaregiverBrief', id: 'cg1', fullName: 'พยาบาลมาลี', avatarUrl: null },
        bookedByName: 'ณัฐพล วงศ์ดี',
        bookedByMe: true,
        bookedByUserId: 'u-me',
        estimatedCost: 1760,
        serviceLocations: ['at_home'],
        locationAddress: '123/45 ซอยลาดพร้าว 101 เขตบางกะปิ',
        paymentStatus: 'transferred',
        checkInTime: null,
      },
    ],
  },
  activity: {},
  seq: 100,
};

/** Seeded history, oldest last. 16 rows on g1 so the feed pages twice at PAGE_SIZE=15. */
function seedActivity(
  groupId: string,
  rows: [action: string, actorUserId: string, hours: number, metadata?: Record<string, string>][],
) {
  store.activity[groupId] = rows.map(([action, actorUserId, hours, metadata], i) => ({
    id: `${groupId}-a${i + 1}`,
    action,
    targetType: null,
    metadata: metadata ?? null,
    createdAt: hoursAgo(hours),
    actorUserId,
  }));
}

seedActivity('g1', [
  ['MEMBER_JOINED', 'u-somchai', 2],
  ['JOIN_LINK_ROTATED', ME, 5],
  ['BOOKING_CREATED_ON_BEHALF', 'u-parichat', 26, { recipientName: 'สมศรี วงศ์ดี' }],
  ['RECIPIENT_SHARED', 'u-parichat', 30, { recipientName: 'ประยูร วงศ์ดี' }],
  ['GROUP_RENAMED', ME, 50, { oldName: 'ครอบครัวของฉัน', newName: 'ครอบครัววงศ์ดี' }],
  ['MEMBER_REMOVED', ME, 74, { memberName: 'วิไล วงศ์ดี' }],
  ['JOIN_LINK_REVOKED', ME, 76],
  ['BOOKING_CANCELLED', ME, 100, { recipientName: 'สมศรี วงศ์ดี' }],
  ['MEMBER_REJOINED', 'u-wilai', 120],
  ['RECIPIENT_SHARED', ME, 140, { recipientName: 'สมศรี วงศ์ดี' }],
  ['BOOKING_CREATED_ON_BEHALF', ME, 160, { recipientName: 'สมศรี วงศ์ดี' }],
  ['MEMBER_LEFT', 'u-wilai', 300],
  ['MEMBER_JOINED', 'u-wilai', 400],
  ['MEMBER_JOINED', 'u-parichat', 600],
  // Deliberately dirty metadata: a BE that puts the raw token/URL on a join-link row must not
  // leak it into the feed. readActivityMeta() drops both — TC-BS-07 can check this row.
  ['JOIN_LINK_CREATED', ME, 640, { token: 'demo9f2a4c71b8e35d0197', url: 'https://payung.app/join?token=demo9f2a4c71b8' }],
  ['GROUP_CREATED', ME, 648, { groupName: 'ครอบครัววงศ์ดี' }],
]);

seedActivity('g2', [
  ['MEMBER_JOINED', ME, 960],
  ['RECIPIENT_SHARED', 'u-aunt', 1400, { recipientName: 'สมจิตร ใจดี' }],
  ['JOIN_LINK_CREATED', 'u-aunt', 1430],
  ['GROUP_CREATED', 'u-aunt', 1440, { groupName: 'บ้านคุณยายสมจิตร' }],
]);

/** Append a row for something the demo user just did, so the feed reacts like the real one. */
function logActivity(
  groupId: string,
  action: string,
  metadata: Record<string, string> | null = null,
  actorUserId: string = ME,
) {
  if (!store.activity[groupId]) store.activity[groupId] = [];
  store.activity[groupId].unshift({
    id: `a${++store.seq}`,
    action,
    targetType: null,
    metadata,
    createdAt: new Date().toISOString(),
    actorUserId,
  });
}

// ── Shapers (add __typename so the InMemoryCache is happy) ──────────────────────

const findGroup = (id: string) => store.groups.find((g) => g.id === id);

function groupOut(g: MockGroup) {
  const mine = g.members.find((m) => m.userId === ME);
  return {
    __typename: 'FamilyGroup',
    id: g.id,
    name: g.name,
    createdBy: g.createdBy,
    myRole: mine?.role ?? 'MEMBER',
    memberCount: g.members.length,
    createdAt: g.createdAt,
    updatedAt: g.createdAt,
    members: g.members.map((m) => ({
      __typename: 'FamilyGroupMemberItem',
      id: m.id,
      userId: m.userId,
      displayName: m.displayName,
      email: m.email,
      avatarUrl: null,
      role: m.role,
      joinedAt: m.joinedAt,
      isMe: m.userId === ME,
    })),
  };
}

function linkOut(groupId: string, l: MockLink) {
  const g = findGroup(groupId);
  const remaining = l.maxUses == null ? null : Math.max(0, l.maxUses - l.usedCount);
  return {
    __typename: 'FamilyGroupJoinLink',
    id: l.id,
    groupId,
    url: l.url,
    expiresAt: l.expiresAt,
    maxUses: l.maxUses,
    remainingUses: remaining,
    memberCount: g?.members.length ?? 0,
    memberLimit: l.memberLimit,
    isUsable: (remaining == null || remaining > 0) && new Date(l.expiresAt).getTime() > Date.now(),
    createdAt: iso(0),
  };
}

/** `metadata` goes out as a JSON *string* — the schema has no JSON scalar (see PYG-421 note). */
function activityOut(a: MockActivity) {
  const person = PEOPLE[a.actorUserId];
  return {
    __typename: 'FamilyGroupActivityItem',
    id: a.id,
    action: a.action,
    targetType: a.targetType,
    metadata: a.metadata ? JSON.stringify(a.metadata) : null,
    createdAt: a.createdAt,
    actor: {
      __typename: 'FamilyGroupActivityActor',
      userId: a.actorUserId,
      displayName: person?.displayName ?? null,
      email: person?.email ?? null,
      avatarUrl: null,
    },
  };
}

/** Opaque keyset cursor — the real one encodes (created_at, id) the same way. */
const cursorOf = (a: MockActivity) => `${a.createdAt}|${a.id}`;

const gqlError = (message: string, code: string) => ({ message, extensions: { code } });

// ── The operation handlers ───────────────────────────────────────────────────

type Vars = Record<string, unknown>;

function resolve(opName: string, vars: Vars): { data?: unknown; errors?: unknown[] } {
  switch (opName) {
    case 'MyFamilyGroups':
      return { data: { myFamilyGroups: store.groups.map(groupOut) } };

    case 'GroupCareRecipients':
      return {
        data: {
          groupCareRecipients: (store.recipients[vars.groupId as string] ?? []).map((r) => ({
            __typename: 'GroupCareRecipient',
            ...r,
          })),
        },
      };

    case 'GroupBookings':
      return { data: { groupBookings: store.bookings[vars.groupId as string] ?? [] } };

    case 'AddGroupCareRecipient': {
      const input = vars.input as { groupId: string; name: string; nickname?: string };
      const rec = {
        id: `r${++store.seq}`,
        name: input.name,
        nickname: input.nickname ?? null,
        ownerUserId: ME,
        selfReported: true,
      };
      (store.recipients[input.groupId] ??= []).push(rec);
      return { data: { addGroupCareRecipient: { __typename: 'GroupCareRecipient', ...rec } } };
    }

    case 'UpdateGroupCareRecipient': {
      const input = vars.input as {
        groupId: string;
        recipientId: string;
        name?: string;
        nickname?: string;
      };
      const rec = (store.recipients[input.groupId] ?? []).find((r) => r.id === input.recipientId);
      if (rec) {
        if (input.name !== undefined) rec.name = input.name;
        if (input.nickname !== undefined) rec.nickname = input.nickname || null;
      }
      return {
        data: { updateGroupCareRecipient: { __typename: 'GroupCareRecipient', ...rec } },
      };
    }

    case 'RemoveGroupCareRecipient': {
      const input = vars.input as { groupId: string; recipientId: string };
      store.recipients[input.groupId] = (store.recipients[input.groupId] ?? []).filter(
        (r) => r.id !== input.recipientId,
      );
      return {
        data: {
          removeGroupCareRecipient: {
            __typename: 'RemoveGroupCareRecipientResult',
            recipientId: input.recipientId,
            removed: true,
          },
        },
      };
    }

    case 'GroupJoinLink': {
      const l = store.links[vars.groupId as string];
      if (!l) return { errors: [gqlError('กลุ่มนี้ยังไม่มีลิงก์เข้าร่วม', 'JOIN_LINK_NOT_FOUND')] };
      return { data: { groupJoinLink: linkOut(vars.groupId as string, l) } };
    }

    // Keyset pagination: newest first, `after` is the previous page's last cursor. Rows added
    // while paging shift nothing, which is the whole point of keyset over OFFSET.
    case 'FamilyGroupActivity': {
      const groupId = vars.groupId as string;
      if (!findGroup(groupId)) {
        return { errors: [gqlError('คุณไม่ได้เป็นสมาชิกของกลุ่มนี้', 'NOT_A_MEMBER')] };
      }
      const first = Math.min(Math.max(Number(vars.first ?? 15) || 15, 1), 50);
      const after = (vars.after as string | undefined) ?? null;
      const all = [...(store.activity[groupId] ?? [])].sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      );

      let start = 0;
      if (after) {
        const at = all.findIndex((a) => cursorOf(a) === after);
        if (at === -1) {
          // Cursor points at a row that no longer exists — end the feed rather than restart it.
          return {
            data: {
              familyGroupActivity: {
                __typename: 'FamilyGroupActivityConnection',
                nodes: [],
                hasNextPage: false,
                endCursor: null,
              },
            },
          };
        }
        start = at + 1;
      }

      const page = all.slice(start, start + first);
      const last = page[page.length - 1];
      return {
        data: {
          familyGroupActivity: {
            __typename: 'FamilyGroupActivityConnection',
            nodes: page.map(activityOut),
            hasNextPage: start + page.length < all.length,
            endCursor: last ? cursorOf(last) : null,
          },
        },
      };
    }

    case 'CreateFamilyGroup': {
      const input = vars.input as { name: string };
      const id = `g${++store.seq}`;
      store.groups.unshift({
        id,
        name: input.name,
        createdBy: ME,
        createdAt: iso(0),
        members: [
          { id: `m${++store.seq}`, userId: ME, displayName: 'ณัฐพล วงศ์ดี', email: 'nattapon@example.com', role: 'OWNER', joinedAt: iso(0) },
        ],
      });
      store.recipients[id] = [];
      logActivity(id, 'GROUP_CREATED', { groupName: input.name });
      return { data: { createFamilyGroup: groupOut(findGroup(id)!) } };
    }

    case 'RenameFamilyGroup': {
      const input = vars.input as { groupId: string; name: string };
      const g = findGroup(input.groupId);
      const oldName = g?.name ?? '';
      if (g) g.name = input.name;
      logActivity(input.groupId, 'GROUP_RENAMED', { oldName, newName: input.name });
      return { data: { renameFamilyGroup: groupOut(g!) } };
    }

    case 'DeleteFamilyGroup': {
      const id = vars.groupId as string;
      store.groups = store.groups.filter((g) => g.id !== id);
      delete store.links[id];
      delete store.recipients[id];
      delete store.activity[id];
      return { data: { deleteFamilyGroup: { __typename: 'DeleteFamilyGroupResult', id, deleted: true } } };
    }

    case 'LeaveFamilyGroup': {
      const id = vars.groupId as string;
      const g = findGroup(id);
      const name = g?.name ?? '';
      store.groups = store.groups.filter((x) => x.id !== id);
      return { data: { leaveFamilyGroup: { __typename: 'LeaveFamilyGroupResult', groupId: id, groupName: name, left: true } } };
    }

    case 'RemoveMember': {
      const input = vars.input as { groupId: string; userId: string };
      const g = findGroup(input.groupId);
      const removed = g?.members.find((m) => m.userId === input.userId);
      if (g) g.members = g.members.filter((m) => m.userId !== input.userId);
      logActivity(input.groupId, 'MEMBER_REMOVED', {
        memberName: removed?.displayName || removed?.email || '',
      });
      return { data: { removeMember: groupOut(g!) } };
    }

    case 'TransferOwnership': {
      const input = vars.input as { groupId: string; newOwnerUserId: string };
      const g = findGroup(input.groupId);
      let newOwnerName = '';
      if (g) {
        g.members.forEach((m) => {
          if (m.userId === input.newOwnerUserId) {
            m.role = 'OWNER';
            newOwnerName = m.displayName || m.email;
          } else if (m.role === 'OWNER') m.role = 'MEMBER';
        });
      }
      logActivity(input.groupId, 'OWNERSHIP_TRANSFERRED', { newOwnerName });
      return { data: { transferOwnership: groupOut(g!) } };
    }

    case 'CreateJoinLink':
    case 'RotateJoinLink': {
      const input = vars.input as { groupId: string };
      store.links[input.groupId] = {
        id: `l${++store.seq}`,
        url: `https://payung.app/join?token=demo${Math.random().toString(36).slice(2, 12)}`,
        expiresAt: iso(7),
        maxUses: 10,
        usedCount: 0,
        memberLimit: 10,
      };
      const rotated = opName === 'RotateJoinLink';
      logActivity(input.groupId, rotated ? 'JOIN_LINK_ROTATED' : 'JOIN_LINK_CREATED');
      const key = rotated ? 'rotateJoinLink' : 'createJoinLink';
      return { data: { [key]: linkOut(input.groupId, store.links[input.groupId]!) } };
    }

    case 'RevokeJoinLink': {
      const groupId = vars.groupId as string;
      delete store.links[groupId];
      logActivity(groupId, 'JOIN_LINK_REVOKED');
      return { data: { revokeJoinLink: true } };
    }

    case 'JoinLinkPreview':
      return {
        data: {
          joinLinkPreview: {
            __typename: 'JoinLinkPreview',
            groupName: 'ครอบครัววงศ์ดี',
            ownerName: 'ณัฐพล วงศ์ดี',
            memberCount: 3,
            isUsable: true,
            unusableReason: null,
            alreadyMember: false,
          },
        },
      };

    case 'JoinGroupByLink':
      return { data: { joinGroupByLink: { __typename: 'FamilyGroup', id: 'g1', name: 'ครอบครัววงศ์ดี', myRole: 'MEMBER', memberCount: 4 } } };

    default:
      return { errors: [gqlError(`ยังไม่ได้ mock operation: ${opName}`, 'MOCK_UNHANDLED')] };
  }
}

// ── The client ─────────────────────────────────────────────────────────────────

const mockLink = new ApolloLink(
  (operation) =>
    new Observable((observer) => {
      const isMutation = operation.query.definitions.some(
        (d) => d.kind === 'OperationDefinition' && d.operation === 'mutation',
      );
      const t = setTimeout(() => {
        const result = resolve(operation.operationName ?? '', operation.variables ?? {});
        observer.next(result as Parameters<typeof observer.next>[0]);
        observer.complete();
      }, isMutation ? 350 : 200); // small latency so loading/busy states are visible
      return () => clearTimeout(t);
    }),
);

export function createMockFamilyClient() {
  return new ApolloClient({ link: mockLink, cache: new InMemoryCache() });
}

