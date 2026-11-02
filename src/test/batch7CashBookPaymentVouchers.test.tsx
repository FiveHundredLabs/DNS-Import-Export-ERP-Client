import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { cashBookService } from '../services/CashBookService';
import { CashBookPage } from '../features/finance/pages/CashBookPage';
import { User } from '../types/auth';

const mockStaffUser: User = {
  id: 'usr-clerk-01',
  name: 'Sunil Jayawardena',
  email: 'sunil@dnserp.lk',
  role: 'OPERATIONAL',
  assignedTerritories: [],
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockManagerUser: User = {
  id: 'usr-mgr-01',
  name: 'Anura Perera',
  email: 'anura@dnserp.lk',
  role: 'MANAGER',
  assignedTerritories: [],
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

let currentUserState: User = mockManagerUser;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentUserState,
    role: currentUserState.role,
    isAuthenticated: true,
  }),
}));

describe('Batch 7: Cash Book & Payment Vouchers (BR-09, MG-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserState = mockManagerUser;
  });

  it('allows staff to create a Payment Voucher in PENDING_APPROVAL state linked to Account 1040', async () => {
    const voucher = await cashBookService.createVoucher(
      {
        voucherType: 'PAYMENT',
        category: 'PETTY_CASH',
        payeeOrPayer: 'Kelani Office Stationery',
        amount: 3500,
        cashAccountCode: '1040',
        offsetAccountCode: '5020',
        description: 'A4 printing paper reams for billing counter',
      },
      mockStaffUser
    );

    expect(voucher).toBeDefined();
    expect(voucher.voucherNumber).toMatch(/^PV-2026-/);
    expect(voucher.status).toBe('PENDING_APPROVAL');
    expect(voucher.amount).toBe(3500);
    expect(voucher.cashAccountCode).toBe('1040');
    expect(voucher.createdBy).toBe('usr-clerk-01');
  });

  it('rejects vouchers requesting disbursement exceeding available cash balance', async () => {
    const summary = await cashBookService.getSummary();
    const excessiveAmount = summary.account1040Balance + 500000;

    await expect(
      cashBookService.createVoucher(
        {
          voucherType: 'PAYMENT',
          category: 'OFFICE_EXPENSE',
          payeeOrPayer: 'Office Luxury Furniture Ltd',
          amount: excessiveAmount,
          cashAccountCode: '1040',
          offsetAccountCode: '5020',
          description: 'Executive mahogany boardroom desk',
        },
        mockStaffUser
      )
    ).rejects.toThrow(/Insufficient funds in Cash Account 1040/i);
  });

  it('enforces MG-02 boundary: rejects voucher approval by unauthorized operational staff', async () => {
    const voucher = await cashBookService.createVoucher(
      {
        voucherType: 'PAYMENT',
        category: 'TRAVEL_TRANSPORT',
        payeeOrPayer: 'Express Cab Service',
        amount: 2200,
        cashAccountCode: '1040',
        offsetAccountCode: '5040',
        description: 'Emergency documents delivery to Customs office',
      },
      mockStaffUser
    );

    await expect(
      cashBookService.approveVoucher(voucher.id, mockStaffUser)
    ).rejects.toThrow(/Only Finance Manager, General Manager, or Director can approve cash disbursements/i);
  });

  it('approves voucher by Manager, updates live status to APPROVED, and links GL entry (BR-09, MG-02)', async () => {
    const voucher = await cashBookService.createVoucher(
      {
        voucherType: 'PAYMENT',
        category: 'UTILITIES',
        payeeOrPayer: 'National Water Supply Board',
        amount: 4200,
        cashAccountCode: '1010',
        offsetAccountCode: '5030',
        description: 'Showroom monthly water consumption bill',
      },
      mockStaffUser
    );

    const approved = await cashBookService.approveVoucher(voucher.id, mockManagerUser);

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedBy).toBe('usr-mgr-01');
    expect(approved.approvedByName).toBe('Anura Perera');
    expect(approved.glJournalId).toBeDefined();
  });

  it('renders Cash Book page with KPI metric cards, filters, and records table', async () => {
    render(
      <BrowserRouter>
        <CashBookPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Cash Book & Payment Vouchers/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new payment voucher/i })).toBeInTheDocument();
    expect(screen.getByText(/Operating Float \(1010\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Petty Cash Float \(1040\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Approvals \(MG-02\)/i)).toBeInTheDocument();
  });

  it('provides downloadable action and opens System View inner modal with Print button', async () => {
    render(
      <BrowserRouter>
        <CashBookPage />
      </BrowserRouter>
    );

    // Switch to Vouchers tab
    const vouchersTabBtn = screen.getByRole('button', { name: /Payment & Receipt Vouchers/i });
    fireEvent.click(vouchersTabBtn);

    // Verify voucher items render with View, Download, and Print actions
    await waitFor(() => {
      expect(screen.getByText('PV-2026-0001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /^view$/i });
    expect(viewButtons.length).toBeGreaterThan(0);

    // Click "View" to open the System View inner modal
    fireEvent.click(viewButtons[0]);

    // Verify System View contains official accounting voucher details
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Official Payment Voucher/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /print voucher/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /download/i }).length).toBeGreaterThan(0);
      expect(screen.getByText(/DNS IMPORT & EXPORT \(PVT\) LTD/i)).toBeInTheDocument();
      expect(screen.getByText(/Statutory Double-Entry GL Impact:/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Amount Authorized:/i)).toBeInTheDocument();
      expect(screen.getByText(/1\. Prepared By/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Approved By/i)).toBeInTheDocument();
    });
  });
});
