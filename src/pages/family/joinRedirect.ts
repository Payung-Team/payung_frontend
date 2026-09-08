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

/** The /join path for a token — also used as the login `redirect` target. */
export function joinPath(token: string): string {
  return `/join?token=${encodeURIComponent(token)}`;
}

export function setPendingJoinToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* storage disabled — the ?redirect= param still covers the login path */
  }
}

/** Reads and clears the pending token (one-shot). */
export function takePendingJoinToken(): string | null {
  try {
    const token = localStorage.getItem(KEY);
    if (token) localStorage.removeItem(KEY);
    return token;
  } catch {
    return null;
  }
}

/** If a join is pending, the /join path to resume it; otherwise null. Clears storage. */
export function takePendingJoinPath(): string | null {
  const token = takePendingJoinToken();
  return token ? joinPath(token) : null;
}
