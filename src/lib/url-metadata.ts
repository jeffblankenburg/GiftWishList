export interface UrlMetadata {
  title: string | null
  siteName: string | null
  imageUrl: string | null
  price: string | null
  url: string
}

/**
 * Fetch metadata from a URL.
 * Scrapes Open Graph and other meta tags.
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
        return { title: null, siteName: null, imageUrl: null, price: null, url }
      }

      const html = await response.text()

      const title = extractTitle(html)
      const imageUrl = extractImage(html, url)
      const price = extractPrice(html)
      const siteName = extractSiteName(html, url)

      return { title, siteName, imageUrl, price, url }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Error fetching URL:', fetchError)
      return { title: null, siteName: null, imageUrl: null, price: null, url }
    }
  } catch (error) {
    console.error('Error in fetchUrlMetadata:', error)
    return { title: null, siteName: null, imageUrl: null, price: null, url }
  }
}

function extractTitle(html: string): string | null {
  const patterns = [
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
    /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
    /<span[^>]*id=["']productTitle["'][^>]*>([^<]+)</i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim())
    }
  }

  return null
}

function extractImage(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /<img[^>]*id=["']landingImage["'][^>]*src=["']([^"']+)["']/i,
    /<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      let imageUrl = match[1].trim()
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('/')) {
        const urlObj = new URL(baseUrl)
        imageUrl = urlObj.origin + imageUrl
      }
      return imageUrl
    }
  }

  return null
}

function extractPrice(html: string): string | null {
  const jsonLdPrice = extractPriceFromJsonLd(html)
  if (jsonLdPrice) return jsonLdPrice

  const patterns = [
    /<meta[^>]*itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i,
    /<span[^>]*class=["'][^"']*a-price-whole[^"']*["'][^>]*>([^<]+)/i,
    /<span[^>]*id=["']priceblock_ourprice["'][^>]*>([^<]+)/i,
    /<[^>]*class=["'][^"']*price[^"']*["'][^>]*>\s*(\$[\d,]+\.?\d*)/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      let price = match[1].trim().replace(/\s+/g, '')
      if (/^[\d,]+\.?\d*$/.test(price)) {
        price = `$${price}`
      }
      if (/\$[\d,]+\.?\d*/.test(price)) {
        return price
      }
    }
  }

  return null
}

function extractPriceFromJsonLd(html: string): string | null {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim())
      const price = findPriceInObject(data)
      if (price) {
        const numPrice = parseFloat(price.replace(/[^0-9.]/g, ''))
        if (!isNaN(numPrice)) {
          return `$${numPrice.toFixed(2)}`
        }
      }
    } catch {
      // Continue to next script
    }
  }

  return null
}

function findPriceInObject(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const price = findPriceInObject(item)
      if (price) return price
    }
    return null
  }

  const record = obj as Record<string, unknown>

  if (record.price !== undefined && record.price !== null) {
    if (typeof record.price === 'string' || typeof record.price === 'number') {
      return String(record.price)
    }
    if (typeof record.price === 'object') {
      const priceObj = record.price as Record<string, unknown>
      if (priceObj.price) return String(priceObj.price)
      if (priceObj.value) return String(priceObj.value)
    }
  }

  if (record.offers) {
    const price = findPriceInObject(record.offers)
    if (price) return price
  }

  if (record.lowPrice !== undefined && record.lowPrice !== null) {
    return String(record.lowPrice)
  }

  return null
}

function extractSiteName(html: string, url: string): string {
  const patterns = [
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i,
    /<meta[^>]*name=["']twitter:site["'][^>]*content=["']@?([^"']+)["']/i,
    /<meta[^>]*name=["']application-name["'][^>]*content=["']([^"']+)["']/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim())
    }
  }

  try {
    const urlObj = new URL(url)
    let hostname = urlObj.hostname
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    return hostname
  } catch {
    return 'Unknown'
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}
