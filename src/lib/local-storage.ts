/**
 * localStorage に保存する幹事/回答者トークンのキーと読み書きヘルパー。
 * SSR / localStorage 非対応環境でも安全に no-op する。
 */

export interface EditCredential {
  participantId: string;
  editToken: string;
}

const EVENT_TITLE_DRAFT_KEY = "chosei:new-event-title";
const EVENT_TITLE_MAX_LENGTH = 100;

function adminKey(slug: string): string {
  return `chosei:admin:${slug}`;
}

function editKey(slug: string): string {
  return `chosei:edit:${slug}`;
}

/** Save the one-time home-page title handoff without exposing it in a URL. */
export function saveEventTitleDraft(title: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = title.trim().slice(0, EVENT_TITLE_MAX_LENGTH);
    if (trimmed) {
      window.sessionStorage.setItem(EVENT_TITLE_DRAFT_KEY, trimmed);
    } else {
      window.sessionStorage.removeItem(EVENT_TITLE_DRAFT_KEY);
    }
  } catch {
    // sessionStorage が使えない環境ではタイトルなしで作成画面を開く
  }
}

/** Read and immediately remove the one-time title handoff. */
export function consumeEventTitleDraft(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const title = window.sessionStorage.getItem(EVENT_TITLE_DRAFT_KEY);
    window.sessionStorage.removeItem(EVENT_TITLE_DRAFT_KEY);
    return title?.slice(0, EVENT_TITLE_MAX_LENGTH) ?? null;
  } catch {
    return null;
  }
}

export function saveAdminToken(slug: string, adminToken: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(adminKey(slug), adminToken);
  } catch {
    // localStorage が使えない環境では保存をあきらめる
  }
}

export function loadAdminToken(slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(adminKey(slug));
  } catch {
    return null;
  }
}

export function saveEditCredential(
  slug: string,
  credential: EditCredential,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(editKey(slug), JSON.stringify(credential));
  } catch {
    // localStorage が使えない環境では保存をあきらめる
  }
}

/** そのイベントの失効した編集資格だけを取り除く。 */
export function removeEditCredential(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(editKey(slug));
  } catch {
    // localStorage が使えない環境では削除をあきらめる
  }
}

export function loadEditCredential(slug: string): EditCredential | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(editKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditCredential>;
    if (
      typeof parsed.participantId === "string" &&
      typeof parsed.editToken === "string"
    ) {
      return {
        participantId: parsed.participantId,
        editToken: parsed.editToken,
      };
    }
    return null;
  } catch {
    return null;
  }
}
