# PharmaBridge — Complete API Keys & Services Setup Guide
### Every service, every key, step-by-step with exact URLs

---

## Overview — All Services You Need

| Service | Purpose | Cost | Priority |
|---|---|---|---|
| Supabase | PostgreSQL database | Free (500MB) | 🔴 Required |
| Upstash | Redis cache + queues | Free (10K req/day) | 🔴 Required |
| Cloudinary | Image/file storage | Free (25GB) | 🔴 Required |
| Razorpay | Payments (UPI/Cards) | Free + 2% per txn | 🔴 Required |
| MSG91 | OTP SMS India | Pay-per-use (~₹0.20/SMS) | 🔴 Required |
| Firebase | Push notifications | Free | 🔴 Required |
| MeiliSearch | Medicine search | Free (self-host) | 🟡 Required |
| Railway | Backend hosting | Free ($5 credit) | 🟡 Required |
| Vercel | Frontend hosting | Free | 🟡 Required |
| Cloudflare | CDN + DNS | Free | 🟡 Required |
| Sentry | Error monitoring | Free (5K errors/mo) | 🟢 Optional |

**Estimated monthly cost at launch:** ₹0 (all free tiers are enough to start)

---

## STEP 1 — Supabase (PostgreSQL Database)

**URL:** https://supabase.com

### How to get your keys:
1. Go to https://supabase.com → click **Start your project**
2. Sign up with GitHub (easiest)
3. Click **New project**
4. Fill in:
   - **Organization:** create one (e.g. "PharmaBridge")
   - **Name:** `pharmabridge`
   - **Database Password:** create a strong password — **SAVE THIS, you cannot recover it**
   - **Region:** `Southeast Asia (Singapore)` — closest to India
   - **Pricing Plan:** Free
5. Click **Create new project** — wait ~2 minutes for it to spin up
6. Once ready, go to: **Settings → Database**
7. Scroll to **Connection string** → select **URI** tab
8. Copy the URI — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
9. Replace `[YOUR-PASSWORD]` with the password you set in step 4

### What to put in .env:
```bash
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres"
```

### Notes:
- Keep **Direct connection** URL (not the pooler URL) for Prisma migrations
- If you see a "Pooler" connection string option, use the **Direct** one for `DATABASE_URL`
- The free tier gives you 500MB storage and 2 concurrent connections — enough for development and early launch

---

## STEP 2 — Upstash (Redis)

**URL:** https://upstash.com

### How to get your keys:
1. Go to https://upstash.com → **Start for free**
2. Sign up with GitHub or Google
3. Click **Create Database**
4. Fill in:
   - **Name:** `pharmabridge-redis`
   - **Type:** Regional
   - **Region:** `ap-south-1` (Mumbai) — closest to India
   - **Enable Eviction:** OFF (we need persistent OTP storage)
5. Click **Create**
6. On the database page, find the **REST API** section
7. Click **Redis** tab (not REST)
8. Copy the connection string that looks like:
   ```
   redis://default:XXXXXXXXXXXXXXXXXX@caring-owl-12345.upstash.io:6379
   ```

### What to put in .env:
```bash
REDIS_URL="redis://default:XXXXXXXXXXXX@caring-owl-12345.upstash.io:6379"
```

### Notes:
- Free tier: 10,000 commands/day, 256MB — plenty for development
- Upstash Redis works with ioredis (the package used in this project) out of the box

---

## STEP 3 — Cloudinary (Images & File Storage)

**URL:** https://cloudinary.com

### How to get your keys:
1. Go to https://cloudinary.com → **Sign up for free**
2. Fill in details — select **Developer** as your role
3. After signup, you land on the **Dashboard**
4. You'll see your credentials immediately:
   - **Cloud name** (e.g. `dxxxxxxxxx`)
   - **API Key** (a long number)
   - **API Secret** (keep this private — never expose in frontend)

