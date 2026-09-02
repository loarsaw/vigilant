# vigilant-jobs-client

Framework-agnostic JS/TS client for browsing job postings and applying to
them via the Vigilant API. No React/Vue dependency — works in plain
JS/TS, Node, or as the base for framework wrappers.

## Install (once published)

```bash
npm install vigilant-jobs-client
```

For now, while developing locally, you can install it straight from the
folder:

```bash
npm install /path/to/vigilant-jobs-client
```

## Quick start

```ts
import { VigilantClient } from "vigilant-jobs-client";

const client = new VigilantClient({
  baseUrl: "https://api.yourapp.com",
});

// List open positions (public route, no auth needed)
const positions = await client.listPositions({ active: true });

// Get a single position
const position = await client.getPosition(positions[0].id);

// Apply to it (route is open — no token required)
const result = await client.apply(position.id, {
  name: "Jane Doe",
  email: "jane@example.com",
  resume_url: "https://...",
});
```

## Error handling

```ts
import { VigilantApiError, VigilantNetworkError } from "vigilant-jobs-client";

try {
  await client.apply(positionId, payload);
} catch (err) {
  if (err instanceof VigilantApiError) {
    // err.status, err.body available
    console.error(`API error ${err.status}:`, err.message);
  } else if (err instanceof VigilantNetworkError) {
    console.error("Network/connection issue:", err.message);
  } else {
    throw err;
  }
}
```

## Optional auth

Apply is currently designed as an open route, but the client still
supports sending a bearer token if you ever gate it later:

```ts
const client = new VigilantClient({
  baseUrl: "https://api.yourapp.com",
  // static token:
  token: "some-jwt",
  // or resolve dynamically on each request:
  getToken: () => localStorage.getItem("token"),
});
```

## API surface

| Method | Route | Auth |
|---|---|---|
| `client.listPositions(params?)` | `GET /api/v1/public/positions` | none |
| `client.getPosition(id)` | `GET /api/v1/public/positions/:id` | none |
| `client.apply(positionId, payload)` | `POST /api/v1/positions/:position_id/apply` | none (once opened) |

`listPositions` accepts optional `{ active?, page?, limit?, search? }` —
these are just serialized as query params, so drop/add whatever your
backend actually supports.

## Notes / things to double check against your real backend

- The `Position` and `ApplyPayload`/`ApplyResponse` types in `src/types.ts`
  are a best guess based on your route names, with an index signature so
  extra fields won't break TS consumers. Tighten these once you have the
  real handler DTOs.
- `apply()` currently posts to `/api/v1/positions/:position_id/apply`
  under the **candidate** route group in your Go router
  (`registerCandidateRoutes`). If you move it under the public group
  instead of just removing the auth middleware from the existing route,
  update the path in `client.ts` to match.

## Build

```bash
npm install
npm run build      # emits dist/ (ESM + CJS + .d.ts)
npm run typecheck
```

## Next steps

This core package is meant to be the foundation for `@vigilant/react`
(hooks: `usePositions`, `usePosition`, `useApply`) and a Vue composables
package, both wrapping this client rather than reimplementing fetch logic.
