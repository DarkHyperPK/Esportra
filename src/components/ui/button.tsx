import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button-variants"

const COLOR_CLASS_PATTERN =
  /\b(?:hover:|focus-visible:|active:)?(?:bg-|text-|border-|ring-)/

function warnOnColorClassNameOverride(className: string | undefined) {
  if (import.meta.env.DEV && className && COLOR_CLASS_PATTERN.test(className)) {
    console.warn(
      "[Button] Avoid color utilities in className — use semantic components from @/components/ui/app-buttons or JackButton.",
      className,
    )
  }
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    warnOnColorClassNameOverride(className)
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
export {
  AccentButton,
  CancelButton,
  CtaButton,
  DangerButton,
  GhostButton,
  OutlineButton,
  SettingsButton,
  SuccessButton,
} from "@/components/ui/app-buttons"
