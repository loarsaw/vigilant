---
id: cors-and-rate-limits
title: CORS & Rate Limits
sidebar_label: CORS & Rate Limits
sidebar_position: 4
description: What to know before calling this API from your own domain.
---

## CORS

These endpoints are meant to be called directly from a browser on a domain
you control (not just from the Vigilant-hosted frontend). Vigilant applies
CORS middleware globally, so cross-origin requests from your configured
frontend domain are allowed.

If you see a CORS error in the browser console:

- Confirm you're calling the correct base URL for your Vigilant instance.
- Confirm your frontend's origin is included in the instance's allowed
  origins configuration (this is set on the Vigilant deployment, not
  something you configure from the client).
- Check that you're not sending unexpected custom headers that would trigger
  a preflight your server config doesn't allow.

## Rate limits

| Endpoint | Limiter | Behavior |
|---|---|---|
| `GET /public/positions` | `APILimiter` | General-purpose limit, generous for read traffic. |
| `GET /public/positions/:id` | `APILimiter` | Same as above. |
| `POST /public/positions/:id/apply` | `ApplyLimiter` | Strict, keyed by IP address — this is a public write endpoint reachable by bots. |

### Handling `429` responses

The `apply` endpoint is the one most likely to get rate-limited. Build your
form to handle it gracefully:

```js
if (res.status === 429) {
  // Show a friendly message — don't auto-retry immediately.
  showError("You're submitting too quickly. Please wait a moment and try again.");
}
```

Avoid calling `apply` automatically (e.g. on every keystroke, or via
client-side validation retries) — reserve it for the final, deliberate form
submission.

## A note on caching

`GET /public/positions` is a good candidate for light client-side caching
(e.g. 30–60 seconds) if your careers page gets meaningful traffic — position
listings don't change second-to-second, and it reduces load on shared
infrastructure.