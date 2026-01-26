"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PhoneInputProps {
  onSubmit: (phoneNumber: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function PhoneInput({ onSubmit, isLoading, error }: PhoneInputProps) {
  const [phoneNumber, setPhoneNumber] = useState("");

  const formatDisplayPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDisplayPhone(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(phoneNumber);
  };

  const isValid = phoneNumber.replace(/\D/g, "").length >= 10;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="tel"
          placeholder="(555) 555-5555"
          value={phoneNumber}
          onChange={handleChange}
          className="text-lg h-14 text-center"
          autoFocus
          autoComplete="tel"
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
            Sending code...
          </>
        ) : (
          "Send verification code"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        We&apos;ll text you a code to sign in. Standard message rates may apply.
      </p>
    </form>
  );
}
