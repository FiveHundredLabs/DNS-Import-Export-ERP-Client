import { describe, it, expect } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
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

    expect(screen.getByText('Thermal 80mm ESC/POS Preview')).toBeInTheDocument();
    expect(screen.getAllByText('DNS DISTRIBUTION (PVT) LTD').length).toBeGreaterThan(0);
    expect(screen.getByText(MOCK_PAYMENTS[0].receiptNumber)).toBeInTheDocument();
    expect(screen.getByText('Print Thermal Receipt')).toBeInTheDocument();
  });
});
