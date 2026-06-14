import { describe, expect, it } from 'vitest'
import { classNameHasColorUtilities } from '@/lib/buttonColorClassOverride'

describe('classNameHasColorUtilities', () => {
  it('does not warn on layout and text-size utilities', () => {
    expect(classNameHasColorUtilities('h-9 text-xs')).toBe(false)
    expect(classNameHasColorUtilities('h-8 px-3 text-xs disabled:cursor-not-allowed')).toBe(false)
    expect(classNameHasColorUtilities('text-sm font-medium')).toBe(false)
    expect(classNameHasColorUtilities('text-[11px]')).toBe(false)
    expect(classNameHasColorUtilities('text-[clamp(0.75rem,2vw,1rem)]')).toBe(false)
    expect(classNameHasColorUtilities('text-center uppercase tracking-wide')).toBe(false)
  })

  it('warns on real color overrides', () => {
    expect(classNameHasColorUtilities('bg-emerald-600 hover:bg-emerald-500 text-white')).toBe(true)
    expect(classNameHasColorUtilities('border-rose-500/40')).toBe(true)
    expect(classNameHasColorUtilities('ring-2 ring-white/20')).toBe(true)
    expect(classNameHasColorUtilities('text-zinc-400')).toBe(true)
    expect(classNameHasColorUtilities('hover:text-rose-300')).toBe(true)
    expect(classNameHasColorUtilities('text-[#ff00aa]')).toBe(true)
  })
})
