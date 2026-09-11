import type {
  FamilyGroupActivity,
  FamilyGroupActivityAction,
} from '../../graphql/familyGroup';

/**
 * Turns a raw activity row into the line a person reads (PYG-422).
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
 *    `token` in metadata cannot leak it through this view by accident.
 */

export type ActivityLang = 'th' | 'en';

/** Visual tone for the row's icon disc. Maps to the palette used across the family screens. */
export type ActivityTone = 'brand' | 'info' | 'warn' | 'danger' | 'neutral';

/** The only metadata keys this view will read. Anything else is ignored. */
const META_ALLOWLIST = [
  'groupName',
  'oldName',
  'newName',
  'memberName',
  'newOwnerName',
  'recipientName',
  'caregiverName',
] as const;

export type ActivityMeta = Partial<Record<(typeof META_ALLOWLIST)[number], string>>;

/** Looks like a URL, a long opaque token, or a bearer-ish blob — never show it. */
function looksSecret(value: string): boolean {
  return (
    value.includes('://') ||
    value.includes('token=') ||
    /^[A-Za-z0-9_-]{24,}$/.test(value)
  );
}

/**
 * Safe reader for `metadata`. Accepts the JSON *string* the schema sends today (it has no
 * JSON scalar) as well as a real object, should BE add one later. Returns only allow-listed,
 * non-empty, non-secret string values.
 */
export function readActivityMeta(
  metadata: FamilyGroupActivity['metadata'],
): ActivityMeta {
  let raw: unknown = metadata;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const source = raw as Record<string, unknown>;
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

// ── The action table ─────────────────────────────────────────────────────────

interface CopyContext {
  /** Display name of whoever did it, already resolved ("คุณ" when it was the viewer). */
  actor: string;
  meta: ActivityMeta;
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
    th: ({ actor, meta }) => `${actor} สร้างกลุ่ม${quoted(meta.groupName)}`,
    en: ({ actor, meta }) => `${actor} created the group${quoted(meta.groupName, '"', '"')}`,
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
  MEMBER_REMOVED: {
    icon: 'person_remove',
    tone: 'danger',
    th: ({ actor, meta }) =>
      meta.memberName
        ? `${actor} นำ ${meta.memberName} ออกจากกลุ่ม`
        : `${actor} นำสมาชิกออกจากกลุ่ม`,
    en: ({ actor, meta }) =>
      meta.memberName
        ? `${actor} removed ${meta.memberName} from the group`
        : `${actor} removed a member from the group`,
  },
  OWNERSHIP_TRANSFERRED: {
    icon: 'swap_horiz',
    tone: 'warn',
    th: ({ actor, meta }) =>
      meta.newOwnerName
        ? `${actor} โอนสิทธิ์เจ้าของกลุ่มให้ ${meta.newOwnerName}`
        : `${actor} โอนสิทธิ์เจ้าของกลุ่ม`,
    en: ({ actor, meta }) =>
      meta.newOwnerName
        ? `${actor} transferred group ownership to ${meta.newOwnerName}`
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

  RECIPIENT_SHARED: {
    icon: 'elderly',
    tone: 'info',
    th: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} แชร์โปรไฟล์ผู้รับการดูแล ${meta.recipientName} เข้ากลุ่ม`
        : `${actor} แชร์โปรไฟล์ผู้รับการดูแลเข้ากลุ่ม`,
    en: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} shared the care profile of ${meta.recipientName} with the group`
        : `${actor} shared a care profile with the group`,
  },
  RECIPIENT_UNSHARED: {
    icon: 'person_off',
    tone: 'neutral',
    th: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} นำโปรไฟล์ ${meta.recipientName} ออกจากกลุ่ม`
        : `${actor} นำโปรไฟล์ผู้รับการดูแลออกจากกลุ่ม`,
    en: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} removed the care profile of ${meta.recipientName} from the group`
        : `${actor} removed a care profile from the group`,
  },
  BOOKING_CREATED_ON_BEHALF: {
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
  BOOKING_CANCELLED: {
    icon: 'event_busy',
    tone: 'danger',
    th: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} ยกเลิกการจองของ ${meta.recipientName}`
        : `${actor} ยกเลิกการจอง`,
    en: ({ actor, meta }) =>
      meta.recipientName
        ? `${actor} cancelled the booking for ${meta.recipientName}`
        : `${actor} cancelled a booking`,
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

/**
 * @param actorName Already-resolved display name; the caller decides when it is "คุณ"/"You",
 *                  since only the caller knows which member is the viewer.
 */
export function describeActivity(
  item: FamilyGroupActivity,
  actorName: string,
  lang: ActivityLang = 'th',
): DescribedActivity {
  const copy = ACTIONS[item.action] ?? FALLBACK;
  const context: CopyContext = { actor: actorName, meta: readActivityMeta(item.metadata) };
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
