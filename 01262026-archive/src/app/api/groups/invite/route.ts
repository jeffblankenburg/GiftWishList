import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, PrismaTransactionClient } from "@/lib/db";
import { sendSms } from "@/lib/twilio";

// Normalize phone number to E.164 format
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If it starts with 1 and is 11 digits, assume US number
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // If it's 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it already has country code (starts with +), return as is
  if (phone.startsWith("+")) {
    return `+${digits}`;
  }

  // Default: return with + prefix
  return `+${digits}`;
}

// POST /api/groups/invite - Invite a user to a group by phone number
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, phoneNumber } = await request.json();

    if (!groupId || !phoneNumber) {
      return NextResponse.json(
        { error: "Group ID and phone number are required" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Validate phone number format
    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Check if user is a member of the group
    const membership = await db.groupMembership.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId,
        },
      },
      include: {
        group: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 }
      );
    }

    // Check if invited user already exists
    let invitedUser = await db.user.findUnique({
      where: { phoneNumber: normalizedPhone },
      include: {
        lists: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    // Check if user is already in the group
    if (invitedUser) {
      const existingMembership = await db.groupMembership.findUnique({
        where: {
          userId_groupId: {
            userId: invitedUser.id,
            groupId,
          },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "This person is already a member of the group" },
          { status: 400 }
        );
      }
    }

    // Create user and add to group in a transaction
    await db.$transaction(async (tx: PrismaTransactionClient) => {
      let targetUser = invitedUser;
      let defaultList = invitedUser?.lists[0];

      if (!targetUser) {
        // Create new user with empty display name (will be set when they log in)
        targetUser = await tx.user.create({
          data: {
            phoneNumber: normalizedPhone,
            displayName: "",
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
        defaultList = targetUser.lists[0];
      }

      if (!defaultList) {
        // Create default list if somehow missing
        defaultList = await tx.list.create({
          data: {
            userId: targetUser.id,
            name: "My Wishlist",
            isDefault: true,
          },
        });
      }

      // Add user to group
      await tx.groupMembership.create({
        data: {
          userId: targetUser.id,
          groupId,
          listId: defaultList.id,
          role: "MEMBER",
        },
      });

      // Set as default group if user doesn't have one
      if (!targetUser.defaultGroupId) {
        await tx.user.update({
          where: { id: targetUser.id },
          data: { defaultGroupId: groupId },
        });
      }
    });

    // Send invitation SMS
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://groupgiftlist.com";
    const inviterName = user.displayName || "Someone";
    const groupName = membership.group.name;

    const isNewUser = !invitedUser;
    let message: string;

    if (isNewUser) {
      message = `${inviterName} invited you to "${groupName}" on Group Gift List! Create your wishlist and share gift ideas with family and friends. Get started: ${appUrl}`;
    } else {
      message = `${inviterName} added you to "${groupName}" on Group Gift List! View the group: ${appUrl}/groups`;
    }

    await sendSms(normalizedPhone, message);

    return NextResponse.json({
      success: true,
      message: isNewUser
        ? "Invitation sent! They'll receive a text to set up their account."
        : "User added to the group and notified.",
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return NextResponse.json(
      { error: "Failed to invite user" },
      { status: 500 }
    );
  }
}
