export class InsecureTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsecureTransportError";
  }
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

const LOCAL_RESOURCE_PROTOCOLS = new Set([
  "blob:",
  "data:",
  "capacitor:",
  "ionic:",
  "file:",
  "content:",
]);

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

/** Reject cleartext and non-HTTPS schemes for remote URLs. */
export function assertHttpsUrl(url: string): void {
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InsecureTransportError(`Invalid URL: ${url}`);
  }

  if (LOCAL_RESOURCE_PROTOCOLS.has(parsed.protocol)) return;
  if (parsed.protocol === "http:" && isLoopbackHost(parsed.hostname)) return;

  if (parsed.protocol !== "https:") {
    throw new InsecureTransportError(
      `Blocked insecure request to ${parsed.origin}. HTTPS is required.`
    );
  }
}

export async function secureFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  assertHttpsUrl(resolveUrl(input));
  return fetch(input, init);
}

type SecureFetchWindow = Window & {
  __secureFetchInstalled?: boolean;
  __assertHttpsUrl?: (url: string) => void;
};

if (typeof window !== "undefined") {
  (window as SecureFetchWindow).__assertHttpsUrl = assertHttpsUrl;
}

/** Patch window.fetch once so existing call sites reject non-HTTPS remotes. */
export function installSecureFetchGuard(): void {
  if (typeof window === "undefined") return;
  const w = window as SecureFetchWindow;
  w.__assertHttpsUrl = assertHttpsUrl;
  if (w.__secureFetchInstalled) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    w.__assertHttpsUrl?.(resolveUrl(input));
    return originalFetch(input, init);
  }) as typeof window.fetch;

  w.__secureFetchInstalled = true;
}
