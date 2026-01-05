import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { displayName } = await request.json();

    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    if (displayName.length > 50) {
      return NextResponse.json(
        { error: "Display name must be 50 characters or less" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { displayName: displayName.trim() },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error in update-profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
