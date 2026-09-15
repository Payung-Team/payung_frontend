import type {
  FamilyGroupActivity,
  FamilyGroupActivityAction,
} from '../../graphql/familyGroup';

/**
 * Turns a raw activity row into the line a person reads (PYG-422).
 *
 * The action codes and metadata keys here mirror what the API actually writes: ACTIVITY_ACTION in
 * the backend's family-group.constants.ts, and the `writeActivity` calls in family-group.service.ts
 * and booking.service.ts (PYG-421). The first cut of this file guessed them from the ticket and
 * several did not match, so the feed rendered generic lines. When BE adds or renames an action,
 * update this table from those two places, not from ticket text.
 *
 * Two rules drive the shape of this file:
 *
 * 1. **TH/EN.** The app ships Thai only today (see familyStrings.ts), but the action copy is
 *    the one surface the card calls out as bilingual, and it is also the surface most likely
 *    to be read by a non-Thai reviewer during the demo. So every action carries both, and the
 *    renderer picks by `lang` — defaulting to 'th'. When the app grows a real locale context,
 *    this table needs no change: only the argument passed to `describeActivity` does.
 *
 * 2. **No secrets in the feed.** PYG-422's comment is explicit: never print a join-link token
 *    or a full URL, only the fact that a link was created / rotated / revoked. That is
 *    enforced structurally here — `readActivityMeta` allow-lists field names and additionally
 *    drops anything that looks like a URL or an opaque token, so a BE that starts putting
 *    `token` in metadata cannot leak it through this view by accident. The same allow-list
 *    keeps the invitee email on legacy MEMBER_INVITED rows out of the feed.
 */

export type ActivityLang = 'th' | 'en';

/** Visual tone for the row's icon disc. Maps to the palette used across the family screens. */
export type ActivityTone = 'brand' | 'info' | 'warn' | 'danger' | 'neutral';

/** The only metadata keys this view will *display*. Anything else is ignored. */
const META_ALLOWLIST = [
  'name', // GROUP_CREATED
  'oldName', // GROUP_RENAMED
  'newName', // GROUP_RENAMED
  'recipientName', // BOOKING_ON_BEHALF (and assumed for RECIPIENT_* — see the table)
] as const;

export type ActivityMeta = Partial<Record<(typeof META_ALLOWLIST)[number], string>>;

/**
 * Ids the view may *look up* but must never print. Kept apart from META_ALLOWLIST because a
 * UUID is exactly what `looksSecret` is built to drop — reading ids through that path would
 * silently lose them, and printing them would put raw ids in front of family members.
 */
interface ActivityRefs {
  toUserId?: string; // OWNERSHIP_TRANSFERRED
}

/** Looks like a URL, a long opaque token, or a bearer-ish blob — never show it. */
function looksSecret(value: string): boolean {
  return (
    value.includes('://') ||
    value.includes('token=') ||
    /^[A-Za-z0-9_-]{24,}$/.test(value)
  );
}

/**
 * `metadata` arrives as a JSON *string* ("{}" when empty) because the schema has no JSON scalar.
 * A real object is accepted too, should BE add one later. Anything unparseable reads as empty.
 */
