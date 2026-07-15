import { cva } from "class-variance-authority"

/**
 * Esportra button variants — every variant defines bg, text, and border for
 * default + hover so partial className overrides cannot leave orphan hovers
 * (e.g. hover:text-white on a white button).
 *
 * Prefer semantic components from `@/components/ui/app-buttons` over raw variants.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border font-mono text-xs font-bold uppercase tracking-wider ring-offset-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Primary CTA — rose fill (Register, Save, Join, Confirm). */
        default:
          "border-transparent bg-rose-500 text-white hover:border-transparent hover:bg-rose-400 hover:text-white focus-visible:ring-white/25",
        /** Alias for default — explicit imports in app-buttons. */
        cta:
          "border-transparent bg-rose-500 text-white hover:border-transparent hover:bg-rose-400 hover:text-white focus-visible:ring-white/25",
        /** High-contrast white pill — rare emphasis (modal confirm on dark). */
        accent:
          "border-white bg-white text-matte-black hover:border-zinc-200 hover:bg-zinc-200 hover:text-matte-black focus-visible:ring-white/30",
        /** Settings, cancel-adjacent, low-emphasis actions. */
        secondary:
          "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:ring-white/25",
        /** Bordered glass — filters, tertiary actions. */
        outline:
          "border-white/15 bg-transparent text-white hover:border-white/30 hover:bg-white/5 hover:text-white focus-visible:ring-white/25",
        /** Minimal — toolbars, icon-adjacent actions. */
        ghost:
          "border-transparent bg-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-white focus-visible:ring-white/25",
        destructive:
          "border-red-500/40 bg-red-950/20 text-red-200 hover:border-red-500 hover:bg-red-600 hover:text-white focus-visible:ring-red-500/50",
        /** Live / match actions — enter room, check-in, go live. */
        success:
          "border-transparent bg-green-600 text-white shadow-[0_0_40px_rgba(22,163,74,0.25)] hover:border-transparent hover:bg-green-500 hover:text-white active:border-transparent active:bg-green-700 focus-visible:ring-green-500/70",
        link:
          "border-transparent bg-transparent px-0 text-white underline-offset-4 hover:border-transparent hover:bg-transparent hover:text-rose-300 hover:underline focus-visible:ring-white/20",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-3 text-[11px]",
        lg: "h-12 px-7",
        hero: "h-14 px-8 text-base md:h-16 md:px-12 md:text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonVariant = NonNullable<Parameters<typeof buttonVariants>[0]>["variant"]
export type ButtonSize = NonNullable<Parameters<typeof buttonVariants>[0]>["size"]
