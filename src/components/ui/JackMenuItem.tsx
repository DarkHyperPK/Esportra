import * as React from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFramerDropdown } from "@/components/ui/framerDropdownContext";

/**
 * Quiet menu row used inside `FramerDropdownContent`: dark at rest, lit on hover and focus.
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
    close();
    if (to) navigate(to);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "block w-full rounded-md px-3 py-2.5 text-left text-[13px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.08] focus-visible:text-white focus-visible:outline-none",
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

export const JackMenuDivider = () => <div className="mx-2 my-1 h-px bg-white/[0.08]" />;
