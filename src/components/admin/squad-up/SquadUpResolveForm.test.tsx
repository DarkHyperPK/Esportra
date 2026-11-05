import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SquadUpResolveForm } from './SquadUpResolveForm';

const props = { canManage: true, canSuspend: false, pending: false, onResolve: vi.fn() };

describe('SquadUpResolveForm', () => {
  it('is read-only without squad_up:manage', () => {
    render(<SquadUpResolveForm {...props} canManage={false} />);
    expect(screen.getByText(/needs the squad_up:manage permission/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply decision' })).not.toBeInTheDocument();
  });

  it('needs a note for a penalty and confirms before applying', () => {
    const onResolve = vi.fn();
    render(<SquadUpResolveForm {...props} onResolve={onResolve} />);
    fireEvent.click(screen.getByLabelText(/Remove from Squad Up/));
    expect(screen.getByRole('button', { name: 'Apply decision' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Note for the record/), { target: { value: 'Repeated abuse' } });
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '168' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply decision' }));
    expect(onResolve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onResolve).toHaveBeenCalledWith({ action: 'squad_up_ban', note: 'Repeated abuse', durationHours: 168 });
  });

  it('only offers account suspension to admins with users:ban', () => {
    const { rerender } = render(<SquadUpResolveForm {...props} />);
    expect(screen.getByLabelText(/Suspend the account/)).toBeDisabled();
    rerender(<SquadUpResolveForm {...props} canSuspend />);
    expect(screen.getByLabelText(/Suspend the account/)).toBeEnabled();
  });
});
