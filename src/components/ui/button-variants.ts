import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border font-mono text-xs font-bold uppercase tracking-wider ring-offset-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-white bg-white text-black hover:border-rose-500 hover:bg-rose-500 hover:text-white",
        destructive:
          "border-red-500/40 bg-red-950/20 text-red-200 hover:border-red-500 hover:bg-red-600 hover:text-white",
        outline:
          "border-white/20 bg-[#0a0a0c] text-white hover:border-rose-500 hover:bg-white/5",
        secondary:
          "border-white/10 bg-[#0a0a0c] text-white hover:border-white/30 hover:bg-white/10",
        ghost: "border-transparent bg-transparent text-white hover:border-white/20 hover:bg-white/5",
        link: "border-transparent bg-transparent px-0 text-white underline-offset-4 hover:text-rose-300 hover:underline",
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
