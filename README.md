# GiftWishList

A website to share your wishlists with your friends and family.

## Features

- Create and share wishlists with family groups
- Add items by pasting URLs (auto-fetches product info)
- Add items by texting URLs to a phone number
- Mark items as purchased (hidden from the wisher to preserve surprises)
- Coordinate with other buyers via notes

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Phone number + SMS (Twilio)
- **Hosting**: Vercel

## Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

## Environment Variables

See `.env.example` for required environment variables.
