import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TabBar, TabPanel } from '../TabBar';
import { useTabBase } from '../useTabBase';

const TABS = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta', count: 3 }, { id: 'c', label: 'Gamma' }];

function Demo() {
  const [value, setValue] = useState('a');
  const base = useTabBase();
  return (
    <>
      <TabBar tabs={TABS} value={value} onChange={setValue} label="Sections" base={base} />
      {TABS.map((t) => <TabPanel key={t.id} base={base} id={t.id} value={value}>panel {t.id}</TabPanel>)}
    </>
  );
}

describe('TabBar', () => {
  it('marks one tab selected, keeps only it in the tab order and mounts only its panel', () => {
    render(<Demo />);
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Beta/ })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('panel a')).toBeInTheDocument();
    expect(screen.queryByText('panel b')).not.toBeInTheDocument();
  });

  it('links each tab to its panel', () => {
    render(<Demo />);
    const tab = screen.getByRole('tab', { name: 'Alpha' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', tab.getAttribute('aria-controls'));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tab.id);
  });

  it('moves with the arrow keys, wrapping, and jumps with Home and End, moving focus too', () => {
    render(<Demo />);
    const list = screen.getByRole('tablist');
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Beta/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Beta/ })).toHaveFocus();
    fireEvent.keyDown(list, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Gamma' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(list, { key: 'Home' });
    expect(screen.getByText('panel a')).toBeInTheDocument();
  });

  it('shows a count only when given one, and changes tab on click', () => {
    render(<Demo />);
    expect(screen.getByRole('tab', { name: /Beta/ })).toHaveTextContent('3');
    expect(screen.getByRole('tab', { name: 'Alpha' })).not.toHaveTextContent(/\d/);
    fireEvent.click(screen.getByRole('tab', { name: /Beta/ }));
    expect(screen.getByText('panel b')).toBeInTheDocument();
  });
});
