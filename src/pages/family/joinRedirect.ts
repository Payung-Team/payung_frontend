/**
 * Keeps a pending join token across the sign-in / sign-up detour.
 *
 * The main path for invite links (per PYG-408) is a person who received the link in LINE
 * and has no account yet. When they open /join while signed out we stash the token, send
 * them through login/register, and bring them straight back to /join afterwards — instead
 * of making them re-open the original link.
 *
 * Two mechanisms cover the two auth routes:
 *  - Login: a `?redirect=` param (consumed by Login + GuestRoute) returns immediately.
 *  - Register: register → onboarding, so the token is read back from storage when
 *    onboarding finishes (OnboardingPage / AuthCallback).
 */

const KEY = 'payung_pending_join_token';

/**
 * A stashed token only means "finish the detour you just started". Without an expiry a token
 * left behind (e.g. the user went via login, which returns through ?redirect= and never reads
 * storage) sent the *next* registration in this browser — possibly another account — to a
 * stale /join that shows "ลิงก์คำเชิญไม่ถูกต้อง" instead of home.
 */
const MAX_AGE_MS = 60 * 60 * 1000;

interface StoredToken {
  token: string;
  savedAt: number;
}

/** The /join path for a token — also used as the login `redirect` target. */
export function joinPath(token: string): string {
  return `/join?token=${encodeURIComponent(token)}`;
}

export function setPendingJoinToken(token: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, savedAt: Date.now() } satisfies StoredToken));
  } catch {
    /* storage disabled — the ?redirect= param still covers the login path */
  }
}

/** Drops any stashed token — call once the user has reached /join signed in. */
export function clearPendingJoinToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage disabled */
  }
}

/**
 * Reads and clears the pending token (one-shot). Expired or unreadable values (including the
 * old plain-string format) count as no pending join.
 */
export function takePendingJoinToken(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    localStorage.removeItem(KEY);
    const stored = JSON.parse(raw) as Partial<StoredToken> | null;
    if (typeof stored?.token !== 'string' || typeof stored.savedAt !== 'number') return null;
    if (Date.now() - stored.savedAt > MAX_AGE_MS) return null;
    return stored.token;
  } catch {
    return null;
  }
}

/** If a join is pending, the /join path to resume it; otherwise null. Clears storage. */
export function takePendingJoinPath(): string | null {
  const token = takePendingJoinToken();
  return token ? joinPath(token) : null;
}
