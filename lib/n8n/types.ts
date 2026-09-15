import type { ServerEnv } from "@/lib/env";

export type N8nChatRequest = {
  action: "sendMessage";
  sessionId: string;
  chatInput: string;
};

export type N8nClientDeps = {
  fetchImpl?: typeof fetch;
  env?: ServerEnv;
};
