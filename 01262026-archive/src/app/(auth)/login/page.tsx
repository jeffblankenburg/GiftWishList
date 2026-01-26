"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PhoneInput } from "@/components/auth/phone-input";
import { CodeInput } from "@/components/auth/code-input";
import { NameInput } from "@/components/auth/name-input";

type AuthStep = "phone" | "code" | "name";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (phone: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send code");
        return;
      }

      setPhoneNumber(phone);
      setStep("code");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid code");
        setIsLoading(false);
        return;
      }

      if (data.isNewUser || !data.user.displayName) {
        setStep("name");
      } else {
        // Existing user with name, go to app
        router.push("/groups");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, router]);

  const handleResendCode = async () => {
    setError(null);
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to resend code");
      }
    } catch {
      setError("Failed to resend code");
    }
  };

  const handleSetName = async (displayName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save name");
        return;
      }

      // Success, go to app
      router.push("/groups");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePhone = () => {
    setStep("phone");
    setError(null);
  };

  return (
    <AuthLayout
      title={
        step === "phone"
          ? "Sign in"
          : step === "code"
            ? "Enter your code"
            : "What's your name?"
      }
      subtitle={
        step === "phone"
          ? "Enter your phone number to get started"
          : step === "code"
            ? undefined
            : "Let's set up your profile"
      }
    >
      {step === "phone" && (
        <PhoneInput
          onSubmit={handleSendCode}
          isLoading={isLoading}
          error={error}
        />
      )}

      {step === "code" && (
        <CodeInput
          phoneNumber={phoneNumber}
          onSubmit={handleVerifyCode}
          onResend={handleResendCode}
          onChangePhone={handleChangePhone}
          isLoading={isLoading}
          error={error}
        />
      )}

      {step === "name" && (
        <NameInput
          onSubmit={handleSetName}
          isLoading={isLoading}
          error={error}
        />
      )}
    </AuthLayout>
  );
}
