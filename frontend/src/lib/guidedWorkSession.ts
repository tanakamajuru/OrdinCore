// 26 Oct developer correction, "Guided Work: optional display". Guided mode must stay OFF
// by default and persist the user's dismissal through navigation, refresh and future logins —
// a plain React state reset on every route change, so it never actually dismissed. Backed by
// localStorage keyed to the signed-in user, not the URL, so an ordinary task/notification link
// that happens to carry a stale `guided=1`/`gw=` param can never re-activate it on its own.
function currentUserId(): string {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    return u.id || u.user_id || "anon";
  } catch {
    return "anon";
  }
}

const KEY_PREFIX = "ordincore_guided_active:";

export function isGuidedWorkActive(): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + currentUserId()) === "1";
  } catch {
    return false;
  }
}

export function setGuidedWorkActive(active: boolean): void {
  try {
    if (active) localStorage.setItem(KEY_PREFIX + currentUserId(), "1");
    else localStorage.removeItem(KEY_PREFIX + currentUserId());
  } catch { /* ignore */ }
}
