# POS Frontend (Next.js)

Modern multi-tenant POS frontend built with Next.js 14, TypeScript, Tailwind CSS, and Framer Motion.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Make sure `NEXT_PUBLIC_API_URL` points to your running Laravel backend (default: `http://localhost:8000/api/v1`).

### 3. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

```
app/
├── (public)/           # Public routes (landing, login, register)
│   ├── page.tsx        # Landing page
│   ├── login/
│   └── register/
├── admin/              # Super admin panel
│   ├── dashboard/
│   ├── stores/
│   ├── modules/        # The key feature — toggle modules per store
│   ├── landing-page/   # CMS for landing page
│   └── api-logs/       # Debug API requests
└── dashboard/          # Store owner / staff
    ├── pos/
    └── settings/
components/
├── ui/                 # Reusable UI (Button, Card, Input, Switch, etc.)
└── landing/            # Landing page sections
lib/
├── api.ts              # Axios client + helpers
└── utils.ts            # cn, formatCurrency, etc.
store/
└── auth.ts             # Zustand auth state
types/
└── index.ts            # Shared TS types
```

## Default Credentials (after backend seeding)

- **Super Admin**: `admin@possystem.com` / `password`

## Features

✅ Landing page with editable sections (managed via super admin)
✅ Master toggle to enable/disable landing page
✅ Multi-step store registration
✅ Login with role-based redirect (admin → /admin, user → /dashboard)
✅ Super admin panel with module permission matrix
✅ Toggle any module for any store (or user-level override)
✅ API logs viewer with filters and detail modal
✅ Store dashboard (placeholder for Phase 4 POS features)
