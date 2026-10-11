import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatOffset,
  formatPrintDate,
  slotTypeLabel,
  SLOT_TYPE_LABELS,
} from '../../broadcastFormat';

describe('formatDuration', () => {
  it('formats sub-minute durations as MM:SS', () => {
    expect(formatDuration(45)).toBe('00:45');
  });

  it('formats a full minute boundary correctly', () => {
    expect(formatDuration(60)).toBe('01:00');
  });

  it('formats durations under an hour as MM:SS', () => {
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('formats exactly one hour as H:MM:SS', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('formats multi-hour durations as H:MM:SS', () => {
    expect(formatDuration(7265)).toBe('2:01:05');
  });

  it('truncates fractional seconds', () => {
    expect(formatDuration(90.9)).toBe('01:30');
  });
});

describe('formatOffset', () => {
  it('pads single-digit components with zeros', () => {
    expect(formatOffset(0)).toBe('00:00:00');
  });

  it('formats a mid-show offset', () => {
    expect(formatOffset(3661)).toBe('01:01:01');
  });

  it('formats large offsets without truncation', () => {
    expect(formatOffset(7322)).toBe('02:02:02');
  });
});

describe('formatPrintDate', () => {
  it('returns empty string for null', () => {
    expect(formatPrintDate(null)).toBe('');
  });

  it('formats a known UTC date', () => {
    // 2026-10-14T19:00:00Z → "14 Oct 2026"
    expect(formatPrintDate('2026-10-14T19:00:00Z')).toBe('14 Oct 2026');
  });
});

describe('slotTypeLabel', () => {
  it('returns known label for a registered slot type', () => {
    expect(slotTypeLabel('lower_third')).toBe('Lower third');
    expect(slotTypeLabel('bug')).toBe('Bug');
    expect(slotTypeLabel('full_screen')).toBe('Full-screen');
  });

  it('falls back to the raw type for unregistered slots', () => {
    expect(slotTypeLabel('unknown_type')).toBe('unknown_type');
  });

  it('covers every key in SLOT_TYPE_LABELS', () => {
    for (const key of Object.keys(SLOT_TYPE_LABELS)) {
      expect(slotTypeLabel(key)).toBe(SLOT_TYPE_LABELS[key]);
    }
  });
});
