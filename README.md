# SpreadBliss Collaboration Intelligence

SpreadBliss Collaboration Intelligence is a Next.js chat application for
discovering and researching potential nonprofit collaboration partners. The
chat UI calls the server-side `/api/chat` route and preserves the current
conversation in browser session storage across refreshes.

```text
Browser → Next.js chat UI → Next.js server API → n8n Chat Trigger
  → Collaboration Intelligence workflow → response rendered in the chat UI
```

## Requirements

- Node.js 24 LTS
- npm 11+

## Installation

```bash
npm install
```

## Environment configuration

Create a local environment file and configure the server-only variables:

```bash
cp .env.example .env.local
```

- `N8N_CHAT_WEBHOOK_URL` is the only required value.
- `N8N_CHAT_BASIC_AUTH_USER` is an optional Basic-auth username.
- `N8N_CHAT_BASIC_AUTH_PASSWORD` is an optional Basic-auth password.
- `N8N_REQUEST_TIMEOUT_MS` is an optional positive integer timeout, defaulting
  to 180000 milliseconds.

Do not expose these variables with a `NEXT_PUBLIC_` prefix.

## Local development

Copy `.env.example` to `.env.local` and configure the server-only n8n values
for real responses. The UI and tests can run with mocked responses, but live
chat responses require the local environment to be configured.

```bash
npm run dev
```

Open <http://localhost:3000>.

## API

`POST /api/chat` is implemented and the chat UI calls it through a client-safe
transport. The current session ID and transcript are stored in
`sessionStorage` only, with no permanent storage or user account. See
[docs/n8n-integration.md](./docs/n8n-integration.md) for the request,
response, error, and logging contracts. Assistant responses support GitHub
Flavored Markdown through a safe renderer with raw HTML disabled, and validated
structured recommendations appear as organization cards with source links.
Client-safe error messages distinguish timeouts, busy/unavailable services,
malformed responses, network failures, and generic failures without exposing
upstream details. See [docs/security.md](./docs/security.md) for the security
decisions and [docs/n8n-integration.md](./docs/n8n-integration.md) for the
integration contract.

## Lint

```bash
npm run lint
```

## Typecheck

```bash
npm run typecheck
```

## Testing

`npm test` runs Vitest with mocked n8n fetch calls, API transport tests, storage
tests, recommendation-guard tests, and jsdom component tests. Markdown uses
GFM syntax without raw HTML rendering; recommendation cards render validated
organization details and HTTP(S) sources in a new tab. End-to-end tests remain
a placeholder for now:

The UI uses these client-safe error messages:

- Timeout: “Research took longer than expected. Please try again.”
- Busy: “The research service is busy. Please try again shortly.”
- Unavailable: “The research service is temporarily unavailable.”
- Invalid response: “We couldn't process the research response.”
- Network: “We couldn't reach the research service.”
- Generic: “We couldn't complete that research request. Please try again.”

```bash
npm test
npm run test:e2e
```

## Production build

```bash
npm run build
npm start
```

## End-to-end tests

Install the Playwright Chromium browser once:

```bash
npx playwright install chromium
```

The Playwright suite builds and starts the production app, then intercepts
`/api/chat` in the browser with deterministic mocked responses. It never calls
n8n and does not use an application test backdoor:

```bash
npm run test:e2e
```

## Project structure

```text
app/
  api/chat/route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  chat/
    ChatShell.tsx
    ChatComposer.tsx
    Conversation.tsx
    AssistantMessage.tsx
    MarkdownContent.tsx
    RecommendationCard.tsx
    ExternalLinkAnchor.tsx
    UserMessage.tsx
    LoadingMessage.tsx
    EmptyState.tsx
    SuggestedPrompt.tsx
  layout/
  ui/
lib/
  chat/
    api-transport.ts
    fixtures.ts
    mock-transport.ts
    session.ts
    storage.ts
    types.ts
    validation.ts
  n8n/
    client.ts
    errors.ts
    normalize-response.ts
    types.ts
  env.ts
  logging.ts
docs/
  n8n-integration.md
tests/
  client.test.ts
  normalize-response.test.ts
  route.test.ts
  validation.test.ts
public/
.env.example
```

See [AGENTS.md](./AGENTS.md) for repository guidance and
[docs/n8n-integration.md](./docs/n8n-integration.md) for the n8n boundary.