### Setting up Upload Preset (required for direct frontend uploads):
1. In Cloudinary dashboard → **Settings** (gear icon, top right)
2. Click **Upload** tab
3. Scroll to **Upload presets** → click **Add upload preset**
4. Fill in:
   - **Preset name:** `pharmabridge-unsigned`
   - **Signing Mode:** `Unsigned` (this allows frontend direct upload)
   - **Folder:** `pharmabridge`
5. Click **Save**

### Setting up folders (optional but organized):
In Cloudinary dashboard → **Media Library** → create these folders:
- `pharmabridge/prescriptions`
- `pharmabridge/medicines`
- `pharmabridge/pharmacy-logos`
- `pharmabridge/licenses`
- `pharmabridge/doctors`

### What to put in .env:
```bash
# Backend (packages/api/.env)
CLOUDINARY_CLOUD_NAME="dxxxxxxxxx"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Frontend (apps/customer/.env, apps/pharmacy/.env)
VITE_CLOUDINARY_CLOUD_NAME="dxxxxxxxxx"
VITE_CLOUDINARY_UPLOAD_PRESET="pharmabridge-unsigned"
```

### Notes:
- Free tier: 25GB storage, 25GB bandwidth/month
- Never put `CLOUDINARY_API_SECRET` in any frontend `.env` file
- The upload preset is what allows frontend to upload directly without exposing the secret

---

## STEP 4 — Razorpay (Payments)

**URL:** https://razorpay.com

### How to get your keys:
1. Go to https://razorpay.com → **Sign Up**
2. Enter your business details:
   - **Business Type:** Individual / Proprietorship (if you don't have a company yet)
   - **Business Name:** PharmaBridge
   - **Business Category:** Healthcare
3. Verify your email and phone
4. You'll be on the **Test Mode** dashboard immediately — you don't need to submit KYC to use test mode
5. Go to **Settings** (left sidebar) → **API Keys**
6. Click **Generate Test Key**
7. You'll see:
   - **Key ID:** starts with `rzp_test_`
   - **Key Secret:** shown once — copy it immediately and save it

### Setting up Webhook (for payment confirmation):
1. Go to **Settings → Webhooks**
2. Click **Add New Webhook**
3. **Webhook URL:** `https://your-api-domain.com/api/v1/payments/webhook`
   - For development: use ngrok (see note below)
4. **Secret:** create any random string (e.g. generate with: `openssl rand -hex 32`)
5. Select these events to listen to:
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `refund.processed`
6. Click **Create Webhook**

### For local development webhook testing (ngrok):
```bash
# Install ngrok: https://ngrok.com
ngrok http 3001
# Copy the https URL it gives you (e.g. https://abc123.ngrok.io)
# Use that as your webhook URL in Razorpay
```

### What to put in .env:
```bash
RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXX"
RAZORPAY_KEY_SECRET="XXXXXXXXXXXXXXXXXXXXXXXX"
RAZORPAY_WEBHOOK_SECRET="your-random-32-char-string"

# Frontend
VITE_RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXX"
```

### Going Live (when ready):
1. Complete KYC in Razorpay dashboard (business docs, bank account)
2. Get Live keys from Settings → API Keys → Generate Live Key
3. Replace `rzp_test_` keys with `rzp_live_` keys
4. **Never mix test and live keys**

---

## STEP 5 — MSG91 (OTP SMS)

**URL:** https://msg91.com

### How to get your keys:
1. Go to https://msg91.com → **Sign Up**
2. Verify your mobile number (Indian number required)
3. After login → go to **API** section (left sidebar)
4. Your **Auth Key** is shown here — copy it

### DLT Registration (MANDATORY for India SMS):
This is a legal requirement by TRAI. Without it, your SMS won't be delivered.

1. Go to **DLT** section in MSG91 dashboard
2. Click **Register on DLT**
3. You'll be redirected to https://www.vilpower.in (Vodafone's DLT portal)
   OR https://traidlt.com
4. Register your business:
   - **Entity Type:** Individual or Company
   - **Entity Name:** PharmaBridge
   - **Business Category:** Healthcare/Pharmacy
5. After registration (takes 1–3 days), you get a **Principal Entity ID**
6. Come back to MSG91 → **DLT** → enter your Principal Entity ID

