# Diverse Way Clinic

Full-stack website for Diverse Way Clinic (Kathmandu) — static pages, REST API, SQLite database, and admin dashboard.

**Live domain:** [https://www.diversewayclinic.com](https://www.diversewayclinic.com)

## Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Database:** SQLite (`data/clinic.db`) — bookings and contact messages persist across restarts

## Run locally

```bash
npm install
cp .env.example .env
# Edit .env — set ADMIN_USERNAME, ADMIN_PASSWORD, and SESSION_SECRET
npm start
```

Open **http://localhost:3000**  
Admin login: **http://localhost:3000/admin**

## Deploy to your domain (www.diversewayclinic.com)

This site is a **Node.js app** (not static GitHub Pages). Use a host that runs `npm start`, then point your domain DNS there.

### Option A — Render (recommended, free tier)

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Web Service** → connect **Diverseway-clinic**.
3. Render reads `render.yaml` automatically, or set manually:
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Health check:** `/api/health`
4. **Environment variables:**
   - `NODE_ENV` = `production`
   - `ADMIN_USERNAME` = your admin username (e.g. `admin`)
   - `ADMIN_PASSWORD` = a strong password for `/admin` login
   - `SESSION_SECRET` = long random string (encrypts login cookies)
   - `ADMIN_API_KEY` = optional legacy API key for scripts
   - `CANONICAL_HOST` = `www.diversewayclinic.com`
   - `SITE_URL` = `https://www.diversewayclinic.com`
   - `DATA_DIR` = `/opt/render/project/src/data` (when using a persistent disk — see below)
5. **Custom domain** (Render dashboard → Settings → Custom Domains):
   - Add `www.diversewayclinic.com`
   - Add `diversewayclinic.com` (apex) — Render redirects to www
6. **DNS** at your domain registrar:

   | Type  | Name | Value |
   |-------|------|--------|
   | CNAME | `www` | your-app.onrender.com |
   | ALIAS or ANAME | `@` | your-app.onrender.com |

   (Exact values come from Render after you add the custom domain.)

7. Wait for DNS + SSL (usually 5–30 minutes). Visit **https://www.diversewayclinic.com**

### Option B — VPS / cPanel / any Linux server

```bash
git clone https://github.com/Sumit1001wok/Diverseway-clinic.git
cd Diverseway-clinic
npm install
cp .env.example .env
# Edit .env with ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET, NODE_ENV=production, CANONICAL_HOST, SITE_URL
npm start
```

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
- **Data:** SQLite file at `data/clinic.db` (legacy JSON in `data/` is imported automatically on first run)

### Keeping data on Render

On Render’s **free tier**, the filesystem is wiped on each deploy unless you attach a **persistent disk** (paid). Uncomment the `disk` block in `render.yaml`, set `DATA_DIR=/opt/render/project/src/data`, and redeploy so bookings and messages survive updates.

## Booking system

- **Admin login:** `/admin` — manage bookings, contact messages, and available times
- **Availability:** Admin opens 15-minute blocks (7 AM – 8 PM). Patients pick service → date → available slot
- **Session lengths:** Speech & voice therapy 30 min; occupational, behaviour, counselling & others 45 min
- **Database:** SQLite (`data/clinic.db`) — survives restarts when using persistent disk on Render

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
