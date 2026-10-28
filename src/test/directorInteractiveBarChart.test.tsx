import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  DirectorInteractiveBarChart,
  ERP_SALES_TRENDS_DATA,
} from '../features/dashboard/components/DirectorInteractiveBarChart';

describe('Director Dashboard — Shadcn Interactive Bar Chart Component', () => {
  it('renders the interactive bar chart header with proper ERP revenue records', () => {
    render(<DirectorInteractiveBarChart />);

    expect(screen.getByText(/Commercial Sales & Revenue Trends/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Daily revenue streams across Wholesale B2B & Showroom Retail/i)
    ).toBeInTheDocument();

    // Verify valuable ERP business metric tabs
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Wholesale B2B')).toBeInTheDocument();
    expect(screen.getByText('Showroom Retail')).toBeInTheDocument();

    // Verify calculated totals match exact expected values (LKR 48.5M, LKR 31.4M, LKR 17.1M)
    expect(screen.getByText('LKR 48.5M')).toBeInTheDocument();
    expect(screen.getByText('LKR 31.4M')).toBeInTheDocument();
    expect(screen.getByText('LKR 17.1M')).toBeInTheDocument();
  });

  it('calculates totals correctly from the underlying 30-day ERP dataset', () => {
    const wholesaleTotal = ERP_SALES_TRENDS_DATA.reduce((acc, curr) => acc + curr.wholesale, 0);
    const retailTotal = ERP_SALES_TRENDS_DATA.reduce((acc, curr) => acc + curr.retail, 0);
    const grossTotal = ERP_SALES_TRENDS_DATA.reduce((acc, curr) => acc + curr.total, 0);
    const ordersTotal = ERP_SALES_TRENDS_DATA.reduce((acc, curr) => acc + curr.orders, 0);

    expect(wholesaleTotal).toBe(31420000);
    expect(retailTotal).toBe(17080000);
    expect(grossTotal).toBe(48500000);
    expect(ordersTotal).toBe(2641);
    expect(ERP_SALES_TRENDS_DATA.length).toBe(30);
  });

  it('allows switching between Total Revenue, Wholesale B2B, and Showroom Retail views', () => {
    render(<DirectorInteractiveBarChart />);

    const totalButton = screen.getByText('Total Revenue').closest('button');
    const wholesaleButton = screen.getByText('Wholesale B2B').closest('button');
    const retailButton = screen.getByText('Showroom Retail').closest('button');

    // Default active is Total Revenue
    expect(totalButton).toHaveAttribute('data-active', 'true');
    expect(wholesaleButton).toHaveAttribute('data-active', 'false');
    expect(retailButton).toHaveAttribute('data-active', 'false');

    // Switch to Wholesale B2B
    fireEvent.click(wholesaleButton!);
    expect(wholesaleButton).toHaveAttribute('data-active', 'true');
    expect(totalButton).toHaveAttribute('data-active', 'false');
    expect(retailButton).toHaveAttribute('data-active', 'false');

    // Switch to Showroom Retail
    fireEvent.click(retailButton!);
    expect(retailButton).toHaveAttribute('data-active', 'true');
    expect(wholesaleButton).toHaveAttribute('data-active', 'false');
    expect(totalButton).toHaveAttribute('data-active', 'false');

    // Switch back to Total Revenue
    fireEvent.click(totalButton!);
    expect(totalButton).toHaveAttribute('data-active', 'true');
  });
});
