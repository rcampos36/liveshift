# LiveShift

Multi-tenant restaurant operations SaaS. This repository currently contains the application foundation: companies, restaurant locations, users, memberships, authentication, and role-based authorization.

Operational restaurant modules are intentionally not included yet.

## Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- PostgreSQL on Neon via Prisma 7
- JOSE access tokens, bcrypt passwords, Resend email
- Vercel-ready

## Setup

1. Copy `.env.example` to `.env` and fill in Neon, `AUTH_SECRET`, Resend, and `APP_URL`.
2. Generate the Prisma client:

```bash
npm run db:generate
```

3. Apply the schema to Neon:

```bash
npm run db:migrate
```

4. Optionally create a platform super admin:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

## Auth endpoints

- `POST /api/auth/register` — create user + company + `COMPANY_ADMIN` membership
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
