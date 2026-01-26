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
import { ArrowLeft, Copy, Check, UserPlus, Loader2, Users } from "lucide-react";

interface Member {
  id: string;
  displayName: string;
  phoneNumber: string;
  role: string;
  isCurrentUser: boolean;
}

interface GroupDetailProps {
  group: {
    id: string;
    name: string;
    code: string;
  };
  members: Member[];
  currentUserRole: string;
}

export function GroupDetail({ group, members, currentUserRole }: GroupDetailProps) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(group.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/groups/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send invite");
        return;
      }

      setSuccess(data.message);
      setPhoneNumber("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format as (XXX) XXX-XXXX for US numbers
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <Users className="h-3 w-3" />
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Invite Code */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Invite Code</p>
              <p className="text-lg font-mono font-bold">{group.code}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Members</h2>
          <Dialog open={isInviteOpen} onOpenChange={(open) => {
            setIsInviteOpen(open);
            if (!open) {
              setError(null);
              setSuccess(null);
              setPhoneNumber("");
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite someone</DialogTitle>
                <DialogDescription>
                  Enter their phone number to send an invitation via text message.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}
                <Button type="submit" className="w-full" disabled={isLoading || !phoneNumber.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Invite"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {member.displayName}
                  {member.isCurrentUser && (
                    <span className="text-muted-foreground text-sm ml-2">(you)</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatPhoneNumber(member.phoneNumber)}
                </p>
              </div>
              {member.role === "OWNER" && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  Owner
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
