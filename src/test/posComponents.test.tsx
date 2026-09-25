import { describe, it, expect } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShowroomPOSTerminal } from '../features/pos/ShowroomPOSTerminal';
import { POSTransactionHistoryPage } from '../features/pos/POSTransactionHistoryPage';
import { POSSessionsPage } from '../features/pos/POSSessionsPage';
import { ThermalReceiptModal } from '../features/pos/ThermalReceiptModal';
import { CashMovementModal } from '../features/pos/CashMovementModal';
import { CloseShiftModal } from '../features/pos/CloseShiftModal';
import { OpenShiftModal } from '../features/pos/OpenShiftModal';
import { POSPaymentModal } from '../features/pos/POSPaymentModal';
import { MOCK_POS_TRANSACTIONS, MOCK_POS_SESSIONS } from '../mock/mockPOS';

describe('Phase 8 — POS UI Components & Terminal Experience', () => {
  it('renders ShowroomPOSTerminal with scanner bar, catalog filters, and cart panel', () => {
    render(
      <MemoryRouter>
        <ShowroomPOSTerminal />
      </MemoryRouter>
    );

    expect(screen.getByText('Showroom Point of Sale')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Scan barcode or type SKU\/Name/)).toBeInTheDocument();
    expect(screen.getByText('All Products')).toBeInTheDocument();
    expect(screen.getByText('Current Order Cart')).toBeInTheDocument();
  });

  it('renders ThermalReceiptModal with 80mm ESC/POS layout, totals, and print action', () => {
    const tx = MOCK_POS_TRANSACTIONS[0];
    render(
      <ThermalReceiptModal
        isOpen={true}
        transaction={tx}
        onClose={() => {}}
      />
    );

    expect(screen.getAllByText('DNS DISTRIBUTION (PVT) LTD').length).toBeGreaterThan(0);
    expect(screen.getByText('Showroom Sales Outlet')).toBeInTheDocument();
    expect(screen.getByText(tx.receiptNumber)).toBeInTheDocument();
    expect(screen.getByText(tx.cashierName)).toBeInTheDocument();
    expect(screen.getByText('Print Receipt')).toBeInTheDocument();
  });

  it('renders CashMovementModal with Cash In / Cash Out toggle and required fields', () => {
    render(
      <CashMovementModal
        isOpen={true}
        onClose={() => {}}
        onRecord={async () => {}}
        currentFloat={15000}
      />
    );

    expect(screen.getByText('Float Cash Management')).toBeInTheDocument();
    expect(screen.getByText(/Cash In \(Add Float\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cash Out \(Safe Drop\)/)).toBeInTheDocument();
    expect(screen.getByText(/Reason \/ Justification/)).toBeInTheDocument();
  });

  it('renders CloseShiftModal with mathematical reconciliation and counted cash input', () => {
    const session = MOCK_POS_SESSIONS[0];
    render(
      <CloseShiftModal
        isOpen={true}
        session={session}
        cashSalesTotal={33250}
        onClose={() => {}}
        onConfirmClose={async () => {}}
      />
    );

    expect(screen.getByText('Close Cashier Shift')).toBeInTheDocument();
    expect(screen.getByText('Shift Cash Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('Opening Float:')).toBeInTheDocument();
    expect(screen.getByText(/Counted Physical Cash in Drawer/)).toBeInTheDocument();
    expect(screen.getByText('Reconcile & Close Shift')).toBeInTheDocument();
  });

  it('renders OpenShiftModal with opening float input', () => {
    render(
      <OpenShiftModal
        isOpen={true}
        cashierName="Chathura Alwis"
        onClose={() => {}}
        onOpenShift={async () => {}}
      />
    );

    expect(screen.getByText('Open Cashier Shift')).toBeInTheDocument();
    expect(screen.getByText(/Opening Float Cash/)).toBeInTheDocument();
    expect(screen.getByText('Start Active Shift')).toBeInTheDocument();
  });

  it('renders POSPaymentModal with Cash, Card, Cheque tender options and change calculator', () => {
    render(
      <POSPaymentModal
        isOpen={true}
        totalAmount={7670}
        customerName="Walk-in Retail Customer"
        onClose={() => {}}
        onConfirmPayment={async () => {}}
      />
    );

    expect(screen.getByText('Showroom Checkout Tender')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('Card (POS)')).toBeInTheDocument();
    expect(screen.getByText('Cheque')).toBeInTheDocument();
    expect(screen.getByText('Exact')).toBeInTheDocument();
    expect(screen.getByText('Complete Sale & Print Receipt')).toBeInTheDocument();
  });

  it('renders POSTransactionHistoryPage with table of sales receipts and filters', () => {
    render(
      <MemoryRouter>
        <POSTransactionHistoryPage />
      </MemoryRouter>
    );

    expect(screen.getByText('POS Showroom Transactions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search receipt #, customer, cashier/)).toBeInTheDocument();
    expect(screen.getByText('Receipt Number')).toBeInTheDocument();
  });

  it('renders POSSessionsPage with shift reconciliation history and summaries', () => {
    render(
      <MemoryRouter>
        <POSSessionsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Cashier Shift Sessions & Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('Shift Number')).toBeInTheDocument();
    expect(screen.getByText('Opening Float')).toBeInTheDocument();
  });

  it('opens Search Canonical Product Master modal when clicking Search Master button', () => {
    render(
      <MemoryRouter>
        <ShowroomPOSTerminal />
      </MemoryRouter>
    );

    const searchMasterBtn = screen.getByText('Search Master');
    expect(searchMasterBtn).toBeInTheDocument();

    fireEvent.click(searchMasterBtn);
    expect(screen.getByText('Search Canonical Product Master')).toBeInTheDocument();
  });

  it('supports typing barcode or SKU into barcode scanner input and submits search', () => {
    render(
      <MemoryRouter>
        <ShowroomPOSTerminal />
      </MemoryRouter>
    );

    const barcodeInput = screen.getByPlaceholderText(/Scan barcode or type SKU\/Name/) as HTMLInputElement;
    fireEvent.change(barcodeInput, { target: { value: '8901020304011' } });
    expect(barcodeInput.value).toBe('8901020304011');

    const scanBtn = screen.getByText('Scan / Add');
    fireEvent.click(scanBtn);
  });
});
