import { gql } from '@apollo/client';

/**
 * GraphQL operations for the Family Group feature (PYG-413 / PYG-419 / Epic PYG-381).
 *
 * Kept in a dedicated file (not the shared queries.ts) because the feature owns a
 * self-contained slice of the schema and the shared file is already large.
 *
 * ★ The permission model is enforced by the SERVER (family-group.resolver.ts guards).
 *   The FE hides/disables owner-only actions for a better UX only — every one of these
 *   operations is re-checked server-side, so a member calling an owner mutation still fails.
 */

// Shared member shape — mirrors FamilyGroupMemberItem.
const MEMBER_FIELDS = `
  id
  userId
  displayName
  email
  avatarUrl
  role
  joinedAt
  isMe
`;

// Shared group shape — mirrors FamilyGroup.
const GROUP_FIELDS = `
  id
  name
  createdBy
  myRole
  memberCount
  createdAt
  updatedAt
  members {
    ${MEMBER_FIELDS}
  }
`;

// ── Queries ────────────────────────────────────────────────────────────────

/** Every group I'm an ACTIVE member of, newest first. Empty array (not an error) when none. */
export const MY_FAMILY_GROUPS = gql`
  query MyFamilyGroups {
    myFamilyGroups {
      ${GROUP_FIELDS}
    }
  }
`;

/** Care recipients shared into a group — used on the dashboard. */

/**
 * PYG-517 — สมาชิก ACTIVE ทุกคนในกลุ่มพร้อมข้อมูลสำหรับ autofill ตอนจองแทน
 *
 * ต่างจาก GROUP_CARE_RECIPIENTS ตรงที่คืน "คน" ไม่ใช่ "โปรไฟล์" — สมาชิกทุกคนได้
 * หนึ่งรายการเสมอ แม้ยังไม่มีโปรไฟล์ในกลุ่ม (hasProfile=false, details=null)
 *
 * ★ BE ตั้งใจไม่คืนข้อมูลจากโปรไฟล์ส่วนตัวของสมาชิก (ยังไม่ได้แชร์เข้ากลุ่ม — PDPA)
 *   ดังนั้น details=null ไม่ได้แปลว่า "คนนี้ไม่มีข้อมูล" แต่แปลว่า "ยังไม่มีในกลุ่มนี้"
 */
export const GROUP_BOOKING_RECIPIENTS = gql`
  query GroupBookingRecipients($groupId: ID!) {
    groupBookingRecipients(groupId: $groupId) {
      memberUserId
      name
      nameLocked
      nickname
      hasProfile
      details {
        age
        gender
        weight
        height
        supportLevel
        bloodGroup
        conditions
        medicines
        allergies
        careInstructions
        regularHospital
        addressLine
        province
        district
      }
    }
  }
`;

export interface GroupBookingRecipient {
  memberUserId: string;
  name: string;
  nameLocked: boolean;
  nickname?: string | null;
  hasProfile: boolean;
  details?: {
    age?: number | null;
    gender?: string | null;
    weight?: number | null;
    height?: number | null;
    supportLevel?: string | null;
    bloodGroup?: string | null;
    conditions?: string[] | null;
    medicines?: string | null;
    allergies?: string | null;
    careInstructions?: string | null;
    regularHospital?: string | null;
    addressLine?: string | null;
    province?: string | null;
    district?: string | null;
  } | null;
}

export const GROUP_CARE_RECIPIENTS = gql`
  query GroupCareRecipients($groupId: ID!) {
    groupCareRecipients(groupId: $groupId) {
      id
      name
      nickname
      ownerUserId
      details {
        age
        gender
        weight
        height
        supportLevel
        bloodGroup
        conditions
        medicines
        allergies
        careInstructions
        regularHospital
      }
    }
  }
`;

/**
 * PYG-385: shared feed of on-behalf bookings for a group — every ACTIVE member sees the same
 * list, newest first. Empty array (not an error) when the group has no bookings yet.
 */
export const GROUP_BOOKINGS = gql`
  query GroupBookings($groupId: ID!) {
    groupBookings(groupId: $groupId) {
      id
      bookingDate
      startTime
      status
      serviceType
      durationHours
      careRecipientName
      caregiver {
        id
        fullName
        avatarUrl
      }
      bookedByName
      bookedByUserId
      bookedByMe
      estimatedCost
      serviceLocations
      locationAddress
      paymentStatus
      checkInTime
    }
  }
`;

