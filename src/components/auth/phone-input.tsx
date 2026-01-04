"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

// Format phone number as user types (US format: (XXX) XXX-XXXX)
function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 10);

  if (limited.length === 0) return "";
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6)
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
}

function getDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidPhone(value: string): boolean {
  const digits = getDigits(value);
  return digits.length === 10;
}

export function PhoneInput({
  value,
  onChange,
  error,
  className,
  ...props
}: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <div className="space-y-2">
      <div className="flex">
        <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm min-h-[44px]">
          +1
        </div>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(555) 555-5555"
          value={value}
          onChange={handleChange}
          className={cn(
            "rounded-l-none min-h-[44px] text-base",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? "phone-error" : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id="phone-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
