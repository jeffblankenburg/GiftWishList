import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { GroupsList } from "@/components/groups/groups-list";

export default async function GroupsPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's groups
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
    memberCount: m.group._count.members,
    role: m.role,
  }));

  return (
    <div className="min-h-screen bg-background">
      <GroupsList groups={groups} userName={user.displayName} />
    </div>
  );
}