/** รายละเอียดคำจองสำหรับสมาชิกกลุ่ม ใช้หน้าเดียวกับรายละเอียดคำจองส่วนตัว. */
export const GROUP_BOOKING_DETAIL = gql`
  query GroupBookingDetail($groupId: ID!, $bookingId: ID!) {
    groupBooking(groupId: $groupId, bookingId: $bookingId) {
      id
      bookedByMe
      status
      disputeStatus
      disputeReason
      serviceType
      timeSlot
      startTime
      durationHours
      tasks
      serviceLocations
      bookingDate
      locationAddress
      locationLat
      locationLng
      notes
      estimatedCost
      careRecipientName
      patientName
      dayOfContactName
      dayOfContactPhone
      dayOfContactRelationship
      patientProfile {
        age
        gender
        weight
        height
        supportLevel
        bloodGroup
        conditions
        medicines
        allergies
        careInstructions
        regularHospital
      }
      confirmedAt
      createdAt
      caregiver {
        id
        fullName
        avatarUrl
        hourlyRate
        averageRating
        reviewCount
        completedJobs
        experienceYears
        phone
      }
      payment {
        id
        amount
        currency
        paymentMethod
        paymentStatus
        failureMessage
        qrCodeUrl
        updatedAt
      }
    }
  }
`;

/** The current usable join link (OWNER only). Throws JOIN_LINK_NOT_FOUND when the group has none. */
export const GROUP_JOIN_LINK = gql`
  query GroupJoinLink($groupId: ID!) {
    groupJoinLink(groupId: $groupId) {
      id
      groupId
      url
      expiresAt
      maxUses
      remainingUses
      memberCount
      memberLimit
      isUsable
      createdAt
    }
  }
`;

/**
 * What a link-holder sees before confirming. Requires an authenticated caller, so a
 * logged-out invitee cannot read it (by design — the group name is not leaked pre-auth).
 * Unusable links return isUsable=false + unusableReason instead of throwing;
 * only a token that matches no link throws JOIN_LINK_INVALID.
 */
export const JOIN_LINK_PREVIEW = gql`
  query JoinLinkPreview($token: String!) {
    joinLinkPreview(token: $token) {
      groupName
      ownerName
      memberCount
      isUsable
      unusableReason
      alreadyMember
    }
  }
`;

/**
 * Group activity feed — newest first, keyset paginated (PYG-422 · BE PYG-421).
 *
 * Mirrors `familyGroupActivity` in the API's schema.gql (FamilyGroupActivityConnection /
 * FamilyGroupActivityItem / FamilyGroupActivityPageInfo). Paging info sits under `pageInfo`, not
 * beside `nodes`, and the actor carries no email. There is deliberately no totalCount: the API
 * avoids COUNT(*) on an append-only table, and infinite scroll never shows a total anyway.
 *
 * `first` defaults to 20 server-side and is clamped to 50. `after` is the previous page's
 * `pageInfo.endCursor` — opaque, never parse it; one the API cannot decode comes back as
 * ACTIVITY_CURSOR_INVALID.
 */
export const FAMILY_GROUP_ACTIVITY = gql`
  query FamilyGroupActivity($groupId: ID!, $first: Int, $after: String) {
    familyGroupActivity(groupId: $groupId, first: $first, after: $after) {
      nodes {
        id
        action
        targetType
        metadata
        createdAt
        actor {
          userId
          displayName
          avatarUrl
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// ── Mutations ────────────────────────────────────────────────────────────────

export const CREATE_FAMILY_GROUP = gql`
  mutation CreateFamilyGroup($input: CreateFamilyGroupInput!) {
    createFamilyGroup(input: $input) {
      ${GROUP_FIELDS}
    }
  }
`;

export const RENAME_FAMILY_GROUP = gql`
  mutation RenameFamilyGroup($input: RenameFamilyGroupInput!) {
    renameFamilyGroup(input: $input) {
      ${GROUP_FIELDS}
    }
  }