function parseMetadata(metadata: FamilyGroupActivity['metadata'] | unknown): Record<string, unknown> {
  let raw: unknown = metadata;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

/** Allow-listed, non-empty, non-secret display strings from `metadata`. */
export function readActivityMeta(metadata: FamilyGroupActivity['metadata']): ActivityMeta {
  const source = parseMetadata(metadata);
  const out: ActivityMeta = {};
  for (const key of META_ALLOWLIST) {
    const value = source[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || looksSecret(trimmed)) continue;
    out[key] = trimmed;
  }
  return out;
}

function readActivityRefs(metadata: FamilyGroupActivity['metadata']): ActivityRefs {
  const { toUserId } = parseMetadata(metadata);
  return typeof toUserId === 'string' && toUserId ? { toUserId } : {};
}

// ── The action table ─────────────────────────────────────────────────────────

interface CopyContext {
  /** Display name of whoever did it, already resolved ("คุณ" when it was the viewer). */
  actor: string;
  meta: ActivityMeta;
  /** OWNERSHIP_TRANSFERRED only: the new owner's name, resolved from `toUserId` by the caller. */
  newOwner?: string;
}

interface ActionCopy {
  icon: string;
  tone: ActivityTone;
  th: (c: CopyContext) => string;
  en: (c: CopyContext) => string;
}

/** `“ชื่อ”` / `"name"` — only when the name actually came through. */
const quoted = (value: string | undefined, open = '“', close = '”') =>
  value ? ` ${open}${value}${close}` : '';

const ACTIONS: Record<string, ActionCopy> = {
  GROUP_CREATED: {
    icon: 'groups',
    tone: 'brand',
    th: ({ actor, meta }) => `${actor} สร้างกลุ่ม${quoted(meta.name)}`,
    en: ({ actor, meta }) => `${actor} created the group${quoted(meta.name, '"', '"')}`,
  },
  GROUP_RENAMED: {
    icon: 'edit',
    tone: 'neutral',
    th: ({ actor, meta }) =>
      meta.newName
        ? `${actor} เปลี่ยนชื่อกลุ่มเป็น${quoted(meta.newName)}`
        : `${actor} เปลี่ยนชื่อกลุ่ม`,
    en: ({ actor, meta }) =>
      meta.newName
        ? `${actor} renamed the group to${quoted(meta.newName, '"', '"')}`
        : `${actor} renamed the group`,
  },
  MEMBER_JOINED: {
    icon: 'person_add',
    tone: 'brand',
    th: ({ actor }) => `${actor} เข้าร่วมกลุ่มผ่านลิงก์เชิญ`,
    en: ({ actor }) => `${actor} joined the group via the invite link`,
  },
  MEMBER_REJOINED: {
    icon: 'person_add',
    tone: 'info',
    th: ({ actor }) => `${actor} กลับเข้ากลุ่มอีกครั้ง`,
    en: ({ actor }) => `${actor} rejoined the group`,
  },
  MEMBER_LEFT: {
    icon: 'logout',
    tone: 'neutral',
    th: ({ actor }) => `${actor} ออกจากกลุ่ม`,
    en: ({ actor }) => `${actor} left the group`,
  },
  // The API writes `{}` here, and the removed person is no longer in the member list, so there
  // is no name to show — the line says only that someone was removed.
  MEMBER_REMOVED: {
    icon: 'person_remove',
    tone: 'danger',
    th: ({ actor }) => `${actor} นำสมาชิกออกจากกลุ่ม`,
    en: ({ actor }) => `${actor} removed a member from the group`,
  },
  OWNERSHIP_TRANSFERRED: {
    icon: 'swap_horiz',
    tone: 'warn',
    th: ({ actor, newOwner }) =>
      newOwner
        ? `${actor} โอนสิทธิ์เจ้าของกลุ่มให้ ${newOwner}`
        : `${actor} โอนสิทธิ์เจ้าของกลุ่ม`,
    en: ({ actor, newOwner }) =>
      newOwner
        ? `${actor} transferred group ownership to ${newOwner}`
        : `${actor} transferred group ownership`,
  },

  // Join-link actions (SCR-FG2-001). Deliberately say only *that* a link changed —
  // never the token, never the URL.
  JOIN_LINK_CREATED: {
    icon: 'link',
    tone: 'brand',
    th: ({ actor }) => `${actor} สร้างลิงก์เข้าร่วมกลุ่ม`,
    en: ({ actor }) => `${actor} created a group join link`,
  },
  JOIN_LINK_ROTATED: {
    icon: 'autorenew',
    tone: 'warn',
    th: ({ actor }) => `${actor} สร้างลิงก์เข้าร่วมใหม่ (ลิงก์เดิมใช้ไม่ได้แล้ว)`,
    en: ({ actor }) => `${actor} rotated the join link (the old link stopped working)`,
  },
  JOIN_LINK_REVOKED: {
    icon: 'link_off',
    tone: 'danger',
    th: ({ actor }) => `${actor} ยกเลิกลิงก์เข้าร่วมกลุ่ม`,
    en: ({ actor }) => `${actor} revoked the group join link`,
  },

  // Legacy email-invite rows. SCR-FG2-001 retired the flow, but the API still accepts these
  // codes and old rows carry them. Their metadata holds the invitee email, which is not
  // allow-listed, so it can never reach the feed.
  MEMBER_INVITED: {
    icon: 'mail',
    tone: 'neutral',
    th: ({ actor }) => `${actor} เชิญสมาชิกเข้ากลุ่มทางอีเมล (ระบบคำเชิญแบบเดิม)`,
    en: ({ actor }) => `${actor} sent an email invite (legacy invite system)`,
  },
  INVITE_REVOKED: {
    icon: 'cancel_schedule_send',
    tone: 'neutral',
    th: ({ actor }) => `${actor} ยกเลิกคำเชิญทางอีเมล (ระบบคำเชิญแบบเดิม)`,
    en: ({ actor }) => `${actor} revoked an email invite (legacy invite system)`,
  },

  // RECIPIENT_* are declared by the API (PYG-424) but nothing writes them yet, so their metadata
  // is unconfirmed. `recipientName` is assumed from BOOKING_ON_BEHALF; without it the line still
  // reads correctly, just without the name.
  RECIPIENT_ADDED: {
    icon: 'elderly',
    tone: 'info',
    th: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} เพิ่มผู้รับการดูแล ${meta.recipientName} ในกลุ่ม`
        : `${actor} เพิ่มผู้รับการดูแลในกลุ่ม`,
    en: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} added ${meta.recipientName} as a care recipient in the group`
        : `${actor} added a care recipient to the group`,
  },
  RECIPIENT_UPDATED: {
    icon: 'edit_note',
    tone: 'neutral',
    th: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} แก้ไขข้อมูลผู้รับการดูแล ${meta.recipientName}`
        : `${actor} แก้ไขข้อมูลผู้รับการดูแล`,
    en: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} updated the details of ${meta.recipientName}`
        : `${actor} updated care recipient details`,
  },
  RECIPIENT_REMOVED: {
    icon: 'person_off',
    tone: 'neutral',
    th: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} นำผู้รับการดูแล ${meta.recipientName} ออกจากกลุ่ม`
        : `${actor} นำผู้รับการดูแลออกจากกลุ่ม`,
    en: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} removed ${meta.recipientName} from the care recipients`
        : `${actor} removed a care recipient from the group`,
  },
  BOOKING_ON_BEHALF: {
    icon: 'event_available',
    tone: 'brand',
    th: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} จองผู้ดูแลแทน ${meta.recipientName}`
        : `${actor} จองผู้ดูแลแทนสมาชิกในกลุ่ม`,
    en: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} booked a caregiver for ${meta.recipientName}`
        : `${actor} booked a caregiver on behalf of the group`,
  },
};

