import { describe, expect, it } from 'vitest';
import { messagePreview, parseScrimBookedMessage } from './scrimBookedMessage';

const text = 'Scrim booked: valorant — TBD — Match Room: /competitive/scrims/sessions/eb7ecbf4-fac8-41b1-b756-82c3a1848f61';

describe('scrimBookedMessage', () => {
  it('parses the booking message', () => {
    expect(parseScrimBookedMessage(text)).toEqual({ game: 'valorant', when: 'TBD', path: '/competitive/scrims/sessions/eb7ecbf4-fac8-41b1-b756-82c3a1848f61' });
  });
  it('ignores ordinary and off-site messages', () => {
    expect(parseScrimBookedMessage('hello')).toBeNull();
    expect(parseScrimBookedMessage('Scrim booked: valorant — TBD — Match Room: https://evil.test/x')).toBeNull();
  });
  it('shortens the preview', () => {
    expect(messagePreview(text)).toBe('Scrim booked · valorant · TBD');
    expect(messagePreview('hello')).toBe('hello');
  });
});
