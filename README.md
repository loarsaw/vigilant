# Vigilant

Vigilant is a self-hostable hiring & interview platform: job postings,
candidate applications, AI-assisted assignment generation and review,
scheduled interviews with proctoring, and a code-judge sandbox for live
coding assessments — all in one system you run yourself.

## What's in this repo

| Path | What it is |
|---|---|
| `server/` | The Go backend — REST API, Postgres schema/migrations, the code-judge runners, email/SMS/video integrations |
| `apps/vigilant-admin/` | Electron admin dashboard — positions, pipeline, scheduling, proctoring review |
| `apps/vigilant-code/` | Electron app candidates use for code assessments |
| `apps/vigilant/` | Candidate-side monitoring agent used during proctored interview sessions |
| `client/packages/` | Framework-agnostic JS/TS client SDKs (`core`, `react`, `vue`) for embedding a "browse open positions / apply" widget on your own careers page |
| `docs/` | Docusaurus documentation site |
| `docker-compose.yml` / `docker-compose.release.yml` | Build-from-source vs. pull-published-images deployment |

## Documentation

Full documentation: **https://loarsaw.github.io/vigilant/docs/intro**

## Running it

You have two ways to run the backend + code-judge runners:

- **Self-hosting with published images (recommended)** — no Go/Node
  toolchain needed, just Docker. See **[INSTALL.md](./INSTALL.md)**.
- **Building from source** — for development or if you're modifying the
  server:
  ```bash
  git clone https://github.com/loarsaw/vigilant.git
  cd vigilant
  cp vigilant.conf.example vigilant.conf   # fill in secrets — see INSTALL.md
  docker compose up -d --build
  ```

Either way, the desktop apps (`apps/vigilant-admin`, `apps/vigilant-code`)
are separate installs — see their own READMEs for build/run instructions,
or grab a packaged release from this repo's Releases page once one exists.

## Architecture notes

- The Postgres schema is managed with idempotent `CREATE TABLE IF NOT
  EXISTS` migrations that run automatically on every server boot — there's
  no separate migration step to remember, including on upgrade.
- On first boot, the server checks whether Email (SES), LiveKit, GitHub,
  and an AI provider have been configured, and raises an in-app admin
  notification listing anything still missing — that's your post-install
  checklist, not something you need to track separately.
- Candidates authenticate via a short-lived JWT issued when they verify an
  interview passcode — there's no separate candidate login/password flow.
- The code-judge runners (`server/runners/{c,cpp,js,java,python}`) execute
  submitted code in locked-down containers: read-only root filesystem, all
  capabilities dropped, no new privileges, and per-container CPU/memory/PID
  limits. Don't loosen these when deploying.

## License

GPL-2.0 — see [LICENSE](./LICENSE).