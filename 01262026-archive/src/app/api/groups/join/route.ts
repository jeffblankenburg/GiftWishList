import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, PrismaTransactionClient } from "@/lib/db";

// POST /api/groups/join - Join a group by code
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Find the group
    const group = await db.group.findUnique({
      where: { code: normalizedCode },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMembership = await db.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: group.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "You're already a member of this group" },
        { status: 400 }
      );
    }

    // Get user's default list
    const defaultList = await db.list.findFirst({
      where: { userId: user.id, isDefault: true },
    });

    if (!defaultList) {
      return NextResponse.json(
        { error: "No default list found. Please contact support." },
        { status: 500 }
      );
    }

    // Create membership
    await db.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.groupMembership.create({
        data: {
          userId: user.id,
          groupId: group.id,
          listId: defaultList.id,
          role: "MEMBER",
        },
      });

      // Set as default group if user doesn't have one
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { defaultGroupId: true },
      });

      if (!currentUser?.defaultGroupId) {
        await tx.user.update({
          where: { id: user.id },
          data: { defaultGroupId: group.id },
        });
      }
    });

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
      },
    });
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 }
    );
  }
}
