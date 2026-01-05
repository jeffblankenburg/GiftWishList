# Jeff's Setup TODO

When you're back, here's what you need to do to get the app running locally.

## 1. Set Up PostgreSQL Database

You have a few options:

### Option A: Vercel Postgres (Recommended for later deployment)
1. Go to [vercel.com](https://vercel.com) and create a project
2. Go to Storage → Create Database → Postgres
3. Copy the `DATABASE_URL` from the `.env.local` tab

### Option B: Local PostgreSQL
1. Install PostgreSQL locally (if not already): `brew install postgresql@15`
2. Start it: `brew services start postgresql@15`
3. Create a database: `createdb giftwishlist`
4. Your DATABASE_URL will be: `postgresql://localhost:5432/giftwishlist`

### Option C: Supabase (Free tier)
1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to Settings → Database → Connection string
3. Copy the URI (use "Transaction pooler" for serverless)

---

## 2. Set Up Twilio

1. Create account at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Console Dashboard
3. Go to Verify → Services → Create new service (call it "GiftWishList")
4. Copy the Service SID
5. (Optional for SMS adding feature later) Buy a phone number (~$1/month)

---

## 3. Create Your .env File

```bash
cp .env.example .env
```

Then edit `.env` with your values:

```
DATABASE_URL="your_database_url_here"

TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token_here"
TWILIO_VERIFY_SERVICE_SID="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_PHONE_NUMBER="+1234567890"

JWT_SECRET="make-this-a-long-random-string-at-least-32-chars"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 4. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

This creates all the database tables.

---

## 5. Start the Dev Server

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

---

## What's Working So Far

- ✅ Phone number login with SMS verification
- ✅ New user name setup
- ✅ Create groups
- ✅ Join groups by invite code
- ✅ View your groups list
- ✅ Logout

## What's Next to Build

- View other members' wishlists
- Mark items as purchased
- SMS inbound (text a URL to add items)

## Future Enhancements

- Amazon affiliate link replacement (replace any existing affiliate codes with Jeff's code)

---

## Quick Commands Reference

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linter
npx prisma studio    # Open database GUI
npx prisma migrate dev   # Run migrations
```

---

## Questions?

All the GitHub issues are created with detailed specs. Check:
- Issue #18 for the full roadmap
- `/docs/ARCHITECTURE.md` for technical details