### Creating OTP Template:
1. In MSG91 → **SMS** → **Templates**
2. Click **Create Template**
3. Template Type: **Transactional**
4. Template content (exact format):
   ```
   Your PharmaBridge OTP is {#var#}. Valid for 10 minutes. Do not share with anyone. - PharmaBridge
   ```
5. Submit for DLT approval — takes 1–24 hours
6. Once approved, you get a **Template ID**

### What to put in .env:
```bash
MSG91_AUTH_KEY="XXXXXXXXXXXXXXXXXXXXXX"
MSG91_TEMPLATE_ID="XXXXXXXXXX"
MSG91_SENDER_ID="PHARMB"
```

### Temporary workaround for development:
While waiting for DLT approval, log OTP to console. In your auth service:
```typescript
// dev only — console.log instead of MSG91
if (process.env.NODE_ENV === 'development') {
  console.log(`OTP for ${phone}: ${otp}`)
} else {
  await sendSMS(phone, otp) // MSG91
}
```

---

## STEP 6 — Firebase (Push Notifications)

**URL:** https://console.firebase.google.com

### How to get your keys:
1. Go to https://console.firebase.google.com
2. Click **Create a project**
3. **Project name:** `pharmabridge`
4. Disable Google Analytics (not needed for now) → click **Create project**
5. Wait for project to be created → click **Continue**

### Getting the Service Account key (for backend):
1. In Firebase Console → click the ⚙️ gear icon → **Project settings**
2. Click **Service accounts** tab
3. Click **Generate new private key**
4. A JSON file downloads — this contains your credentials
5. Open the JSON file — you need these values:
   - `project_id`
   - `client_email`
   - `private_key` (the long RSA key starting with `-----BEGIN PRIVATE KEY-----`)

### Enabling Cloud Messaging:
1. In Firebase Console → **Build** → **Cloud Messaging**
2. The API is enabled by default for new projects

### Getting the Web Push VAPID key (for PWA notifications):
1. Firebase Console → Project Settings → **Cloud Messaging** tab
2. Scroll to **Web configuration**
3. Click **Generate key pair** under Web Push certificates
4. Copy the **Key pair** (this is your VAPID public key)

### What to put in .env:
```bash
# Backend (packages/api/.env)
FIREBASE_PROJECT_ID="pharmabridge-xxxxx"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@pharmabridge-xxxxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXXX\n-----END PRIVATE KEY-----\n"

# Frontend (apps/customer/.env)
VITE_FIREBASE_VAPID_KEY="BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Important note about FIREBASE_PRIVATE_KEY:
The private key in the JSON file has actual newlines. In .env you must replace them with `\n`:
```bash
# The JSON file has:
"private_key": "-----BEGIN PRIVATE KEY-----\nABCDEF\n-----END PRIVATE KEY-----\n"

# In .env, wrap it in double quotes exactly as shown above
# The \n characters must stay as \n (not actual newlines)
```

---

## STEP 7 — MeiliSearch (Medicine Search)

MeiliSearch is **self-hosted** — you run it yourself. Two options:

### Option A: Run locally (development)
```bash
# Install and run MeiliSearch locally
curl -L https://install.meilisearch.com | sh
./meilisearch --master-key="your-secret-master-key"

# It runs on http://localhost:7700
```

### Option B: MeiliSearch Cloud (production — free tier available)
**URL:** https://cloud.meilisearch.com

1. Go to https://cloud.meilisearch.com → **Get started**
2. Sign up with GitHub or email
3. Click **New project**
4. **Project name:** `pharmabridge`
5. **Region:** `ap-southeast-1` (Singapore — closest to India)
6. **Plan:** Free (100K documents, plenty for start)
7. Click **Create**
8. On the project page, you'll see:
   - **Host URL** (e.g. `https://ms-xxxx.meilisearch.io`)
   - **Default API Key** (use this as master key)
   - **Search-only API Key** (use this in frontend — limited permissions)

