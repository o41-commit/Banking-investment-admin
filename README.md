# Mobile Saving Bank Admin

Premium Next.js admin dashboard for crypto investment operations.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Socket.IO client

## Run

```bash
npm install
npm run dev
```

The app reads:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

If those variables are not set, the UI uses typed demo data so every admin screen remains usable while the backend is being configured.

Live support chat uses `NEXT_PUBLIC_SOCKET_URL` and the admin access token returned by `/api/auth/admin/login`.

## Verify

```bash
npm run typecheck
npm run build
```
