import * as React from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFramerDropdown } from "@/components/ui/framerDropdownContext";

/**
 * Sharp menu item used inside `FramerDropdownContent`.
 * CTA slide-up behavior is intentionally reserved for JackButton.
 *
 * Must be rendered within a `FramerDropdownRoot` so it can close the
 * dropdown when invoked.
 */
export interface JackMenuItemProps {
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function JackMenuItem({
  to,
  onClick,
  icon,
  trailing,
  className,
  children,
}: JackMenuItemProps) {
  const { close } = useFramerDropdown();
  const navigate = useNavigate();

  const handleClick = () => {
    onClick?.();
    if (to) navigate(to);
    close();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "block w-full bg-white px-4 py-3 text-left font-mono text-[12px] font-bold uppercase tracking-wider text-matte-black transition-colors hover:bg-rose-500 hover:text-white",
        className,
      )}
    >
      <span className="flex w-full items-center gap-2">
        {icon}
        <span className="flex-1 truncate">{children}</span>
        {trailing}
      </span>
    </button>
  );
}

export const JackMenuDivider = () => <div className="h-px bg-black/10" />;
