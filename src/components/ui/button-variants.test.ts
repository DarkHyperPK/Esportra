import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'

describe('buttonVariants', () => {
  it('success variant has no rose border or ring after cn merge', () => {
    const classes = cn(buttonVariants({ variant: 'success', size: 'default' }))
    expect(classes).not.toContain('ring-rose')
    expect(classes).not.toContain('border-rose')
    expect(classes).not.toContain('bg-rose')
    expect(classes).toContain('border-transparent')
    expect(classes).toContain('bg-green-600')
    expect(classes).toContain('focus-visible:ring-green-500/70')
  })

  it('accent variant keeps matte black text on hover', () => {
    const classes = buttonVariants({ variant: 'accent', size: 'default' })
    expect(classes).toContain('text-matte-black')
    expect(classes).toContain('hover:text-matte-black')
    expect(classes).not.toContain('hover:text-white')
    expect(classes).not.toContain('ring-rose')
    expect(classes).not.toContain('border-rose')
  })

  it('default and secondary variants have no rose strokes', () => {
    for (const variant of ['default', 'secondary'] as const) {
      const classes = buttonVariants({ variant, size: 'default' })
      expect(classes).not.toContain('ring-rose')
      expect(classes).not.toContain('border-rose')
    }
  })

  it('cta variant has rose fill but no rose border stroke', () => {
    const classes = buttonVariants({ variant: 'cta', size: 'default' })
    expect(classes).toContain('bg-rose-500')
    expect(classes).not.toContain('border-rose')
    expect(classes).not.toContain('ring-rose')
    expect(classes).toContain('border-transparent')
  })

  it('default variant plus white bg override leaks hover:text-white (anti-pattern)', () => {
    const classes = cn(
      buttonVariants({ variant: 'default', size: 'default' }),
      'bg-white text-matte-black hover:bg-white/90',
    )
    expect(classes).toContain('hover:text-white')
    expect(classes).toContain('bg-white')
  })

  it('success variant merged with layout className stays green', () => {
    const classes = cn(
      buttonVariants({ variant: 'success', size: 'hero' }),
      'flex-1 active:scale-[0.98]',
    )
    expect(classes).not.toContain('ring-rose')
    expect(classes).not.toContain('border-rose')
    expect(classes).toContain('border-transparent')
    expect(classes).toContain('h-14')
  })
})
