# n8n integration

## Overview

The application is a thin, server-side conduit to the existing n8n workflow:

```text
Browser
  → Next.js chat UI (App Router, client component)
  → Next.js server API (Route Handler, server-only)
  → n8n Chat Trigger (webhook, credentials held server-side)
  → existing n8n "Collaboration Intelligence" workflow
  → response rendered in the chat UI
```

## Status

**Planned — not yet implemented.** `POST /api/chat` currently returns `501`
until the integration task lands. The live n8n request and response contract
is unverified.

## Request

The server sends a JSON `POST` request with `Content-Type: application/json`.
The body includes:

```json
{
  "action": "sendMessage",
  "sessionId": "<opaque session id>",
  "chatInput": "<user message>"
}
```

`sessionId` and `chatInput` are required. `action` is included by default
pending confirmation that the deployed Chat Trigger requires it. Optional
Basic authentication is configured server-side when both credentials are
provided.

## Internal browser contract

`POST /api/chat` returns the stable internal shape:

```ts
type ChatResponse = {
  sessionId: string;
  message: { role: "assistant"; content: string };
  recommendations?: Recommendation[];
};
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `N8N_CHAT_WEBHOOK_URL` | Required server-side n8n webhook URL. |
| `N8N_CHAT_BASIC_AUTH_USER` | Optional Basic-auth username. |
| `N8N_CHAT_BASIC_AUTH_PASSWORD` | Optional Basic-auth password. |
| `N8N_REQUEST_TIMEOUT_MS` | Optional positive integer timeout; defaults to `180000`. |

These variables must not use the `NEXT_PUBLIC_` prefix.

## Planned timeout and error mapping

| Condition | HTTP status | Client error |
| --- | ---: | --- |
| Invalid JSON or request fields | 400 | `Invalid request` |
| Upstream response or normalization failure | 502 | `Upstream request failed` |
| Missing or invalid server configuration | 503 | `Chat service is not configured` |
| Upstream request timeout | 504 | `Upstream request timed out` |

## Open questions

1. Does the deployed n8n Chat Trigger require `action: "sendMessage"`?
2. What is the exact response JSON shape (`output` / `text` / array / other)?
3. Is the Chat Trigger protected by Basic auth, a header token, or none?
4. Does n8n respond synchronously within the timeout, or stream (SSE)?
   Streaming support is out of scope unless explicitly requested.
5. Does n8n accept the 4,000-character server limit without truncating input?
6. Does n8n return structured recommendation data, and in what shape, so
   `Recommendation` can be typed and validated?
7. What is the deployment target for the POC, and how does its function
   timeout limit interact with `N8N_REQUEST_TIMEOUT_MS=180000`?
