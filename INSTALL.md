# Installing Vigilant (self-hosted)

This covers running the Vigilant backend + code-judge runners with Docker.
It assumes Docker and Docker Compose (v2.20+) are already installed on the
host.

## 1. Get the deploy bundle

Download the latest release — this is a small zip with just the deploy
files, not the full source tree:

```bash
wget https://github.com/loarsaw/vigilant/releases/download/v1.0.0/vigilant-1.0.0.zip
unzip vigilant-1.0.0.zip && cd vigilant-X.Y.Z
ls
# docker-compose.yml  docker-compose.prod.yml  Caddyfile
# .env.example  vigilant.conf.example  INSTALL.md
```

(Replace `X.Y.Z` with the version you want from the
[Releases page](https://github.com/loarsaw/vigilant/releases).)

## 2. Configure secrets

```bash
cp vigilant.conf.example vigilant.conf
```

Fill in every `changeme` and blank value in `vigilant.conf`. Generate real
secrets rather than hand-typing them:

```bash
openssl rand -hex 32      # AUTHN_TOKEN, ADMIN_AUTH_TOKEN, JWT_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -base64 24   # POSTGRES_PASSWORD
```

The server **will not start** without a valid `JWT_SECRET` (32+ characters)
and `ENCRYPTION_KEY` (base64 for exactly 32 raw bytes) — it fails fast on
boot rather than running insecurely. If the `server` container keeps
restarting, check `docker compose logs server` — it names exactly which
value is missing or wrong.

Also worth setting deliberately rather than leaving at the default:

- **`ALLOW_ORIGIN`** — defaults to `*`. Set this to your actual frontend
  origin (e.g. `https://app.your-domain.com`) before going live.
- **`ADMIN_IP_ADDRESS`** — leave blank to allow admin login from any IP, or
  set a comma-separated allowlist to restrict it. Blank does not fail to
  start — it just means the allowlist is off.

## 3. Choose plain HTTP or Caddy (automatic TLS)

**No TLS** (behind your own reverse proxy, or just testing):

```bash
cp .env.example .env
# set VIGILANT_VERSION to the version you downloaded
docker compose up -d
```

The server is reachable directly on port `3333`.

**With Caddy handling TLS automatically** — you'll need a real domain
with an A record pointing at this server's public IP:

```bash
cp .env.example .env
# set VIGILANT_VERSION *and* DOMAIN=api.your-domain.com in .env

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Point the DNS A record at this host **before** starting — Caddy needs
`DOMAIN` to resolve to request a Let's Encrypt certificate. With this
overlay, port `3333` is no longer exposed directly; all traffic routes
through Caddy on 80/443.

Either way, the database schema is created automatically on first
boot — there's no separate migration step to run.

## 4. Verify

```bash
docker compose ps

curl -I http://localhost:3333/health          # without Caddy
curl -I https://api.your-domain.com/health    # with Caddy
```

You should get a `200` response (and a valid TLS certificate, with Caddy).

## 5. First-boot checklist

Log into the admin app. On first boot, the server checks whether Email
(AWS SES), LiveKit, GitHub, and an AI provider have been configured, and
raises an admin notification listing anything still missing. Nothing
hard-fails if you skip these — they gate specific features (invite emails,
video interviews, assignment repo creation, AI-assisted review) — the
notification is your post-install checklist, not something you need to
track separately.

## Upgrading

Back up first:

```bash
docker compose exec db pg_dump -U vigilant vigilant > backup-$(date +%F).sql
```

Then bump `VIGILANT_VERSION` in `.env` to the new released tag:

```bash
docker compose pull
docker compose up -d
```

Migrations run automatically on the new image's first boot. Check the
release notes for the version you're upgrading to in case a new variable
needs adding to `vigilant.conf` — your existing file isn't overwritten, so
new required settings need adding manually.

## Building from source instead

If you're contributing to the server rather than just running it, clone
the full repo and use the plain `docker-compose.yml` there instead of the
release bundle's — it builds the server and runner images locally instead
of pulling from Docker Hub:

```bash
git clone https://github.com/loarsaw/vigilant.git
cd vigilant
cp vigilant.conf.example vigilant.conf   # same secret setup as step 2 above
docker compose up -d --build
# or, with Caddy:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Troubleshooting

- **`server` container exits immediately with "Invalid configuration"** —
  check the log line right above it: it names exactly which of
  `JWT_SECRET` / `ENCRYPTION_KEY` is missing or invalid, and why.
- **Caddy logs show `Timeout during connect (likely firewall problem)`** —
  ports 80/443 aren't reachable from the internet on this host. Check your
  cloud provider's firewall/security group (not just `ufw`), and confirm
  the DNS A record for `DOMAIN` actually points here (`dig +short
  your-domain.com`).
- **Admin panel unreachable from your browser but the health check
  works** — check `ALLOW_ORIGIN` in `vigilant.conf` matches the exact
  origin your browser is loading the frontend from.