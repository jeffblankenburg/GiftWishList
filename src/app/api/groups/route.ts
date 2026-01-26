import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Generate random 8-character invite code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

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

    // Generate unique invite code
    let code = generateCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('groups')
        .select('id')
        .eq('code', code)
        .single()

      if (!existing) break
      code = generateCode()
      attempts++
    }

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        code,
        owner_id: user.id,
      })
      .select()
      .single()

    if (groupError) {
      console.error('Group creation error:', groupError)
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    // Add owner as a member
    const { error: memberError } = await supabase
      .from('group_memberships')
      .insert({
        user_id: user.id,
        group_id: group.id,
        role: 'owner',
      })

    if (memberError) {
      console.error('Membership creation error:', memberError)
      // Clean up the group
      await supabase.from('groups').delete().eq('id', group.id)
      return NextResponse.json({ error: 'Failed to create group membership' }, { status: 500 })
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
