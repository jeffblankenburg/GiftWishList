# GiftWishList Architecture Plan

## Overview

GiftWishList is a web application that allows users to create and share gift wishlists with family and friends. The core innovation is maintaining gift purchase privacy—buyers can see what others have purchased to avoid duplicates, but the gift recipient never sees this information.

## Core Concepts

### User Model
- Users authenticate via phone number + SMS verification code
- A user can belong to multiple **Groups** (e.g., "Blankenburg Family", "Work Secret Santa")
- Each user has a **separate wishlist per group** they belong to
- Users are identified primarily by their phone number (enables SMS integration)

### Group Model
- A Group is a collection of users who share wishlists with each other
- Groups have an owner (creator) who can invite/remove members
- Group members can see all other members' wishlists for that group
- Invitation via SMS or shareable link with group code

### Wishlist Item Model
- Each item belongs to a specific user's list within a specific group
- Items contain:
  - URL (required) - link to the product
  - Auto-fetched metadata: title, image, price (when available)
  - User notes (optional) - size, color, preferences
  - Priority/ranking (optional)
  - Created date
- Items can be marked as "purchased" by other group members
- Purchase status includes:
  - Purchased by (user reference)
  - Purchase date
  - Buyer notes (visible to other buyers only, NOT the wisher)

## Technology Stack

### Frontend
- **Next.js 14+** with App Router
- **React 18+** with Server Components where appropriate
- **Tailwind CSS** for styling (mobile-first responsive design)
- **shadcn/ui** for accessible, customizable UI components

### Backend
- **Next.js API Routes** (serverless functions)
- **Prisma ORM** for database access
- **PostgreSQL** database (via Vercel Postgres or Supabase)

### Authentication
- **Custom SMS-based auth** using Twilio Verify API
- Phone number as primary identifier
- Session management via secure HTTP-only cookies or JWT

### External Services
- **Twilio** - SMS verification codes + inbound SMS for adding items
- **Vercel** - Hosting, serverless functions, edge network
- **Metascraper/Open Graph** - URL metadata extraction

### SMS Integration (Twilio)
- **Outbound**: Verification codes, group invitations, notifications
- **Inbound**: Users text a URL to a Twilio number → item added to their default list
- Webhook endpoint receives inbound SMS, parses URL, creates wishlist item

## Database Schema

```
User
├── id (uuid)
├── phoneNumber (unique, indexed)
├── displayName
├── createdAt
├── updatedAt
└── defaultGroupId (optional - for SMS item additions)

Group
├── id (uuid)
├── name
├── code (unique, shareable invite code)
├── ownerId (User reference)
├── createdAt
└── updatedAt

GroupMembership
├── id (uuid)
├── userId
├── groupId
├── role (owner | member)
├── joinedAt
└── unique constraint on (userId, groupId)

WishlistItem
├── id (uuid)
├── userId (owner of the wish)
├── groupId (which group list this belongs to)
├── url
├── title (auto-fetched or manual)
├── imageUrl (auto-fetched)
├── price (auto-fetched, stored as string for display)
├── notes (user's personal notes - size, color, etc.)
├── priority (integer, for ordering)
├── createdAt
├── updatedAt
└── unique constraint on (userId, groupId, url)

Purchase
├── id (uuid)
├── wishlistItemId
├── purchasedByUserId
├── purchasedAt
├── buyerNotes (visible to other buyers only)
└── unique constraint on (wishlistItemId) - one purchase per item
```

## Key User Flows

### 1. New User Onboarding
1. User visits site → enters phone number
2. Receives SMS verification code → enters code
3. Sets display name
4. Either: creates a new group OR enters invite code to join existing group
5. Lands on their (empty) wishlist for that group

### 2. Adding a Wish (Web)
1. User clicks "Add Item" button
2. Pastes URL into input field
3. System fetches metadata (title, image, price) - shows loading state
4. User can edit title, add notes about size/color/preferences
5. User saves → item appears on their list

### 3. Adding a Wish (SMS)
1. User texts a URL to the app's Twilio number
2. System looks up user by phone number
3. System fetches URL metadata
4. Item is added to user's **default group** wishlist
5. System replies via SMS: "Added [Product Title] to your [Group Name] wishlist!"

