import {
  isAmazonUrl,
  extractAsin,
  getAmazonProductInfo,
  resolveAmazonShortUrl,
  buildAmazonUrl,
} from "@/lib/amazon";

export interface UrlMetadata {
  title: string | null;
  siteName: string | null;
  imageUrl: string | null;
  price: string | null;
  url: string; // May be modified (e.g., with affiliate tag)
}

/**
 * Fetch metadata from a URL.
 * For Amazon URLs, uses PA-API for better data and adds affiliate tag.
 * For other URLs, scrapes Open Graph and other meta tags.
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    // Handle Amazon URLs specially
    if (isAmazonUrl(url)) {
      // Resolve short URLs first
      if (url.includes("amzn.to")) {
        const resolvedUrl = await resolveAmazonShortUrl(url);
        if (resolvedUrl) {
          url = resolvedUrl;
        }
      }

      const asin = extractAsin(url);
      if (asin) {
        console.log(`Fetching Amazon product info for ASIN: ${asin}`);
        const amazonInfo = await getAmazonProductInfo(asin);

        if (amazonInfo) {
          return {
            title: amazonInfo.title,
            imageUrl: amazonInfo.imageUrl,
            price: amazonInfo.price,
            siteName: "Amazon",
            url: amazonInfo.url, // Clean URL with affiliate tag
          };
        }

        // If PA-API fails, still return clean URL with affiliate tag
        console.log("Amazon PA-API failed, falling back to generic scraping");
        url = buildAmazonUrl(asin);
      }
    }

    // Generic metadata fetching for non-Amazon URLs (or Amazon fallback)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        return { title: null, siteName: null, imageUrl: null, price: null, url };
      }

      const html = await response.text();

      const title = extractTitle(html);
      const imageUrl = extractImage(html, url);
      const price = extractPrice(html);
      const siteName = extractSiteName(html, url);

      return { title, siteName, imageUrl, price, url };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Error fetching URL:", fetchError);
      return { title: null, siteName: null, imageUrl: null, price: null, url };
    }
  } catch (error) {
    console.error("Error in fetchUrlMetadata:", error);
    return { title: null, siteName: null, imageUrl: null, price: null, url };
  }
}

function extractTitle(html: string): string | null {
  const patterns = [
    // Open Graph title
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
    // Twitter title
    /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
    // Amazon specific - product title
    /<span[^>]*id=["']productTitle["'][^>]*>([^<]+)</i,
    // Generic title tag
    /<title[^>]*>([^<]+)<\/title>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

function extractImage(html: string, baseUrl: string): string | null {
  const patterns = [
    // Open Graph image
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    // Twitter image
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    // Amazon specific - main image
    /<img[^>]*id=["']landingImage["'][^>]*src=["']([^"']+)["']/i,
    /<img[^>]*data-old-hires=["']([^"']+)["']/i,
    // Schema.org image
    /<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let imageUrl = match[1].trim();
      // Make relative URLs absolute
      if (imageUrl.startsWith("//")) {
        imageUrl = "https:" + imageUrl;
      } else if (imageUrl.startsWith("/")) {
        const urlObj = new URL(baseUrl);
        imageUrl = urlObj.origin + imageUrl;
      }
      return imageUrl;
    }
  }

  return null;
}

function extractPrice(html: string): string | null {
  // Try JSON-LD first (most reliable)
  const jsonLdPrice = extractPriceFromJsonLd(html);
  if (jsonLdPrice) return jsonLdPrice;

  // Common price patterns
  const patterns = [
    // Schema.org price meta tag
    /<meta[^>]*itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
    // Open Graph price
    /<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i,
    // Amazon apex price (current format)
    /<span[^>]*class=["'][^"']*a-price-whole[^"']*["'][^>]*>([^<]+)/i,
    // Amazon price block
    /<span[^>]*id=["']priceblock_ourprice["'][^>]*>([^<]+)/i,
    /<span[^>]*id=["']priceblock_dealprice["'][^>]*>([^<]+)/i,
    /<span[^>]*id=["']priceblock_saleprice["'][^>]*>([^<]+)/i,
    // Generic price patterns with $ symbol
    /<[^>]*class=["'][^"']*price[^"']*["'][^>]*>\s*(\$[\d,]+\.?\d*)/i,
    // data-price attribute
    /data-price=["'](\$?[\d,]+\.?\d*)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let price = match[1].trim();
      // Clean up the price
      price = price.replace(/\s+/g, "");
      // Add $ if it's just a number
      if (/^[\d,]+\.?\d*$/.test(price)) {
        price = `$${price}`;
      }
      // Only return if it looks like a valid price
      if (/\$[\d,]+\.?\d*/.test(price)) {
        return price;
      }
    }
  }

  return null;
}

function extractPriceFromJsonLd(html: string): string | null {
  // Find all JSON-LD scripts
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonContent = match[1].trim();
      const data = JSON.parse(jsonContent);
      const price = findPriceInObject(data);
      if (price) {
        // Format price
        const numPrice = parseFloat(price.replace(/[^0-9.]/g, ""));
        if (!isNaN(numPrice)) {
          return `$${numPrice.toFixed(2)}`;
        }
      }
    } catch {
      // JSON parse failed, continue to next script
    }
  }

  return null;
}

function findPriceInObject(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const price = findPriceInObject(item);
      if (price) return price;
    }
    return null;
  }

  const record = obj as Record<string, unknown>;

  // Check for price directly
  if (record.price !== undefined && record.price !== null) {
    if (typeof record.price === "string" || typeof record.price === "number") {
      return String(record.price);
    }
    if (typeof record.price === "object") {
      const priceObj = record.price as Record<string, unknown>;
      if (priceObj.price) return String(priceObj.price);
      if (priceObj.value) return String(priceObj.value);
    }
  }

  // Check offers (common for Product schema)
  if (record.offers) {
    const price = findPriceInObject(record.offers);
    if (price) return price;
  }

  // Check lowPrice (for AggregateOffer)
  if (record.lowPrice !== undefined && record.lowPrice !== null) {
    return String(record.lowPrice);
  }

  return null;
}

function extractSiteName(html: string, url: string): string {
  // Try og:site_name first (most sites set this)
  const patterns = [
    /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i,
    // Twitter site
    /<meta[^>]*name=["']twitter:site["'][^>]*content=["']@?([^"']+)["']/i,
    // Application name
    /<meta[^>]*name=["']application-name["'][^>]*content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  // Fall back to domain name
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;

    // Remove www. prefix if present
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }

    return hostname;
  } catch {
    return "Unknown";
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
