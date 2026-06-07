# Diverse Way Clinic

Full-stack website for Diverse Way Clinic (Kathmandu) — static pages, REST API, SQLite database, and admin dashboard.

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

- **Booking:** `/booking.html` → saves to database via `POST /api/booking`
- **Contact:** `/contact.html` → saves via `POST /api/contact`
- **Admin:** `/admin` → view bookings & messages (requires `ADMIN_API_KEY`)

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/booking` | Create appointment request |
| POST | `/api/contact` | Send contact message |
| GET | `/api/admin/bookings` | List bookings (auth required) |
| GET | `/api/admin/messages` | List messages (auth required) |

Admin requests need header: `Authorization: Bearer YOUR_ADMIN_API_KEY`

## Deploy

Set environment variables on your host (Render, Railway, VPS, etc.):

- `PORT` — server port (often set automatically)
- `ADMIN_API_KEY` — secret for admin dashboard

Start command: `npm start`

## WhatsApp

Forms still support **WhatsApp** as a secondary option. Primary submit saves to the database.

WhatsApp number: **9845366417** (`9779845366417` in wa.me links)
