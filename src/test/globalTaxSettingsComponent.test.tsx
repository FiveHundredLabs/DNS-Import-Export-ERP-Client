import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { GlobalTaxSettings } from '../features/dashboard/GlobalTaxSettings';
import { TaxProvider } from '../context/TaxContext';
import { taxService } from '../services/TaxService';
import * as authHook from '../hooks/useAuth';

describe('GlobalTaxSettings Component UI Suite', () => {
  beforeEach(() => {
    taxService.resetToDefaults('DIRECTOR');
    vi.restoreAllMocks();
  });

  const renderWithProviders = () => {
    return render(
      <BrowserRouter>
        <TaxProvider>
          <GlobalTaxSettings />
        </TaxProvider>
      </BrowserRouter>
    );
  };

  it('renders Global Tax Configuration settings for Director with default 18% VAT enabled', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: { id: 'usr-101', name: 'Saman Jayasuriya', role: 'DIRECTOR' } as any,
      role: 'DIRECTOR',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      canAccessRoute: vi.fn().mockReturnValue(true),
    });

    renderWithProviders();

    expect(screen.getByText('Global Tax Configuration System')).toBeDefined();
    expect(screen.getByText(/Tax Status & Rate Rules/i)).toBeDefined();
    expect(screen.getByLabelText(/Tax Enabled/i)).toBeDefined();

    const checkbox = screen.getByRole('checkbox', { name: /Tax Enabled/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(screen.getAllByText(/Tax Enabled \(18%\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Live Calculation Simulator/i)).toBeDefined();
  });

  it('renders Access Restricted when non-Director accesses the component', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: { id: 'usr-106', name: 'Kasun Rep', role: 'SALES_REP' } as any,
      role: 'SALES_REP',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      canAccessRoute: vi.fn().mockReturnValue(true),
    });

    renderWithProviders();

    expect(screen.getByText('Access Restricted')).toBeDefined();
    expect(screen.getByText(/Only authenticated users with the/i)).toBeDefined();
    expect(screen.queryByText('Global Tax Configuration System')).toBeNull();
  });

  it('updates live simulation calculation when tax is toggled off', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: { id: 'usr-101', name: 'Saman Jayasuriya', role: 'DIRECTOR' } as any,
      role: 'DIRECTOR',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      canAccessRoute: vi.fn().mockReturnValue(true),
    });

    renderWithProviders();

    const checkbox = screen.getByRole('checkbox', { name: /Tax Enabled/i }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    // Toggle Tax Enabled to FALSE
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    // Verify indicator changes to Disabled
    expect(screen.getByText(/Tax Disabled \(0%\)/i)).toBeDefined();

    // Verify Apply Now / Unsaved banner appears
    expect(screen.getByText(/You have unsaved changes to the global tax configuration/i)).toBeDefined();
  });

  it('selects preset rates and saves configuration', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: { id: 'usr-101', name: 'Saman Jayasuriya', role: 'DIRECTOR' } as any,
      role: 'DIRECTOR',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      canAccessRoute: vi.fn().mockReturnValue(true),
    });

    renderWithProviders();

    // Click 15% Corporate preset
    const preset15 = screen.getByText('15% Corporate');
    fireEvent.click(preset15);

    // Click Save Tax Settings button
    const saveBtn = screen.getByText('Save Tax Settings');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(taxService.getTaxConfig().taxRate).toBe(15);
      expect(taxService.getTaxConfig().taxEnabled).toBe(true);
    });
  });
});
