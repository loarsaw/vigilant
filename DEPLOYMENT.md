# Deployment

Vigilant ships two Compose files:

- `docker-compose.yml` — local development. Exposes Adminer and Postgres, no resource limits.
- `docker-compose.prod.yml` — production overlay. Hardens the containers (resource limits, `no-new-privileges`, read-only runners), disables Adminer, and puts Caddy in front for automatic HTTPS.

They're meant to be combined, not used alone, in production.

## 1. Point a domain at your server

Create an A record for the host you'll use (e.g. `api.your-domain.com`) pointing at your server's public IP. Caddy needs this to be live and resolving before it can request a certificate.

## 2. Configure secrets

```bash
git clone <this-repo>
cd vigilant
cp vigilant.conf.example vigilant.conf
cp .env.example .env
```

Edit `vigilant.conf` and replace every `changeme` value. Generate strong values rather than typing your own:

```bash
openssl rand -hex 32     # AUTHN_TOKEN, ADMIN_AUTH_TOKEN, JWT_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY
openssl rand -base64 24  # POSTGRES_PASSWORD
```

Edit `.env` and set:

```
DOMAIN=api.your-domain.com
```

`vigilant.conf` and `.env` are both gitignored — never commit your real copies. Only the `.example` files should be tracked.

In production, also set `ALLOW_ORIGIN` in `vigilant.conf` to your actual frontend origin (e.g. `https://app.your-domain.com`) instead of `*`.

## 3. Bring it up

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Compose merges the two files: the prod overlay closes the server's public port (traffic must go through Caddy), scales Adminer to zero replicas, and adds the resource/security limits. Caddy listens on 80/443 and automatically obtains and renews a Let's Encrypt certificate for `$DOMAIN`.

Note: the `!reset []` merge key in `docker-compose.prod.yml` requires a reasonably recent Docker Compose (v2.20+). Check with:

```bash
docker compose version
```

## 4. Verify

```bash
docker compose ps
curl -I https://api.your-domain.com/health
```

You should see a `200` from the health check and a valid TLS certificate.

## 5. Rotating secrets later

If any value in `vigilant.conf` is ever exposed (committed by accident, leaked in a log, etc.), rotate it and restart:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate server db
```

Changing `POSTGRES_PASSWORD` after the database volume already exists requires updating the password inside Postgres itself, not just the config file — see `docs/` for the migration notes if applicable.