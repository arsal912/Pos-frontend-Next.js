# POS System — Frontend (Next.js)

This is the Next.js 14 frontend for the POS System multi-tenant SaaS platform.

For full project documentation, features, tech stack, and quick-start instructions see the main README in the backend repository:

**[pos-backend/README.md](../pos-backend/README.md)**

## Frontend Quick Start

```bash
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Default login:** admin@possystem.com / password

## Key Technologies
- Next.js 14 (App Router), TypeScript, TailwindCSS
- Dexie.js + Service Worker (offline-first PWA)
- Zustand (auth state)
- Axios (API client)
