import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrganizerProLock } from '../OrganizerProLock';
import { MemoryRouter } from 'react-router-dom';

const renderInRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('OrganizerProLock', () => {
  it('renders the ORGANIZER PRO REQUIRED label', () => {
    renderInRouter(<OrganizerProLock feature="Custom veto sequences" />);
    expect(screen.getByText('ORGANIZER PRO REQUIRED')).toBeDefined();
  });

  it('renders the feature name with correct plurality for plural features', () => {
    renderInRouter(<OrganizerProLock feature="Discord DMs to teams" />);
    expect(screen.getByText(/Discord DMs to teams require Organizer Pro\./)).toBeDefined();
  });

  it('renders the feature name with correct plurality for singular features', () => {
    renderInRouter(<OrganizerProLock feature="Custom veto sequence" />);
    expect(screen.getByText(/Custom veto sequence requires Organizer Pro\./)).toBeDefined();
  });

  it('renders a Contact us to unlock link pointing to /contact', () => {
    renderInRouter(<OrganizerProLock feature="Custom veto sequences" />);
    const link = screen.getByRole('link', { name: /contact us to unlock/i });
    expect(link.getAttribute('href')).toBe('/contact');
  });

  it('accepts an optional className on the root element', () => {
    const { container } = renderInRouter(
      <OrganizerProLock feature="Custom veto sequences" className="mb-4" />
    );
    const root = container.firstChild as HTMLElement;
    expect(root?.className).toContain('mb-4');
  });
});
