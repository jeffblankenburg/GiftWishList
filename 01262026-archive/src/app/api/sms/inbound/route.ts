import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/twilio";
import { fetchUrlMetadata } from "@/lib/url-metadata";

// Helper to extract URL and notes from message
function extractUrlAndNotes(text: string): { url: string | null; notes: string | null } {
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const match = text.match(urlRegex);

  if (!match) {
    return { url: null, notes: null };
  }

  const url = match[1];
  // Remove the URL from the message to get the notes
  const remaining = text.replace(url, "").trim();
  const notes = remaining.length > 0 ? remaining : null;

  return { url, notes };
}

// POST /api/sms/inbound - Receive inbound SMS from Twilio
export async function POST(request: NextRequest) {
  try {
    // Parse the form data from Twilio
    const formData = await request.formData();
    const from = formData.get("From") as string;
    const body = formData.get("Body") as string;

    if (!from || !body) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    console.log(`SMS received from ${from}: ${body}`);

    // Extract URL and notes from message
    const { url, notes } = extractUrlAndNotes(body);
    console.log(`Extracted URL: ${url}`);
    console.log(`Extracted notes: ${notes}`);

    if (!url) {
      // No URL - check if this is a follow-up message adding notes to the last item
      const messageText = body.trim();

      // Heuristic: likely notes if it's short and doesn't look like a question/command
      const looksLikeNotes = messageText.length < 100
        && !messageText.includes("?")
        && !messageText.toLowerCase().startsWith("help")
        && !messageText.toLowerCase().startsWith("stop");

      // Only delay if it looks like notes (to allow concurrent URL processing to finish)
      if (looksLikeNotes) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      const user = await db.user.findUnique({
        where: { phoneNumber: from },
        include: {
          lists: {
            where: { isDefault: true },
            take: 1,
            include: {
              items: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      const lastItem = user?.lists[0]?.items[0];

      // Only treat as notes if the last item was added within the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (lastItem && lastItem.createdAt > fiveMinutesAgo) {
        // Append to existing notes or set new notes
        const newNotes = lastItem.notes
          ? `${lastItem.notes}\n${body.trim()}`
          : body.trim();

        await db.wishlistItem.update({
          where: { id: lastItem.id },
          data: { notes: newNotes },
        });

        await sendSms(from, `Got it! Added notes to "${lastItem.title}": ${body.trim()}`);
        return twimlResponse();
      }

      // No recent item to add notes to - send helpful reply
      await sendSms(
        from,
        "To add an item to your wishlist, text me a link to the product. Example: https://amazon.com/dp/..."
      );
      return twimlResponse();
    }

    // Look up or create user by phone number
    let user = await db.user.findUnique({
      where: { phoneNumber: from },
      include: {
        lists: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    let defaultList = user?.lists[0];

    if (!user) {
      // Auto-create account for new user
      user = await db.user.create({
        data: {
          phoneNumber: from,
          displayName: "", // Will be set when they log in
          lists: {
            create: {
              name: "My Wishlist",
              isDefault: true,
            },
          },
        },
        include: {
          lists: {
            where: { isDefault: true },
            take: 1,
          },
        },
      });
      defaultList = user.lists[0];
    }

    if (!defaultList) {
      // Shouldn't happen, but create one just in case
      defaultList = await db.list.create({
        data: {
          userId: user.id,
          name: "My Wishlist",
          isDefault: true,
        },
      });
    }

    // Check if URL already exists in their list
    const existingItem = await db.wishlistItem.findFirst({
      where: { listId: defaultList.id, url },
    });

    if (existingItem) {
      await sendSms(from, `That item is already on your wishlist: "${existingItem.title}"`);
      return twimlResponse();
    }

    // Fetch metadata for the URL (uses shared library with Amazon PA-API support)
    const metadata = await fetchUrlMetadata(url);
    const title = metadata.title || "Untitled Item";
    // Use the (possibly modified) URL from metadata (e.g., with affiliate tag)
    const finalUrl = metadata.url;

    // Add item to wishlist
    await db.wishlistItem.create({
      data: {
        listId: defaultList.id,
        url: finalUrl,
        title,
        siteName: metadata.siteName,
        imageUrl: metadata.imageUrl,
        price: metadata.price,
        notes,
      },
    });

    // Send confirmation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app";
    const isNewUser = user.displayName === "";

    let replyMessage = `Added to your wishlist: "${title}"`;
    if (metadata.siteName) {
      replyMessage += ` from ${metadata.siteName}`;
    }

    if (isNewUser) {
      replyMessage += `\n\nNew here? Set up your account at ${appUrl} to share your list with family and friends!`;
    }

    await sendSms(from, replyMessage);

    return twimlResponse();
  } catch (error) {
    console.error("Error processing inbound SMS:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

// Return empty TwiML response (we send replies via the API instead)
function twimlResponse() {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    }
  );
}
