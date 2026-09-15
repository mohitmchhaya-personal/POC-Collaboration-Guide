# AGENTS.md — SpreadBliss Collaboration Intelligence

Guidance for AI coding agents and human contributors working in this repository.
Read this file fully before making changes. When in doubt, prefer the narrower,
simpler option and ask rather than expanding scope.

---

## 1. What this repository is

**SpreadBliss Collaboration Intelligence** is a standalone web application that
helps nonprofit organizations discover potential collaboration partners.

This repository contains **only the chat front door** to an agentic workflow
that already exists in **n8n**. The application here is a thin, secure conduit:

```text
Browser
  → Next.js chat UI (App Router, client component)
  → Next.js server API (Route Handler, server-only)
  → n8n Chat Trigger (webhook, credentials held server-side)
  → existing n8n "Collaboration Intelligence" workflow
  → response rendered in the chat UI
```

### 1.1 What n8n already does (do NOT recreate)

The n8n workflow is the **source of truth for all agentic behavior**. It performs:

- organization context retrieval
- candidate discovery
- You.com web search
- candidate research
- collaboration evaluation / scoring
- evidence verification
- conversational memory
- final recommendations

This repository must **never** reproduce any of the following, in any form:

- candidate discovery or ranking
- web search (including any direct You.com integration)
- scoring, evaluation, or verification logic
- prompts, prompt templates, or LLM calls
- workflow routing / orchestration
- agent memory or conversation summarization

If a task appears to require any of the above, **stop and flag it** — it belongs
in n8n, not here.

### 1.2 What this repository is responsible for

- Rendering a chat interface with SpreadBliss branding.
- Managing a per-conversation `sessionId` in the browser.
- Accepting a user message, validating it, and forwarding it (with the
  `sessionId`) to n8n from the **server** side.
- Adapting n8n's response into a UI-friendly shape.
- Displaying the response safely (plain text / constrained markdown, no raw HTML).
- Handling loading, timeout, and error states gracefully.

---

## 2. Repository state and workflow rules

- The repository started empty; `main` was initialized with an empty bootstrap
  commit so that reviewable PRs can be opened.
- **All changes go through pull requests targeting `main`.** Never commit
  directly to `main`.
- Branch naming: `devin/<unix-timestamp>-<short-slug>` for agent branches;
  humans may use `feature/<slug>` or `fix/<slug>`.
- One prompt / task = one PR. Do not start subsequent tasks in the same PR.
- The PR description must report: branch, files changed, assumptions,
  risks/questions, and verification performed (commands run and results).
- Implementation agents must **not merge** PRs. The user-authorized
  implementation manager reviews the PR, merges it after acceptance, and
  confirms the merge before assigning the next prompt.
- Do not edit the n8n workflow from this repository or any task in it.
- Never commit webhook URLs, credentials, `.env`, `.env.local`, or anything
  under `.env*` except `.env.example`. In `.env.example`, the webhook URL and
  Basic-auth values must be empty; `N8N_REQUEST_TIMEOUT_MS=180000` is a
  non-secret default and should be filled in.

---

## 3. Architecture and technology

### 3.1 Required stack

| Concern         | Choice                                                  |
| --------------- | ------------------------------------------------------- |
| Framework       | **Next.js 16.x** (latest secure patch), **App Router**  |
| UI library      | **React 19.x**                                          |
| Language        | **TypeScript** (strict mode)                            |
| Styling         | **Tailwind CSS**                                        |
| Runtime         | **Node.js 24 LTS** compatible                           |
| Package manager | **npm** (unless the repo already establishes another)   |
| Server layer    | Next.js Route Handlers (`app/api/**/route.ts`)          |

Pin exact or caret versions in `package.json`; commit `package-lock.json`.
Use the latest secure, compatible patch releases and do not delay security
updates. Keep the dependency footprint minimal.

### 3.2 Explicitly excluded (do NOT add unless clearly necessary and approved)

- NestJS, Express, or any separate backend server / repository
- Databases of any kind (SQL, NoSQL, vector DBs, ORMs, Prisma, etc.)
- Authentication / user accounts / session stores
- AWS or any cloud infrastructure-as-code
- Docker, Redis, message queues
- LangChain, LangGraph, or any other agent framework
- Any AI provider SDK (OpenAI, Anthropic, etc.) — the only "AI" dependency is
  the n8n webhook
- Payments, email outreach, organization profile editing
- Microservices or workers

The Next.js server layer is sufficient for this POC.

### 3.3 Suggested project layout (when implementation begins)

