"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/auth/loading-button";
import { cn } from "@/lib/utils";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const storedPhone = sessionStorage.getItem("authPhone");
    const isNewUser = sessionStorage.getItem("isNewUser");

    if (!storedPhone || isNewUser !== "true") {
      router.replace("/login");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (trimmedName.length > 50) {
      setError("Name must be less than 50 characters");
      return;
    }

    setLoading(true);

    try {
      // TODO: Call API to save user name
      // Simulating API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      sessionStorage.removeItem("authPhone");
      sessionStorage.removeItem("isNewUser");

      router.push("/");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">What&apos;s your name?</CardTitle>
        <CardDescription>
          This is how others will see you
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              disabled={loading}
              autoComplete="name"
              autoFocus
              className={cn(
                "min-h-[44px] text-base text-center",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={!!error}
              aria-describedby={error ? "name-error" : undefined}
            />
            {error && (
              <p id="name-error" className="text-sm text-destructive text-center">
                {error}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <LoadingButton
            type="submit"
            className="w-full text-base"
            size="lg"
            loading={loading}
            loadingText="Saving..."
          >
            Continue
          </LoadingButton>
        </CardFooter>
      </form>
    </Card>
  );
}
