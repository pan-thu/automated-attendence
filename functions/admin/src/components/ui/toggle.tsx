import * as React from "react";

export interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <input
          ref={ref}
          type="checkbox"
          className={`size-4 rounded border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`}
          {...props}
        />
        {label ? <span>{label}</span> : null}
      </label>
    );
  }
);
Toggle.displayName = "Toggle";

