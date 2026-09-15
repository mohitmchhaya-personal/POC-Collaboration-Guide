# Security decisions

SpreadBliss is a thin browser-to-Next.js front door. The browser never calls
the n8n webhook directly, and all webhook configuration and credentials stay in
server-only environment variables. No `NEXT_PUBLIC_` variable is used for
secrets. `.env*` files are ignored by Git except for the empty-value
`.env.example`.

## Validation and trust boundaries

- The server validates chat messages to a maximum of 4,000 characters and
  validates session IDs as bounded opaque identifiers.
- Recommendations are validated independently in both the server response
  normalizer and the browser transport/storage guards.
- `sessionStorage` is treated as untrusted input. Stored transcripts are
  validated on load, and malformed recommendation fields are discarded.

## Rendering and links

Assistant Markdown uses `react-markdown` with raw HTML disabled and a strict
element allowlist. Plain text remains plain text. Only `http(s)` links become
anchors, and external links use `target="_blank"` with
`noopener noreferrer nofollow`. Long link text wraps rather than overflowing.

## Errors, logging, and cancellation

Client error copy is generic and never includes upstream text, URLs, status
numbers, or exception messages. Server logs contain only operational
information such as request ID, status, duration, error category, and a short
hash of the session ID.

The server request uses `AbortController` with a default timeout of 180,000
milliseconds. The browser aborts requests when starting a new conversation or
unmounting, and ignores stale completions from an older conversation.

## Dependency posture

The project keeps the dependency footprint small and tests use mocked
transports; tests never contact n8n. `npm audit` is expected to report zero
vulnerabilities. ESLint remains on the 9.x major because
`eslint-config-next@16.3.5` is not compatible with ESLint 10.
