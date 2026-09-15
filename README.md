# SpreadBliss Collaboration Intelligence

SpreadBliss Collaboration Intelligence is a Next.js application that provides
a secure chat front door for discovering and researching potential nonprofit
collaboration partners through an existing n8n workflow.

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

```bash
npm run dev
```

Open <http://localhost:3000>.

## API

`POST /api/chat` is implemented and forwards validated requests to the
server-side n8n integration. See
[docs/n8n-integration.md](./docs/n8n-integration.md) for the request,
response, error, and logging contracts.

## Lint

```bash
npm run lint
```

## Typecheck

```bash
npm run typecheck
```

## Testing

`npm test` runs Vitest with mocked n8n fetch calls. End-to-end tests remain a
placeholder for now:

```bash
npm test
npm run test:e2e
```

The `/api/chat` endpoint currently returns `501` until the n8n integration task
lands.

## Production build

```bash
npm run build
npm start
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
  layout/
  ui/
lib/
  chat/
    session.ts
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
