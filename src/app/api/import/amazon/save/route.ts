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

  const { items, groupId } = await request.json()

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items to import' }, { status: 400 })
  }

  if (!groupId) {
    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
  }

  // Verify user is a member of this group
  const { data: membership } = await supabase
    .from('group_memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('group_id', groupId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 })
  }

  // Insert all items
  const itemsToInsert = items.map((item: ImportItem) => ({
    user_id: user.id,
    group_id: groupId,
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
    return NextResponse.json({ error: 'Failed to save items' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    count: insertedItems?.length || items.length
  })
}
