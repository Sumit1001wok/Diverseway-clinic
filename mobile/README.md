# Diverse Way Clinic — Patient App

A real native app (React Native + Expo), separate from the website codebase,
covering the patient-facing flows: sign in/register, book an appointment
(including eSewa payment), take the free speech/language screening tool, and
view booking/screening history. It talks to the **same backend** the website
already uses (`server/routes/api.js`, `server/routes/auth.js` — nothing new
was added server-side for this app).

Admin and therapist native screens are **not built yet** — this is
deliberately scoped to the patient role first. See "What's next" below.

## Run it on your phone (no Xcode/Android Studio needed for this)

1. Install the [Expo Go](https://expo.dev/go) app on your Android or iOS phone.
2. On your computer:
   ```
   cd mobile
   npm install
   npx expo start
   ```
3. Scan the QR code that appears with your phone's camera (iOS) or the Expo
   Go app (Android). The app loads straight onto your phone.

That's the whole loop for trying it out and for day-to-day development —
Expo Go doesn't require any developer account, signing certificate, or
native build.

The app talks to the **live production site** (`https://www.diversewayclinic.com`)
by default — see `src/api/client.js`. To point it at a local dev server
instead while testing a backend change, change `BASE_URL` there to your
computer's LAN IP (not `localhost` — a phone can't reach your laptop's
localhost), e.g. `http://192.168.1.23:3000`.

## What's built

- **Auth**: `src/screens/LoginScreen.js`, `RegisterScreen.js` — session
  cookie-based, same as the website (`/api/auth/*`).
- **Booking**: `src/screens/booking/` — service → date/time → confirm →
  eSewa checkout (a `WebView` auto-submitting the same HTML form
  `server/esewa.js` builds for the website) → result screen.
- **Screening tool**: `src/screens/ScreeningScreen.js` — full port of the
  branching question/scoring logic from `../js/screening-data.js` (see
  `src/screeningData.js`; keep both in sync if the clinical logic changes).
- **My Bookings / My Screenings / Account**: read the same
  `/api/auth/account/*` endpoints the website's `account.html` uses.

## Verified so far

I don't have Xcode, the Android SDK, or a simulator/device in this
environment, so I could not click through the app myself. What I *could*
verify:

- `npx expo export --platform ios` and `--platform android` both bundle
  the entire app with **zero errors** across all ~875 modules — this
  catches syntax errors, broken imports, and missing dependencies, but
  **not** runtime/UI bugs.
- Every screen calls the exact same API endpoints/payload shapes the
  website already uses in production (cross-checked against
  `server/routes/api.js` and `server/routes/auth.js` directly).

**Please run through the app yourself on a real device** (steps above)
before considering it done — especially the eSewa checkout flow (WebView
form auto-submit + redirect interception), which is the piece most likely
to need a tweak once it's actually exercised against eSewa's real gateway.

## Known follow-ups

- The adaptive Android icon's monochrome variant is still the generic Expo
  placeholder, not a clinic-branded one.
- No offline handling — if the phone has no signal, screens will just show
  their error states.
- Admin and therapist roles aren't built yet.

## Path to a real App Store / Play Store listing

Running via Expo Go (above) is enough for using and testing the app, but
publishing to the stores needs a few things only you can do:

1. **Accounts** (your name/business, real payment): an
   [Apple Developer Program](https://developer.apple.com/programs/) membership
   ($99/year) and a [Google Play Console](https://play.google.com/console/) account
   ($25 one-time).
2. **A production build.** Easiest path is
   [EAS Build](https://docs.expo.dev/build/introduction/) (Expo's cloud build
   service — no local Xcode/Android Studio needed even for this step):
   ```
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build --platform ios
   eas build --platform android
   ```
   This produces the signed `.ipa`/`.aab` files the stores require.
3. **Submit.** `eas submit` can push the build straight to App Store
   Connect / Play Console once you've filled in the store listing (screenshots,
   description, privacy policy URL, etc.) on each platform's own site.

None of this needs the website's codebase to change — this `mobile/`
directory is a separate, independently deployable project.
