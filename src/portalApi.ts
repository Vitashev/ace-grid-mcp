export type PortalClientOptions = {
  apiBaseUrl?: string;
  token?: string;
};

export type PortalRequestOptions = {
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
};

export class PortalAuthError extends Error {
  constructor() {
    super("Set ACE_GRID_PORTAL_TOKEN to use authenticated Ace Grid account tools.");
  }
}

export class PortalClient {
  private readonly apiBaseUrl: string;
  private readonly token?: string;

  constructor(options: PortalClientOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? process.env.ACE_GRID_API_BASE_URL ?? "https://api.ace-grid.com";
    this.token = options.token ?? process.env.ACE_GRID_PORTAL_TOKEN;
  }

  async request<T>(path: string, options: PortalRequestOptions = {}): Promise<T> {
    if (!this.token) {
      throw new PortalAuthError();
    }

    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        authorization: `Bearer ${this.token}`,
        ...(options.body ? { "content-type": "application/json" } : {}),
      },
      method: options.method ?? "GET",
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof body === "object" && body && "message" in body
          ? String((body as { message?: unknown }).message)
          : "Ace Grid portal API request failed.";
      throw new Error(message);
    }

    return body as T;
  }
}
