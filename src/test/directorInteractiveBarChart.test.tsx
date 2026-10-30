import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import {
  DirectorInteractiveBarChart,
  ERP_SALES_TRENDS_DATA,
} from '../features/dashboard/components/DirectorInteractiveBarChart';
import { themeService } from '../services/ThemeService';

describe('Director Dashboard — Shadcn Interactive Bar Chart Component', () => {
  it('renders the interactive bar chart header with proper ERP revenue records', () => {
    render(<DirectorInteractiveBarChart />);

    expect(screen.getByText(/Commercial Sales & Revenue Trends/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Daily revenue streams across Sales Reps & Showroom/i)
    ).toBeInTheDocument();

    // Verify valuable ERP business metric tabs
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Sales Reps')).toBeInTheDocument();
    expect(screen.getByText('Showroom')).toBeInTheDocument();

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

  it('allows switching between Total Revenue, Sales Reps, and Showroom views', () => {
    render(<DirectorInteractiveBarChart />);

    const totalButton = screen.getByText('Total Revenue').closest('button');
    const salesRepButton = screen.getByText('Sales Reps').closest('button');
    const showroomButton = screen.getByText('Showroom').closest('button');

    // Default active is Total Revenue
    expect(totalButton).toHaveAttribute('data-active', 'true');
    expect(salesRepButton).toHaveAttribute('data-active', 'false');
    expect(showroomButton).toHaveAttribute('data-active', 'false');

    // Switch to Sales Reps
    fireEvent.click(salesRepButton!);
    expect(salesRepButton).toHaveAttribute('data-active', 'true');
    expect(totalButton).toHaveAttribute('data-active', 'false');
    expect(showroomButton).toHaveAttribute('data-active', 'false');

    // Switch to Showroom
    fireEvent.click(showroomButton!);
    expect(showroomButton).toHaveAttribute('data-active', 'true');
    expect(salesRepButton).toHaveAttribute('data-active', 'false');
    expect(totalButton).toHaveAttribute('data-active', 'false');

    // Switch back to Total Revenue
    fireEvent.click(totalButton!);
    expect(totalButton).toHaveAttribute('data-active', 'true');
  });

  it('updates SVG linearGradient stops reactively when ERP theme color changes', () => {
    const { container } = render(<DirectorInteractiveBarChart />);

    // Initially check gradient stop color exists
    const initialStop = container.querySelector('#barThemeTotalGradient stop');
    expect(initialStop).not.toBeNull();

    // Change theme color to Red (#EC1B27) as DIRECTOR
    act(() => {
      themeService.setPrimaryColor('#EC1B27', 'DIRECTOR');
    });

    const redStop = container.querySelector('#barThemeTotalGradient stop');
    expect(redStop).toHaveAttribute('stop-color', '#F43F5E');

    // Restore back to default Dark Blue (#263183) as DIRECTOR
    act(() => {
      themeService.setPrimaryColor('#263183', 'DIRECTOR');
    });

    const blueStop = container.querySelector('#barThemeTotalGradient stop');
    expect(blueStop).toHaveAttribute('stop-color', '#3B82F6');
  });
});
