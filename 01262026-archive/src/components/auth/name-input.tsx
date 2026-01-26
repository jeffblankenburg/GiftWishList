"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface NameInputProps {
  onSubmit: (displayName: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function NameInput({ onSubmit, isLoading, error }: NameInputProps) {
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      await onSubmit(displayName.trim());
    }
  };

  const isValid = displayName.trim().length >= 2;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="text-lg h-14 text-center"
          autoFocus
          autoComplete="name"
          maxLength={50}
          disabled={isLoading}
        />
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base"
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Continue"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        This is how your family and friends will see you in their groups.
      </p>
    </form>
  );
}