```text
app/
  layout.tsx                # Inter font, brand tokens, metadata
  page.tsx                  # Chat page
  globals.css               # Tailwind base + brand CSS variables
  api/
    chat/
      route.ts              # POST: validate → n8n adapter → normalized response
components/
  chat/                     # ChatWindow, MessageList, MessageBubble, Composer,
                            # NewConversationButton, etc.
  ui/                       # Small, generic presentational primitives
lib/
  n8n/
    client.ts               # server-only fetch to n8n (timeout, auth, errors)
    adapter.ts              # request builder + response normalizer (see §4)
    types.ts                # N8nChatRequest / N8nChatResponse / ChatResponse
  session.ts                # sessionId generation + browser persistence
  validation.ts             # message validation (length, type, trimming)
  env.ts                    # server-only env parsing/validation
docs/
  n8n-integration.md        # the FINAL documented n8n contract (see §4.3)
tests/                      # unit tests (Vitest or Jest) and e2e (Playwright)
.env.example                # secrets empty; N8N_REQUEST_TIMEOUT_MS=180000 default
```

This layout is a recommendation, not a mandate; keep it flat and boring.

---

## 4. n8n integration boundary

### 4.1 Request contract (expected — verify before relying on it)

The n8n **Chat Trigger** node is expected to accept a JSON POST like:

```json
{
  "action": "sendMessage",
  "sessionId": "<opaque session id>",
  "chatInput": "<user message>"
}
```

- `sessionId` and `chatInput` are expected to be required.
- `action: "sendMessage"` should be included **only if** the deployed n8n
  contract requires it; confirm against the actual workflow configuration.
- Do **not** send arbitrary extra fields; n8n memory is keyed on `sessionId`.

### 4.2 Response contract (unknown — do NOT assume blindly)

The n8n Chat Trigger response shape depends on how the workflow is configured
(e.g. `{"output": "..."}`, `{"text": "..."}`, an array of items, or a custom
object). **Do not hard-code a single assumed schema.**

Requirements:

- Build an **adapter layer** (`lib/n8n/adapter.ts`) that is the *only* place
  in the codebase that knows about n8n's request/response format.
- The adapter must normalize whatever n8n returns into the stable browser
  contract below, tolerating the common shapes above and failing with a
  clear, non-leaking error when unrecognized.
- The UI must consume only the normalized type — never the raw n8n payload.
- Log the *shape* (keys / type) of unrecognized responses in development to
  aid contract discovery; never log full content in production.

#### Internal browser contract (stable; owned by this repo)

This is what `POST /api/chat` returns to the browser. It is distinct from the
live n8n contract above, which remains unverified until confirmed against the
deployed workflow.

```ts
type ChatResponse = {
  sessionId: string;
  message: { role: "assistant"; content: string };
  recommendations?: Recommendation[]; // typed, validated structured data
};
```

- `recommendations` is optional and present only when n8n returns structured
  recommendation data that passes server-side validation against a typed
  schema (`Recommendation` to be defined in `lib/n8n/types.ts` once the live
  shape is known).
- **Never** pass arbitrary raw upstream payloads (e.g. a `raw` field) to the
  browser. Unvalidated or unrecognized structured data is dropped server-side.

### 4.3 Documenting the contract

Once the real request/response contract has been confirmed against the deployed
workflow, document it in **`docs/n8n-integration.md`**, including:

- endpoint semantics (method, headers, auth mode — never the actual URL)
- exact request body fields and which are required
- observed response shape(s) with sanitized examples
- timeout behavior and error responses
- how `sessionId` maps to n8n memory
- any open questions

Keep the document updated whenever the adapter changes.

### 4.4 Session design

- One browser conversation ↔ one n8n `sessionId`.
- The `sessionId` is generated **in the browser** with `crypto.randomUUID()`,
  kept in client state (optionally `sessionStorage`), and sent with **every**
  follow-up message so n8n's conversational memory continues.
- The API treats `sessionId` as an **opaque identifier** with reasonable
  validation (non-empty string, bounded length, safe character set). It must
  **not** require UUID-only identifiers.
- **New Conversation** must:
  1. generate a fresh `sessionId`, and
  2. clear the visible transcript.
- No user accounts and no permanent database. Transcript state lives in the
  browser only; the server is stateless.

---

## 5. Environment variables

```text
N8N_CHAT_WEBHOOK_URL=
N8N_CHAT_BASIC_AUTH_USER=
N8N_CHAT_BASIC_AUTH_PASSWORD=
N8N_REQUEST_TIMEOUT_MS=180000
```

Rules:

- **Only `N8N_CHAT_WEBHOOK_URL` is required.** Basic-auth fields are optional;
  when both are present, send an `Authorization: Basic ...` header.
- `N8N_REQUEST_TIMEOUT_MS` defaults to `180000` (3 minutes) when unset.
- **Never** prefix these with `NEXT_PUBLIC_`. They must be read only in
  server code (Route Handlers / `lib/env.ts` marked `import "server-only"`).
- **Never** expose the webhook URL to browser code, client bundles, HTML,
  logs, error messages, or the PR/issue tracker.
- Provide `.env.example` with the keys above: `N8N_CHAT_WEBHOOK_URL`,
  `N8N_CHAT_BASIC_AUTH_USER`, and `N8N_CHAT_BASIC_AUTH_PASSWORD` empty;
  `N8N_REQUEST_TIMEOUT_MS=180000` as the documented non-secret default.
