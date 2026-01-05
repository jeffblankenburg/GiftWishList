"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CodeInputProps {
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  phoneNumber: string;
  onChangePhone: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function CodeInput({
  onSubmit,
  onResend,
  phoneNumber,
  onChangePhone,
  isLoading,
  error,
}: CodeInputProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resendCountdown, setResendCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Auto-submit when all digits are entered
  useEffect(() => {
    const fullCode = code.join("");
    if (fullCode.length === 6 && code.every((d) => d !== "")) {
      onSubmit(fullCode);
    }
  }, [code, onSubmit]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);

      // Focus the next empty input or the last one
      const nextEmpty = newCode.findIndex((d) => d === "");
      inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    }
  };

  const handleResend = async () => {
    setResendCountdown(30);
    await onResend();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to
        </p>
        <p className="font-medium">{phoneNumber}</p>
        <button
          type="button"
          onClick={onChangePhone}
          className="text-sm text-primary hover:underline"
          disabled={isLoading}
        >
          Change number
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {code.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="w-12 h-14 text-center text-xl font-semibold"
            disabled={isLoading}
            autoFocus={index === 0}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {isLoading && (
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="text-center">
        {resendCountdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Resend code in {resendCountdown}s
          </p>
        ) : (
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={isLoading}
            className="text-sm"
          >
            Resend code
          </Button>
        )}
      </div>
    </div>
  );
}
