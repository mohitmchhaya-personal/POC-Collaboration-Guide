# Demo script

This walkthrough is designed for a three-to-five-minute product demo.

## Pre-demo checklist

- Prepare `.env.local` with `N8N_CHAT_WEBHOOK_URL` set; never show the file or
  its value on screen.
- Build and start the production server:

  ```bash
  npm run build && npm start
  ```

- Open [http://localhost:3000](http://localhost:3000).
- Click **New conversation** for a clean state.
- Hard-refresh once if you want to demonstrate refresh persistence.

## Timed walkthrough

1. **Problem — 0:00–0:30.** Explain that nonprofits can duplicate effort
   because potential partners are difficult to discover, compare, and verify.
2. **Initial request — 0:30–1:20.** Type exactly:
   `Find organizations that could collaborate with a youth mental-health nonprofit in Los Angeles.`
   The workflow may first ask a clarifying question about the organisation's
   mission or programs. Say: “We provide community-based youth counseling and
   family support, with a focus on early intervention for teens.” Expect
   roughly 30–45 seconds of the loading message
   “Researching and verifying potential partners…”.
3. **Recommendations — 1:20–2:00.** Show the organization headings and point
   out Collaboration Fit, Why it fits, Potential collaboration, Strengths, and
   Considerations.
4. **Sources — 2:00–2:20.** Open one source link. It opens in a new tab and
   includes the external-link icon, demonstrating the safe source-link
   behavior.
5. **Geographic follow-up — 2:20–2:45.** Type exactly:
   `Focus specifically on Santa Clarita.`
6. **Memory — 2:45–3:15.** Point out that this is the same conversation and
   does not require re-explaining the original request. Optionally ask:
   `Why is the first organization a stronger partner than the second?`
7. **Architecture — 3:15–3:45.** Use the README diagram to explain the
   browser → Next.js API → server-only n8n request path and the safe response
   boundary.
8. **Scope — 3:45–4:30.** Explain that outbound outreach is intentionally out
   of scope, and click **New conversation** to show that it resets the session
   and transcript.

## Fallback if n8n is slow or unavailable

If the request times out or the service is unavailable, show the friendly
client error and click **Retry**. If the live service cannot recover during the
demo, continue with the architecture diagram and explain that the browser
boundary, validation, safe rendering, persistence, and retry behavior are
independently covered by the automated tests.

## Talking points to avoid

- Do not show environment files or their values.
- Do not show a terminal containing secrets or credentials.
- Do not expose raw n8n payloads, internal workflow screens, or the server-only
  webhook configuration.
