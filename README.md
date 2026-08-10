# Diverse Way Clinic

Full-stack website for Diverse Way Clinic (Kathmandu) — static pages, REST API, Postgres database, and admin dashboard. Deployed as a serverless Express app on Vercel.

**Live domain:** [https://www.diversewayclinic.com](https://www.diversewayclinic.com)

## Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express, deployed on **Vercel** as a serverless function (see `vercel.json`)
- **Database:** Postgres (Vercel Postgres / Neon) via `DATABASE_URL` — bookings, patients, screenings, and all CMS content
- **Sessions:** Redis (Vercel KV) via `REDIS_URL` — required for admin/patient login to work reliably across serverless invocations
- **WhatsApp:** Meta WhatsApp Business Cloud API auto-notifies clinic staff on new bookings/contacts/screening callbacks (see `server/whatsapp.js`)

## Run locally

Needs a Postgres database and a Redis instance reachable via `DATABASE_URL` / `REDIS_URL`. For local development without cloud accounts, install both locally (e.g. via Homebrew: `brew install postgresql@16 redis`) and point the env vars at them.

```bash
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_URL, ADMIN_USERNAME, ADMIN_PASSWORD, and SESSION_SECRET
npm start
```

Open **http://localhost:3000**
Admin login: **http://localhost:3000/admin**

## Deploy to your domain (www.diversewayclinic.com)

This site deploys to **Vercel** as a serverless Node/Express app (`vercel.json` routes all requests to `server/index.js`).

### Deploy steps

1. Push this repo to GitHub (already done if you're reading this from the deployed repo).
2. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import **Diverseway-clinic**.
3. **Storage → Create Database → Postgres** (powered by Neon) — connect it to this project. Vercel auto-injects `POSTGRES_URL` (this app also accepts `DATABASE_URL` if you prefer to set it manually).
4. **Storage → Create Database → KV** (Redis, powered by Upstash) — connect it too. Vercel auto-injects `KV_URL` (this app also accepts `REDIS_URL`).
5. **Environment variables** (Project → Settings → Environment Variables):
   - `ADMIN_USERNAME` = your admin username (e.g. `admin`)
   - `ADMIN_PASSWORD` = a strong password for `/admin` login
   - `SESSION_SECRET` = long random string (encrypts login cookies)
   - `ADMIN_API_KEY` = optional legacy API key for scripts
   - `CANONICAL_HOST` = `www.diversewayclinic.com`
   - `SITE_URL` = `https://www.diversewayclinic.com`
   - `NODE_ENV` = `production`
   - WhatsApp notification vars (optional, see `.env.example`): `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_NOTIFY_NUMBERS`
6. Deploy. Vercel builds and runs `server/index.js` as a serverless function automatically.
7. **Custom domain** (Project → Settings → Domains): add `www.diversewayclinic.com` and `diversewayclinic.com`; Vercel shows the exact DNS records to add at your registrar (usually a CNAME for `www` and an A/ALIAS record for the apex).
8. Wait for DNS + SSL (usually 5–30 minutes). Visit **https://www.diversewayclinic.com**

### Option B — VPS / cPanel / any Linux server

```bash
git clone https://github.com/Sumit1001wok/Diverseway-clinic.git
cd Diverseway-clinic
npm install
cp .env.example .env
# Edit .env with DATABASE_URL, REDIS_URL, ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET, NODE_ENV=production, CANONICAL_HOST, SITE_URL
npm start
```

This mode runs the Express app as one long-running process (not serverless), so it also works fine with a locally-installed Postgres/Redis instead of hosted ones.

Use **PM2** or **systemd** to keep it running, and **Nginx** as reverse proxy with SSL (Let’s Encrypt):

```nginx
server {
  listen 443 ssl;
  server_name www.diversewayclinic.com diversewayclinic.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Production behaviour

- Redirects **HTTP → HTTPS**
- Redirects **diversewayclinic.com → www.diversewayclinic.com**
- Serves site + API on the **same domain** (forms use `/api/booking`, `/api/contact`)
- **Admin:** `https://www.diversewayclinic.com/admin` — sign in with username and password
- **Data:** Postgres (`DATABASE_URL`/`POSTGRES_URL`) — schema and default content are created automatically on first boot; nothing to run manually
- **Sessions:** Redis (`REDIS_URL`/`KV_URL`) — without this set, sessions fall back to in-memory storage, which is unreliable on serverless (logins may randomly drop)

## Booking system

- **Admin login:** `/admin` — manage bookings, contact messages, and available times
- **Availability:** Admin opens 15-minute blocks (7 AM – 8 PM). Patients pick service → date → available slot
- **Session lengths:** Speech & voice therapy 30 min; occupational, behaviour, counselling & others 45 min
- **Database:** Postgres — persists automatically, no separate backup/disk setup needed

### Admin quick start

1. Sign in at `/admin`
2. Under **Available appointment times**, pick a date → **Add clinic hours (7 AM – 8 PM)**
3. Close any slots you don't want open
4. New online bookings appear in **Appointment requests**

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + database info |
| GET | `/api/availability?date=&service=` | Available start times for a service |
| POST | `/api/booking` | Create appointment request |
| POST | `/api/contact` | Send contact message |
| POST | `/api/admin/login` | Admin sign-in (session cookie) |
| POST | `/api/admin/logout` | Sign out |
| GET | `/api/admin/session` | Current login status |
| GET | `/api/admin/availability?date=` | Admin view of slots for a date |
| POST | `/api/admin/availability/standard` | Open all clinic hours for a date |
| GET | `/api/admin/bookings` | List bookings (auth required) |
| PATCH | `/api/admin/bookings/:id` | Update booking (auth required) |
| GET | `/api/admin/messages` | List messages (auth required) |

Admin dashboard uses **cookie sessions** after login. API scripts can still use `Authorization: Bearer YOUR_ADMIN_API_KEY`.

## WhatsApp

Forms also support **WhatsApp**. Primary submit saves to the server.

WhatsApp: **9845366417** (`9779845366417` in wa.me links)
