import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { buyerNotes } = await request.json()

    // Get the wishlist item
    const { data: item, error: itemError } = await supabase
      .from('wishlist_items')
      .select('user_id, group_id')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Cannot purchase your own item
    if (item.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot purchase your own item' }, { status: 403 })
    }

    // Verify user is in the same group
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('group_id', item.group_id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('item_id', itemId)
      .single()

    if (existingPurchase) {
      return NextResponse.json({ error: 'Item already purchased' }, { status: 400 })
    }

    // Create purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        item_id: itemId,
        buyer_id: user.id,
        buyer_notes: buyerNotes || null,
      })
      .select()
      .single()

    if (purchaseError) {
      console.error('Create purchase error:', purchaseError)
      return NextResponse.json({ error: 'Failed to mark as purchased' }, { status: 500 })
    }

    return NextResponse.json({ purchase })
  } catch (error) {
    console.error('Purchase POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only the buyer can unmark
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('item_id', itemId)
      .eq('buyer_id', user.id)

    if (error) {
      console.error('Delete purchase error:', error)
      return NextResponse.json({ error: 'Failed to unmark purchase' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Purchase DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