- Fail fast with a clear server-side error if `N8N_CHAT_WEBHOOK_URL` is missing;
  return a generic error to the client.

---

## 6. Security requirements

These are mandatory for every implementation PR:

1. **n8n endpoint stays server-side.** Only the Route Handler calls n8n.
2. **Validate incoming chat messages** on the server: must be a non-empty
   string after trimming, enforce a maximum length of **4,000 characters**,
   reject non-string / malformed bodies, and validate `sessionId` as a
   reasonably constrained opaque identifier (see §4.4) — not UUID-only.
3. **Do not render arbitrary HTML returned by AI.** Render as plain text or via
   a markdown renderer with HTML disabled/sanitized. Never use
   `dangerouslySetInnerHTML` with model output.
4. **External links must use safe attributes:** `target="_blank"` with
   `rel="noopener noreferrer nofollow"`; only allow `http(s)` schemes.
5. **No API secrets in browser bundles.** Grep the build output for
   `N8N_` before finalizing; no `NEXT_PUBLIC_` secrets.
6. **Do not log credentials** — including the webhook URL and Basic-auth values.
7. **Avoid logging full conversation content** unnecessarily; log request IDs,
   status codes, latency, and error classes instead.
8. Return generic error messages to the client; keep details in server logs.
9. Set a request timeout (`AbortController`) using `N8N_REQUEST_TIMEOUT_MS`.
10. Consider basic per-IP rate limiting at the Route Handler only if needed —
    without adding Redis or external services.

---

## 7. SpreadBliss visual design

### 7.1 Brand tokens

| Token         | Value     | Use                                            |
| ------------- | --------- | ---------------------------------------------- |
| Black         | `#111111` | primary text, dark UI elements                 |
| White         | `#FFFFFF` | page background, cards                         |
| Electric Blue | `#2563EB` | primary action, links, focus rings, user bubble |
| Brass Gold    | `#B08D57` | sparing accents (brand mark, subtle highlights) |
| Font          | **Inter** | all text (load via `next/font/google`)         |

Expose these as CSS variables and Tailwind theme colors (e.g. `brand.black`,
`brand.blue`, `brand.gold`).

### 7.2 Design principles

- Minimal, professional **nonprofit SaaS** appearance.
- Substantial whitespace; generous padding and line height.
- Thin borders (`1px`, light neutral), clean cards, restrained shadows.
- Minimal animations (subtle fades / typing indicator only).
- **No gradients.**
- Accessible: semantic HTML, visible focus states, sufficient contrast,
  keyboard-operable composer (Enter to send, Shift+Enter for newline),
  `aria-live` region for new assistant messages.
- Responsive: usable on mobile widths; chat column max-width on desktop.

---

## 8. Testing and quality gates

Implementation tasks must run the relevant combination of:

```text
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Expectations:

- `lint`: ESLint with `eslint-config-next` (and TypeScript rules).
- `typecheck`: `tsc --noEmit` in strict mode.
- `test`: unit tests for the adapter (each tolerated response shape + the
  unrecognized case), validation, and session utilities. Mock `fetch`; never
  hit a real n8n instance in tests.
- `test:e2e`: Playwright smoke test of the chat flow with the `/api/chat` route
  mocked or the n8n call stubbed; verify New Conversation resets transcript and
  changes `sessionId`.
- `build`: `next build` must succeed with zero type errors.

Report every command run and its outcome in the PR description. Do not weaken
or delete tests to make them pass.

---

## 9. Coding conventions

- TypeScript strict; no `any`, no `@ts-ignore` without a justified comment.
- Server-only modules import `"server-only"`.
- Prefer Server Components by default; mark interactive chat components
  `"use client"`.
- Small, focused components; colocate types with their modules.
- Minimal comments; rely on clear naming. No comments that narrate a diff.
- Keep PRs small and scoped to the task at hand.
- Follow existing conventions once code exists; do not introduce new tooling
  (formatters, state libraries, UI kits) without a clear need.

---

## 10. Scope exclusions (hard "no")

Do **not** implement:

- authentication
- database or persistent storage
- payments
- email outreach
- organization profile editing
- AWS infrastructure
- direct You.com integration
- duplicate agent logic (search, scoring, verification, prompts, memory)
- unnecessary microservices, queues, or caches

---

## 11. Open questions to resolve during implementation

Track answers in `docs/n8n-integration.md` and PR descriptions.

1. Does the deployed n8n Chat Trigger require `action: "sendMessage"`?
2. What is the exact response JSON shape (`output` / `text` / array / other)?
3. Is the Chat Trigger protected by Basic auth, a header token, or none?
4. Does n8n respond synchronously within the timeout, or stream (SSE)?
   Streaming support is out of scope unless explicitly requested.
5. Does n8n accept the 4,000-character server limit without truncating input?
7. Does n8n return structured recommendation data, and in what shape, so
   `Recommendation` can be typed and validated?
6. Deployment target for the POC (e.g. Vercel) — affects function timeout
   limits versus `N8N_REQUEST_TIMEOUT_MS=180000`.
