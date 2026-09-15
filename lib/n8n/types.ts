export type N8nChatRequest = {
  action: "sendMessage";
  sessionId: string;
  chatInput: string;
};

/**
 * Live n8n contract is unverified; transport and normalization are implemented
 * in a later task. See docs/n8n-integration.md.
 */
export type N8nChatRawResponse = unknown;
