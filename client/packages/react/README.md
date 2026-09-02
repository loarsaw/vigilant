# vigilant-jobs-react

React hooks for browsing job postings and applying to them, built on
[`vigilant-jobs-client`](../core).

## Install

```bash
npm install vigilant-jobs-react
```

(`vigilant-jobs-client` comes along as a dependency — you don't need to
install it separately.)

## Setup

Wrap your app once:

```tsx
import { VigilantProvider } from "vigilant-jobs-react";

function App() {
  return (
    <VigilantProvider config={{ baseUrl: "https://api.yourapp.com" }}>
      <PositionsPage />
    </VigilantProvider>
  );
}
```

## Usage

```tsx
import { usePositions, usePosition, useApply } from "vigilant-jobs-react";

function PositionsPage() {
  const { positions, loading, error } = usePositions({ active: true });

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Something went wrong: {error.message}</p>;

  return (
    <ul>
      {positions.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}

function PositionDetail({ id }: { id: string }) {
  const { position, loading } = usePosition(id);
  const { apply, loading: applying, error: applyError, data } = useApply();

  if (loading || !position) return <p>Loading…</p>;

  return (
    <div>
      <h1>{position.title}</h1>
      <button
        disabled={applying}
        onClick={() => apply(position.id, { name: "Jane Doe", email: "jane@example.com" })}
      >
        {applying ? "Applying…" : "Apply"}
      </button>
      {applyError && <p>Apply failed: {applyError.message}</p>}
      {data && <p>Applied! Status: {data.status}</p>}
    </div>
  );
}
```

## Exports

- `VigilantProvider`, `useVigilantClient` — context setup
- `usePositions(params?)` — `{ positions, loading, error, refetch }`
- `usePosition(id)` — `{ position, loading, error, refetch }`
- `useApply()` — `{ apply, loading, error, data, reset }`
- Everything from `vigilant-jobs-client` (`VigilantClient`, error classes, types) is re-exported for convenience.

## Using with Next.js (App Router / Server Components)

This package ships with the `"use client"` directive baked into its
build output, so you don't need to add it yourself just to import
`usePositions`/`usePosition`/`useApply` — they work as-is inside any
Client Component.

Two patterns depending on where you're fetching:

**Client-side (interactive pages, e.g. an apply form):**
```tsx
"use client";
import { VigilantProvider, usePositions } from "vigilant-jobs-react";
// same as any other client component — see usage above
```

**Server-side (initial page load, SEO, no client JS needed to see listings):**
Skip this package entirely for the fetch and use the underlying
`vigilant-jobs-client` directly in a Server Component instead — it has
zero React dependency and works fine in RSC/server contexts:

```tsx
// app/positions/page.tsx — Server Component, no "use client" needed
import { VigilantClient } from "vigilant-jobs-client";

const client = new VigilantClient({ baseUrl: process.env.API_BASE_URL! });

export default async function PositionsPage() {
  const positions = await client.listPositions({ active: true });
  return (
    <ul>
      {positions.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}
```

A common split: fetch the list server-side for fast/SEO-friendly initial
render, then use `useApply()` from this package only inside the small
Client Component that renders the actual apply button/form.

## Build

```bash
npm install
npm run build
npm run typecheck
```
