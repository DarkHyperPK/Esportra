import * as React from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFramerDropdown } from "@/components/ui/FramerDropdown";

/**
 * JACK IN-style menu item used inside `FramerDropdownContent`.
 * White tile, mono uppercase text, rose-pink slide-up on hover.
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
        "group relative block w-full overflow-hidden bg-white px-4 py-3 text-left font-mono text-[12px] font-bold uppercase tracking-wider text-black",
        className,
      )}
    >
      <span className="relative z-10 flex w-full items-center gap-2">
        {icon}
        <span className="flex-1 truncate">{children}</span>
        {trailing}
      </span>
      <span className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
    </button>
  );
}

export const JackMenuDivider = () => <div className="h-px bg-black/10" />;
