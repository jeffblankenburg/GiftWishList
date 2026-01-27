import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ImportItem {
  title: string
  price: string | null
  image: string | null
  url: string | null
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { items } = await request.json()

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items to import' }, { status: 400 })
  }

  // Insert all items (no group_id - visible to all groups by default)
  const itemsToInsert = items.map((item: ImportItem) => ({
    user_id: user.id,
    title: item.title,
    price: item.price,
    image_url: item.image,
    url: item.url,
    site_name: 'Amazon',
  }))

  const { data: insertedItems, error } = await supabase
    .from('wishlist_items')
    .insert(itemsToInsert)
    .select()

  if (error) {
    console.error('Insert error:', error)
    return NextResponse.json({ error: `Failed to save items: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    count: insertedItems?.length || items.length
  })
}
