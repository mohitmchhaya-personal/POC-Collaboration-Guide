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

**Implemented and validated against the deployed workflow.** The server route
validates browser requests, sends the request to n8n, normalizes supported
response shapes, and returns a stable browser contract. The live contract
observed during validation is recorded in [Confirmed live contract](#confirmed-live-contract).

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

## Confirmed live contract

Observed against the deployed Chat Trigger (no Basic auth configured; the
webhook URL is referenced only as `N8N_CHAT_WEBHOOK_URL`).

### Request

- `POST` to the webhook URL with `Content-Type: application/json`.
- Body fields `sessionId` and `chatInput` are accepted as documented above.
- `action: "sendMessage"` is accepted; a request without it also succeeded,
  so the field is tolerated rather than required. The client keeps sending it.
- No authentication header is required. Leave both Basic-auth variables unset.

### Response

Every observed response was HTTP 200 with
`Content-Type: application/json; charset=utf-8` and a single-key body:

```json
{ "output": "<assistant text>" }
```

No other top-level keys, arrays, or structured `recommendations` fields were
observed. Responses are synchronous (no streaming).

`output` is either:

- a short plain-text sentence (clarification requests and conversational
  replies), or
- a Markdown research report using `##`/`###` headings, `**bold**` labels,
  `-` bullet lists, `---` rules, and `[title](https://...)` source links.

A sanitized example of the Markdown form, with the deployed workflow's actual
section labels and shortened values:

```markdown
## SpreadBliss Collaboration Intelligence

**Organization:** <requesting organization>

**Collaboration goal:** <goal>

<one-paragraph summary>

---

### 1. <Candidate organization>

**Collaboration Fit:** 90/100

**Why it fits**

<paragraph>

**Potential collaboration**

<paragraph>

**Strengths**
- <item>

**Considerations**
- <item>

**Evidence quality:** strong

**Sources**
- [<title>](https://example.org/)
```

Because recommendations arrive embedded in Markdown rather than as structured
data, the browser renders them through the safe Markdown renderer; the
`recommendations` field of the browser contract stays absent. Scores are shown
verbatim as written by the workflow (for example `90/100`).

### Behavior

- The workflow asks a clarification question when the requesting organization
  or its mission/programs/population are not yet known in the session. These
  arrive as ordinary `output` text and render as normal assistant messages.
- Memory is keyed on `sessionId`: follow-ups such as narrowing the geography or
  comparing candidates reused earlier context, and a fresh `sessionId` had no
  access to the previous conversation.
- Observed latency ranged from roughly 4 s (clarifications) to 45 s (full
  research runs) end to end, well inside the 180 s default timeout.

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

## Resolved questions

1. `action: "sendMessage"` is accepted but not required; it is still sent.
2. The deployed response shape is `{ "output": string }`.
3. The Chat Trigger is not protected by Basic auth or a header token.
4. n8n responds synchronously; no streaming was observed.
5. Structured recommendation data is not returned; recommendations are
   embedded in Markdown. The structured normalization path remains available
   should the workflow start returning it.

## Open questions

1. Whether n8n truncates inputs near the 4,000-character server limit was not
   exercised; validation used messages under 400 characters.
2. The deployment target for the POC, and how its function timeout limit
   interacts with `N8N_REQUEST_TIMEOUT_MS=180000`, remains undecided.
