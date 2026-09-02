---
sidebar_position: 1
---

# Setup

This guide details the environment variables and security settings required to run the **Vigilant** suite. Configuration is split across two files: `vigilant.conf` (secrets and runtime settings) and `.env` (your public domain, used by Caddy).

:::warning
Never commit your real `vigilant.conf` or `.env` to version control. Only the `.example` versions of these files should be tracked in git.
:::

## 1. The Configuration Files

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

# Performance & Limits
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

### `.env`

Caddy reads this at the repo root to know which domain to request a TLS certificate for:

```bash
cp .env.example .env
```

```ini
# Public hostname Caddy will request a TLS cert for and reverse-proxy to
# the server container. Must be a real DNS record pointing at this host's
# public IP for Caddy to obtain a Let's Encrypt certificate automatically.
DOMAIN=api.your-domain.com
```

Point an A record for this hostname at your server's public IP **before** starting the stack — Caddy needs it resolvable to issue a certificate.

---

## 2. Generating Secrets

Don't hand-type secrets. Generate strong values for each `changeme` / blank field in `vigilant.conf`:

```bash
openssl rand -hex 32     # AUTHN_TOKEN, ADMIN_AUTH_TOKEN, JWT_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY
openssl rand -base64 24  # POSTGRES_PASSWORD
```

---

## 3. Parameter Explanation

To ensure **Vigilant** operates securely on your VPS, it is important to understand what these variables control.

### **Server & Network**
* **`SERVER_PORT`**: The internal port for the Go server (default 3333).
* **`SERVER_HOST`**: Set to `0.0.0.0` to allow Docker to route traffic from the host to the container.
* **`ALLOW_ORIGIN`**: Controls CORS. Using `*` is fine for development, but in production, replace this with your actual domain to prevent unauthorized web access.
* **`DOMAIN`** *(`.env`)*: The public hostname Caddy fronts. Used for automatic HTTPS via Let's Encrypt.

### **Database (PostgreSQL)**
* **`POSTGRES_HOST`**: This is set to `db` because the Go backend needs to resolve the database service name defined in your `docker-compose.yml`.
* **`POSTGRES_PASSWORD`**: **Action required.** Never leave this as `changeme` — generate a unique, strong password before deployment (see [Generating Secrets](#2-generating-secrets)).

### **Security & Encryption**
* **`JWT_SECRET`**: A secret key used to sign session tokens. Generate a long, random string for this.
* **`ENCRYPTION_KEY`**: Used to encrypt sensitive data at rest within the database.
    * **Setup:** Run `openssl rand -base64 32` in your terminal and paste the generated string here.
* **`BCRYPT_COST`**: Defines the computational effort for hashing passwords. `10` is the industry standard for balancing security and performance.

### **Integrity & Performance**
* **`HIGH_MEMORY_THRESHOLD`**: If the Electron client or a monitored process exceeds this limit (500MB), the system flags it as a potential integrity risk.
* **`DATA_RETENTION_HOURS`**: To prevent your VPS storage from filling up, Vigilant will automatically purge logs and historical data older than 72 hours.
* **`CLIENT_UPDATE_INTERVAL`**: How often (in seconds) the system heartbeats and checks the process tree.

---

## 4. Launching the System

Two Compose files are provided:

* `docker-compose.yml` — local development (exposes Adminer, no resource limits).
* `docker-compose.prod.yml` — production overlay (hardened containers, no Adminer, Caddy for automatic HTTPS).

**Local development:**

```bash
docker compose up -d
```

**Production (VPS):**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Compose merges the two files: the prod overlay closes the server's public port (traffic must route through Caddy), disables Adminer, and applies the resource/security limits. Caddy listens on 80/443 and automatically obtains and renews a certificate for the `DOMAIN` set in `.env`.

:::tip
Requires Docker Compose v2.20+ (the prod overlay uses the `!reset` merge key). Check with `docker compose version`.
:::

### Verify

```bash
docker compose ps
curl -I https://api.your-domain.com/health
```

You should see a `200` response and a valid TLS certificate.

---

## 5. Before You Upgrade

Always back up your database before pulling a new version:

```bash
docker compose exec db pg_dump -U vigilant vigilant > backup-$(date +%F).sql
```

Schema changes are applied automatically on server startup. Check the changelog for any new required variables in `vigilant.conf` before upgrading — these will need to be added manually since your existing `vigilant.conf` isn't overwritten.