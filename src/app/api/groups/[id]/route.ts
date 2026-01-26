import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
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

  if (group.owner_id !== user.id) {
    return NextResponse.json(
      { error: 'Only the group owner can delete the group' },
      { status: 403 }
    )
  }

  // Delete the group (cascades to memberships, wishlist items, and purchases via foreign keys)
  const { error: deleteError } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
