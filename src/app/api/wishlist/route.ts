import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    let query = supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (groupId) {
      query = query.eq('group_id', groupId)
    }

    const { data: items, error } = await query

    if (error) {
      console.error('Fetch wishlist error:', error)
      return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 })
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Wishlist GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { groupId, title, url, siteName, imageUrl, price, notes } = body

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Verify user is a member of the group
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('group_id', groupId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 })
    }

    // Create the wishlist item
    const { data: item, error } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: user.id,
        group_id: groupId,
        title: title.trim(),
        url: url || null,
        site_name: siteName || null,
        image_url: imageUrl || null,
        price: price || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create wishlist item error:', error)
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Wishlist POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
