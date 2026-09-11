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
export const GROUP_CARE_RECIPIENTS = gql`
  query GroupCareRecipients($groupId: ID!) {
    groupCareRecipients(groupId: $groupId) {
      id
      name
      nickname
      ownerUserId
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
 * Group activity feed — newest first, keyset paginated on createdAt DESC (PYG-422).
 *
 * ⚠ Backend contract is PYG-421 and NOT deployed yet — the running schema has no
 *   `familyGroupActivity` field, so this query fails validation until it ships and the
 *   ActivityPanel renders its "unavailable" state instead of breaking the dashboard.
 *
 *   The shape below is the one PYG-421 describes (actor · action · targetType · metadata ·
 *   createdAt) expressed in this schema's house style: a flat `nodes` list plus paging info,
 *   like PaymentConnection / DisputeSummaryConnection, rather than Relay `edges`/`node`.
 *   `id` is requested on top of the card's field list because a connection node without one
 *   cannot be normalised by InMemoryCache. If BE lands a different shape, this file and
 *   `activityCopy.ts` are the only two places that need to change.
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
          email
          avatarUrl
        }
      }
      hasNextPage
      endCursor
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
 * Actions the activity feed knows how to phrase. Kept as a union of literals plus an escape
 * hatch: the server owns this list and may add to it, so an unknown code must still render
 * (as a generic line) rather than crash the feed.
 *
 * `MEMBER_INVITED` is deliberately absent — SCR-FG2-001 replaced per-email invites with a
 * group join link, so that action no longer exists (see PYG-408 / PYG-422 comments).
 */
export type FamilyGroupActivityAction =
  | 'GROUP_CREATED'
  | 'GROUP_RENAMED'
  | 'MEMBER_JOINED'
  | 'MEMBER_REJOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'
  | 'OWNERSHIP_TRANSFERRED'
  | 'JOIN_LINK_CREATED'
  | 'JOIN_LINK_ROTATED'
  | 'JOIN_LINK_REVOKED'
  | 'RECIPIENT_SHARED'
  | 'RECIPIENT_UNSHARED'
  | 'BOOKING_CREATED_ON_BEHALF'
  | 'BOOKING_CANCELLED'
  | (string & {});

/** Who did it. Nullable throughout: a removed user's row still has to render. */
export interface FamilyGroupActivityActor {
  userId?: string | null;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface FamilyGroupActivity {
  id: string;
  action: FamilyGroupActivityAction;
  targetType?: string | null;
  /**
   * Per-action detail. The schema has no JSON scalar today, so this arrives as a JSON
   * *string*; typed loosely because BE may later add one. Never render it raw — read it
   * through `readActivityMeta()`, which allow-lists fields and drops tokens/URLs.
   */
  metadata?: string | Record<string, unknown> | null;
  createdAt: string;
  actor?: FamilyGroupActivityActor | null;
}

export interface FamilyGroupActivityConnection {
  nodes: FamilyGroupActivity[];
  hasNextPage: boolean;
  endCursor?: string | null;
}