`;

export const DELETE_FAMILY_GROUP = gql`
  mutation DeleteFamilyGroup($groupId: ID!) {
    deleteFamilyGroup(groupId: $groupId) {
      id
      deleted
    }
  }
`;

export const LEAVE_FAMILY_GROUP = gql`
  mutation LeaveFamilyGroup($groupId: ID!) {
    leaveFamilyGroup(groupId: $groupId) {
      groupId
      groupName
      left
    }
  }
`;

export const REMOVE_MEMBER = gql`
  mutation RemoveMember($input: RemoveMemberInput!) {
    removeMember(input: $input) {
      ${GROUP_FIELDS}
    }
  }
`;

export const TRANSFER_OWNERSHIP = gql`
  mutation TransferOwnership($input: TransferOwnershipInput!) {
    transferOwnership(input: $input) {
      ${GROUP_FIELDS}
    }
  }
`;

export const CREATE_JOIN_LINK = gql`
  mutation CreateJoinLink($input: CreateJoinLinkInput!) {
    createJoinLink(input: $input) {
      id
      groupId
      url
      expiresAt
      maxUses
      remainingUses
      memberCount
      memberLimit
      isUsable
      createdAt
    }
  }
`;

export const ROTATE_JOIN_LINK = gql`
  mutation RotateJoinLink($input: CreateJoinLinkInput!) {
    rotateJoinLink(input: $input) {
      id
      groupId
      url
      expiresAt
      maxUses
      remainingUses
      memberCount
      memberLimit
      isUsable
      createdAt
    }
  }
`;

export const REVOKE_JOIN_LINK = gql`
  mutation RevokeJoinLink($groupId: ID!) {
    revokeJoinLink(groupId: $groupId)
  }
`;

/**
 * Consume a join link and become a member.
 *
 * ⚠ Backend contract is PYG-417 and NOT deployed yet — this mutation will error with a
 *   schema-validation error until it ships. The JoinGroupPage handles that failure
 *   gracefully. Shape assumed here (returns the joined FamilyGroup) matches every other
 *   family mutation; when PYG-417 lands this needs no FE change if it keeps that shape.
 */
export const JOIN_GROUP_BY_LINK = gql`
  mutation JoinGroupByLink($token: String!) {
    joinGroupByLink(token: $token) {
      id
      name
      myRole
      memberCount
    }
  }
`;

// ── PYG-385: manage care recipients in a group (add / edit / remove) ──────────

export const ADD_GROUP_CARE_RECIPIENT = gql`
  mutation AddGroupCareRecipient($input: AddGroupCareRecipientInput!) {
    addGroupCareRecipient(input: $input) {
      id
      name
      nickname
      ownerUserId
    }
  }
`;

export const UPDATE_GROUP_CARE_RECIPIENT = gql`
  mutation UpdateGroupCareRecipient($input: UpdateGroupCareRecipientInput!) {
    updateGroupCareRecipient(input: $input) {
      id
      name
      nickname
      ownerUserId
    }
  }
`;

export const REMOVE_GROUP_CARE_RECIPIENT = gql`
  mutation RemoveGroupCareRecipient($input: RemoveGroupCareRecipientInput!) {
    removeGroupCareRecipient(input: $input) {
      recipientId
      removed
    }
  }
`;

/**
 * PYG-385 — จองผู้ดูแลแทนผู้รับบริการที่แชร์อยู่ในกลุ่ม.
 * Returns the created booking (BookingSummary). The booker is the paying user; the existing
 * payment flow runs afterwards unchanged. RECIPIENT_NOT_IN_GROUP if the recipient isn't shared
 * into this group.
 */
export const CREATE_BOOKING_ON_BEHALF = gql`
  mutation CreateBookingOnBehalf($input: CreateBookingOnBehalfInput!) {
    createBookingOnBehalf(input: $input) {
      id
      status
      bookingDate
      careRecipientName
    }
  }
