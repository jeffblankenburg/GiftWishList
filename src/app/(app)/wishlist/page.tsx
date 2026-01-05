import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export default async function WishlistPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // Get user's default list with items
  const defaultList = await db.list.findFirst({
    where: { userId: user.id, isDefault: true },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // If no default list exists, create one (shouldn't happen, but just in case)
  if (!defaultList) {
    const newList = await db.list.create({
      data: {
        userId: user.id,
        name: "My Wishlist",
        isDefault: true,
      },
    });
    return (
      <div className="min-h-screen bg-background">
        <WishlistView
          list={{ id: newList.id, name: newList.name, items: [] }}
          userName={user.displayName}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WishlistView
        list={{
          id: defaultList.id,
          name: defaultList.name,
          items: defaultList.items.map((item) => ({
            id: item.id,
            url: item.url,
            title: item.title,
            siteName: item.siteName,
            imageUrl: item.imageUrl,
            price: item.price,
            notes: item.notes,
            priority: item.priority,
          })),
        }}
        userName={user.displayName}
      />
    </div>
  );
}
