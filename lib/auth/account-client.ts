export type AccountSession = { account: { id: string; email: string; displayName: string; role: string }; csrfToken: string; expiresAt: string };
export function readAccountSession(value: unknown): AccountSession | null {
  if (!value || typeof value !== "object") return null;
  const session = value as Partial<AccountSession>;
  const account = session.account;
  if (!account || typeof account.id !== "string" || typeof account.email !== "string" ||
    typeof account.displayName !== "string" || typeof account.role !== "string" ||
    typeof session.csrfToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(session.csrfToken) || typeof session.expiresAt !== "string") return null;
  return session as AccountSession;
}

export async function accountAction(action: string, body: Record<string, string>, csrfToken?: string) {
  // Cookies stay HttpOnly. CSRF is held in component memory, never localStorage.
  const response = await fetch(`/api/account/${action}`, {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json", "X-Savora-Request": "1", ...(csrfToken ? { "X-Savora-Csrf": csrfToken } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const data: unknown = response.status === 204 ? null : await response.json();
  const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : "AccountsUnavailable";
  return { response, data, code };
}
