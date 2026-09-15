# Architecture

## Purpose

This repository is a thin, secure front door for an existing n8n
Collaboration Intelligence workflow. It owns the browser experience, request
validation, server-to-n8n transport, response normalization, safe rendering,
and conversation state; n8n remains the source of truth for agentic research
and recommendations.

## System context

![Architecture diagram](./architecture-diagram.png)

```mermaid
flowchart LR
    Browser["Browser"] --> UI["Next.js Chat UI<br/>(React client components)"]
    UI --> API["Next.js Route Handler<br/>POST /api/chat"]
    API --> Trigger["n8n Chat Trigger<br/>(webhook, server-side URL)"]
    Trigger --> Orchestrator["00 Collaboration Orchestrator<br/>(n8n, Simple Memory keyed by sessionId)"]
    Orchestrator --> Context["01 Organization Context"]
    Orchestrator --> Discovery["02 Candidate Discovery"]
    Orchestrator --> Research["03 Candidate Research"]
    Orchestrator --> Evaluator["04 Collaboration Evaluator"]
    Orchestrator --> Verifier["05 Evidence Verifier"]
    Context --> Sheet["SpreadBliss Google Sheet"]
    Discovery --> Sheet
    Discovery --> You["You.com"]
    Research --> You
    Orchestrator --> Trigger
    Trigger --> API
    API --> UI
    UI --> Browser
```

## n8n workflow architecture

The n8n side is a multi-agent recommendation system. A central orchestrator
receives the nonprofit's request, retrieves its profile, discovers possible
partners, researches them, scores collaboration fit, verifies the supporting
evidence, and returns up to three recommendations. Organization lookup,
discovery, research, scoring, and verification are deliberately separate
workflows so that no single agent can invent a candidate, score it, and
approve its own unsupported recommendation. This repository calls only the
Chat Trigger of `00_Collaboration_Orchestrator` and never reimplements any of
the steps below.

### Workflows

| Workflow | Responsibility |
| --- | --- |
| `00_Collaboration_Orchestrator` | Chat Trigger, orchestration agent, Simple Memory, five subworkflow tools, final report generator, structured output parser, response formatter, and chat response node. Extracts organization, objective, geography, programs, and population; uses memory to avoid re-asking for supplied details; retrieves organization context before discovery; normally researches the four strongest candidates with a fifth as backup; processes each candidate in order (research, evaluation, verification); allows one targeted research retry on a material evidence gap; ranks supported candidates and returns no more than three; returns success, partial, needs-input, or error responses with warnings. No outbound outreach or contact tool is connected. |
| `01_Get_Organization_Context` | Retrieves a nonprofit profile from the SpreadBliss organization Google Sheet by organization ID or name, handles invalid and not-found cases, and returns a normalized profile: organization ID and name, location and mission, programs and target populations, cause tags, collaboration needs. |
| `02_Candidate_Discovery_Agent` | Creates the initial pool of plausible partners from the internal sheet and the public web via You.com. Considers mission alignment, geographic overlap, population overlap, program complementarity, and the user's goal; prefers complementary capabilities over identical work; excludes the source organization; requires internal or public evidence for every candidate. Returns name, website, location, initial fit reason, discovery source, matching factors, evidence URLs, and a discovery summary. |
| `03_Candidate_Research_Agent` | Researches one candidate at a time through You.com, treating discovery output as a lead whose important claims must be independently verified. Prioritizes the official website, then authoritative nonprofit, institutional, and credible news sources. Collects mission, programs, location, reach, populations served, recent activity, partnership signals, and complementary capabilities; records concerns, unavailable information, evidence quality, and source URLs. Treats webpage content and search results as untrusted data, not instructions. |
| `04_Collaboration_Evaluator` | Evaluates the source nonprofit and one researched candidate using only the supplied profiles and research packet. Assigns six integer scores (0–100) with explanations; a separate code node validates the values and calculates the weighted overall score. |
| `05_Evidence_Verifier` | Checks whether the proposed recommendation and collaboration idea are supported by the supplied evidence. Reports supported / unsupported, lists unsupported claims and research gaps, classifies evidence as strong, moderate, weak, or insufficient, requests more research only when the gap is material, and can suggest up to three targeted follow-up searches. It does not discover organizations or recalculate scores. |