### What to put in .env:
```bash
# Backend (packages/api/.env)
MEILISEARCH_HOST="https://ms-xxxx.meilisearch.io"   # or http://localhost:7700 for local
MEILISEARCH_KEY="your-master-key"

# Frontend (apps/customer/.env) — search-only key, safe to expose
VITE_MEILISEARCH_HOST="https://ms-xxxx.meilisearch.io"
VITE_MEILISEARCH_KEY="your-search-only-key"
```

---

## STEP 8 — Railway (Backend Hosting)

**URL:** https://railway.app

### How to set up:
1. Go to https://railway.app → **Login with GitHub**
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Connect your GitHub account → select your `pharmabridge` repo
5. Railway will detect it's a Node.js project
6. Click on the service → **Settings** tab
7. Set:
   - **Root Directory:** `packages/api`
   - **Build Command:** `pnpm install && pnpm build && pnpm prisma migrate deploy`
   - **Start Command:** `pnpm start`
8. Go to **Variables** tab → add all your backend `.env` variables here

### Getting your Railway backend URL:
1. In Railway → your service → **Settings** → **Domains**
2. Click **Generate Domain**
3. You get a URL like: `https://pharmabridge-api-production.up.railway.app`
4. Use this as your frontend's `VITE_API_URL`

### Notes:
- Free tier: $5 credit/month (enough for ~500 hours of usage)
- You'll need to upgrade to Hobby ($5/month) for persistent uptime
- Railway automatically redeploys when you push to GitHub main branch

---

## STEP 9 — Vercel (Frontend Hosting)

**URL:** https://vercel.com

### How to set up (repeat for all 3 apps):
1. Go to https://vercel.com → **Sign up with GitHub**
2. Click **Add New Project**
3. Import your `pharmabridge` GitHub repo
4. For **each app** (customer, pharmacy, admin):
   - **Root Directory:** `apps/customer` (or `apps/pharmacy`, `apps/admin`)
   - **Framework Preset:** Vite
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
5. Click **Environment Variables** → add your frontend `.env` variables
6. Click **Deploy**
7. You get URLs like:
   - `https://pharmabridge.vercel.app` (customer)
   - `https://pharmabridge-pharmacy.vercel.app` (pharmacy panel)
   - `https://pharmabridge-admin.vercel.app` (admin panel)

### Custom domain (optional):
1. Buy a domain (e.g. `pharmabridge.in`) from GoDaddy, Namecheap, or Google Domains
2. In Vercel → your project → **Settings → Domains**
3. Add your domain → Vercel gives you DNS records to add

---

## STEP 10 — Cloudflare (CDN + DNS)

**URL:** https://cloudflare.com

### How to set up:
1. Go to https://cloudflare.com → **Sign up** (free)
2. Click **Add a Site**
3. Enter your domain (e.g. `pharmabridge.in`)
4. Select **Free plan**
5. Cloudflare scans your existing DNS records
6. Update your domain's nameservers at your registrar to Cloudflare's nameservers
   (Cloudflare shows you exactly which nameservers to use)
7. Once active, Cloudflare automatically:
   - Serves your assets from CDN servers in Mumbai, Chennai, Hyderabad
   - Provides free SSL/HTTPS
   - Protects against DDoS

### What goes in .env:
Nothing — Cloudflare works at DNS level, no API keys needed for basic setup.

---

## STEP 11 — Sentry (Error Monitoring — Optional but Recommended)

**URL:** https://sentry.io

### How to get your keys:
1. Go to https://sentry.io → **Create account** (free)
2. **Create Organization:** PharmaBridge
3. For **backend**: Click **Create Project** → select **Node.js** → name it `pharmabridge-api`
4. For **frontend**: Create another project → select **React** → name it `pharmabridge-customer`
5. Each project gives you a **DSN** (Data Source Name) — a URL that looks like:
   ```
   https://xxxxxxxxxx@o123456.ingest.sentry.io/123456
   ```

### What to put in .env:
```bash
# Backend
SENTRY_DSN="https://xxxxxxxxxx@o123456.ingest.sentry.io/123456"

# Frontend
VITE_SENTRY_DSN="https://yyyyyyyyyy@o123456.ingest.sentry.io/789012"
```

