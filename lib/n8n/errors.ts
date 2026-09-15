import type { ChatErrorCode } from "@/lib/chat/types";

export type N8nErrorCategory =
  | "auth"
  | "not_found"
  | "rejected"
  | "rate_limited"
  | "timeout"
  | "network"
  | "server"
  | "malformed";

export class N8nError extends Error {
  readonly category: N8nErrorCategory;
  readonly upstreamStatus?: number;

  constructor(
    category: N8nErrorCategory,
    message: string,
    upstreamStatus?: number,
  ) {
    super(message);
    this.name = "N8nError";
    this.category = category;
    this.upstreamStatus = upstreamStatus;
  }
}

export function categorizeUpstreamStatus(status: number): N8nErrorCategory {
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server";
  if (status >= 400) return "rejected";
  return "malformed";
}

export type ClientErrorMapping = {
  status: number;
  code: ChatErrorCode;
  error: string;
};

const CLIENT_ERROR_BY_CATEGORY: Record<N8nErrorCategory, ClientErrorMapping> = {
  auth: {
    status: 502,
    code: "upstream_auth",
    error: "The chat service could not authenticate with its upstream provider.",
  },
  not_found: {
    status: 502,
    code: "upstream_not_found",
    error: "The chat service endpoint could not be reached.",
  },
  rejected: {
    status: 502,
    code: "upstream_rejected",
    error: "The chat service rejected the request.",
  },
  rate_limited: {
    status: 429,
    code: "upstream_rate_limited",
    error: "The assistant is busy. Please try again shortly.",
  },
  timeout: {
    status: 504,
    code: "upstream_timeout",
    error: "The assistant took too long to respond. Please try again.",
  },
  network: {
    status: 502,
    code: "upstream_unavailable",
    error: "The chat service is temporarily unavailable.",
  },
  server: {
    status: 502,
    code: "upstream_unavailable",
    error: "The chat service is temporarily unavailable.",
  },
  malformed: {
    status: 502,
    code: "upstream_malformed",
    error: "The assistant returned an unexpected response.",
  },
};

export function toClientError(category: N8nErrorCategory): ClientErrorMapping {
  return CLIENT_ERROR_BY_CATEGORY[category];
}
