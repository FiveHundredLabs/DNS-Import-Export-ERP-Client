import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components to test
import { BalancingBar } from '../features/finance/components/BalancingBar';
import { SupplierModal } from '../features/finance/components/SupplierModal';
import { AccountModal } from '../features/finance/components/AccountModal';
import { CategoryModal } from '../features/finance/components/CategoryModal';
import { OpeningBalanceWizard } from '../features/finance/components/OpeningBalanceWizard';
import { PrintablePaymentVoucher } from '../features/finance/components/PrintablePaymentVoucher';

describe('Finance Module: Confirmation Popups on Action Buttons', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('auth_token', 'mock_token');
    vi.clearAllMocks();
  });

  describe('1. BalancingBar Confirmation Popups', () => {
    it('prompts confirmation modal before resetting journal form', async () => {
      const onResetMock = vi.fn();
      render(
        <BalancingBar
          totalDebit={15000}
          totalCredit={15000}
          onPost={vi.fn()}
          onReset={onResetMock}
        />
      );

      const clearBtn = screen.getByRole('button', { name: /^clear$/i });
      fireEvent.click(clearBtn);

      // Verify confirmation modal appears
      await waitFor(() => {
        expect(screen.getByText(/Clear Journal Entry Form\?/i)).toBeDefined();
        expect(screen.getByText(/Are you sure you want to discard all entered lines/i)).toBeDefined();
      });

      // Confirm clear
      const confirmClear = screen.getByRole('button', { name: /clear form/i });
      fireEvent.click(confirmClear);

      expect(onResetMock).toHaveBeenCalledTimes(1);
    });

    it('prompts confirmation modal before posting general journal entry', async () => {
      const onPostMock = vi.fn();
      render(
        <BalancingBar
          totalDebit={25000}
          totalCredit={25000}
          onPost={onPostMock}
        />
      );

      const postBtn = screen.getByRole('button', { name: /post entry \(commit\)/i });
      fireEvent.click(postBtn);

      // Verify confirmation modal appears
      await waitFor(() => {
        expect(screen.getByText(/Post General Journal Entry\?/i)).toBeDefined();
        expect(screen.getByText(/Are you sure you want to commit this journal entry/i)).toBeDefined();
      });

      // Confirm posting
      const confirmSubmit = screen.getByTestId('confirm-dialog-submit-btn');
      fireEvent.click(confirmSubmit);

      expect(onPostMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. OpeningBalanceWizard Confirmation Popup', () => {
    it('prompts confirmation modal before saving opening balances', async () => {
      const onSaveMock = vi.fn().mockResolvedValue(undefined);
      render(
        <OpeningBalanceWizard
          accounts={[
            {
              id: 'acc-1',
              code: '1010',
              name: 'Corporate Bank Account',
              classification: 'ASSET',
              accountClass: 'ASSET',
              accountType: 'Bank',
              accountSubClass: 'CURRENT_ASSET',
              accountSubType: 'Bank',
              currentBalance: 0,
              isActive: true,
              currency: 'LKR',
            },
          ]}
          onSave={onSaveMock}
          onClose={vi.fn()}
        />
      );

      // Find save button (initially disabled until input entered)
      const input = screen.getAllByRole('textbox')[0];
      fireEvent.change(input, { target: { value: '500000' } });

      const saveBtn = screen.getAllByRole('button', { name: /save opening balances/i })[0];
      fireEvent.click(saveBtn);

      // Verify confirmation modal
      await waitFor(() => {
        expect(screen.getByText(/Save & Post Opening Balances\?/i)).toBeDefined();
        expect(
          screen.getByText(/Are you sure you want to commit these opening balances/i)
        ).toBeDefined();
      });

      // Cancel
      const cancelBtn = screen.getByTestId('confirm-dialog-cancel-btn');
      fireEvent.click(cancelBtn);
      expect(onSaveMock).not.toHaveBeenCalled();
    });
  });

  describe('3. PrintablePaymentVoucher Confirmation Popups', () => {
    it('prompts confirmation before approving from printable voucher', async () => {
      const onApproveMock = vi.fn();
      render(
        <PrintablePaymentVoucher
          open={true}
          onOpenChange={vi.fn()}
          canApprove={true}
          voucher={{
            id: 'v-101',
            voucherNumber: 'PV-2026-001',
            date: '2026-11-19',
            amount: 75000,
            status: 'PENDING_APPROVAL',
            payee: 'City Logistics',
            category: 'TRANSPORT',
            paymentMethod: 'CASH',
            cashAccountCode: '1040',
            offsetAccountCode: '5010',
            description: 'Warehouse transportation delivery',
            createdBy: 'user-1',
            createdAt: '2026-11-19T10:00:00Z',
          } as any}
          onApprove={onApproveMock}
          onReject={vi.fn()}
        />
      );

      const approveBtn = screen.getByRole('button', { name: /approve voucher/i });
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Approve Payment Voucher\?/i)).toBeDefined();
        expect(
          screen.getByText(/Are you sure you want to approve voucher PV-2026-001/i)
        ).toBeDefined();
      });

      // Cancel
      const cancelBtn = screen.getByTestId('confirm-dialog-cancel-btn');
      fireEvent.click(cancelBtn);
      expect(onApproveMock).not.toHaveBeenCalled();
    });

    it('prompts confirmation before rejecting from printable voucher', async () => {
      const onRejectMock = vi.fn();
      render(
        <PrintablePaymentVoucher
          open={true}
          onOpenChange={vi.fn()}
          canApprove={true}
          voucher={{
            id: 'v-102',
            voucherNumber: 'PV-2026-002',
            date: '2026-11-19',
            amount: 25000,
            status: 'PENDING_APPROVAL',
            payee: 'Office Supplies Inc',
            category: 'OFFICE',
            paymentMethod: 'CASH',
            cashAccountCode: '1040',
            offsetAccountCode: '5020',
            description: 'Stationery purchase',
            createdBy: 'user-1',
            createdAt: '2026-11-19T10:00:00Z',
          } as any}
          onApprove={vi.fn()}
          onReject={onRejectMock}
        />
      );

      const rejectBtn = screen.getByRole('button', { name: /^reject$/i });
      fireEvent.click(rejectBtn);

      await waitFor(() => {
        expect(screen.getByText(/Reject Payment Voucher\?/i)).toBeDefined();
        expect(
          screen.getByText(/Are you sure you want to reject voucher PV-2026-002/i)
        ).toBeDefined();
      });

      // Cancel
      const cancelBtn = screen.getByTestId('confirm-dialog-cancel-btn');
      fireEvent.click(cancelBtn);
      expect(onRejectMock).not.toHaveBeenCalled();
    });
  });

  describe('4. Creation and Edit Modals Confirmation Popups', () => {
    it('prompts confirmation before creating supplier in SupplierModal', async () => {
      const onSaveMock = vi.fn().mockResolvedValue({ id: 'sup-1', name: 'Apex Global' });
      render(
        <SupplierModal
          open={true}
          onOpenChange={vi.fn()}
          onSave={onSaveMock}
        />
      );

      // Fill in all required fields
      fireEvent.change(screen.getByPlaceholderText(/e.g. SUP-005/i), { target: { value: 'SUP-999' } });
      fireEvent.change(screen.getByPlaceholderText(/e.g. Global Tech Components Ltd/i), { target: { value: 'Apex Global' } });
      fireEvent.change(screen.getByPlaceholderText(/Mr. Arjuna Weerasinghe/i), { target: { value: 'Mr. John Silva' } });
      fireEvent.change(screen.getByPlaceholderText(/\+94 11 234 5678/i), { target: { value: '0771234567' } });

      const submitBtn = screen.getByRole('button', { name: /register supplier/i });
      fireEvent.click(submitBtn);

      // Verify confirmation popup
      await waitFor(() => {
        expect(screen.getByText(/Register Supplier\?/i)).toBeDefined();
        expect(screen.getByText(/Are you sure you want to register supplier "Apex Global"\?/i)).toBeDefined();
      });

      // Cancel
      const cancelBtn = screen.getByTestId('confirm-dialog-cancel-btn');
      fireEvent.click(cancelBtn);
      expect(onSaveMock).not.toHaveBeenCalled();
    });

    it('prompts confirmation before creating category in CategoryModal', async () => {
      render(
        <CategoryModal
          open={true}
          onOpenChange={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/e.g. 1001, 1002/i), { target: { value: '9900' } });
      fireEvent.change(screen.getByPlaceholderText(/e.g. Current Assets, Non-Current Assets, Direct Costs/i), { target: { value: 'Custom Capital' } });

      const submitBtn = screen.getByRole('button', { name: /save category/i });
      fireEvent.click(submitBtn);

      // Verify confirmation popup
      await waitFor(() => {
        expect(screen.getByText(/Create Category\?/i)).toBeDefined();
        expect(screen.getByText(/Are you sure you want to create category "9900 - Custom Capital"\?/i)).toBeDefined();
      });
    });

    it('prompts confirmation before creating account in AccountModal', async () => {
      render(
        <AccountModal
          open={true}
          onOpenChange={vi.fn()}
          onCreate={vi.fn()}
          defaultHeaderCategoryId="cat-1"
          categoriesList={[{ id: 'cat-1', code: '1000', name: 'Assets', accountClass: 'ASSET', isSystem: true, level: 1 }]}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/e.g. 1010, 5010/i), { target: { value: '1099' } });
      fireEvent.change(screen.getByPlaceholderText(/e.g. Cash in Hand, Commercial Bank USD/i), { target: { value: 'Escrow Account' } });

      const submitBtn = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitBtn);

      // Verify confirmation popup
      await waitFor(() => {
        expect(screen.getByText(/Create Account\?/i)).toBeDefined();
        expect(screen.getByText(/Are you sure you want to create account "1099 - Escrow Account"\?/i)).toBeDefined();
      });
    });
  });
});
