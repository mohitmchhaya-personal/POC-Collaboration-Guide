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

**Implemented (live contract still to be confirmed against the deployed
workflow).** The server route validates browser requests, sends the request to
n8n, normalizes supported response shapes, and returns a stable browser
contract. The live n8n endpoint contract remains unverified.

## Request

`POST /api/chat` accepts a JSON body with required `sessionId` and `message`
fields. The server sends n8n this JSON body:

```json
{
  "action": "sendMessage",
  "sessionId": "<opaque session id>",
  "chatInput": "<trimmed user message>"
}
```

The upstream request headers are:

- `Content-Type: application/json`
- `Accept: application/json`
- Optional `Authorization: Basic ...` when both Basic-auth environment
  variables are configured

Requests use `cache: "no-store"` and `redirect: "error"`. An
`AbortController` enforces the `N8N_REQUEST_TIMEOUT_MS` timeout, defaulting to
180000 milliseconds.

## Supported upstream response shapes

The response normalizer supports:

- A top-level non-empty string.
- An array whose first element is normalized as the response.
- An object with text fields checked in priority order:
  `output`, `text`, `message`, `response`, `answer`.
- A nested object one level below one of those text keys.
- A `recommendations` or `candidates` array.

Text fields are strings when present. A nested object can contain recognized
recommendation data. When no text field exists, content is synthesized as
numbered recommendation names only, for example:

```text
1. Example Organization
2. Another Organization
```

Recommendation fields are normalized using these aliases:

- Name: `name`, `organization`, `organizationName`, `title`
- Why it fits: `whyThisFits`, `why_this_fits`, `rationale`, `reason`
- Collaboration opportunity: `collaborationOpportunity`,
  `collaboration_opportunity`, `opportunity`
- `strengths` and `considerations`: non-empty string arrays
- Evidence quality: `evidenceQuality` or `evidence_quality`, case-insensitive
  `high`, `medium`, `low`, or `unknown`
- Sources: `sources`, `evidence`, or `links`

Sources may be HTTP(S) strings or objects with a URL under `url`, `href`, or
`link`, and an optional title under `title`, `name`, or `label`. Invalid
schemes, invalid source items, and invalid list items are dropped. Unknown
recommendation keys and undefined-valued fields are dropped. A recommendation
without a valid name rejects the whole response.

## Internal browser contract

`POST /api/chat` returns:

```ts
type ChatResponse = {
  sessionId: string;
  message: { role: "assistant"; content: string };
  recommendations?: Recommendation[];
};
```

The route never forwards raw upstream payloads.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `N8N_CHAT_WEBHOOK_URL` | Required server-only n8n webhook URL. |
| `N8N_CHAT_BASIC_AUTH_USER` | Optional Basic-auth username. |
| `N8N_CHAT_BASIC_AUTH_PASSWORD` | Optional Basic-auth password. |
| `N8N_REQUEST_TIMEOUT_MS` | Optional positive integer timeout; defaults to `180000`. |

Set up local configuration without committing it:

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local`. Never use the `NEXT_PUBLIC_` prefix, and
never commit `.env.local`, credentials, or a real webhook URL.

## Error responses

Every API response includes an `X-Request-Id` header. Error bodies have this
shape:

```ts
type ChatErrorResponse = {
  error: string;
  code: ChatErrorCode;
  requestId: string;
};
```

| Condition | HTTP status | Code |
| --- | ---: | --- |
| Invalid JSON or request fields | 400 | `invalid_request` |
| Missing or invalid server configuration | 503 | `not_configured` |
| Upstream authentication failure (401/403) | 502 | `upstream_auth` |
| Upstream endpoint not found (404) | 502 | `upstream_not_found` |
| Other upstream 4xx rejection | 502 | `upstream_rejected` |
| Upstream rate limit (429) | 429 | `upstream_rate_limited` |
| Upstream timeout | 504 | `upstream_timeout` |
| Upstream 5xx or network failure | 502 | `upstream_unavailable` |
| Empty, invalid JSON, or unrecognized upstream response | 502 | `upstream_malformed` |

## Browser rendering

Validated structured recommendations render as organization cards with
evidence, collaboration details, and source links. Markdown responses use a
safe GFM renderer with raw HTML disabled. Plain responses render as text.
Only HTTP(S) links are rendered as links, and they open in a new tab with
`noopener noreferrer nofollow`. Recommendation scores are shown verbatim.

## Logging policy

The server logs structured chat request events containing the request ID,
success/error outcome, duration, HTTP status, optional upstream status and
error category, and a short SHA-256 hash of the session ID. It never logs
message content, webhook URLs, credentials, or upstream response bodies.

### Diagnostics for unrecognized responses

When a parsed upstream response cannot be normalized, development logging
emits an `n8n_unrecognized_response` event containing only the top-level type,
allowlisted object key names, the count of non-allowlisted object keys, and
array length and first-item type when applicable. It never emits object values,
non-allowlisted key names, or nested object keys. Production and test
environments emit no diagnostic event.

## Open questions

1. Does the deployed n8n Chat Trigger require `action: "sendMessage"`?
2. What is the exact deployed response JSON shape beyond the supported
   compatibility shapes?
3. Is the Chat Trigger protected by Basic auth, a header token, or none?
4. Does n8n respond synchronously within the timeout, or stream (SSE)?
   Streaming support is out of scope unless explicitly requested.
5. Does n8n accept the 4,000-character server limit without truncating input?
6. Does n8n return structured recommendation data in the documented shape?
7. What is the deployment target for the POC, and how does its function
   timeout limit interact with `N8N_REQUEST_TIMEOUT_MS=180000`?
