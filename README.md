# GiftWishList

A website to share wishlists with friends and family.

## Tech Stack

- **Framework:** Next.js 16+ with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (mobile-first)
- **UI Components:** shadcn/ui
- **Database:** PostgreSQL with Prisma ORM
- **Code Quality:** ESLint + Prettier

## Project Structure

```
/src
  /app          - Next.js app router pages
  /components   - Reusable UI components
  /lib          - Utility functions, database client
  /generated    - Prisma generated client
/prisma         - Database schema and migrations
/public         - Static assets
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd GiftWishList
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

5. Push database schema (development):
   ```bash
   npm run db:push
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Prisma](https://www.prisma.io/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
