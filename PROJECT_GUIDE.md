# POS Frontend Project Guide

This document is a quick reference for understanding the Next.js frontend project for the POS system. It is intended to help new contributors get oriented quickly.

## 1. Project Overview

This project is the frontend for a multi-tenant POS and inventory platform. It includes:
- Public pages for login, registration, password reset, email verification, and billing
- Admin dashboard for store, billing, subscriptions, and module management
- Staff dashboard for POS, inventory, products, customers, reports, and settings
- Offline-capable POS experience using IndexedDB and service workers

## 2. Main Technologies

- Next.js 14 with the App Router
- TypeScript
- Tailwind CSS
- Zustand for auth state
- Axios for API requests
- Dexie for offline storage
- PWA support via next-pwa
- Framer Motion for UI animations

## 3. Project Structure

- [app](app) — application routes and page components
  - [app/(public)](app/(public)) — login, register, password reset, verify email, unsubscribe
  - [app/admin](app/admin) — admin-only pages
  - [app/dashboard](app/dashboard) — main staff/store dashboard pages
  - [app/billing](app/billing) — billing and subscription flows
- [components](components) — reusable UI and feature components
  - [components/pos](components/pos) — POS-specific UI components
  - [components/ui](components/ui) — shared UI primitives
  - [components/reports](components/reports) — reporting-related UI
- [hooks](hooks) — custom React hooks
- [lib](lib) — shared logic and utilities
  - [lib/api.ts](lib/api.ts) — Axios API client and helpers
  - [lib/offline](lib/offline) — offline cart, sync, and IndexedDB logic
- [store](store) — Zustand stores
- [types](types) — shared TypeScript types
- [public](public) — static assets, manifest, and icons

## 4. Getting Started

### Install dependencies

```bash
npm install
```

### Environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Then set the backend API URL, for example:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Run locally

```bash
npm run dev
```

Open http://localhost:3000

## 5. Useful Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # run production build locally
npm run lint     # lint project
npm run type-check  # TypeScript check
```

## 6. Key Areas to Know

### Authentication
- State is managed in [store/auth.ts](store/auth.ts)
- API helpers live in [lib/api.ts](lib/api.ts)
- Auth-related pages are in [app/(public)](app/(public))

### Dashboard Layout
- The main dashboard navigation is defined in [app/dashboard/layout.tsx](app/dashboard/layout.tsx)
- This file controls sidebar navigation, auth checks, and shared layout behavior

### POS Flow
- POS page logic is in [app/dashboard/pos/page.tsx](app/dashboard/pos/page.tsx)
- Offline cart and sync logic are handled under [lib/offline](lib/offline)
- POS-specific UI components are in [components/pos](components/pos)

### Offline-first Features
- The app uses IndexedDB via Dexie for local product/customer/cart data
- Sync behavior is implemented in [lib/offline/sync-service.ts](lib/offline/sync-service.ts)
- Local cart handling is in [lib/offline/cart.ts](lib/offline/cart.ts)

### Admin and Reporting
- Admin pages live in [app/admin](app/admin)
- Report UI components are in [components/reports](components/reports)

## 7. Important Notes

- The frontend expects the backend API to be reachable at the URL configured in the environment.
- Some routes depend on the backend being running and authenticated.
- The project includes PWA behavior, so service worker and manifest changes should be tested carefully.
- If you change shared UI or core layout files, check both the dashboard and admin experiences.

## 8. Recommended Workflow for Future Changes

1. Understand the relevant route under [app](app)
2. Check the corresponding component or hook in [components](components) or [hooks](hooks)
3. Update shared types in [types](types) if needed
4. Verify behavior with:
   - `npm run type-check`
   - `npm run build`

## 9. Good Starting Points

If you are new to the project, these are the best places to start:
- [app/dashboard/layout.tsx](app/dashboard/layout.tsx)
- [app/dashboard/pos/page.tsx](app/dashboard/pos/page.tsx)
- [lib/api.ts](lib/api.ts)
- [store/auth.ts](store/auth.ts)
- [lib/offline/sync-service.ts](lib/offline/sync-service.ts)

## 10. Summary

This frontend is a modern, offline-capable Next.js app for a POS system. The main themes are:
- Route-based app structure
- Shared UI components
- Offline-first POS logic
- API-driven admin and dashboard features

If you are making changes, follow the existing route/component pattern and keep the app’s offline and authentication behavior in mind.
