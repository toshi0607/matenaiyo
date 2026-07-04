/**
 * localStorage に保存する幹事/回答者トークンのキーと読み書きヘルパー。
 * SSR / localStorage 非対応環境でも安全に no-op する。
 */

export interface EditCredential {
  participantId: string;
  editToken: string;
}

function adminKey(slug: string): string {
  return `chosei:admin:${slug}`;
}

function editKey(slug: string): string {
  return `chosei:edit:${slug}`;
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
