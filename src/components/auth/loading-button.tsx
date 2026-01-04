"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { type VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoadingButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
  asChild?: boolean;
}

export function LoadingButton({
  children,
  loading = false,
  loadingText,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={loading || disabled}
      className={cn("min-h-[44px]", className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
