import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WarrantyStatusBadge, ClaimStatusBadge } from '../features/warranty/WarrantyStatusBadge';
import { WarrantyHubPage } from '../features/warranty/WarrantyHubPage';
import { CommissionHubPage } from '../features/commissions/CommissionHubPage';
import { NewClaimModal } from '../features/warranty/NewClaimModal';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'cust-001' }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'usr-106',
      name: 'Kasun Wickramasinghe',
      role: 'SALES_REP',
      areaId: 'area-01',
    },
    role: 'SALES_REP',
    canAccessRoute: () => true,
    hasPermission: () => true,
  }),
}));

describe('Phase 10 — Warranty & Commission UI Components', () => {
  it('renders warranty status badges correctly', () => {
    const { rerender } = render(<WarrantyStatusBadge status="ACTIVE" />);
    expect(screen.getByText('ACTIVE')).toBeTruthy();

    rerender(<WarrantyStatusBadge status="EXPIRED" />);
    expect(screen.getByText('EXPIRED')).toBeTruthy();

    rerender(<WarrantyStatusBadge status="CLAIMED" />);
    expect(screen.getByText('CLAIMED')).toBeTruthy();
  });

  it('renders claim status badges correctly', () => {
    const { rerender } = render(<ClaimStatusBadge status="SUBMITTED" />);
    expect(screen.getByText('SUBMITTED')).toBeTruthy();

    rerender(<ClaimStatusBadge status="IN_INSPECTION" />);
    expect(screen.getByText('IN INSPECTION')).toBeTruthy();

    rerender(<ClaimStatusBadge status="REPLACED" />);
    expect(screen.getByText('REPLACED')).toBeTruthy();

    rerender(<ClaimStatusBadge status="REPAIRED" />);
    expect(screen.getByText('REPAIRED')).toBeTruthy();

    rerender(<ClaimStatusBadge status="REJECTED" />);
    expect(screen.getByText('REJECTED')).toBeTruthy();
  });

  it('renders WarrantyHubPage with header, metric cards, and hides claim button for SALES_REP', async () => {
    render(<WarrantyHubPage />);
    expect(screen.getByText('Warranty & Claims Hub')).toBeTruthy();
    expect(screen.getByText('Active Warranties')).toBeTruthy();
    expect(screen.getByText('Missing Warranty Notes')).toBeTruthy();
    // Sales Rep cannot file warranty claims per RBAC
    expect(screen.queryByText('Lodge Warranty Claim')).toBeNull();

    await waitFor(() => {
      expect(screen.getByText(/Registered Warranties Master Ledger/i)).toBeTruthy();
    });
  });

  it('renders CommissionHubPage with target progress and hides leaderboard for SALES_REP', async () => {
    render(<CommissionHubPage />);
    expect(screen.getByText('Sales Target & Commission Hub')).toBeTruthy();
    expect(screen.getByText(/Enterprise Sales Commission Tier Policy/)).toBeTruthy();

    // Sales Rep cannot view other reps' figures or leaderboard per RBAC
    expect(screen.queryByText(/Sales Representative Performance Leaderboard/i)).toBeNull();
  });

  it('renders NewClaimModal with customer selector and complaint fields', async () => {
    render(
      <NewClaimModal
        open={true}
        onOpenChange={() => {}}
        onSuccess={() => {}}
      />
    );

    expect(screen.getByText('Lodge Warranty Claim')).toBeTruthy();
    expect(screen.getByText('Select Customer')).toBeTruthy();
    expect(screen.getByText(/Defect \/ Complaint Reason/i)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('All Customers')).toBeTruthy();
    });
  });
});
