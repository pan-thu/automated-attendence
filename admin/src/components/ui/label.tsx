import * as React from "react";

import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  requiredMarker?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, requiredMarker = false, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium leading-none text-foreground", className)}
      {...props}
    >
      <span>{children}</span>
      {requiredMarker ? <span className="ml-1 text-destructive">*</span> : null}
    </label>
  )
);
Label.displayName = "Label";

export { Label };

