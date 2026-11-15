import { Storage } from "@capacitor/storage";

/** localStorage / Capacitor keys involved in auth session. */
export const AUTH_STORAGE_KEYS = {
  userData: "userData",
  checkInFlag: "checkInFlag",
  rememberMe: "rememberMe",
  rememberedUsername: "username",
  /** @deprecated Never store passwords. Cleared on session ops. */
  legacyPassword: "password",
  capacitorToken: "token",
} as const;

/** Non-auth keys preserved across logout / forced session clear. */
export const SESSION_PRESERVE_KEYS = [
  "device_token",
  "app_name",
  "app_version",
  "Google_Map_API_Key",
  AUTH_STORAGE_KEYS.rememberedUsername,
  AUTH_STORAGE_KEYS.rememberMe,
] as const;

export type SessionUser = {
  api_token?: string;
  user_id?: string | number;
  last_action?: string;
  avatar?: string;
  [key: string]: unknown;
};

function safeParseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as SessionUser;
  } catch {
    return null;
  }
}

/** True when a usable Bearer token exists in session. */
export function isAuthenticated(): boolean {
  const user = getSessionUser();
  return Boolean(user?.api_token && String(user.api_token).trim());
}

export function getSessionUser(): SessionUser | null {
  return safeParseUser(localStorage.getItem(AUTH_STORAGE_KEYS.userData));
}

export function getApiToken(): string | null {
  const token = getSessionUser()?.api_token;
  return token ? String(token) : null;
}

export function getAuthHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  const token = getApiToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Remove legacy plaintext password leftovers. */
export function purgeLegacyCredentials(): void {
  localStorage.removeItem(AUTH_STORAGE_KEYS.legacyPassword);
  localStorage.removeItem("rememberedPassword");
  localStorage.removeItem("rememberedUserName");
}

/**
 * Persist post-login session. Does not store passwords.
 * Keeps `userData` in localStorage for existing API call sites.
 */
export async function setSession(userData: SessionUser): Promise<void> {
  if (!userData?.api_token) {
    throw new Error("Cannot establish session without api_token");
  }

  purgeLegacyCredentials();

  const sanitized: SessionUser = { ...userData };
  delete sanitized.password;
  delete sanitized.user_password;
  delete sanitized.plain_password;

  localStorage.setItem(AUTH_STORAGE_KEYS.userData, JSON.stringify(sanitized));
  localStorage.setItem("firstLoginTime", String(Date.now()));

  try {
    await Storage.set({
      key: AUTH_STORAGE_KEYS.capacitorToken,
      value: String(sanitized.api_token),
    });
  } catch {
    /* web / storage unavailable */
  }
}

/** Remember username only (never password). */
export function setRememberedUsername(username: string | null): void {
  if (username && username.trim()) {
    localStorage.setItem(AUTH_STORAGE_KEYS.rememberedUsername, username.trim());
    localStorage.setItem(AUTH_STORAGE_KEYS.rememberMe, "true");
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.rememberedUsername);
    localStorage.removeItem(AUTH_STORAGE_KEYS.rememberMe);
  }
  purgeLegacyCredentials();
}

export function getRememberedUsername(): string | null {
  if (localStorage.getItem(AUTH_STORAGE_KEYS.rememberMe) !== "true") {
    return null;
  }
  return localStorage.getItem(AUTH_STORAGE_KEYS.rememberedUsername);
}

/**
 * Clear auth session. Preserves device/app settings and remembered username.
 */
export async function clearSession(): Promise<void> {
  purgeLegacyCredentials();

  const preserved: Record<string, string> = {};
  for (const key of SESSION_PRESERVE_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) preserved[key] = value;
  }

  // Drop session blob + check-in; keep offline task caches unless full wipe requested.
  localStorage.removeItem(AUTH_STORAGE_KEYS.userData);
  localStorage.removeItem(AUTH_STORAGE_KEYS.checkInFlag);
  localStorage.removeItem("firstLoginTime");
  localStorage.removeItem("activeTaskData");

  for (const [key, value] of Object.entries(preserved)) {
    localStorage.setItem(key, value);
  }

  try {
    await Storage.remove({ key: AUTH_STORAGE_KEYS.capacitorToken });
  } catch {
    /* ignore */
  }
}

/** Password strength for change-password UI. */
export function validateNewPassword(password: string): string | null {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}
