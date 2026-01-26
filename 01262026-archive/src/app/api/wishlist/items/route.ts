import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/wishlist/items - Add item to a list
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId, url, title, siteName, imageUrl, price, notes } = await request.json();

    if (!listId || !url || !title) {
      return NextResponse.json(
        { error: "List ID, URL, and title are required" },
        { status: 400 }
      );
    }

    // Verify the list belongs to the user
    const list = await db.list.findFirst({
      where: { id: listId, userId: user.id },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Check for duplicate URL in this list
    const existingItem = await db.wishlistItem.findFirst({
      where: { listId, url },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "This item is already on your list" },
        { status: 400 }
      );
    }

    // Create the item
    const item = await db.wishlistItem.create({
      data: {
        listId,
        url,
        title,
        siteName: siteName || null,
        imageUrl: imageUrl || null,
        price: price || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        url: item.url,
        title: item.title,
        siteName: item.siteName,
        imageUrl: item.imageUrl,
        price: item.price,
        notes: item.notes,
      },
    });
  } catch (error) {
    console.error("Error adding wishlist item:", error);
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500 }
    );
  }
}
