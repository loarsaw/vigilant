---
sidebar_position: 2
---

# Install

This guide details the environment variables and security settings required to run the **Vigilant** suite. Configuration is split across two files: `vigilant.conf` (secrets and runtime settings) and `.env` (deployment settings — which version to run, and your public domain if using Caddy).

:::warning
Never commit your real `vigilant.conf` or `.env` to version control. Only the `.example` versions of these files should be tracked in git.
:::

## 1. Choose how you're deploying

There are two ways to run Vigilant, and it affects which files you need:

- **Self-hosting from published images (recommended)** — no Go/Node toolchain needed, just Docker. Download the release bundle (a small zip containing only `docker-compose.yml`, `docker-compose.prod.yml`, `Caddyfile`, and the two `.example` config files) from the [Releases page](https://github.com/loarsaw/vigilant/releases) instead of cloning the whole repo:

  ```bash
  wget https://github.com/loarsaw/vigilant/releases/download/v1.0.0/vigilant-1.0.0.zip
  unzip vigilant-1.0.0.zip && cd vigilant-1.0.0
  ```

- **Building from source** — for contributors, or if you're modifying the server:

  ```bash
  git clone https://github.com/loarsaw/vigilant.git
  cd vigilant
  ```

The rest of this guide applies to both — the only difference is which compose file you end up running (covered in [Launching the System](#5-launching-the-system)).

## 2. The Configuration Files

### `vigilant.conf`

Copy the example file and fill in real values:

```bash
cp vigilant.conf.example vigilant.conf
```

```ini
# ============================================================
#                   VIGILANT CONFIGURATION
#   Copy this file to `vigilant.conf` and fill in real values.
#   NEVER commit the real `vigilant.conf` — it holds secrets.
# ============================================================

# Server
SERVER_PORT=3333
SERVER_HOST=0.0.0.0

# Database (PostgreSQL)
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=vigilant
POSTGRES_USER=vigilant
# generate: openssl rand -base64 24
POSTGRES_PASSWORD=changeme

# Authentication
# generate: openssl rand -hex 32
AUTHN_TOKEN=changeme

# Admin
# generate: openssl rand -hex 32
ADMIN_AUTH_TOKEN=changeme
# optional: restrict admin routes to a specific IP. Leave blank to allow any.
ADMIN_IP_ADDRESS=
ADMIN_SESSION_TIMEOUT=24

# Security
# generate: openssl rand -hex 32
JWT_SECRET=changeme
BCRYPT_COST=10

# Code Execution
DATA_RETENTION_HOURS=72
RATE_LIMIT_PER_MINUTE=120
CLIENT_UPDATE_INTERVAL=5
HIGH_MEMORY_THRESHOLD=500

# Network & CORS
ENABLE_WEBSOCKETS=true
# In production, set this to your actual frontend origin, e.g.
# https://app.your-domain.com — do not leave as * outside local dev.
ALLOW_ORIGIN=*

# Encryption
# generate: openssl rand -base64 32
ENCRYPTION_KEY=
```

:::danger
The server **will not start** with a missing or weak `JWT_SECRET` or `ENCRYPTION_KEY` — it fails fast on boot rather than running in a silently-insecure state. Specifically:
- `JWT_SECRET` must be at least 32 characters.
- `ENCRYPTION_KEY` must be valid base64 for exactly 32 raw bytes (AES-256).

If either is wrong, the server logs exactly which one and why, then exits immediately — check `docker compose logs server` if the `server` container keeps restarting.
:::

### `.env`

Used for two things: telling the release compose file which image version to pull, and telling Caddy which domain to serve.

```bash
cp .env.example .env
```

```ini
# Which released version to run. Pin this to a specific tag once you're
# past initial setup — don't float on "latest" for anything you care
# about staying stable. Only relevant if you're using docker-compose.yml
# from a release bundle (pulls images); has no effect if you're building
# from source.
VIGILANT_VERSION=1.0.0

# Public hostname Caddy will request a TLS cert for and reverse-proxy to
# the server container. Must be a real DNS record pointing at this host's
# public IP for Caddy to obtain a Let's Encrypt certificate automatically.
# Only needed if you're using the docker-compose.prod.yml overlay.
DOMAIN=api.your-domain.com
```

Point an A record for `DOMAIN` at your server's public IP **before** starting the stack — Caddy needs it resolvable to issue a certificate.

---

## 3. Generating Secrets

Don't hand-type secrets. Generate strong values for each `changeme` / blank field in `vigilant.conf`:

```bash
openssl rand -hex 32     # AUTHN_TOKEN, ADMIN_AUTH_TOKEN, JWT_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY
openssl rand -base64 24  # POSTGRES_PASSWORD
```

---

## 4. Parameter Explanation

To ensure **Vigilant** operates securely on your VPS, it is important to understand what these variables control.

### **Server & Network**
* **`SERVER_PORT`**: The internal port for the Go server (default 3333).
* **`SERVER_HOST`**: Set to `0.0.0.0` to allow Docker to route traffic from the host to the container.
* **`ALLOW_ORIGIN`**: Controls CORS. Using `*` is fine for development, but in production, replace this with your actual domain — a wildcard origin combined with credentialed requests will be rejected by browsers anyway, so leaving it at `*` breaks things rather than making them more open.
* **`VIGILANT_VERSION`** *(`.env`)*: Which published image tag to pull, if you're using the release bundle.
* **`DOMAIN`** *(`.env`)*: The public hostname Caddy fronts. Used for automatic HTTPS via Let's Encrypt.

### **Database (PostgreSQL)**
* **`POSTGRES_HOST`**: This is set to `db` because the Go backend needs to resolve the database service name defined in your compose file.
* **`POSTGRES_PASSWORD`**: **Action required.** Never leave this as `changeme` — generate a unique, strong password before deployment (see [Generating Secrets](#3-generating-secrets)).

### **Security & Encryption**
* **`JWT_SECRET`**: Signs candidate session tokens. Must be at least 32 characters — see the warning above.
* **`ENCRYPTION_KEY`**: Encrypts sensitive integration credentials (email, GitHub, Twilio, LiveKit) at rest in the database. Must be a valid 32-byte base64 key — see the warning above.
    * **Setup:** Run `openssl rand -base64 32` and paste the result here.
* **`BCRYPT_COST`**: Defines the computational effort for hashing admin passwords. `10` is the industry standard for balancing security and performance.
* **`ADMIN_IP_ADDRESS`**: Optional comma-separated IP allowlist for the admin panel. Leaving this blank does **not** fail to start — it just disables the allowlist entirely (any IP can reach admin routes). Set this deliberately if you want network-level restriction.

### **Code Execution**
These four settings all apply to the code-judge service — the sandboxed runner that executes candidate-submitted code (`/execute`) — not to the Electron desktop client or its integrity/anti-cheat monitoring.

* **`HIGH_MEMORY_THRESHOLD`**: The memory ceiling (in MB) for a single code execution. If a submission's peak memory usage exceeds this, the judge marks that submission's status as `high_memory` in its result (alongside `accepted`, `timeout`, or `error`) rather than failing the request. Defaults to `500` if unset or invalid.
* **`DATA_RETENTION_HOURS`**: How long completed code-judge submissions (code, stdout/stderr, exit code, timing, memory) are kept in the `judge_submissions` table before a background worker purges them. Cleanup runs once on server start, then every 6 hours. Defaults to `72` if unset or invalid.
* **`RATE_LIMIT_PER_MINUTE`**: Caps how many code-execution requests the judge API will accept per minute, to keep the sandbox runners from being overwhelmed.
* **`CLIENT_UPDATE_INTERVAL`**: How often (in seconds) the code-judge environment polls/refreshes execution status for a running or queued submission.

### **Integrity & Performance**
Settings that affect the Electron client and admin-side monitoring live here — currently none of the four vars above belong in this section; see **Code Execution** above.

---

## 5. Launching the System

Which compose file you start with depends on how you're deploying (from [step 1](#1-choose-how-youre-deploying)):

| | Base file | Notes |
|---|---|---|
| Self-hosting (published images) | `docker-compose.yml` (from the release bundle — this is `docker-compose.release.yml` in the source repo, renamed) | Pulls `epichypatia/vigilant-*` images, no build step |
| Building from source | `docker-compose.yml` (repo root) | Builds the server + all 5 code-judge runners locally |

Either base file can optionally be combined with the `docker-compose.prod.yml` overlay, which adds Caddy for automatic HTTPS, closes the server's direct port exposure, disables Adminer, and applies resource/security limits. Compose merges files by service name, so the same overlay works on top of either base:

**Self-hosting, no TLS (e.g. behind your own reverse proxy, or just testing):**

```bash
docker compose up -d
```

**Self-hosting, with Caddy handling TLS automatically:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Building from source, with Caddy:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

(Only the source-build path needs `--build` — the release bundle's `docker-compose.yml` has no `build:` directives to trigger, so `--build` there is a no-op.)

:::tip
Requires Docker Compose v2.20+ (the prod overlay uses the `!reset` merge key). Check with `docker compose version`.
:::

### Verify

```bash
docker compose ps
curl -I https://api.your-domain.com/health   # with Caddy
curl -I http://localhost:3333/health          # without Caddy
```

You should see a `200` response (and a valid TLS certificate, if using Caddy).

### First-boot checklist

Once the server's running, log into the admin app. On first boot, the server checks whether Email (AWS SES), LiveKit, GitHub, and an AI provider have been configured, and raises an admin notification listing anything still missing. Nothing hard-fails if you skip these — they gate specific features (invite emails, video interviews, assignment repo creation, AI-assisted review) — but the notification is your post-install checklist.

---

## 6. Before You Upgrade

Always back up your database before pulling a new version:

```bash
docker compose exec db pg_dump -U vigilant vigilant > backup-$(date +%F).sql
```

Schema changes are applied automatically on server startup — there's no separate migration command. If you're on the release-images path, upgrading is:

```bash
# bump VIGILANT_VERSION in .env, then:
docker compose pull
docker compose up -d
```

Check the changelog for any new required variables in `vigilant.conf` before upgrading — these need to be added manually, since your existing `vigilant.conf` isn't overwritten.