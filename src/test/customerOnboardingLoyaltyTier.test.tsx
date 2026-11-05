import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerOnboardingPage, LOYALTY_TIER_DEFAULTS } from '../features/customers/CustomerOnboardingPage';
import { Sidebar } from '../components/common/Sidebar';
import { creditTermsConfigService } from '../services/CreditTermsConfigService';
import * as authHook from '../hooks/useAuth';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Customer Onboarding — Step 2 Classification Removal & Loyalty Tier Auto-Commercials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    creditTermsConfigService.resetToDefaults({
      id: 'usr-dir',
      name: 'Director User',
      role: 'DIRECTOR',
      email: 'director@dns.lk',
    } as any);

    // Mock as SALES_MANAGER who can access Step 2 directly
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'usr-sm',
        name: 'Sales Manager User',
        role: 'SALES_MANAGER',
        email: 'salesmanager@dns.lk',
      },
      role: 'SALES_MANAGER',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      hasPermission: vi.fn().mockReturnValue(true),
      canAccessRoute: vi.fn().mockReturnValue(true),
    } as any);
  });

  it('does NOT render Customer Classification dropdown anywhere in Step 2', async () => {
    render(
      <MemoryRouter>
        <CustomerOnboardingPage />
      </MemoryRouter>
    );

    // Switch to Step 2
    const step2Button = screen.getByRole('button', { name: /Step 2: Commercial & Routing/i });
    fireEvent.click(step2Button);

    // Assert "Customer Classification" is NOT in the document
    expect(screen.queryByText('Customer Classification')).not.toBeInTheDocument();
    expect(screen.queryByText('Authorized Dealer')).not.toBeInTheDocument();
    expect(screen.queryByText('Showroom Outlet')).not.toBeInTheDocument();

    // Loyalty Tier, Area Manager, and Assigned Sales Representative ARE rendered
    expect(screen.getByText('Loyalty Tier')).toBeInTheDocument();
    expect(screen.getByText('Area Manager')).toBeInTheDocument();
    expect(screen.getByText('Assigned Sales Representative')).toBeInTheDocument();

    // Verify discount fields are NOT in the document
    expect(screen.queryByText('Default Standard Discount (%)')).not.toBeInTheDocument();
    expect(screen.queryByText('Maximum Allowed Discount (%)')).not.toBeInTheDocument();

    // Verify descriptive sub-texts are NOT in the document
    expect(screen.queryByText(/Can be assigned later if pending territory confirmation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Field rep responsible for routine orders and collections/i)).not.toBeInTheDocument();
  });

  it('automatically sets credit days and credit limit when Sales Manager selects Premium tier', async () => {
    render(
      <MemoryRouter>
        <CustomerOnboardingPage />
      </MemoryRouter>
    );

    // Switch to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Step 2: Commercial & Routing/i }));

    // Initially NEW: 30 days, 500,000 limit (Normal Approval)
    expect(screen.getByText(/Standard Policy Terms Applied/i)).toBeInTheDocument();

    const creditDaysInput = screen.getByDisplayValue('30') as HTMLInputElement;
    const creditLimitInput = screen.getByDisplayValue('500000') as HTMLInputElement;
    expect(creditDaysInput).toBeInTheDocument();
    expect(creditLimitInput).toBeInTheDocument();

    // Open Loyalty Tier select dropdown and click "Premium (Level 2)"
    const loyaltyTrigger = screen.getByTestId('loyalty-tier-select');
    fireEvent.click(loyaltyTrigger);
    fireEvent.click(screen.getByText('Premium (Level 2)'));

    // Verify inputs were auto-updated to Premium defaults (45 days, LKR 1,500,000)
    await waitFor(() => {
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1500000')).toBeInTheDocument();
    });

    // Verify Special Director Approval Required is triggered because 45 > 30 and 1.5M > 1M
    expect(screen.getByText(/Special Director Approval Required/i)).toBeInTheDocument();
  });

  it('automatically sets credit days and credit limit when Sales Manager selects Platinum tier', async () => {
    render(
      <MemoryRouter>
        <CustomerOnboardingPage />
      </MemoryRouter>
    );

    // Switch to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Step 2: Commercial & Routing/i }));

    // Open Loyalty Tier select and click "Platinum (Level 3)"
    const loyaltyTrigger = screen.getByTestId('loyalty-tier-select');
    fireEvent.click(loyaltyTrigger);
    fireEvent.click(screen.getByText('Platinum (Level 3)'));

    // Verify inputs were auto-updated to Platinum defaults (60 days, LKR 3,000,000)
    await waitFor(() => {
      expect(screen.getByDisplayValue('60')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3000000')).toBeInTheDocument();
    });

    // Verify Special Approval is flagged
    expect(screen.getByText(/Special Director Approval Required/i)).toBeInTheDocument();
  });

  it('resets back to Normal Approval when switched back to New tier', async () => {
    render(
      <MemoryRouter>
        <CustomerOnboardingPage />
      </MemoryRouter>
    );

    // Switch to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Step 2: Commercial & Routing/i }));

    const loyaltyTrigger = screen.getByTestId('loyalty-tier-select');

    // Change to PREMIUM
    fireEvent.click(loyaltyTrigger);
    fireEvent.click(screen.getByText('Premium (Level 2)'));
    await waitFor(() => {
      expect(screen.getByText(/Special Director Approval Required/i)).toBeInTheDocument();
    });

    // Change back to NEW
    fireEvent.click(loyaltyTrigger);
    fireEvent.click(screen.getByText('New (Level 1)'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      expect(screen.getByDisplayValue('500000')).toBeInTheDocument();
      expect(screen.getByText(/Standard Policy Terms Applied/i)).toBeInTheDocument();
    });
  });

  it('highlights ONLY Customer Onboarding as active in the sidebar when on /customers/onboarding (Customer Master remains inactive)', () => {
    render(
      <MemoryRouter initialEntries={['/customers/onboarding']}>
        <Sidebar isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    );

    const onboardingLink = screen.getByRole('link', { name: /Customer Onboarding/i });
    const masterLink = screen.getByRole('link', { name: /Customer Master/i });

    // The wrapper of Customer Onboarding has active styling (bg-slate-100)
    expect(onboardingLink.closest('.group')).toHaveClass('bg-slate-100');
    // The wrapper of Customer Master does NOT have active styling
    expect(masterLink.closest('.group')).not.toHaveClass('bg-slate-100');
  });
});
