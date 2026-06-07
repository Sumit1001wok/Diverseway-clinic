# Diverse Way Clinic

Full-stack website for Diverse Way Clinic (Kathmandu) — static pages, REST API, JSON storage, and admin dashboard.

**Live domain:** [https://www.diversewayclinic.com](https://www.diversewayclinic.com)

## Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Database:** JSON files in `data/` (`bookings.json`, `messages.json`)

## Run locally

```bash
npm install
cp .env.example .env
# Edit .env — set ADMIN_API_KEY to a strong secret
npm start
```

Open **http://localhost:3000**

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
   - `ADMIN_API_KEY` = your secret (long random string)
   - `CANONICAL_HOST` = `www.diversewayclinic.com`
   - `SITE_URL` = `https://www.diversewayclinic.com`
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
# Edit .env with ADMIN_API_KEY, NODE_ENV=production, CANONICAL_HOST, SITE_URL
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
- **Admin:** `https://www.diversewayclinic.com/admin`

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/booking` | Create appointment request |
| POST | `/api/contact` | Send contact message |
| GET | `/api/admin/bookings` | List bookings (auth required) |
| GET | `/api/admin/messages` | List messages (auth required) |

Admin requests need header: `Authorization: Bearer YOUR_ADMIN_API_KEY`

## WhatsApp

Forms also support **WhatsApp**. Primary submit saves to the server.

WhatsApp: **9845366417** (`9779845366417` in wa.me links)
