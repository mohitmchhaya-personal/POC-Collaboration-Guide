import "server-only";

export type ServerEnv = {
  n8nChatWebhookUrl: string;
  n8nBasicAuth?: { user: string; password: string };
  n8nRequestTimeoutMs: number;
};

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

export function getServerEnv(): ServerEnv {
  const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL?.trim() ?? "";

  try {
    const parsedUrl = new URL(webhookUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw new EnvValidationError(
      "N8N_CHAT_WEBHOOK_URL is missing or invalid",
    );
  }

  const basicAuthUser = process.env.N8N_CHAT_BASIC_AUTH_USER ?? "";
  const basicAuthPassword = process.env.N8N_CHAT_BASIC_AUTH_PASSWORD ?? "";
  const hasUser = basicAuthUser.length > 0;
  const hasPassword = basicAuthPassword.length > 0;

  if (hasUser !== hasPassword) {
    throw new EnvValidationError(
      "N8N_CHAT_BASIC_AUTH_USER and N8N_CHAT_BASIC_AUTH_PASSWORD must be set together",
    );
  }

  const timeoutValue = process.env.N8N_REQUEST_TIMEOUT_MS;
  const n8nRequestTimeoutMs =
    timeoutValue === undefined ? 180000 : Number(timeoutValue);

  if (
    timeoutValue !== undefined &&
    (!/^\d+$/.test(timeoutValue) ||
      !Number.isSafeInteger(n8nRequestTimeoutMs) ||
      n8nRequestTimeoutMs <= 0)
  ) {
    throw new EnvValidationError(
      "N8N_REQUEST_TIMEOUT_MS must be a positive integer",
    );
  }

  return {
    n8nChatWebhookUrl: webhookUrl,
    ...(hasUser && hasPassword
      ? { n8nBasicAuth: { user: basicAuthUser, password: basicAuthPassword } }
      : {}),
    n8nRequestTimeoutMs,
  };
}
