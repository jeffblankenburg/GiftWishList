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
import { PhoneInput, isValidPhone } from "@/components/auth/phone-input";
import { LoadingButton } from "@/components/auth/loading-button";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate phone number
    if (!isValidPhone(phone)) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);

    try {
      // TODO: Call API to send verification code
      // Simulating API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      sessionStorage.setItem("authPhone", phone);

      router.push("/verify");
    } catch {
      setError("Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome</CardTitle>
        <CardDescription>
          Enter your phone number to sign in or create an account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <PhoneInput
            value={phone}
            onChange={(value) => {
              setPhone(value);
              if (error) setError("");
            }}
            error={error}
            disabled={loading}
          />
          <p className="text-sm text-muted-foreground text-center">
            We&apos;ll text you a code to sign in
          </p>
        </CardContent>
        <CardFooter className="pt-2">
          <LoadingButton
            type="submit"
            className="w-full text-base"
            size="lg"
            loading={loading}
            loadingText="Sending..."
          >
            Send Code
          </LoadingButton>
        </CardFooter>
      </form>
    </Card>
  );
}