### 4. Viewing Someone Else's List
1. User navigates to group → selects a member
2. Sees that member's wishlist with all items
3. For each item, sees:
   - Product info (title, image, price, link)
   - Wisher's notes
   - Purchase status: "Available" or "Purchased by [Name]" with buyer notes
4. Can click to mark as purchased

### 5. Marking an Item as Purchased
1. User clicks "Mark as Purchased" on an item
2. Optional: adds buyer notes ("I got the red one", "Shipping Dec 15")
3. Item now shows as purchased to all group members EXCEPT the wisher
4. The wisher still sees it as unpurchased (no indication)

### 6. Creating/Joining Groups
**Creating:**
1. User clicks "Create Group" → enters group name
2. System generates shareable invite code/link
3. User shares link via SMS, email, or messaging app

**Joining:**
1. User receives invite link → clicks it
2. If logged in: added to group immediately
3. If not logged in: goes through phone verification first, then added
4. New wishlist created for user in that group

## UI/UX Design Principles

### Mobile-First Responsive
- Primary use case is mobile phone
- Touch-friendly tap targets (min 44x44px)
- Bottom navigation for key actions on mobile
- Responsive grid that adapts to tablet/desktop

### Simplicity for Non-Technical Users
- Minimal text input required
- Clear, action-oriented buttons
- Confirmation dialogs for destructive actions
- Progress indicators during async operations
- Error messages in plain language

### Key Screens

1. **Login/Verification** - Phone number input → code input → name setup
2. **My Groups** - List of groups user belongs to
3. **Group View** - Members list, tap to see their wishlist
4. **My Wishlist** (per group) - User's items for this group, add/edit/remove
5. **Member's Wishlist** - View items, mark as purchased
6. **Add Item** - URL input, metadata preview, notes
7. **Group Settings** - Invite link, member management (for owners)

### Visual Design
- Clean, minimal aesthetic
- Gift/celebration theming without being childish
- High contrast for accessibility
- Clear visual distinction between "available" and "purchased" items

## Security Considerations

- Phone verification prevents account spoofing
- Users can only see wishlists of groups they belong to
- Purchase information is server-side filtered (wisher never receives it)
- Rate limiting on SMS sends to prevent abuse
- Invite codes are randomly generated, not guessable

## SMS Implementation Details

### Twilio Setup
- One Twilio phone number for the application
- Configure webhook URL for incoming SMS
- Use Twilio Verify for phone number verification

### Inbound SMS Flow
```
User sends: "https://amazon.com/dp/B08XYZ..."
     ↓
Twilio webhook → /api/sms/inbound
     ↓
Parse sender phone number
     ↓
Look up user by phone (if not found, reply with signup link)
     ↓
Extract URL from message body
     ↓
Fetch URL metadata
     ↓
Add to user's default group wishlist
     ↓
Reply: "✓ Added 'Product Name' to your Family wishlist!"
```

### Setting Default Group
- User can set which group is their "default" for SMS additions
- If user belongs to only one group, that's automatically the default
- If no default set and multiple groups, reply asking them to set one

## URL Metadata Extraction

### Strategy
1. Fetch URL with appropriate User-Agent
2. Parse HTML for Open Graph meta tags (og:title, og:image, og:price)
3. Fallback to standard meta tags (title, description)
4. For known retailers (Amazon, Target, etc.), use specific selectors
5. Handle failures gracefully - allow manual entry

### Caching
- Cache extracted metadata to avoid repeated fetches
- Allow user to refresh metadata if product info changes

## Notifications (Future Enhancement)

Potential notification triggers:
- Someone joined your group
- Someone purchased from your list (don't reveal what!)
- Reminder: Holiday is approaching, update your list
- New item added to a list you follow

## Domain Recommendations

Suggested domain names to check availability:
- giftwishlist.com / .io / .app
- familywishes.com
- ourwishlists.com
- wishlistshare.com
- giftlistshare.com

## Development Phases

### Phase 1: Core MVP
- User auth (phone + SMS)
- Create/join groups
- Add/edit/remove wishlist items (web only)
- View others' lists
- Mark items as purchased

### Phase 2: Enhanced Experience
- URL metadata auto-fetch
- Buyer notes on purchases
- Responsive polish
- SMS item addition

### Phase 3: Polish & Scale
- Notifications
- Item priority/ordering
- Multiple images per item
- Price tracking/alerts
- Archive old lists
