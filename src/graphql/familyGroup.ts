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
