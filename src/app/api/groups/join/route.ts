import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
    }

    const normalizedCode = code.trim().toUpperCase()

    // Ensure user profile exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingUser) {
      // Create user profile
      await supabase
        .from('users')
        .insert({
          id: user.id,
          phone: user.phone || '',
        })
    }

    // Find the group by code
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('code', normalizedCode)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('group_id', group.id)
      .single()

    if (existingMembership) {
      return NextResponse.json({ error: 'You are already a member of this group' }, { status: 400 })
    }

    // Add user as a member
    const { error: memberError } = await supabase
      .from('group_memberships')
      .insert({
        user_id: user.id,
        group_id: group.id,
        role: 'member',
      })

    if (memberError) {
      console.error('Join group error:', memberError)
      return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Join group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
