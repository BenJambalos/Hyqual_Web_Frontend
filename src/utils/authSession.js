export const ACTIVE_AUTH_SESSION_KEY = "hyqual_active_auth_session";

export function hasActiveAuthSession() {
  return sessionStorage.getItem(ACTIVE_AUTH_SESSION_KEY) === "true";
}