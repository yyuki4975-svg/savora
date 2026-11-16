export interface AccountResponse { id: string; email: string; displayName: string; role: string }
export interface SessionResponse { account: AccountResponse; csrfToken: string; expiresAt: string }
