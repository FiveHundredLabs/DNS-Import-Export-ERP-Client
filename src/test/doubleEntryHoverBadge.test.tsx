import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DoubleEntryHoverBadge } from '../features/finance/components/DoubleEntryHoverBadge';

describe('DoubleEntryHoverBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const sampleLines = [
    { accountCode: '1010', accountName: 'Cash Float', type: 'DEBIT' as const, amount: 5000 },
    { accountCode: '1020', accountName: 'Trade Receivables', type: 'CREDIT' as const, amount: 5000 },
  ];

  it('renders trigger button with exclamation mark', () => {
    render(<DoubleEntryHoverBadge lines={sampleLines} />);
    const button = screen.getByRole('button', { name: /Automated Double-Entry Impact/i });
    expect(button).toBeInTheDocument();
    expect(button.textContent?.trim()).toBe('!');
  });

  it('opens portal popover on mouseEnter with high z-index and balancing ledger lines', () => {
    render(<DoubleEntryHoverBadge lines={sampleLines} />);
    const triggerContainer = screen.getByRole('button', { name: /Automated Double-Entry Impact/i }).parentElement!;

    fireEvent.mouseEnter(triggerContainer);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.className).toContain('z-[9999]');
    expect(tooltip.parentElement).toBe(document.body);

    expect(screen.getByText('Automated Double-Entry Impact')).toBeInTheDocument();
    expect(screen.getByText('1010')).toBeInTheDocument();
    expect(screen.getByText('Cash Float')).toBeInTheDocument();
    expect(screen.getByText('1020')).toBeInTheDocument();
    expect(screen.getByText('Trade Receivables')).toBeInTheDocument();
    expect(screen.getByText(/Balanced Entry/i)).toBeInTheDocument();
  });

  it('closes popover on mouseLeave after debounce timeout', () => {
    render(<DoubleEntryHoverBadge lines={sampleLines} />);
    const triggerContainer = screen.getByRole('button', { name: /Automated Double-Entry Impact/i }).parentElement!;

    fireEvent.mouseEnter(triggerContainer);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(triggerContainer);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('toggles popover on button click', () => {
    render(<DoubleEntryHoverBadge lines={sampleLines} />);
    const button = screen.getByRole('button', { name: /Automated Double-Entry Impact/i });

    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
