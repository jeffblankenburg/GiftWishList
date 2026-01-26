import { NextRequest, NextResponse } from "next/server";
import { checkVerificationCode } from "@/lib/twilio";
import { formatPhoneNumber, isValidPhoneNumber, createSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code } = await request.json();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: "Phone number and code are required" },
        { status: 400 }
      );
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Verify the code with Twilio
    const result = await checkVerificationCode(formattedPhone, code);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { phoneNumber: formattedPhone },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user with temporary display name and default list
      user = await db.user.create({
        data: {
          phoneNumber: formattedPhone,
          displayName: "", // Will be set during onboarding
          lists: {
            create: {
              name: "My Wishlist",
              isDefault: true,
            },
          },
        },
      });
    }

    // Create session
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Error in verify-code:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
