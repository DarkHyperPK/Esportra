import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * JackButton — the platform's signature CTA.
 *
 * Visual language inspired by the "JACK IN" button on the About page
 * (`@/pages/About.tsx`). Renders a sharp-cornered surface with text in a
 * mono uppercase voice. On hover, a rose-pink panel slides up from below
 * while the text stays in place.
 *
 * Theme constraints (see `docs/UI_DESIGN_GUIDE.md`):
 *   - White, matte black, and rose pink only.
 *   - No rounded corners, no gradients, no glow shadows.
 *
 * The component is polymorphic: pass `as` to render as a `Link`, `a`, etc.
 */
const jackButtonVariants = cva(
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap font-mono font-bold uppercase tracking-wider outline-none transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-rose-500/70",
  {
    variants: {
      variant: {
        // Default: white surface, black text. Rose slides up on hover.
        primary: "bg-white text-black",
        // Inverse: matte-black surface, white text. Rose slides up on hover.
        invert: "border border-white/15 bg-black text-white",
        // Outline: transparent surface, white text. Rose slides up on hover.
        ghost:
          "border border-white/25 bg-white/5 text-white backdrop-blur-md hover:border-white/50",
      },
      size: {
        sm: "h-10 px-4 text-[11px]",
        md: "h-12 px-6 text-xs",
        lg: "h-14 px-10 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type JackButtonVariant = NonNullable<VariantProps<typeof jackButtonVariants>["variant"]>;
export type JackButtonSize = NonNullable<VariantProps<typeof jackButtonVariants>["size"]>;

type JackButtonOwnProps = {
  variant?: JackButtonVariant;
  size?: JackButtonSize;
  className?: string;
  children: React.ReactNode;
};

type AsProp<C extends React.ElementType> = { as?: C };
type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

export type JackButtonProps<C extends React.ElementType = "button"> =
  AsProp<C> &
    JackButtonOwnProps &
    Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, JackButtonOwnProps>>;

export function JackButton<C extends React.ElementType = "button">({
  as,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: JackButtonProps<C>) {
  const Component: React.ElementType = as || "button";
  return (
    <Component
      className={cn(jackButtonVariants({ variant, size }), className)}
      {...(Component === "button" ? { type: "button" } : {})}
      {...rest}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
    </Component>
  );
}

JackButton.displayName = "JackButton";
