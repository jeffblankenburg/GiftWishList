import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as cheerio from 'cheerio'

interface AmazonItem {
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

  const { url } = await request.json()

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Validate it's an Amazon wishlist URL
  if (!url.includes('amazon.com') || !url.includes('/wishlist/')) {
    return NextResponse.json(
      { error: 'Please provide a valid Amazon wishlist URL' },
      { status: 400 }
    )
  }

  const apiKey = process.env.SCRAPINGBEE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Scraping service not configured' },
      { status: 500 }
    )
  }

  try {
    // Call ScrapingBee to fetch the rendered page
    const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1')
    scrapingBeeUrl.searchParams.set('api_key', apiKey)
    scrapingBeeUrl.searchParams.set('url', url)
    scrapingBeeUrl.searchParams.set('render_js', 'true')
    scrapingBeeUrl.searchParams.set('wait', '3000') // Wait for JS to load

    const response = await fetch(scrapingBeeUrl.toString(), {
      method: 'GET',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ScrapingBee error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch wishlist. Please check the URL and try again.' },
        { status: 500 }
      )
    }

    const html = await response.text()
    const items = parseAmazonWishlist(html)

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No items found. Make sure the wishlist is public and has items.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import wishlist' },
      { status: 500 }
    )
  }
}

function parseAmazonWishlist(html: string): AmazonItem[] {
  const $ = cheerio.load(html)
  const items: AmazonItem[] = []

  // Amazon wishlist items are in list items with specific data attributes
  // Try multiple selectors as Amazon's structure can vary
  const selectors = [
    '[data-itemid]', // Modern wishlist
    'li[data-id]', // Alternative format
    '.g-item-sortable', // Another common class
    '#g-items li', // Container-based
  ]

  // Find which selector has items
  let workingSelector = ''
  for (const selector of selectors) {
    if ($(selector).length > 0) {
      workingSelector = selector
      break
    }
  }

  if (!workingSelector) {
    return items
  }

  $(workingSelector).each((_, element) => {
    const $el = $(element)

    // Extract title - try multiple approaches
    let title = ''
    const titleSelectors = [
      'a[id*="itemName"]',
      '.a-link-normal[title]',
      'h2 a',
      '.g-title a',
      'a.a-link-normal',
    ]
    for (const sel of titleSelectors) {
      const $title = $el.find(sel).first()
      title = $title.attr('title') || $title.text().trim()
      if (title) break
    }

    if (!title) return // Skip items without titles

    // Extract price
    let price: string | null = null
    const priceSelectors = [
      '.a-price .a-offscreen',
      '.a-price-whole',
      '[data-a-color="price"] .a-offscreen',
      '.a-color-price',
    ]
    for (const sel of priceSelectors) {
      const priceText = $el.find(sel).first().text().trim()
      if (priceText) {
        price = priceText
        break
      }
    }

    // Extract image
    let image: string | null = null
    const $img = $el.find('img[src*="images-amazon"]').first()
    if ($img.length) {
      image = $img.attr('src') || null
      // Try to get a larger image by modifying the URL
      if (image) {
        image = image.replace(/\._.*_\./, '._SL500_.')
      }
    }

    // Extract product URL
    let productUrl: string | null = null
    const $link = $el.find('a[href*="/dp/"]').first()
    if ($link.length) {
      const href = $link.attr('href')
      if (href) {
        // Extract ASIN and create clean URL
        const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/)
        if (asinMatch) {
          productUrl = `https://www.amazon.com/dp/${asinMatch[1]}`
        }
      }
    }

    items.push({
      title,
      price,
      image,
      url: productUrl,
    })
  })

  return items
}
