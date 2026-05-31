import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex items-center rounded-none border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/70",
  {
    variants: {
      variant: {
        default:
          "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:border-rose-500",
        secondary:
          "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25",
        destructive:
          "border-red-500/40 bg-red-950/20 text-red-300 hover:border-red-500",
        outline: "border-white/20 bg-transparent text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