---

## STEP 12 — JWT Secrets (Generate Yourself)

These are not from any external service — you generate them yourself.

### How to generate:
Run this command in your terminal:
```bash
# Generate ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate REFRESH_SECRET (run again to get different value)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or use this one-liner to generate both:
```bash
echo "JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
```

### What to put in .env:
```bash
JWT_ACCESS_SECRET="a1b2c3d4e5f6....(128 hex chars)"
JWT_REFRESH_SECRET="f6e5d4c3b2a1....(128 hex chars, DIFFERENT from access)"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="30d"
```

---

## Complete .env Files

### `packages/api/.env` (Backend — NEVER commit this to git)

```bash
# ─── DATABASE ───
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres"

# ─── REDIS ───
REDIS_URL="redis://default:XXXXXXXXXXXX@caring-owl-12345.upstash.io:6379"

# ─── JWT (generate with crypto.randomBytes) ───
JWT_ACCESS_SECRET="128-char-hex-string-here"
JWT_REFRESH_SECRET="different-128-char-hex-string-here"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="30d"

# ─── CLOUDINARY ───
CLOUDINARY_CLOUD_NAME="dxxxxxxxxx"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ─── RAZORPAY ───
RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXX"
RAZORPAY_KEY_SECRET="XXXXXXXXXXXXXXXXXXXXXXXX"
RAZORPAY_WEBHOOK_SECRET="your-32-char-random-string"

# ─── MSG91 (SMS / OTP) ───
MSG91_AUTH_KEY="XXXXXXXXXXXXXXXXXXXXXX"
MSG91_TEMPLATE_ID="XXXXXXXXXX"
MSG91_SENDER_ID="PHARMB"

# ─── FIREBASE (FCM push notifications) ───
FIREBASE_PROJECT_ID="pharmabridge-xxxxx"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@pharmabridge-xxxxx.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXXX\n-----END PRIVATE KEY-----\n"

# ─── MEILISEARCH ───
MEILISEARCH_HOST="https://ms-xxxx.meilisearch.io"
MEILISEARCH_KEY="your-master-key"

# ─── SENTRY (optional) ───
SENTRY_DSN="https://xxxxxxxxxx@o123456.ingest.sentry.io/123456"

# ─── APP CONFIG ───
NODE_ENV="development"
PORT="3001"
FRONTEND_URLS="http://localhost:5173,http://localhost:5174,http://localhost:5175"
COOKIE_DOMAIN="localhost"
```

---

### `apps/customer/.env` (Customer PWA Frontend)

```bash
VITE_API_URL="http://localhost:3001"
VITE_SOCKET_URL="http://localhost:3001"
VITE_RAZORPAY_KEY_ID="rzp_test_XXXXXXXXXX"
VITE_MEILISEARCH_HOST="https://ms-xxxx.meilisearch.io"
VITE_MEILISEARCH_KEY="your-SEARCH-ONLY-key"
VITE_CLOUDINARY_CLOUD_NAME="dxxxxxxxxx"
VITE_CLOUDINARY_UPLOAD_PRESET="pharmabridge-unsigned"
VITE_FIREBASE_VAPID_KEY="BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
VITE_SENTRY_DSN="https://yyyyyyyyyy@o123456.ingest.sentry.io/789012"
```

---

### `apps/pharmacy/.env` (Pharmacy Panel Frontend)

```bash
VITE_API_URL="http://localhost:3001"
VITE_SOCKET_URL="http://localhost:3001"
VITE_CLOUDINARY_CLOUD_NAME="dxxxxxxxxx"
VITE_CLOUDINARY_UPLOAD_PRESET="pharmabridge-unsigned"
VITE_FIREBASE_VAPID_KEY="BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

### `apps/admin/.env` (Admin Panel Frontend)

```bash
VITE_API_URL="http://localhost:3001"
VITE_SOCKET_URL="http://localhost:3001"
VITE_CLOUDINARY_CLOUD_NAME="dxxxxxxxxx"
VITE_CLOUDINARY_UPLOAD_PRESET="pharmabridge-unsigned"
```

