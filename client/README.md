# Vigilant Jobs Client — monorepo

Three packages for browsing job postings and applying to them against
the Vigilant API:

```
packages/
  core/    vigilant-jobs-client   — framework-agnostic TS client (the foundation)
  react/   vigilant-jobs-react    — React hooks, wraps core
  vue/     vigilant-jobs-vue      — Vue 3 composables, wraps core
```

Only `core` talks to the network directly. `react` and `vue` are thin
wrappers so behavior (auth, error shapes, endpoints) stays in one place.

## Develop

```bash
npm install          # installs + links all three workspaces
npm run build         # builds core, then react, then vue
npm run typecheck     # typechecks all three
```

Workspaces are wired with npm workspaces, so `vigilant-jobs-react` and
`vigilant-jobs-vue` resolve `vigilant-jobs-client` from `packages/core`
locally — no publishing needed to develop or test locally.

## Publish

Each package can be published independently once ready:

```bash
cd packages/core && npm publish
cd packages/react && npm publish
cd packages/vue && npm publish
```

Publish `core` first — `react` and `vue` depend on it by version range
(`^0.1.0`), so it needs to exist on the registry (or be bumped/matched)
before the others resolve correctly for outside consumers.

## Backend note

`apply()` posts to `POST /api/v1/positions/:position_id/apply`. In the
current Go router this route sits under `registerCandidateRoutes`,
inside a group with `AuthMiddleware` applied to the whole group. If
you're making this route open, pull it into its own ungated route
group rather than special-casing the middleware — cleaner and harder
to accidentally regress.
