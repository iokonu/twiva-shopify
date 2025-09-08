# Commerce App

A Next.js Shopify embedded app for commission management.

## Features

- Product management
- Commission tracking
- GDPR compliance APIs
- Shopify integration

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Database

The app uses Prisma as the ORM. Available database commands:

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run migrations in development
- `npm run db:migrate:deploy` - Deploy migrations to production

## Tech Stack

- Next.js
- React
- Shopify Polaris
- Prisma
- TypeScript