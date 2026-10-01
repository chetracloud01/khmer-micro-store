import type { BusinessType, FormErrorCode, PlanId, SubscriptionStatus } from "@khmer-micro-store/shared";

// The browser's way to the API (apps/api). The session lives in an HttpOnly
// cookie the API sets, so every call sends cookies; page scripts never see it.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** The API's one error shape (apps/api errors.ts). `status` 0 = the API couldn't be reached at all. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly fields: Partial<Record<string, FormErrorCode>> = {},
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "unreachable");
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (data ?? {}) as { error?: string; fields?: Partial<Record<string, FormErrorCode>> };
    throw new ApiError(response.status, body.error ?? "internal", body.fields ?? {});
  }
  return data as T;
}

export interface Me {
  merchant: { firstName: string; lastName: string; telegramUsername: string | null };
  store: {
    id: string;
    slug: string;
    name: string;
    businessType: BusinessType;
    phone: string;
    subscription: { plan: PlanId; status: SubscriptionStatus; trialEndsAt: string | null } | null;
  } | null;
}

/** null when nobody is signed in. */
export async function getMe(): Promise<Me | null> {
  try {
    return await api<Me>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
