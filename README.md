# CabFlow

CabFlow is a Next.js 14 TypeScript scaffold for a cab dispatch platform with:

- Role-aware authentication and API guards
- Rider, driver, and admin dashboards
- Live driver tracking over Socket.IO
- Polling fallback when sockets are unavailable
- Ride dispatch offers with recommended prices
- Rider address search, saved places, and public trip sharing
- Driver document uploads and admin review queue
- Ride safety alerts, refunds, and audit logging
- Stripe Connect onboarding and destination charges
- Fare estimation from distance, duration, and surge
- PWA manifest, service worker, and offline fallback page

## Stack

- Next.js 14 App Router
- TypeScript in strict mode
- Prisma + PostgreSQL
- Socket.IO for realtime updates
- SWR for client-side data fetching
- Stripe for payments
- Mapbox for routing and map display

## Setup

1. Clone the repo.
2. Install dependencies.

```bash
npm install
```

3. Create a local env file.

```powershell
Copy-Item .env.example .env
```

4. Fill in the environment variables.
5. Push the database schema.

```bash
npx prisma generate
npx prisma db push
```

If you are using Neon, keep the pooled connection in `DATABASE_URL` for the app and set `DIRECT_URL` to the direct database endpoint for Prisma migrations and `db push`.
If the Neon project already has unrelated data, create a dedicated database for CabFlow first and point both URLs at that database instead of reusing `public`.

6. Seed the demo users if you want sample accounts.

```bash
npm run prisma:seed
```

## Environment Variables

Use the values from `.env.example` as a starting point:

- `DATABASE_URL` PostgreSQL connection string
- `DIRECT_URL` direct PostgreSQL connection string for Prisma migrations and `db push`
- `AUTH_SECRET` session signing secret
- `STRIPE_SECRET_KEY` Stripe secret key
- `STRIPE_WEBHOOK_SECRET` Stripe webhook signing secret
- `STRIPE_CONNECT_CLIENT_ID` optional Connect client ID
- `STRIPE_CONNECT_COUNTRY` Connect onboarding country, defaults to `ZA`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` Stripe publishable key for Elements
- `STRIPE_PLATFORM_FEE_BPS` platform commission in basis points
- `MAPBOX_TOKEN` server-side Mapbox token
- `NEXT_PUBLIC_MAPBOX_TOKEN` browser Mapbox token for the interactive map
- `NEXT_PUBLIC_APP_URL` public app origin
- `SOCKET_CORS_ORIGIN` optional Socket.IO CORS origin
- `ALERT_WEBHOOK_URL` optional webhook for safety alerts
- `RATE_LIMIT_WINDOW_MS` rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` maximum requests allowed per window

## Run

### Development

```bash
npm run dev
```

The custom Node server starts Next.js and Socket.IO together on `http://localhost:3000`.

### Production build

```bash
npm run build
```

### Production start

```bash
npm run start
```

## Demo Accounts

After seeding, you can sign in with:

- `admin@cab.local`
- `driver@cab.local`
- `rider@cab.local`

Password for all demo users:

```text
Password123!
```

## Realtime Flow

- Drivers send GPS updates from the driver dashboard.
- The client prefers Socket.IO for updates.
- If the socket drops, rider views fall back to polling `/api/rides/[rideId]/location`.
- Socket rooms are used so only the relevant ride or driver receives updates.

## PWA Flow

- The app manifest is exposed at `/manifest.webmanifest`.
- The app registers `/sw.js` in production.
- The service worker caches the public shell and serves `/offline` when navigation requests fail.
- The offline page is rendered at `/offline`.

## Payments

- Drivers can onboard as Stripe Connect express accounts.
- Ride payment intents are created from the ride total.
- If the driver has a connected account, the payment intent uses destination charges and a platform fee.
- The rider dashboard includes a button to create a payment intent for completed rides.
- The Stripe webhook marks the ride as paid when `payment_intent.succeeded` arrives.

## Project Structure

- `src/app` app router pages and API routes
- `src/components` client and shared UI
- `src/hooks` custom hooks for auth, sockets, and maps
- `src/lib` server utilities, Prisma helpers, Stripe helpers, and fare logic
- `prisma/schema.prisma` database schema
- `server.ts` custom Next + Socket.IO server

## Notes

- The map requires `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Stripe webhook handling requires a reachable webhook endpoint in development or a local Stripe CLI tunnel.
- Role checks are enforced on the API routes, not just in the UI.
