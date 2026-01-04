"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/auth/code-input";
import { LoadingButton } from "@/components/auth/loading-button";

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resendTimer, setResendTimer] = React.useState(RESEND_COOLDOWN);
  const [resending, setResending] = React.useState(false);

  // Get phone from session on mount
  React.useEffect(() => {
    const storedPhone = sessionStorage.getItem("authPhone");
    if (!storedPhone) {
      router.replace("/login");
      return;
    }
    setPhone(storedPhone);
  }, [router]);

  // Resend countdown timer
  React.useEffect(() => {
    if (resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = async (_verificationCode: string) => {
    setError("");
    setLoading(true);

    try {
      // TODO: Call API to verify code
      // Simulating API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo: accept any 6-digit code
      // In production, this would validate against the server

      // Check if user needs to set up name (new user)
      // For demo, we'll simulate this check
      const isNewUser = sessionStorage.getItem("isNewUser") !== "false";

      if (isNewUser) {
        // Mark as new user and go to setup
        sessionStorage.setItem("isNewUser", "true");
        router.push("/setup");
      } else {
        // Returning user - go to main app
        sessionStorage.removeItem("authPhone");
        sessionStorage.removeItem("isNewUser");
        router.push("/");
      }
    } catch {
      setError("Invalid code. Please try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResending(true);

    try {
      // TODO: Call API to resend code
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setResendTimer(RESEND_COOLDOWN);
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleEditPhone = () => {
    router.push("/login");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      handleVerify(code);
    }
  };

  if (!phone) {
    return null; // Redirect happening
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Enter verification code</CardTitle>
        <CardDescription className="space-y-1">
          <span className="block">We sent a code to</span>
          <span className="flex items-center justify-center gap-1">
            <span className="font-medium text-foreground">+1 {phone}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleEditPhone}
              className="h-6 w-6"
              aria-label="Edit phone number"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </span>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <CodeInput
            value={code}
            onChange={(value) => {
              setCode(value);
              if (error) setError("");
            }}
            onComplete={handleVerify}
            error={error}
            disabled={loading}
          />
        </CardContent>
        <CardFooter className="flex-col gap-3 pt-2">
          <LoadingButton
            type="submit"
            className="w-full text-base"
            size="lg"
            loading={loading}
            loadingText="Verifying..."
            disabled={code.length !== 6}
          >
            Verify
          </LoadingButton>

          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend code in {resendTimer}s
              </p>
            ) : (
              <Button
                type="button"
                variant="link"
                onClick={handleResend}
                disabled={resending}
                className="text-sm"
              >
                {resending ? "Sending..." : "Resend code"}
              </Button>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
