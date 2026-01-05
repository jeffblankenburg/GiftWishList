import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { GroupDetail } from "@/components/groups/group-detail";

interface GroupDetailPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupDetailPage({ params }: GroupDetailPageProps) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const { groupId } = await params;

  // Fetch group with membership check
  const membership = await db.groupMembership.findUnique({
    where: {
      userId_groupId: {
        userId: user.id,
        groupId,
      },
    },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    notFound();
  }

  const group = membership.group;

  const members = group.members.map((m: typeof group.members[number]) => ({
    id: m.user.id,
    displayName: m.user.displayName || "New User",
    phoneNumber: m.user.phoneNumber,
    role: m.role,
    isCurrentUser: m.user.id === user.id,
  }));

  return (
    <div className="min-h-screen bg-background">
      <GroupDetail
        group={{
          id: group.id,
          name: group.name,
          code: group.code,
        }}
        members={members}
        currentUserRole={membership.role}
      />
    </div>
  );
}
