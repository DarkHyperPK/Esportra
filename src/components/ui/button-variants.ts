import { cva } from "class-variance-authority"

/**
 * Esportra button variants — every variant defines bg, text, and border for
 * default + hover so partial className overrides cannot leave orphan hovers
 * (e.g. hover:text-white on a white button).
 *
 * Prefer semantic components from `@/components/ui/app-buttons` over raw variants.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border font-mono text-xs font-bold uppercase tracking-wider ring-offset-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Primary CTA — rose fill (Register, Save, Join, Confirm). */
        default:
          "border-rose-500 bg-rose-500 text-white hover:border-rose-400 hover:bg-rose-400 hover:text-white",
        /** Alias for default — explicit imports in app-buttons. */
        cta:
          "border-rose-500 bg-rose-500 text-white hover:border-rose-400 hover:bg-rose-400 hover:text-white",
        /** High-contrast white pill — rare emphasis (modal confirm on dark). */
        accent:
          "border-white bg-white text-black hover:border-zinc-200 hover:bg-zinc-200 hover:text-black",
        /** Settings, cancel-adjacent, low-emphasis actions. */
        secondary:
          "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white",
        /** Bordered glass — filters, tertiary actions. */
        outline:
          "border-white/15 bg-transparent text-white hover:border-white/30 hover:bg-white/5 hover:text-white",
        /** Minimal — toolbars, icon-adjacent actions. */
        ghost:
          "border-transparent bg-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
        destructive:
          "border-red-500/40 bg-red-950/20 text-red-200 hover:border-red-500 hover:bg-red-600 hover:text-white",
        link:
          "border-transparent bg-transparent px-0 text-white underline-offset-4 hover:border-transparent hover:bg-transparent hover:text-rose-300 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-3 text-[11px]",
        lg: "h-12 px-7",
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
