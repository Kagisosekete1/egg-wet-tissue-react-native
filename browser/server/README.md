# Egg Coach API

This stateless server-only AI Gateway handler is prepared for deployment. The web game remains hosted as static assets; this file is not a live API until deployed on a server. Set `LOVABLE_API_KEY` in the host's secure environment, never in browser code, and route the handler at `/api/rules-coach` (or Lovable's external-caller alias `/api/public/rules-coach`). Point `src/web/services/coach.js` at the verified public endpoint only after a real model request and CORS preflight pass.

The model identifier was verified against Lovable's authenticated catalog. Calls use the Gateway's server-side `Lovable-API-Key` header, 400 output tokens and streamed generation internally, returning final `{answer}` JSON. No automatic retries, fake answers, persistent database or chat logging. The instance-local limiter bounds six requests/client/minute, thirty total/minute and three concurrent calls; it is best-effort abuse protection, not a distributed spending quota. Configure spending limits in the Gateway account before public deployment.

Current blocker: the Lovable workspace is out of credits. Its separately prepared TanStack API files have unverified build errors. Cloud database provisioning was rejected by automatic approval review and was not performed; no existing game accounts or scores were migrated. The beginner tutorial and rules work locally while the AI submit button clearly remains unavailable.

Run `node tests/coach-api.test.mjs` from the browser project for input validation, CORS, rate limits, streamed Gateway parsing, errors and rule-context checks. These use a fake model server and do not claim a successful live model call.
