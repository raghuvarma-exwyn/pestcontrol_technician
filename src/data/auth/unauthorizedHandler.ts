import { toast } from "react-toastify";
import { clearSession } from "./sessionAuth";

let isUnauthorizedHandling = false;

/**
 * Attach 401 handling onto the current window.fetch (after secureHttp guard).
 * Call once at app bootstrap from main.tsx.
 */
export function installUnauthorizedHandler(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __unauthorizedHandlerInstalled?: boolean };
  if (w.__unauthorizedHandlerInstalled) return;

  const previousFetch = window.fetch.bind(window);

  window.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const response = await previousFetch(input, init);

    if (response.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login" && !isUnauthorizedHandling) {
        isUnauthorizedHandling = true;
        toast.error(
          "Your session is no longer valid. Please log in again."
        );
        try {
          await clearSession();
        } catch {
          /* ignore */
        }
        window.location.replace("/login");
        // Allow future logins to show toast again after redirect settles
        setTimeout(() => {
          isUnauthorizedHandling = false;
        }, 3000);
      }
    }

    return response;
  }) as typeof window.fetch;

  w.__unauthorizedHandlerInstalled = true;
}
