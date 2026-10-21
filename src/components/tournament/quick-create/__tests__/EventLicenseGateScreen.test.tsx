import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventLicenseGateScreen } from '../EventLicenseGateScreen';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false }));

const renderInRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('EventLicenseGateScreen', () => {
  describe('quota_exhausted variant', () => {
    it('renders QUOTA REACHED eyebrow', () => {
      renderInRouter(
        <EventLicenseGateScreen reason="quota_exhausted" resetsAt="2026-11-01T00:00:00Z" />
      );
      expect(screen.getByText('QUOTA REACHED')).toBeDefined();
    });

    it('renders the correct title', () => {
      renderInRouter(
        <EventLicenseGateScreen reason="quota_exhausted" resetsAt="2026-11-01T00:00:00Z" />
      );
      expect(screen.getByText("You've used both events this month")).toBeDefined();
    });

    it('mentions the reset date when resetsAt is provided', () => {
      renderInRouter(
        <EventLicenseGateScreen reason="quota_exhausted" resetsAt="2026-11-01T00:00:00Z" />
      );
      expect(screen.getByText(/resets on/i)).toBeDefined();
    });

    it('renders the footnote about existing events', () => {
      renderInRouter(
        <EventLicenseGateScreen reason="quota_exhausted" resetsAt="2026-11-01T00:00:00Z" />
      );
      expect(screen.getByText('Already created events are unaffected.')).toBeDefined();
    });

    it('renders Contact us CTA linking to /contact', () => {
      renderInRouter(
        <EventLicenseGateScreen reason="quota_exhausted" resetsAt="2026-11-01T00:00:00Z" />
      );
      const link = screen.getByRole('link', { name: /contact us/i });
      expect(link.getAttribute('href')).toBe('/contact');
    });
  });

  describe('bracket_upgrade_required variant', () => {
    it('renders BRACKET TOO LARGE eyebrow', () => {
      renderInRouter(<EventLicenseGateScreen reason="bracket_upgrade_required" />);
      expect(screen.getByText('BRACKET TOO LARGE')).toBeDefined();
    });

    it('renders the correct title', () => {
      renderInRouter(<EventLicenseGateScreen reason="bracket_upgrade_required" />);
      expect(
        screen.getByText('Events with more than 32 teams require a paid bracket')
      ).toBeDefined();
    });

    it('renders a link to the pricing page in the footnote', () => {
      renderInRouter(<EventLicenseGateScreen reason="bracket_upgrade_required" />);
      const pricingLink = screen.getByRole('link', { name: /pricing/i });
      expect(pricingLink.getAttribute('href')).toBe('/pricing');
    });

    it('does not render the quota reset date', () => {
      renderInRouter(<EventLicenseGateScreen reason="bracket_upgrade_required" />);
      expect(screen.queryByText(/resets on/i)).toBeNull();
    });
  });
});
