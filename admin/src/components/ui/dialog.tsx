import * as React from "react";

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<{
  open: boolean;
  setOpen: (value: boolean) => void;
} | null>(null);

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("DialogTrigger must be used within Dialog");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ctx.setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          ctx.setOpen(true);
        }
      }}
      className="inline-flex"
    >
      {children}
    </div>
  );
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(DialogContext);
  if (!ctx || !ctx.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
        <button
          type="button"
          className="absolute right-4 top-4 text-muted-foreground"
          onClick={() => ctx.setOpen(false)}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4 space-y-1">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

