import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"

type CatalogButtonProps = ButtonProps

/** Primary call-to-action — rose fill (register, redeem, publish, confirm). */
export const CtaButton = React.forwardRef<HTMLButtonElement, CatalogButtonProps>(
  ({ variant, ...props }, ref) => (
    <Button ref={ref} variant={variant ?? "cta"} {...props} />
  ),
)
CtaButton.displayName = "CtaButton"

/** High-contrast white button — use sparingly for modal emphasis. */
export const AccentButton = React.forwardRef<HTMLButtonElement, CatalogButtonProps>(
  ({ variant, ...props }, ref) => (
    <Button ref={ref} variant={variant ?? "accent"} {...props} />
  ),
)
AccentButton.displayName = "AccentButton"

/** Settings panels, secondary form actions, dismiss-adjacent controls. */
export const SettingsButton = React.forwardRef<HTMLButtonElement, CatalogButtonProps>(
  ({ variant, ...props }, ref) => (
    <Button ref={ref} variant={variant ?? "secondary"} {...props} />
  ),
)
SettingsButton.displayName = "SettingsButton"

/** Bordered glass — filters, tertiary actions, “open” links. */
export const OutlineButton = React.forwardRef<HTMLButtonElement, CatalogButtonProps>(
  ({ variant, ...props }, ref) => (
    <Button ref={ref} variant={variant ?? "outline"} {...props} />
  ),
)
OutlineButton.displayName = "OutlineButton"

/** Minimal toolbar / inline actions. */
export const GhostButton = React.forwardRef<HTMLButtonElement, CatalogButtonProps>(
  ({ variant, ...props }, ref) => (
    <Button ref={ref} variant={variant ?? "ghost"} {...props} />
  ),
)
GhostButton.displayName = "GhostButton"

/** Destructive confirmations — delete, revoke, ban. */
export const DangerButton = React.forwardRef<HTMLButtonElement, CatalogButtonProps>(
  ({ variant, ...props }, ref) => (
    <Button ref={ref} variant={variant ?? "destructive"} {...props} />
  ),
)
DangerButton.displayName = "DangerButton"

/** Dialog cancel — muted secondary, never rose on hover. */
export const CancelButton = React.forwardRef<HTMLButtonElement, CatalogButtonProps>(
  ({ variant, className, ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant ?? "secondary"}
      className={className}
      {...props}
    />
  ),
)
CancelButton.displayName = "CancelButton"
