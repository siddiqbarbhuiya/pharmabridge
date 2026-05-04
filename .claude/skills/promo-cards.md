# Promo Card System

## Card Types (matches design from UI screenshots)
1. TEXT        — gradient background + badge + title + subtitle + optional CTA button
2. IMAGE_PANEL — left: text content, right: image panel (split layout ~65/35)
3. FULL_IMAGE  — full background image with dark gradient overlay + text on top

## Carousel Behavior (customer app home page)
- Horizontal scroll carousel with dot pagination below
- Auto-advances every 5 seconds (Framer Motion AnimatePresence)
- Touch/swipe support on mobile (Framer Motion drag or react-swipeable)
- Shows partial next card (~15% visible) to indicate scrollability
- Position: BETWEEN hero section and pharmacy discovery section on home page
- Skeleton: show 1 skeleton card while loading (same dimensions as card)
- Max 10 cards fetched (no pagination needed)

## Background Options (TEXT type only)
Store as a key string in DB, resolve to gradient in frontend:
```typescript
const GRADIENTS: Record<string, string> = {
  blue:   'linear-gradient(135deg, #3B82F6, #6366F1)',
  green:  'linear-gradient(135deg, #10B981, #059669)',
  purple: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  orange: 'linear-gradient(135deg, #F97316, #EF4444)',
  dark:   'linear-gradient(135deg, #1E293B, #0F172A)',
  pink:   'linear-gradient(135deg, #EC4899, #DB2777)',
}
// Also accept any hex color string as fallback (solid background)
```

## Badge Format
Optional emoji + label text. Examples:
- "🏥 Health Tips"
- "💊 Special Offer"  
- "📊 Market Insights"
- "⚡ Flash Sale"
Badge renders as pill: background white/10%, text white, rounded-full, px-3 py-1, text-xs

## CTA Button Behavior
- If ctaUrl starts with "/" → internal React Router navigation (push)
- If ctaUrl starts with "http" → window.open(url, '_blank')
- CTA button style: white background, dark text, rounded-full pill

## Stock Tags (PharmaBridge context)
Tags link to: pharmacy slug search OR medicine category search.
Display as small chips: white/15% background, white text, rounded-full.
Example values: medicine categories ("Diabetes", "Vitamins"), pharmacy slugs, or promo codes.
Max 5 tags displayed (truncate if more).

## PromoCard React Component (packages/ui)
```typescript
interface PromoCardProps {
  card: {
    id: string
    type: 'TEXT' | 'IMAGE_PANEL' | 'FULL_IMAGE'
    badge?: string
    title: string
    subtitle?: string
    background: string     // gradient key or hex
    imageUrl?: string
    ctaLabel?: string
    ctaUrl?: string
    stockTags?: string[]
  }
  onClick?: () => void     // for admin preview click tracking
}
```
This single component handles ALL three types based on card.type.
Used in: customer carousel, admin live preview, admin card list thumbnail.

## Admin Form — Card Type Selector
Matches screenshot exactly:
- 3 buttons with icons: [T] Text | [⊞] Image Panel | [⊡] Full Image
- Selected state: blue border + blue text
- Unselected: dark border, grey text

## Scheduling
- startAt / endAt: optional datetime fields
- If startAt is null → card is always available (from creation)
- If endAt is null → card never expires
- Filter query: WHERE isActive=true AND (startAt IS NULL OR startAt <= NOW()) AND (endAt IS NULL OR endAt >= NOW())

## Redis Caching
Cache key: "promo-cards:{target}" (e.g., "promo-cards:CUSTOMER")
TTL: 10 minutes
Invalidate on: any admin create/update/delete/reorder operation
```typescript
await redis.del('promo-cards:CUSTOMER')
await redis.del('promo-cards:PHARMACY')
await redis.del('promo-cards:ALL')
```

## Reorder API
POST /api/v1/admin/promo-cards/reorder
Body: { cards: Array<{ id: string, order: number }> }
Update all in single Prisma transaction:
```typescript
await prisma.$transaction(
  cards.map(({ id, order }) => prisma.promoCard.update({ where: { id }, data: { order } }))
)
```
Then invalidate Redis cache.
