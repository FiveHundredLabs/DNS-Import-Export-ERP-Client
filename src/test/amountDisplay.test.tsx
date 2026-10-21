import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AmountDisplay } from '../components/common/AmountDisplay';
import { StatCard } from '../components/common/StatCard';
import { formatCurrency } from '../utils/formatters';

describe('AmountDisplay Component', () => {
  it('renders exact full monetary amount without abbreviation or ellipsis', () => {
    render(<AmountDisplay amount={898879.75} />);

    // Must show exact full amount and LKR prefix
    expect(screen.getByText('LKR')).toBeInTheDocument();
    expect(screen.getByText('898,879.75')).toBeInTheDocument();

    // Must NOT have abbreviations like K, M, B
    expect(screen.queryByText(/898k/i)).toBeNull();
    expect(screen.queryByText(/\.\.\./)).toBeNull();
  });

  it('handles very large numbers with exact values and dynamic tier scaling', () => {
    const largeAmount = 12450000; // LKR 12,450,000.00 -> 17 chars
    const { container } = render(<AmountDisplay amount={largeAmount} />);

    expect(screen.getByText('LKR')).toBeInTheDocument();
    expect(screen.getByText('12,450,000.00')).toBeInTheDocument();

    // Check that responsive wrap and max-width classes are applied
    const rootEl = container.firstElementChild as HTMLElement;
    expect(rootEl.className).toContain('break-words');
    expect(rootEl.className).toContain('[overflow-wrap:anywhere]');
    expect(rootEl.className).toContain('min-w-0');
  });

  it('renders string amounts properly whether formatted with normal or non-breaking space', () => {
    render(<AmountDisplay amount="LKR 123,456,789.50" />);

    expect(screen.getByText('LKR')).toBeInTheDocument();
    expect(screen.getByText('123,456,789.50')).toBeInTheDocument();
  });

  it('formats zero correctly without breaking', () => {
    render(<AmountDisplay amount={0} />);

    expect(screen.getByText('LKR')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('applies custom className and handles fixed sizes', () => {
    const { container } = render(
      <AmountDisplay amount={500} size="lg" className="text-emerald-600 font-mono" />
    );

    const rootEl = container.firstElementChild as HTMLElement;
    expect(rootEl.className).toContain('text-emerald-600');
    expect(rootEl.className).toContain('font-mono');
    expect(rootEl.className).toContain('text-lg sm:text-xl');
  });
});

describe('StatCard Integration with Currency', () => {
  it('automatically detects currency strings and delegates to AmountDisplay', () => {
    render(
      <StatCard
        title="Active Order Value"
        value={formatCurrency(898879.75)}
        period="Excludes cancelled"
      />
    );

    expect(screen.getByText('Active Order Value')).toBeInTheDocument();
    expect(screen.getByText('LKR')).toBeInTheDocument();
    expect(screen.getByText('898,879.75')).toBeInTheDocument();
    expect(screen.getByText('Excludes cancelled')).toBeInTheDocument();
  });

  it('preserves non-currency values as regular text in StatCard', () => {
    render(
      <StatCard
        title="Pending Approval"
        value="6 Orders"
        period="Active order portfolio"
      />
    );

    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.getByText('6 Orders')).toBeInTheDocument();
  });
});
