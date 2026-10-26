import { describe, it, expect } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InvoiceStatusBadge } from '../features/invoices/InvoiceStatusBadge';
import { InvoiceListPage } from '../features/invoices/InvoiceListPage';
import { InvoiceDetailPage } from '../features/invoices/InvoiceDetailPage';
import { PaymentStatusBadge } from '../features/payments/PaymentStatusBadge';
import { PaymentListPage } from '../features/payments/PaymentListPage';
import { PaymentCollectionPage } from '../features/payments/PaymentCollectionPage';
import { PaymentDetailPage } from '../features/payments/PaymentDetailPage';
import { ThermalReceiptModal } from '../features/payments/ThermalReceiptModal';
import { MOCK_INVOICES } from '../mock/mockInvoices';
import { MOCK_PAYMENTS } from '../mock/mockPayments';

describe('Phase 7 — Invoice & Payment UI Components', () => {
  it('renders InvoiceStatusBadge with all expected status badges', () => {
    const { rerender } = render(<InvoiceStatusBadge status="ISSUED" />);
    expect(screen.getByText('Issued')).toBeInTheDocument();

    rerender(<InvoiceStatusBadge status="PARTIALLY_PAID" />);
    expect(screen.getByText('Partially Paid')).toBeInTheDocument();

    rerender(<InvoiceStatusBadge status="PAID" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();

    rerender(<InvoiceStatusBadge status="OVERDUE" />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    rerender(<InvoiceStatusBadge status="DRAFT" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<InvoiceStatusBadge status="COLLECTED" />);
    expect(screen.getByText('Collected')).toBeInTheDocument();

    rerender(<InvoiceStatusBadge status="PARTIALLY_COLLECTED" />);
    expect(screen.getByText('Partially Collected')).toBeInTheDocument();

    rerender(<InvoiceStatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders PaymentStatusBadge with all expected payment status variants', () => {
    const { rerender } = render(<PaymentStatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('Pending Finance Approval')).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved by Finance')).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders InvoiceListPage with title, metrics, search, and action buttons', async () => {
    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Commercial Tax Invoices')).toBeInTheDocument();
    expect(screen.getByText('Record Payment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by invoice #/i)).toBeInTheDocument();
    expect(screen.getByText('All Invoices')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('All Customers')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('INV-2025-0101')).toBeInTheDocument();
    });
  });

  it('renders InvoiceDetailPage with full IRD commercial layout and printable toolbar', async () => {
    render(
      <MemoryRouter initialEntries={[`/invoices/${MOCK_INVOICES[0].id}`]}>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DNS DISTRIBUTION (PVT) LTD')).toBeInTheDocument();
      expect(screen.getByText('COMMERCIAL TAX INVOICE')).toBeInTheDocument();
      expect(screen.getAllByText(MOCK_INVOICES[0].invoiceNumber).length).toBeGreaterThan(0);
      expect(screen.getByText('Print Invoice')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
      expect(screen.getByText('Share WhatsApp')).toBeInTheDocument();
    });
  });

  it('renders PaymentListPage with metrics, payment method filter, and record button', async () => {
    render(
      <MemoryRouter>
        <PaymentListPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Payment Collections & Verification')).toBeInTheDocument();
    expect(screen.getByText('Record Payment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by receipt #/i)).toBeInTheDocument();
    expect(screen.getByText('All Receipts')).toBeInTheDocument();
    expect(screen.getByText('All Customers')).toBeInTheDocument();
    expect(screen.getByText('All Payment Methods')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('REC-2025-001').length).toBeGreaterThan(0);
    });
  });

  it('renders PaymentCollectionPage with customer selector, collection fields, and allocation ledger', async () => {
    render(
      <MemoryRouter initialEntries={['/payments/new']}>
        <PaymentCollectionPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Record Payment Collection')).toBeInTheDocument();
    expect(screen.getByText('1. Customer Account')).toBeInTheDocument();
    expect(screen.getByText('2. Collection Details')).toBeInTheDocument();
    expect(screen.getByText('3. Open Invoice Settlement Allocation')).toBeInTheDocument();
    expect(screen.getByText('Issue Receipt (Submit for Approval)')).toBeInTheDocument();
  });

  it('automatically calculates FIFO allocations when invoices load with an amount and updates allocations when user changes Collection Amount', async () => {
    render(
      <MemoryRouter initialEntries={['/payments/new?customerId=cust-001&amount=1450000']}>
        <PaymentCollectionPage />
      </MemoryRouter>
    );

    // Wait for customer open invoices to load (matching table row or card)
    await waitFor(() => {
      expect(screen.getAllByText('INV-2025-0101').length).toBeGreaterThan(0);
      expect(screen.getAllByText('INV-2025-0102').length).toBeGreaterThan(0);
      expect(screen.getAllByText('INV-2025-0103').length).toBeGreaterThan(0);
    }, { timeout: 4000 });

    const row1 = screen.getAllByText('INV-2025-0101').find((el) => el.closest('tr'))?.closest('tr');
    const row2 = screen.getAllByText('INV-2025-0102').find((el) => el.closest('tr'))?.closest('tr');
    const row3 = screen.getAllByText('INV-2025-0103').find((el) => el.closest('tr'))?.closest('tr');

    const allocInput1 = row1?.querySelector('input[type="number"]') as HTMLInputElement;
    const allocInput2 = row2?.querySelector('input[type="number"]') as HTMLInputElement;
    const allocInput3 = row3?.querySelector('input[type="number"]') as HTMLInputElement;

    // Initially with 1,450,000, all three invoices are fully allocated
    expect(allocInput1.value).toBe('150000');
    expect(allocInput2.value).toBe('450000');
    expect(allocInput3.value).toBe('850000');

    // Find Collection Amount input
    const collectionAmountInput = screen.getByDisplayValue('1450000') as HTMLInputElement;

    // User changes Collection Amount to 100,000 (as in the screenshot issue)
    fireEvent.change(collectionAmountInput, { target: { value: '100000' } });

    // Oldest invoice (INV-2025-0101) must receive 100,000 and subsequent invoices must receive 0
    expect(allocInput1.value).toBe('100000');
    expect(allocInput2.value).toBe('0');
    expect(allocInput3.value).toBe('0');

    // Total allocated must equal 100,000 and unallocated float must be 0
    expect(screen.getByText(/Total Allocated:/i).parentElement?.textContent).toContain('100,000.00');
    expect(screen.getByText(/Collected:/i).parentElement?.textContent).toContain('100,000.00');
    expect(screen.getByText(/Unallocated Float:/i).parentElement?.textContent).toContain('0.00');

    // User changes Collection Amount to 200,000 (covers 150,000 of INV-2025-0101 and 50,000 of INV-2025-0102)
    fireEvent.change(collectionAmountInput, { target: { value: '200000' } });
    expect(allocInput1.value).toBe('150000');
    expect(allocInput2.value).toBe('50000');
    expect(allocInput3.value).toBe('0');
    expect(screen.getByText(/Total Allocated:/i).parentElement?.textContent).toContain('200,000.00');
    expect(screen.getByText(/Unallocated Float:/i).parentElement?.textContent).toContain('0.00');

    // User manually modifies an invoice allocation (e.g. INV-2025-0102 set to 20000)
    fireEvent.change(allocInput2, { target: { value: '20000' } });
    expect(allocInput2.value).toBe('20000');
    // Float becomes positive (30,000 unallocated float)
    expect(screen.getByText(/Unallocated Float:/i).parentElement?.textContent).toContain('30,000.00');

    // Changing Collection Amount again re-applies FIFO and overwrites stale/manual allocations
    fireEvent.change(collectionAmountInput, { target: { value: '100000' } });
    expect(allocInput1.value).toBe('100000');
    expect(allocInput2.value).toBe('0');
    expect(allocInput3.value).toBe('0');
    expect(screen.getByText(/Unallocated Float:/i).parentElement?.textContent).toContain('0.00');

    // User clears Collection Amount
    fireEvent.change(collectionAmountInput, { target: { value: '' } });
    expect(allocInput1.value).toBe('0');
    expect(allocInput2.value).toBe('0');
    expect(allocInput3.value).toBe('0');
    expect(screen.getByText(/Total Allocated:/i).parentElement?.textContent).toContain('0.00');
    expect(screen.getByText(/Unallocated Float:/i).parentElement?.textContent).toContain('0.00');
  });

  it('renders PaymentDetailPage with collection summary and action buttons', async () => {
    render(
      <MemoryRouter initialEntries={[`/payments/${MOCK_PAYMENTS[0].id}`]}>
        <Routes>
          <Route path="/payments/:id" element={<PaymentDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(MOCK_PAYMENTS[0].receiptNumber).length).toBeGreaterThan(0);
      expect(screen.getByText('Thermal ESC/POS')).toBeInTheDocument();
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
      expect(screen.getByText('Allocated Invoices')).toBeInTheDocument();
    });
  });

  it('renders ThermalReceiptModal with realistic 80mm ESC/POS layout', () => {
    render(
      <ThermalReceiptModal
        isOpen={true}
        onClose={() => {}}
        payment={MOCK_PAYMENTS[0]}
        customerBalance={450000}
      />
    );

    expect(screen.getByText(/Thermal Receipt Preview/i)).toBeInTheDocument();
    expect(screen.getAllByText('DNS DISTRIBUTION (PVT) LTD').length).toBeGreaterThan(0);
    expect(screen.getByText(MOCK_PAYMENTS[0].receiptNumber)).toBeInTheDocument();
    expect(screen.getByText('Print Thermal Receipt')).toBeInTheDocument();
  });
});