---

### Production `.env` changes (when you deploy)

When deploying to Railway + Vercel, update these values:

```bash
# Backend (Railway env vars)
NODE_ENV="production"
FRONTEND_URLS="https://pharmabridge.in,https://pharmacy.pharmabridge.in,https://admin.pharmabridge.in"
COOKIE_DOMAIN=".pharmabridge.in"
PORT="3001"

# Frontend (Vercel env vars)
VITE_API_URL="https://pharmabridge-api-production.up.railway.app"
VITE_SOCKET_URL="https://pharmabridge-api-production.up.railway.app"
```

---

## .env.example File (commit this to git — no real values)

Create `packages/api/.env.example`:

```bash
# Copy this file to .env and fill in real values
# NEVER commit .env to git

DATABASE_URL="postgresql://user:password@host:5432/pharmabridge"
REDIS_URL="redis://default:password@host:6379"

JWT_ACCESS_SECRET="generate-with-crypto-randomBytes-64-hex"
JWT_REFRESH_SECRET="generate-with-crypto-randomBytes-64-hex-different"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="30d"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

RAZORPAY_KEY_ID="rzp_test_or_live_XXXXXXXXXX"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"

MSG91_AUTH_KEY="your-msg91-auth-key"
MSG91_TEMPLATE_ID="your-dlt-approved-template-id"
MSG91_SENDER_ID="PHARMB"

FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

MEILISEARCH_HOST="https://ms-xxxx.meilisearch.io"
MEILISEARCH_KEY="your-master-key"

SENTRY_DSN="https://xxx@sentry.io/xxx"

NODE_ENV="development"
PORT="3001"
FRONTEND_URLS="http://localhost:5173,http://localhost:5174,http://localhost:5175"
COOKIE_DOMAIN="localhost"
```

---

## .gitignore — Make Sure These Are Excluded

Your `.gitignore` at the project root must include:
```
.env
.env.local
.env.production
.env.*.local
*.pem
firebase-service-account.json
```

---

## Recommended Setup Order

Follow this exact order — some services depend on others:

```
Day 1 (30 min total):
  1. ✅ Supabase — database first, everything needs it
  2. ✅ Upstash — Redis, needed for auth
  3. ✅ Generate JWT secrets — takes 1 minute
  4. ✅ Cloudinary — needed for file uploads

Day 1 continued (45 min):
  5. ✅ Razorpay — sign up, get test keys (no KYC needed for test mode)
  6. ✅ Firebase — push notifications setup
  7. ✅ MeiliSearch — run locally for dev (just one command)

Day 2 (after you have working code):
  8. ✅ MSG91 + DLT registration — takes 1-3 days for approval
     (use console.log OTP workaround in the meantime)

When ready to deploy:
  9. ✅ Railway — backend hosting
  10. ✅ Vercel — frontend hosting (3 deployments)
  11. ✅ Cloudflare — DNS + CDN (only if you have a domain)
  12. ✅ Sentry — error monitoring (can add anytime)
```

---

## Quick Reference — All Signup URLs

| Service | Signup URL | Time to set up |
|---|---|---|
| Supabase | https://supabase.com | 5 min |
| Upstash | https://upstash.com | 3 min |
| Cloudinary | https://cloudinary.com | 5 min |
| Razorpay | https://razorpay.com | 10 min |
| MSG91 | https://msg91.com | 10 min + 1-3 days DLT |
| Firebase | https://console.firebase.google.com | 10 min |
| MeiliSearch Cloud | https://cloud.meilisearch.com | 5 min |
| Railway | https://railway.app | 5 min |
| Vercel | https://vercel.com | 5 min |
| Cloudflare | https://cloudflare.com | 10 min |
| Sentry | https://sentry.io | 5 min |
| ngrok (local dev) | https://ngrok.com | 3 min |

---

*PharmaBridge — Environment Setup Guide*
*Version 1.0 — May 2026*