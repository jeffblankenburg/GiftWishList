# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

GiftWishList is a web application for sharing gift wishlists with family and friends. The core value proposition is **purchase privacy** - buyers can coordinate to avoid duplicates, but the gift recipient never sees what's been purchased.

## Technology Stack

- **Frontend**: Next.js 14+ with App Router, React 18+, TypeScript
- **Styling**: Tailwind CSS (mobile-first), shadcn/ui components
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: PostgreSQL via Vercel Postgres, Prisma ORM
- **Auth**: Phone number + SMS verification (Twilio Verify)
- **SMS Integration**: Twilio for inbound/outbound messaging
- **Hosting**: Vercel

## Architecture Overview

### Data Model
- **User**: Identified by phone number, belongs to multiple groups
- **Group**: A collection of users who share wishlists (e.g., "Blankenburg Family")
- **GroupMembership**: Join table with roles (owner/member)
- **WishlistItem**: Belongs to a user within a specific group (separate list per group)
- **Purchase**: Tracks who bought what, with buyer notes (hidden from wisher)

### Key Privacy Rule
The wishlist owner must NEVER see purchase status on their own items. This filtering MUST happen server-side, not just in the UI.

### SMS Flow
Users can text a URL to the app's Twilio number → system looks up user by phone → adds item to their default group's wishlist → replies with confirmation.

## Build Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npx prisma studio           # Open Prisma database GUI
npx prisma migrate dev      # Run database migrations
npx prisma generate         # Generate Prisma client
```

## Project Structure (planned)

```
/app              - Next.js App Router pages and API routes
/components       - Reusable UI components
/lib              - Utilities, database client, auth helpers
/prisma           - Database schema and migrations
/public           - Static assets
/docs             - Architecture documentation
```

## Key Implementation Notes

- Phone numbers are the primary user identifier (E.164 format)
- Each group has a unique 8-character invite code for joining
- URL metadata (title, image, price) fetched via metascraper
- All API endpoints require authentication except auth routes
- Rate limiting required on SMS sends (5 per phone per hour)
