import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, PrismaTransactionClient } from "@/lib/db";
import { generateInviteCode } from "@/lib/utils/generate-code";

// GET /api/groups - List user's groups
export async function GET() {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.groupMembership.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const groups = memberships.map((m: typeof memberships[number]) => ({
      id: m.group.id,
      name: m.group.name,
      code: m.group.code,
      memberCount: m.group._count.members,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: "Group name must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Generate unique invite code
    let code = generateInviteCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.group.findUnique({ where: { code } });
      if (!existing) break;
      code = generateInviteCode();
      attempts++;
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

    // Create group and membership in a transaction
    const group = await db.$transaction(async (tx: PrismaTransactionClient) => {
      const newGroup = await tx.group.create({
        data: {
          name: name.trim(),
          code,
          ownerId: user.id,
        },
      });

      await tx.groupMembership.create({
        data: {
          userId: user.id,
          groupId: newGroup.id,
          listId: defaultList.id,
          role: "OWNER",
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
          data: { defaultGroupId: newGroup.id },
        });
      }

      return newGroup;
    });

    return NextResponse.json({
      success: true,
      group: {
        id: group.id,
        name: group.name,
        code: group.code,
      },
    });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