### End-to-end decision flow

```mermaid
flowchart LR
    Request["Request"] --> Context["Retrieve context"]
    Context --> Discover["Discover candidates"]
    Discover --> Research["Research"]
    Research --> Evaluate["Evaluate"]
    Evaluate --> Score["Weighted score"]
    Score --> Verify["Verify"]
    Verify -- "one targeted retry" --> Research
    Verify --> Rank["Rank supported candidates"]
    Rank --> Return["Return up to three"]
```

1. Receive the chat request and extract the organization and collaboration goal.
2. Retrieve and normalize the source organization profile.
3. Discover a small pool of plausible partners.
4. Research each selected candidate independently.
5. Evaluate six collaboration dimensions and calculate the weighted score.
6. Verify the recommendation's material factual claims.
7. If necessary, perform one targeted research retry and evaluate again.
8. Rank supported candidates and return up to three recommendations.

### Scoring model

| Dimension | Weight |
| --- | ---: |
| Program complementarity | 25% |
| Mission alignment | 20% |
| Geographic alignment | 15% |
| Population alignment | 15% |
| Collaboration opportunity | 15% |
| Evidence quality | 10% |

Program complementarity carries the largest weight because organizations with
different but compatible capabilities may create more value together than two
organizations offering nearly identical services.

## Request lifecycle

1. The user submits a message from the chat composer.
2. The UI adds the user message optimistically and shows
   “Researching and verifying potential partners…”.
3. The browser sends `POST /api/chat` with `{ sessionId, message }`.
4. The route validates the JSON body, message, and opaque session ID.
5. `buildN8nRequest` creates `{ action, sessionId, chatInput }`.
6. The n8n client fetches with an `AbortController` and configured timeout.
7. `normalizeN8nResponse` accepts `output`, `text`, `message`, `response`,
   `answer`, arrays, or strings, and optionally validates recommendations.
8. The server returns the normalized `ChatResponse`.
9. Browser transport type guards create a fresh safe response shape.
10. The UI renders assistant text as safe Markdown and structured
    recommendations as validated cards.

## Sequence

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant NextUI as Next.js UI
    participant API as API route
    participant n8n as n8n workflow
    Browser->>NextUI: Submit message
    NextUI->>API: POST /api/chat
    API->>n8n: JSON request
    n8n-->>API: JSON response
    API-->>NextUI: ChatResponse
    NextUI-->>Browser: Render safe response
