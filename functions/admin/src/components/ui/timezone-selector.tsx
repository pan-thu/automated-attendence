"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TIMEZONES, searchTimezones } from "@/lib/timezones";

interface TimezoneSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function TimezoneSelector({
  value,
  onChange,
  placeholder = "Select timezone...",
}: TimezoneSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredTimezones = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return TIMEZONES;
    }
    return searchTimezones(searchQuery);
  }, [searchQuery]);

  const selectedTimezone = React.useMemo(() => {
    return TIMEZONES.find((tz) => tz.value === value);
  }, [value]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [open]);

  const handleSelect = (timezoneValue: string) => {
    onChange?.(timezoneValue);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        onClick={() => setOpen(!open)}
      >
        {selectedTimezone ? (
          <span className="truncate">{selectedTimezone.label}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none animate-in fade-in-80"
        >
          <div className="p-2">
            <Input
              placeholder="Search timezones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-auto p-1">
            {filteredTimezones.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No timezone found.
              </div>
            ) : (
              filteredTimezones.map((timezone) => (
                <div
                  key={timezone.value}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                    value === timezone.value && "bg-accent"
                  )}
                  onClick={() => handleSelect(timezone.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === timezone.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{timezone.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
