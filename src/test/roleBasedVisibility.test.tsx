import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { MobileNav } from '../components/common/MobileNav';
import { OrderListPage } from '../features/orders/OrderListPage';
import { QuotationListPage } from '../features/quotations/QuotationListPage';
import { PaymentListPage } from '../features/payments/PaymentListPage';
import { AreaManagerDashboard } from '../features/dashboard/AreaManagerDashboard';
import { authService } from '../services/AuthService';

describe('Role-Based Visibility & Access Guarding Audit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Sidebar Rail Category Filtering by Role', () => {
    it('renders all rail categories for DIRECTOR', () => {
      authService.switchRole('DIRECTOR');
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      expect(screen.getByRole('button', { name: /dashboard & quick links/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sales & orders/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customers & crm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /inventory & products/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /finance & payments/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approvals & warranty/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enterprise reports/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /administration/i })).toBeInTheDocument();
    });

    it('hides inventory, reports, and administration rail categories for SALES_REP', () => {
      authService.switchRole('SALES_REP');
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Authorized categories
      expect(screen.getByRole('button', { name: /dashboard & quick links/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sales & orders/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customers & crm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /finance & payments/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approvals & warranty/i })).toBeInTheDocument();

      // Unauthorized categories MUST be hidden
      expect(screen.queryByRole('button', { name: /inventory & products/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enterprise reports/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /administration/i })).not.toBeInTheDocument();
    });

    it('hides sales, customers, finance, approvals, reports, admin rail categories for STOCK_KEEPER', () => {
      authService.switchRole('STOCK_KEEPER');
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Stock Keeper only has Inventory
      expect(screen.getByRole('button', { name: /dashboard & quick links/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /inventory & products/i })).toBeInTheDocument();

      expect(screen.queryByRole('button', { name: /sales & orders/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /customers & crm/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /finance & payments/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /approvals & warranty/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enterprise reports/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /administration/i })).not.toBeInTheDocument();
    });
  });

  describe('2. Mobile Navigation & More Menu Role Filtering', () => {
    it('hides Approvals, Products & Inventory, and Reports from SALES_REP in More sheet', () => {
      authService.switchRole('SALES_REP');
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileNav />
        </MemoryRouter>
      );

      // Open More drawer
      const moreBtn = screen.getByRole('button', { name: /open more features menu/i });
      moreBtn.click();

      // Sales Rep must NOT see Approvals
      expect(screen.queryByText('Approvals')).not.toBeInTheDocument();
      expect(screen.queryByText('Engine Queue')).not.toBeInTheDocument();

      // Sales Rep must NOT see Products & Inventory section
      expect(screen.queryByText('Products & Inventory')).not.toBeInTheDocument();
      expect(screen.queryByText('Warehouse Stock')).not.toBeInTheDocument();

      // Sales Rep must NOT see Enterprise Reports button
      expect(screen.queryByText('Reports')).not.toBeInTheDocument();

      // Sales Rep MUST see allowed items
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('Collect Payment')).toBeInTheDocument();
      expect(screen.getByText('Quotations')).toBeInTheDocument();
      expect(screen.getByText('Invoices')).toBeInTheDocument();
      expect(screen.getByText('Targets & Incentive')).toBeInTheDocument();
    });

    it('shows Products and Reports for AREA_MANAGER but hides Warehouse Stock and Approvals', () => {
      authService.switchRole('AREA_MANAGER');
      render(
        <MemoryRouter initialEntries={['/']}>
          <MobileNav />
        </MemoryRouter>
      );

      // Open More drawer
      const moreBtn = screen.getByRole('button', { name: /open more features menu/i });
      moreBtn.click();

      // Area Manager has products:view -> shows Products
      expect(screen.getByText('Products')).toBeInTheDocument();

      // Area Manager lacks inventory:view -> hides Warehouse Stock
      expect(screen.queryByText('Warehouse Stock')).not.toBeInTheDocument();

      // Area Manager lacks approvals -> hides Approvals
      expect(screen.queryByText('Approvals')).not.toBeInTheDocument();

      // Area Manager has reports:area_only -> shows Reports
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('3. List Page Creation Action Buttons Guarding', () => {
    it('hides New Sales Order, New Quotation, and Record Payment for AREA_MANAGER', () => {
      authService.switchRole('AREA_MANAGER');

      // OrderListPage
      const { unmount: unmountOrders } = render(
        <MemoryRouter initialEntries={['/orders']}>
          <OrderListPage />
        </MemoryRouter>
      );
      expect(screen.queryByRole('button', { name: /new sales order/i })).not.toBeInTheDocument();
      unmountOrders();

      // QuotationListPage
      const { unmount: unmountQuotes } = render(
        <MemoryRouter initialEntries={['/quotations']}>
          <QuotationListPage />
        </MemoryRouter>
      );
      expect(screen.queryByRole('button', { name: /new quotation/i })).not.toBeInTheDocument();
      unmountQuotes();

      // PaymentListPage
      const { unmount: unmountPayments } = render(
        <MemoryRouter initialEntries={['/payments']}>
          <PaymentListPage />
        </MemoryRouter>
      );
      expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
      unmountPayments();
    });

    it('renders New Sales Order, New Quotation, and Record Payment for SALES_REP', () => {
      authService.switchRole('SALES_REP');

      // OrderListPage
      const { unmount: unmountOrders } = render(
        <MemoryRouter initialEntries={['/orders']}>
          <OrderListPage />
        </MemoryRouter>
      );
      expect(screen.getByRole('button', { name: /new sales order/i })).toBeInTheDocument();
      unmountOrders();

      // QuotationListPage
      const { unmount: unmountQuotes } = render(
        <MemoryRouter initialEntries={['/quotations']}>
          <QuotationListPage />
        </MemoryRouter>
      );
      expect(screen.getByRole('button', { name: /new quotation/i })).toBeInTheDocument();
      unmountQuotes();

      // PaymentListPage
      const { unmount: unmountPayments } = render(
        <MemoryRouter initialEntries={['/payments']}>
          <PaymentListPage />
        </MemoryRouter>
      );
      expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
      unmountPayments();
    });
  });

  describe('4. Area Manager Dashboard Quick Operations Guarding', () => {
    it('shows Product Master and hides Showroom Stock for AREA_MANAGER', () => {
      authService.switchRole('AREA_MANAGER');
      render(
        <MemoryRouter initialEntries={['/']}>
          <AreaManagerDashboard />
        </MemoryRouter>
      );

      // Product Master is accessible to Area Manager
      expect(screen.getByText('Product Master')).toBeInTheDocument();

      // Showroom Stock (/inventory/stock) is restricted and MUST be hidden
      expect(screen.queryByText('Showroom Stock')).not.toBeInTheDocument();
    });
  });
});
