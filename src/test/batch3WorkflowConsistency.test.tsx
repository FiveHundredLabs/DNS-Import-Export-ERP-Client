import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ApprovalsPage } from '../features/approvals/ApprovalsPage';
import { PurchaseOrderDetailPage } from '../features/purchasing/PurchaseOrderDetailPage';
import { PurchasingGRNListPage } from '../features/purchasing/PurchasingGRNListPage';
import { OrderListPage } from '../features/orders/OrderListPage';
import { QuotationListPage } from '../features/quotations/QuotationListPage';

describe('Batch 3 Cross-Module Workflow Consistency', () => {
  describe('Approvals Redirection Integrity (APR-001, APR-003, APR-004)', () => {
    it('renders Enterprise Approvals Engine with PageHeader and operational filters', async () => {
      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <Routes>
            <Route path="/approvals" element={<ApprovalsPage />} />
          </Routes>
        </MemoryRouter>
      );

      // PageHeader rendered
      expect(await screen.findByRole('heading', { level: 1, name: /Enterprise Approvals Engine/i })).toBeInTheDocument();
      expect(screen.getByText(/Central Engine/i)).toBeInTheDocument();

      // Refresh button
      expect(screen.getByRole('button', { name: /Refresh Requests/i })).toBeInTheDocument();
    });
  });

  describe('Purchasing GRN List Consistency', () => {
    it('renders PurchasingGRNListPage with canonical PageHeader and Read-Only badge', async () => {
      render(
        <MemoryRouter>
          <PurchasingGRNListPage />
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { level: 1, name: /Goods Received Notes \(GRN\)/i })).toBeInTheDocument();
      expect(screen.getByText(/READ-ONLY VIEW/i)).toBeInTheDocument();
    });
  });

  describe('Sales & Quotations List Headers', () => {
    it('renders OrderListPage with PageHeader and action buttons', async () => {
      render(
        <MemoryRouter>
          <OrderListPage />
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { level: 1, name: /Sales Orders & Approvals/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /New Sales Order/i })).toBeInTheDocument();
    });

    it('renders QuotationListPage with PageHeader and New Quotation button', async () => {
      render(
        <MemoryRouter>
          <QuotationListPage />
        </MemoryRouter>
      );

      expect(await screen.findByRole('heading', { level: 1, name: /Quotation Management/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /New Quotation/i })).toBeInTheDocument();
    });
  });
});
