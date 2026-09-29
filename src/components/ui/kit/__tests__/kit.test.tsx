import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChipGroup } from '../ChipGroup';
import { ChoiceCard } from '../ChoiceCard';
import { Field } from '../Field';
import { StepProgress } from '../StepProgress';

describe('Field', () => {
  it('ties the label to its control', () => {
    render(<Field label="Tournament name" htmlFor="name"><input id="name" /></Field>);
    expect(screen.getByLabelText('Tournament name')).toBeInTheDocument();
  });

  it('shows the hint, then replaces it with the error', () => {
    const { rerender } = render(
      <Field label="Name" htmlFor="n" hint="Players see this first."><input id="n" /></Field>,
    );
    expect(screen.getByText('Players see this first.')).toBeInTheDocument();
    rerender(<Field label="Name" htmlFor="n" hint="Players see this first." error="Add a name."><input id="n" /></Field>);
    expect(screen.getByRole('alert')).toHaveTextContent('Add a name.');
    expect(screen.queryByText('Players see this first.')).not.toBeInTheDocument();
  });

  it('marks optional fields instead of required ones', () => {
    render(<Field label="Venue" optional><input /></Field>);
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });
});

describe('ChoiceCard', () => {
  it('exposes radio semantics and selects on click (native button handles Enter/Space)', () => {
    const onSelect = vi.fn();
    render(<div role="radiogroup"><ChoiceCard selected={false} onSelect={onSelect} title="Online" /></div>);
    const radio = screen.getByRole('radio', { name: /online/i });
    expect(radio).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(radio);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('drops radio semantics in action mode', () => {
    render(<ChoiceCard mode="action" selected={false} onSelect={() => {}} title="Quick start" />);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quick start/i })).toBeInTheDocument();
  });
});

describe('ChipGroup', () => {
  it('reports the chosen value', () => {
    const onChange = vi.fn();
    render(
      <ChipGroup label="Teams" value={8} onChange={onChange} options={[{ value: 8, label: '8' }, { value: 16, label: '16' }]} />,
    );
    expect(screen.getByRole('radio', { name: '8' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: '16' }));
    expect(onChange).toHaveBeenCalledWith(16);
  });
});

describe('StepProgress', () => {
  it('only lets you jump to visited or completed steps', () => {
    const onStepClick = vi.fn();
    render(
      <StepProgress
        steps={[{ id: 1, title: 'Basics' }, { id: 2, title: 'Format' }, { id: 3, title: 'Review' }]}
        current={2}
        completed={{ 1: true }}
        onStepClick={onStepClick}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /basics/i }));
    expect(onStepClick).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: /review/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /format/i })).toHaveAttribute('aria-current', 'step');
  });
});
