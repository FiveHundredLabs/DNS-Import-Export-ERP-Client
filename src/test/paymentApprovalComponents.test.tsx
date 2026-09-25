import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentApprovalPage } from '../features/finance/pages/PaymentApprovalPage';
import { financeRepository } from '../features/finance/api';

describe('Phase F-2: Cash Approval Desk & Sub-Ledger UI', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  it('renders pending cash/bank payments in the verification queue', async () => {
    render(<PaymentApprovalPage />);

    expect(screen.getByText('Cash Verification Desk')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('REC-2026-0491')).toBeDefined();
      expect(screen.getByText('Lanka Electrical & Hardware Superstore')).toBeDefined();
    });
  });

  it('approves a payment and triggers GL double-entry voucher', async () => {
    render(<PaymentApprovalPage />);

    await waitFor(() => {
      expect(screen.getByText('REC-2026-0491')).toBeDefined();
    });

    const approveButtons = screen.getAllByRole('button', { name: /^approve$/i });
    fireEvent.click(approveButtons[0]);

    // Dialog opens
    await waitFor(() => {
      expect(screen.getByText(/Approve Payment/i)).toBeDefined();
    });

    const confirmBtn = screen.getByRole('button', { name: /confirm & post to ledger/i });
    fireEvent.click(confirmBtn);

    // Item is approved and removed from Pending tab
    await waitFor(() => {
      expect(screen.getByText('2')).toBeDefined(); // Pending count dropped from 3 to 2
    });

    // Switch to Approved tab to view cleared voucher
    const approvedTab = screen.getByRole('button', { name: /approved/i });
    fireEvent.click(approvedTab);

    await waitFor(() => {
      expect(screen.getByText('REC-2026-0491')).toBeDefined();
      expect(screen.getAllByText('Cleared to GL').length).toBeGreaterThan(0);
    });
  });
});
