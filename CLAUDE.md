# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

GiftWishList is a PWA for sharing gift wishlists with family and friends. The core value proposition is **purchase privacy** - buyers can coordinate to avoid duplicates, but the gift recipient never sees what's been purchased.

## Technology Stack

- **Frontend**: Next.js 14+ with App Router, React 18+, TypeScript
- **Styling**: Tailwind CSS (mobile-first), shadcn/ui components
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Phone number + SMS verification (Supabase Phone OTP)
- **Hosting**: Vercel
- **PWA**: Service worker, manifest, offline support

## Architecture Overview

### Data Model (Supabase)
- **users**: Identified by phone number, extends auth.users
- **groups**: Collections of users sharing wishlists (e.g., "Smith Family")
- **group_memberships**: Join table with roles (owner/member)
- **wishlist_items**: Belongs to a user within a specific group
- **purchases**: Tracks who bought what, with buyer notes (hidden from wisher)

### Key Privacy Rule
The wishlist owner must NEVER see purchase status on their own items. This is enforced at the database level with RLS policies AND filtered server-side in API routes.

## Build Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
/src/app              - Next.js App Router pages and API routes
/src/components       - Reusable UI components
/src/lib              - Utilities and Supabase clients
/supabase/migrations  - Database schema migrations
/public               - Static assets, PWA manifest, service worker
```

## Key Implementation Notes

- Phone numbers are the primary user identifier (E.164 format)
- Each group has a unique 8-character invite code for joining
- URL metadata (title, image, price) fetched via HTML scraping
- All API endpoints require authentication except auth routes
- Supabase RLS policies enforce data access control
- Purchase privacy is enforced at database level (cannot read purchases on own items)

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Supabase Setup

1. Create a Supabase project
2. Enable Phone Auth in Authentication settings
3. Run the migration in `/supabase/migrations/00001_initial_schema.sql`
4. Copy the project URL and keys to `.env.local`

## PWA Icons

Generate PWA icons before deployment:
- `/public/icons/icon-192x192.png` (192x192 pixels)
- `/public/icons/icon-512x512.png` (512x512 pixels)

Use the `/public/favicon.svg` as the source design.
