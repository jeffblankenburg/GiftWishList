import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is the owner
  const { data: group } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.owner_id === user.id) {
    return NextResponse.json(
      { error: 'Owners cannot leave their group. Delete the group instead.' },
      { status: 400 }
    )
  }

  // Delete the membership
  const { error: deleteError } = await supabase
    .from('group_memberships')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 })
  }

  // Also delete any wishlist items the user had in this group
  await supabase
    .from('wishlist_items')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