/** Rendered for an action the FE has no phrasing for yet — a new BE action must not blank the row. */
const FALLBACK: ActionCopy = {
  icon: 'history',
  tone: 'neutral',
  th: ({ actor }) => `${actor} ทำรายการในกลุ่ม`,
  en: ({ actor }) => `${actor} made a change in the group`,
};

export interface DescribedActivity {
  icon: string;
  tone: ActivityTone;
  /** The human-readable line: actor + action, in the requested language. */
  text: string;
  /** Raw action code — surfaced as a title attribute so an unmapped action is debuggable. */
  code: FamilyGroupActivityAction;
}

export interface DescribeOptions {
  lang?: ActivityLang;
  /**
   * Resolves a userId from metadata to a display name (or "คุณ"), or undefined when that
   * person is not in the group. Only the caller has the member list, so it owns the lookup.
   */
  nameOf?: (userId: string) => string | undefined;
}

/**
 * @param actorName Already-resolved display name; the caller decides when it is "คุณ"/"You",
 *                  since only the caller knows which member is the viewer.
 */
export function describeActivity(
  item: FamilyGroupActivity,
  actorName: string,
  { lang = 'th', nameOf }: DescribeOptions = {},
): DescribedActivity {
  const copy = ACTIONS[item.action] ?? FALLBACK;
  const { toUserId } = readActivityRefs(item.metadata);
  const context: CopyContext = {
    actor: actorName,
    meta: readActivityMeta(item.metadata),
    newOwner: toUserId ? nameOf?.(toUserId) : undefined,
  };
  return {
    icon: copy.icon,
    tone: copy.tone,
    text: copy[lang](context),
    code: item.action,
  };
}

/** Icon-disc classes per tone, matching the family screens' palette. */
export const TONE_CLASS: Record<ActivityTone, string> = {
  brand: 'bg-[#ECFDF5] text-[#047857]',
  info: 'bg-[#EFF6FF] text-[#1D4ED8]',
  warn: 'bg-[#FEF3C7] text-[#B45309]',
  danger: 'bg-[#FEF2F2] text-[#DC2626]',
  neutral: 'bg-[#F1F5F9] text-[#475569]',
};