`;

// ── Types ────────────────────────────────────────────────────────────────────

export type GroupRole = 'OWNER' | 'MEMBER';

export interface FamilyGroupMember {
  id: string;
  userId: string;
  displayName?: string | null;
  email: string;
  avatarUrl?: string | null;
  role: GroupRole;
  joinedAt: string;
  isMe: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  createdBy?: string | null;
  myRole: GroupRole;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  members: FamilyGroupMember[];
}

export interface GroupCareRecipient {
  id: string;
  name: string;
  nickname?: string | null;
  ownerUserId: string;
  details?: {
    age?: number;
    gender?: 'ชาย' | 'หญิง';
    weight?: number;
    height?: number;
    supportLevel?: string;
    bloodGroup?: string;
    conditions?: string[];
    medicines?: string;
    allergies?: string;
    careInstructions?: string;
    regularHospital?: string;
  } | null;
}

export interface GroupBookingSummary {
  id: string;
  bookingDate: string;
  startTime?: string | null;
  status: string;
  serviceType: string;
  durationHours?: number | null;
  careRecipientName?: string | null;
  caregiver?: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
  bookedByName?: string | null;
  bookedByUserId?: string | null;
  bookedByMe: boolean;
  estimatedCost?: number | null;
  serviceLocations?: string[] | null;
  locationAddress?: string | null;
  paymentStatus?: string | null;
  checkInTime?: string | null;
}

export interface FamilyGroupJoinLink {
  id: string;
  groupId: string;
  url: string;
  expiresAt: string;
  maxUses?: number | null;
  remainingUses?: number | null;
  memberCount: number;
  memberLimit: number;
  isUsable: boolean;
  createdAt: string;
}

export type JoinLinkUnusableReason =
  | 'EXPIRED'
  | 'REVOKED'
  | 'EXHAUSTED'
  | 'GROUP_FULL';

export interface JoinLinkPreview {
  groupName: string;
  ownerName?: string | null;
  memberCount: number;
  isUsable: boolean;
  unusableReason?: JoinLinkUnusableReason | null;
  alreadyMember: boolean;
}

/**
 * Every action the API can write to the feed — mirror of ACTIVITY_ACTION in the backend's
 * family-group.constants.ts. The escape hatch stays: the server owns this list, so a code the FE
 * has never seen must still render (as a generic line) rather than crash the feed.
 *
 * MEMBER_INVITED / INVITE_REVOKED are deprecated by SCR-FG2-001 (email invites became a group
 * join link) but the API still accepts them and old rows carry them, so they are listed and
 * phrased rather than dropped.
 */
export type FamilyGroupActivityAction =
  | 'GROUP_CREATED'
  | 'GROUP_RENAMED'
  | 'MEMBER_INVITED'
  | 'INVITE_REVOKED'
  | 'JOIN_LINK_CREATED'
  | 'JOIN_LINK_ROTATED'
  | 'JOIN_LINK_REVOKED'
  | 'MEMBER_JOINED'
  | 'MEMBER_REJOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'OWNERSHIP_TRANSFERRED'
  | 'RECIPIENT_ADDED'
  | 'RECIPIENT_UPDATED'
  | 'RECIPIENT_REMOVED'
  | 'BOOKING_ON_BEHALF'
  | (string & {});

/** Who did it — mirrors FamilyGroupActivityActor. `displayName` is null until the user sets one. */
export interface FamilyGroupActivityActor {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

/** One feed row — mirrors FamilyGroupActivityItem. */
export interface FamilyGroupActivity {
  id: string;
  action: FamilyGroupActivityAction;
  /** 'GROUP' | 'MEMBER' | 'JOIN_LINK' | 'RECIPIENT' | 'BOOKING' (legacy rows: 'INVITE'). */
  targetType?: string | null;
  /**
   * Per-action detail as a JSON *string* — the schema has no JSON scalar — and "{}" when there
   * is none. Never render it raw: read it through `readActivityMeta()`, which allow-lists fields
   * and drops tokens/URLs.
   */
  metadata: string;
  createdAt: string;
  /** null when the account has since been deleted — the row still renders. */
  actor?: FamilyGroupActivityActor | null;
}

export interface FamilyGroupActivityPageInfo {
  hasNextPage: boolean;
  /** Cursor of the last row on this page; null when the page is empty. */
  endCursor?: string | null;
}

export interface FamilyGroupActivityConnection {
  nodes: FamilyGroupActivity[];
  pageInfo: FamilyGroupActivityPageInfo;
}
