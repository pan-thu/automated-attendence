import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

const badgeVariants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border border-input text-foreground",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = "default", ...props }, ref) => (
  <span
    ref={ref}
    className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeVariants[variant], className)}
    {...props}
  />
));
Badge.displayName = "Badge";

