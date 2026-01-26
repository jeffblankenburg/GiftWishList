import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchUrlMetadata } from '@/lib/url-metadata'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const metadata = await fetchUrlMetadata(url)

    return NextResponse.json(metadata)
  } catch (error) {
    console.error('Fetch metadata error:', error)
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}
