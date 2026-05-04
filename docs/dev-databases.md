# PharmaBridge — Dev Database Guide

## Which databases does this project use?

| Database | Port | Purpose | Required in dev? |
|----------|------|---------|-----------------|
| PostgreSQL 16 | 5432 | Primary data store — all business data | **Yes, always** |
| Redis 7 | 6379 | OTP sessions, JWT blacklist, rate limiting, BullMQ job queues | **Yes** (API won't fully work without it) |

---

## PostgreSQL — Primary Data Store

### When to use it
Everything persistent: users, pharmacies, products, orders, prescriptions, payments, audit logs.
All reads/writes go through **Prisma ORM** — you never write raw SQL unless using `$queryRaw`.

### Local setup (Windows)
PostgreSQL 16 is already installed locally. The database `pharmabridge` exists at:

```
Host:     localhost
Port:     5432
Database: pharmabridge
User:     postgres
Password: root
```

### Start / stop PostgreSQL on Windows

```powershell
# Start (run as Administrator if needed)
net start postgresql-x64-16

# Stop
net stop postgresql-x64-16

# Check if running
Get-Service -Name "postgresql*"
```

Or via **Windows Services** (`services.msc`) → find `postgresql-x64-16` → Start.

### Prisma commands (run from project root)

```bash
# Apply all pending migrations (safe, creates migration files)
pnpm --filter @pharmabridge/api exec prisma migrate dev --name <migration-name>

# Quick schema push without migration files (dev only)
pnpm --filter @pharmabridge/api db:push

# Regenerate Prisma Client after schema changes
pnpm --filter @pharmabridge/api db:generate

# Open Prisma Studio (visual table browser)
pnpm --filter @pharmabridge/api db:studio

# Reset DB and re-apply all migrations (DESTRUCTIVE — wipes all data)
pnpm --filter @pharmabridge/api exec prisma migrate reset
```

### .env variable
```
DATABASE_URL="postgresql://postgres:root@localhost:5432/pharmabridge"
```

---

## Redis — Cache, Sessions & Queues

### When to use it
| Feature | How Redis is used |
|---------|------------------|
| OTP verification | Stores `phone → OTP` with 10-min TTL |
| JWT refresh token blacklist | `token_jti → "revoked"` with TTL = token expiry |
| `@fastify/rate-limit` | Sliding-window counters per IP |
| BullMQ job queues | Order notifications, prescription processing, async tasks |

### .env variable
```
REDIS_URL=redis://localhost:6379
```

---

## Plan: Running Redis on Windows (dev)

Redis has no official Windows build. Pick **one** of these options:

---

### Option A — Docker Desktop (recommended if Docker is installed)

```powershell
# One-time: create a named container
docker run -d --name pharmabridge-redis -p 6379:6379 redis:7-alpine

# Daily: start / stop
docker start pharmabridge-redis
docker stop pharmabridge-redis

# Check status
docker ps -a --filter name=pharmabridge-redis

# Connect with redis-cli to verify
docker exec -it pharmabridge-redis redis-cli ping
# Expected: PONG
```

To auto-start with Docker Desktop, go to the container in Docker Desktop UI and toggle **"Start on Docker Desktop startup"**.

---

### Option B — WSL2 (Ubuntu/Debian)

If you have WSL2 installed:

```bash
# In a WSL2 terminal — install Redis once
sudo apt update && sudo apt install redis-server -y

# Start Redis inside WSL2
sudo service redis-server start

# Verify
redis-cli ping   # → PONG
```

From PowerShell you can also start it without opening a WSL terminal:

```powershell
wsl -d Ubuntu -- sudo service redis-server start
```

**Note:** WSL2 Redis is accessible from Windows at `localhost:6379` because WSL2 ports are forwarded automatically.

To start Redis automatically when WSL2 launches, add this to `/etc/wsl.conf` inside WSL2:
```ini
[boot]
command = service redis-server start
```

---

### Option C — Memurai (native Windows service, no Docker/WSL needed)

1. Download **Memurai Developer Edition** (free) from [memurai.com](https://www.memurai.com/)
2. Run the installer — it installs as a Windows Service named `Memurai`
3. It starts automatically on Windows boot

```powershell
# Manual start/stop
net start Memurai
net stop Memurai

# Verify
redis-cli -h localhost -p 6379 ping   # → PONG
```

Memurai is 100% Redis-protocol compatible so no code changes are needed.

---

### Option D — Upstash (cloud Redis, zero local install)

Free tier: 10,000 commands/day — enough for solo dev.

1. Sign up at [upstash.com](https://upstash.com/)
2. Create a Redis database → copy the `rediss://` connection string
3. Update `.env`:
   ```
   REDIS_URL=rediss://:YOUR_PASSWORD@YOUR_ENDPOINT:PORT
   ```

---

## Recommended dev stack summary

For day-to-day development on this Windows machine:

| Database | Recommended approach | Start command |
|----------|---------------------|---------------|
| PostgreSQL 16 | Already installed as Windows service | `net start postgresql-x64-16` |
| Redis | **Option A (Docker)** or **Option C (Memurai)** | `docker start pharmabridge-redis` |

---

## Daily dev startup checklist

```powershell
# 1. Ensure PostgreSQL is running
Get-Service postgresql* | Where-Object Status -eq Running

# 2. Ensure Redis is running (Docker example)
docker start pharmabridge-redis

# 3. Start the API
pnpm dev:api
```

Once both services are up, `pnpm dev:api` should print:
```
Redis connected
Server listening at http://0.0.0.0:4000
```
