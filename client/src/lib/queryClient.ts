import { QueryClient, QueryFunction } from "@tanstack/react-query";

// CSRF token cache
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Fetches CSRF token from the server
 * Uses caching to avoid multiple requests
 */
export async function getCsrfToken(): Promise<string> {
  // Return cached token if available
  if (csrfToken) {
    return csrfToken;
  }

  // If a fetch is already in progress, wait for it
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Start fetching the token
  csrfTokenPromise = (async () => {
    try {
      const res = await fetch('/api/csrf-token', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const data = await res.json();
      csrfToken = data.csrfToken;
      return csrfToken!;
    } catch (error) {
      csrfTokenPromise = null; // Reset promise on error
      throw error;
    }
  })();

  return csrfTokenPromise;
}

/**
 * Clears the cached CSRF token
 * Call this on 403 errors to force token refresh
 */
export function clearCsrfToken() {
  csrfToken = null;
  csrfTokenPromise = null;
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
  },
): Promise<T> {
  const method = options?.method || 'GET';
  const headers: HeadersInit = options?.body ? { "Content-Type": "application/json" } : {};

  // Add CSRF token for mutation requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const token = await getCsrfToken();
      headers['x-csrf-token'] = token;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      // Continue without token - server will reject the request
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  // If we get 403, it might be a stale CSRF token - clear cache
  if (res.status === 403) {
    clearCsrfToken();
  }

  await throwIfResNotOk(res);

  try {
    return await res.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    try {
      return await res.json();
    } catch (error) {
      throw new Error(`Failed to parse JSON response from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
