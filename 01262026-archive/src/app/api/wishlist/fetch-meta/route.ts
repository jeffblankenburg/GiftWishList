import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchUrlMetadata } from "@/lib/url-metadata";

// POST /api/wishlist/fetch-meta - Fetch metadata from a URL
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const metadata = await fetchUrlMetadata(url);

    return NextResponse.json({
      title: metadata.title,
      imageUrl: metadata.imageUrl,
      price: metadata.price,
      siteName: metadata.siteName,
      url: metadata.url,
    });
  } catch (error) {
    console.error("Error in fetch-meta:", error);
    return NextResponse.json({ title: null, imageUrl: null, price: null });
  }
}
