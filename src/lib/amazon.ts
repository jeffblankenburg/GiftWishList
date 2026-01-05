import crypto from "crypto";

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG;

const AMAZON_HOST = "webservices.amazon.com";
const AMAZON_REGION = "us-east-1";
const AMAZON_SERVICE = "ProductAdvertisingAPI";

interface AmazonProductInfo {
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  url: string; // Clean URL with affiliate tag
}

// Extract ASIN from various Amazon URL formats
export function extractAsin(url: string): string | null {
  // Match patterns like /dp/ASIN, /gp/product/ASIN, /product/ASIN, /ASIN
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /amazon\.com.*?\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /amzn\.to\/([A-Za-z0-9]+)/i, // Short URLs - we'll need to resolve these
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

// Check if URL is an Amazon URL
export function isAmazonUrl(url: string): boolean {
  return /amazon\.(com|co\.uk|ca|de|fr|it|es|co\.jp)|amzn\.to/i.test(url);
}

// Build clean Amazon URL with affiliate tag
export function buildAmazonUrl(asin: string): string {
  const tag = AMAZON_ASSOCIATE_TAG || "giftwishlist-20";
  return `https://www.amazon.com/dp/${asin}?tag=${tag}`;
}

// Sign request using AWS Signature Version 4
function signRequest(
  method: string,
  path: string,
  payload: string,
  timestamp: string
): { headers: Record<string, string> } {
  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY) {
    throw new Error("Amazon credentials not configured");
  }

  const date = timestamp.split("T")[0].replace(/-/g, "");
  const amzDate = timestamp.replace(/[-:]/g, "").split(".")[0] + "Z";

  // Create canonical request
  const canonicalHeaders = [
    `content-encoding:amz-1.0`,
    `content-type:application/json; charset=utf-8`,
    `host:${AMAZON_HOST}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems`,
  ].join("\n");

  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";

  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");

  const canonicalRequest = [
    method,
    path,
    "", // query string (empty)
    canonicalHeaders,
    "",
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const credentialScope = `${date}/${AMAZON_REGION}/${AMAZON_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  // Calculate signature
  const getSignatureKey = (key: string, dateStamp: string, region: string, service: string) => {
    const kDate = crypto.createHmac("sha256", `AWS4${key}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    return kSigning;
  };

  const signingKey = getSignatureKey(AMAZON_SECRET_KEY, date, AMAZON_REGION, AMAZON_SERVICE);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  // Build authorization header
  const authorization = `AWS4-HMAC-SHA256 Credential=${AMAZON_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    headers: {
      "content-encoding": "amz-1.0",
      "content-type": "application/json; charset=utf-8",
      "host": AMAZON_HOST,
      "x-amz-date": amzDate,
      "x-amz-target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems",
      "authorization": authorization,
    },
  };
}

// Fetch product info from Amazon PA-API
export async function getAmazonProductInfo(asin: string): Promise<AmazonProductInfo | null> {
  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_ASSOCIATE_TAG) {
    console.error("Amazon PA-API credentials not configured");
    return null;
  }

  const payload = JSON.stringify({
    ItemIds: [asin],
    PartnerTag: AMAZON_ASSOCIATE_TAG,
    PartnerType: "Associates",
    Resources: [
      "ItemInfo.Title",
      "Images.Primary.Large",
      "Offers.Listings.Price",
    ],
  });

  const timestamp = new Date().toISOString();
  const path = "/paapi5/getitems";

  try {
    const { headers } = signRequest("POST", path, payload, timestamp);

    const response = await fetch(`https://${AMAZON_HOST}${path}`, {
      method: "POST",
      headers,
      body: payload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Amazon PA-API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();

    if (!data.ItemsResult?.Items?.[0]) {
      console.error("No items returned from Amazon PA-API");
      return null;
    }

    const item = data.ItemsResult.Items[0];

    // Extract data
    const title = item.ItemInfo?.Title?.DisplayValue || null;
    const imageUrl = item.Images?.Primary?.Large?.URL || null;

    // Get price from offers
    let price: string | null = null;
    const listing = item.Offers?.Listings?.[0];
    if (listing?.Price?.DisplayAmount) {
      price = listing.Price.DisplayAmount;
    }

    return {
      title,
      imageUrl,
      price,
      url: buildAmazonUrl(asin),
    };
  } catch (error) {
    console.error("Error fetching Amazon product info:", error);
    return null;
  }
}

// Resolve amzn.to short URLs to full URLs
export async function resolveAmazonShortUrl(shortUrl: string): Promise<string | null> {
  try {
    const response = await fetch(shortUrl, {
      method: "HEAD",
      redirect: "follow",
    });
    return response.url;
  } catch {
    return null;
  }
}
