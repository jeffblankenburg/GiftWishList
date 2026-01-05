"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Plus, Users, LogOut, Loader2, ExternalLink, Trash2 } from "lucide-react";

interface WishlistItem {
  id: string;
  url: string;
  title: string;
  siteName: string | null;
  imageUrl: string | null;
  price: string | null;
  notes: string | null;
  priority: number;
}

interface WishlistList {
  id: string;
  name: string;
  items: WishlistItem[];
}

interface WishlistViewProps {
  list: WishlistList;
  userName: string;
}

type AddStep = "url" | "preview";

interface FetchedMeta {
  title: string | null;
  siteName: string | null;
  imageUrl: string | null;
  price: string | null;
  url?: string; // May be modified (e.g., with affiliate tag)
}

export function WishlistView({ list, userName }: WishlistViewProps) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<AddStep>("url");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [siteName, setSiteName] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAddStep("url");
    setUrl("");
    setTitle("");
    setSiteName(null);
    setImageUrl(null);
    setPrice(null);
    setNotes("");
    setError(null);
  };

  const handleDialogChange = (open: boolean) => {
    setIsAddOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsFetchingMeta(true);
    setError(null);

    try {
      const response = await fetch("/api/wishlist/fetch-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (response.ok) {
        const data: FetchedMeta = await response.json();
        setTitle(data.title || "");
        setSiteName(data.siteName);
        setImageUrl(data.imageUrl);
        setPrice(data.price);
        // Use modified URL if returned (e.g., with affiliate tag)
        if (data.url) {
          setUrl(data.url);
        }
      }
      setAddStep("preview");
    } catch {
      // Still go to preview, user can enter title manually
      setAddStep("preview");
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/wishlist/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: list.id,
          url: url.trim(),
          title: title.trim(),
          siteName,
          imageUrl,
          price,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to add item");
        return;
      }

      handleDialogChange(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/wishlist/items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      }
    } catch {
      // Handle error silently for now
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{list.name}</h1>
          <p className="text-muted-foreground text-sm">Hi, {userName}!</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/groups")}>
            <Users className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Items list */}
      {list.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Gift className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">Your wishlist is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add items you&apos;d love to receive as gifts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {item.imageUrl && (
                    <div className="w-16 h-16 rounded bg-muted flex-shrink-0 overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {item.siteName && <span>{item.siteName}</span>}
                      {item.siteName && item.price && <span>·</span>}
                      {item.price && <span>{item.price}</span>}
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(item.url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add item button */}
      <Dialog open={isAddOpen} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </DialogTrigger>
        <DialogContent>
          {addStep === "url" ? (
            <>
              <DialogHeader>
                <DialogTitle>Add to wishlist</DialogTitle>
                <DialogDescription className="sr-only">
                  Paste a product URL to add it to your wishlist
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Paste a link</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isFetchingMeta}
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isFetchingMeta || !url.trim()}>
                  {isFetchingMeta ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching details...
                    </>
                  ) : (
                    "Next"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Confirm item</DialogTitle>
                <DialogDescription className="sr-only">
                  Review and confirm the item details before adding to your wishlist
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddItem} className="space-y-4">
                {/* Preview image */}
                {imageUrl && (
                  <div className="w-full h-40 rounded-lg bg-muted overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="What is this item?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {(siteName || price) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {siteName && <span>{siteName}</span>}
                    {siteName && price && <span>·</span>}
                    {price && <span>{price}</span>}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Size, color, preferences..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isLoading}
                    rows={2}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setAddStep("url")}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading || !title.trim()}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Item"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