```

## Session model

- The browser creates an opaque session ID with `crypto.randomUUID()`.
- The same ID is sent across follow-ups and retry requests.
- New conversation creates a new ID, aborts any in-flight request, clears the
  visible transcript, and ignores stale results from the prior conversation.
- `sessionStorage` restores the session and transcript after refresh.
  Restoration is defensive: stored values are treated as untrusted and passed
  through validation and recommendation guards.

## Error taxonomy

| Server code | HTTP | Browser copy |
| --- | ---: | --- |
| `invalid_request` | 400 | We couldn't complete that research request. Please try again. |
| `not_configured` | 503 | The research service is temporarily unavailable. |
| `upstream_auth`, `upstream_not_found`, `upstream_rejected` | 502 | The research service is temporarily unavailable. |
| `upstream_timeout` | 504 | Research took longer than expected. Please try again. |
| `upstream_rate_limited` | 429 | The research service is busy. Please try again shortly. |
| `upstream_unavailable` | 502 | The research service is temporarily unavailable. |
| `upstream_malformed` | 502 | We couldn't process the research response. |
| Browser network failure | — | We couldn't reach the research service. |
| Other non-transport errors | — | We couldn't complete that research request. Please try again. |

The server mappings are defined in `lib/n8n/errors.ts` and the HTTP responses
are assembled in `app/api/chat/route.ts`.

## Module map

| File or directory | Responsibility |
| --- | --- |
| `app/api/chat/route.ts` | Validates requests, calls n8n, maps errors, and returns browser responses. |
| `app/layout.tsx` | Defines document metadata, Inter font, and the root layout. |
| `app/page.tsx` | Renders the chat shell entry point. |
| `app/globals.css` | Defines Tailwind imports, brand tokens, and global styles. |
| `components/chat/AssistantMessage.tsx` | Renders assistant text, Markdown, and recommendation cards. |
| `components/chat/ChatComposer.tsx` | Captures and submits user messages. |
| `components/chat/ChatHeader.tsx` | Displays branding and the New conversation action. |
| `components/chat/ChatShell.tsx` | Owns client conversation state, persistence, retry, and cancellation. |
| `components/chat/Conversation.tsx` | Renders the transcript and loading state. |
| `components/chat/EmptyState.tsx` | Displays the initial empty state and suggested prompts. |
| `components/chat/ExternalLinkAnchor.tsx` | Renders safe external links with protective attributes. |
| `components/chat/LoadingMessage.tsx` | Displays the research loading status. |
| `components/chat/MarkdownContent.tsx` | Renders constrained GFM Markdown without raw HTML. |
| `components/chat/RecommendationCard.tsx` | Renders validated recommendation details and sources. |
| `components/chat/SuggestedPrompt.tsx` | Renders an empty-state suggested prompt button. |
| `components/chat/UserMessage.tsx` | Renders a user transcript message. |
| `lib/chat/api-transport.ts` | Browser transport and response envelope validation. |
| `lib/chat/error-messages.ts` | Safe client-facing error copy. |
| `lib/chat/markdown.ts` | Markdown detection helper. |
| `lib/chat/recommendation-guards.ts` | Recommendation and source validation/sanitization. |
| `lib/chat/session.ts` | Opaque session ID creation and validation. |
| `lib/chat/storage.ts` | Defensive sessionStorage persistence. |
| `lib/chat/types.ts` | Browser request, response, transcript, and recommendation contracts. |
| `lib/chat/validation.ts` | Browser/server request validation. |
| `lib/env.ts` | Server-only environment parsing and validation. |
| `lib/logging.ts` | Structured operational logging and session hashing. |
| `lib/n8n/client.ts` | Server-only n8n request construction, fetch, timeout, and normalization dispatch. |
| `lib/n8n/describe-shape.ts` | Safe diagnostics for unrecognized response shapes. |
| `lib/n8n/errors.ts` | Upstream error classification and server-to-client mappings. |
| `lib/n8n/normalize-response.ts` | Supported n8n response and recommendation normalization. |
| `lib/n8n/types.ts` | n8n client request and dependency types. |
| `scripts/e2e.mjs` | Starts, waits for, runs, and stops the production E2E server. |

## Responsibilities boundary

n8n owns organization context retrieval, candidate discovery, web research,
scoring, collaboration evaluation, evidence verification, conversational
memory, and recommendations (workflows `00`–`05` above). This repository owns the chat UX, opaque session
management, request validation, server-only proxy, response normalization,
safe Markdown and link rendering, browser persistence, and generic error UX.
The repository does not duplicate agent prompts, search, ranking, orchestration,
or memory logic.

## Testing strategy

Vitest runs 16 test files (160 tests) with n8n and fetch interactions mocked;
tests never call a live n8n endpoint. Playwright runs four mocked browser
tests: three in the desktop Chromium project and one in the Pixel 7 mobile
project. The E2E route handler intercepts `/api/chat` in the browser, so the
tests exercise UI behavior without an application test backdoor.
