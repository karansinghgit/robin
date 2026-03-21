import React, { useEffect, useRef, useState } from "react";
import { IconChevron } from "./icons";

export interface DropdownOption {
  value: string;
  label: string;
  group?: string;
}

export function ThemedDropdown({
  value,
  options,
  placeholder,
  onChange,
  disabled,
  compact = false,
  borderless = false,
  menuDirection = "down",
  className
}: {
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  borderless?: boolean;
  menuDirection?: "down" | "up";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const label = selected?.label ?? placeholder;
  const renderedOptions: React.ReactNode[] = [];
  let activeGroup = "";

  for (const option of options) {
    if (option.group && option.group !== activeGroup) {
      activeGroup = option.group;
      renderedOptions.push(
        <div key={`group-${option.group}`} className="themed-dropdown-group">
          {option.group}
        </div>
      );
    }
    renderedOptions.push(
      <button
        key={option.value}
        type="button"
        className={`themed-dropdown-option${option.value === value ? " themed-dropdown-option-active" : ""}`}
        onClick={() => {
          onChange(option.value);
          setOpen(false);
        }}
      >
        {option.label}
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`themed-dropdown${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        className={
          `themed-dropdown-trigger${open ? " themed-dropdown-trigger-open" : ""}` +
          `${compact ? " themed-dropdown-trigger-compact" : ""}` +
          `${borderless ? " themed-dropdown-trigger-borderless" : ""}`
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={`themed-dropdown-label${selected ? "" : " themed-dropdown-label-placeholder"}`}
        >
          {label}
        </span>
        <span
          className={`themed-dropdown-arrow${open ? " themed-dropdown-arrow-open" : ""}`}
        >
          <IconChevron />
        </span>
      </button>
      {open ? (
        <div
          className={`themed-dropdown-menu${menuDirection === "up" ? " themed-dropdown-menu-up" : ""}`}
          role="listbox"
        >
          {renderedOptions.length > 0 ? (
            renderedOptions
          ) : (
            <div className="themed-dropdown-empty">No options available</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
