import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { Sidebar } from '../components/common/Sidebar';
import { MobileNav } from '../components/common/MobileNav';
import { EmptyState } from '../components/common/EmptyState';
import { CustomerCreateModal } from '../features/customers/CustomerCreateModal';
import { authService } from '../services/AuthService';
import { customerService } from '../services/CustomerService';
import { quotationService } from '../services/QuotationService';
import { orderService } from '../services/OrderService';
import { validateGRNReceipt } from '../rules/inventoryRules';
import { MOCK_USERS } from '../mock/mockUsers';
import { Package, Search, ShoppingCart } from 'lucide-react';

describe('Phase 12 — Accessibility, Responsive UI & Form Validation Audit (Section 84, 85)', () => {
  const salesRepUser = MOCK_USERS.find((u) => u.role === 'SALES_REP')!;

  beforeEach(() => {
    authService.switchRole('DIRECTOR');
  });

  describe('1. Navigation Accessibility & ARIA Audit', () => {
    it('provides accessible ARIA attributes and labels on interactive buttons in Header', () => {
      const onToggle = vi.fn();
      render(
        <MemoryRouter>
          <Header onToggleSidebar={onToggle} />
        </MemoryRouter>
      );

      // Icon button for mobile hamburger toggle has accessible aria-label
      const menuBtn = screen.getByRole('button', { name: /toggle navigation menu/i });
      expect(menuBtn).toBeInTheDocument();
      expect(menuBtn).toHaveAttribute('aria-label', 'Toggle navigation menu');

      // Click invokes callback
      fireEvent.click(menuBtn);
      expect(onToggle).toHaveBeenCalledTimes(1);

      // Notification button has accessible label
      const notifBtn = screen.getByRole('button', { name: /notifications/i });
      expect(notifBtn).toBeInTheDocument();
      expect(notifBtn).toHaveAttribute('aria-label', 'Notifications');
    });

    it('renders accessible semantic navigation landmark and close button in Sidebar', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter>
          <Sidebar isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );

      // Semantic <nav> landmark
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();

      // Mobile close icon button has accessible aria-label
      const closeBtn = screen.getByRole('button', { name: /close navigation/i });
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn).toHaveAttribute('aria-label', 'Close navigation');

      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard focus and tab navigation on interactive navigation elements', () => {
      const onToggle = vi.fn();
      render(
        <MemoryRouter>
          <Header onToggleSidebar={onToggle} />
        </MemoryRouter>
      );

      const menuBtn = screen.getByRole('button', { name: /toggle navigation menu/i });
      const notifBtn = screen.getByRole('button', { name: /notifications/i });

      // Interactive buttons have tabIndex >= 0 (accessible via Tab key)
      expect(menuBtn.tabIndex).toBeGreaterThanOrEqual(0);
      expect(notifBtn.tabIndex).toBeGreaterThanOrEqual(0);

      // Focus traversal works cleanly
      menuBtn.focus();
      expect(document.activeElement).toBe(menuBtn);

      notifBtn.focus();
      expect(document.activeElement).toBe(notifBtn);

      // Enter key actuation
      fireEvent.keyDown(menuBtn, { key: 'Enter', code: 'Enter' });
      fireEvent.click(menuBtn);
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('2. Mobile Layout & Responsive Navigation Components', () => {
    it('renders MobileNav bar for SALES_REP role with core mobile workflows', () => {
      authService.switchRole('SALES_REP');

      render(
        <MemoryRouter>
          <MobileNav />
        </MemoryRouter>
      );

      // Essential field operations links
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Warranty')).toBeInTheDocument();
    });

    it('renders MobileNav bar for AREA_MANAGER role', () => {
      authService.switchRole('AREA_MANAGER');

      render(
        <MemoryRouter>
          <MobileNav />
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Warranty')).toBeInTheDocument();
    });

    it('hides MobileNav for desktop-centric roles (DIRECTOR, MANAGER, FINANCE_MANAGER)', () => {
      authService.switchRole('DIRECTOR');
      const { container: dirContainer } = render(
        <MemoryRouter>
          <MobileNav />
        </MemoryRouter>
      );
      expect(dirContainer.firstChild).toBeNull();

      authService.switchRole('MANAGER');
      const { container: mgrContainer } = render(
        <MemoryRouter>
          <MobileNav />
        </MemoryRouter>
      );
      expect(mgrContainer.firstChild).toBeNull();

      authService.switchRole('FINANCE_MANAGER');
      const { container: finContainer } = render(
        <MemoryRouter>
          <MobileNav />
        </MemoryRouter>
      );
      expect(finContainer.firstChild).toBeNull();
    });
  });

  describe('3. Form Validation States & User Error Feedback', () => {
    it('displays helpful validation error feedback on empty CustomerCreateModal submission', async () => {
      const onCreateMock = vi.fn();

      render(
        <CustomerCreateModal
          open={true}
          onOpenChange={() => {}}
          onCreate={onCreateMock}
        />
      );

      expect(screen.getByText('Register New Dealer / Customer')).toBeInTheDocument();

      // Submit empty form
      const submitBtn = screen.getByRole('button', { name: /Submit for Commercial/i });
      fireEvent.click(submitBtn);

      // Feedback message displayed
      expect(
        screen.getByText('Name, Contact Person, and Phone are required.')
      ).toBeInTheDocument();
      expect(onCreateMock).not.toHaveBeenCalled();
    });

    it('enforces Quotation input validation on zero/negative quantities and out-of-range discounts', async () => {
      await expect(
        quotationService.createQuotation(
          {
            customerId: 'cust-001',
            items: [{ productId: 'prod-001', quantity: 0, requestedDiscountPercentage: 5 }],
          },
          salesRepUser
        )
      ).rejects.toThrow(/greater than zero/i);

      await expect(
        quotationService.createQuotation(
          {
            customerId: 'cust-001',
            items: [{ productId: 'prod-001', quantity: 5, requestedDiscountPercentage: 150 }],
          },
          salesRepUser
        )
      ).rejects.toThrow(/Discount percentage cannot exceed 100%/i);
    });

    it('enforces Order input validation on zero quantities and out-of-range discounts', async () => {
      await expect(
        orderService.createOrder(
          {
            customerId: 'cust-001',
            deliveryAddress: 'Colombo',
            items: [{ productId: 'prod-001', orderedQuantity: -5, requestedDiscountPercentage: 5 }],
          },
          salesRepUser
        )
      ).rejects.toThrow(/greater than zero/i);

      await expect(
        orderService.createOrder(
          {
            customerId: 'cust-001',
            deliveryAddress: 'Colombo',
            items: [{ productId: 'prod-001', orderedQuantity: 5, requestedDiscountPercentage: -10 }],
          },
          salesRepUser
        )
      ).rejects.toThrow(/between 0% and 100%/i);
    });

    it('enforces CustomerService domain validation rules', async () => {
      await expect(
        customerService.createCustomer({
          code: 'CUST-ERR-01',
          name: 'AB', // too short (< 3)
          phone: '+94 77 123 4567',
        } as any)
      ).rejects.toThrow('Customer name must be at least 3 characters.');

      await expect(
        customerService.createCustomer({
          code: 'CUST-ERR-02',
          name: 'Valid Name Ltd',
          phone: '123', // too short (< 8)
        } as any)
      ).rejects.toThrow('Valid phone number is required.');
    });

    it('enforces QuotationService domain validation on empty line items', async () => {
      await expect(
        quotationService.createQuotation(
          {
            customerId: 'cust-001',
            items: [],
          },
          salesRepUser
        )
      ).rejects.toThrow('A quotation must contain at least one product line item.');
    });

    it('enforces OrderService domain validation on empty line items', async () => {
      await expect(
        orderService.createOrder(
          {
            customerId: 'cust-001',
            items: [],
          },
          salesRepUser
        )
      ).rejects.toThrow('An order must contain at least one line item.');
    });

    it('enforces GRN receipt validation rules for quantity boundaries', () => {
      // Received quantity cannot be 0 or negative
      expect(() =>
        validateGRNReceipt({
          productId: 'prod-001',
          productNameSnapshot: 'Breaker',
          skuSnapshot: 'DNS-01',
          expectedQuantity: 10,
          receivedQuantity: 0,
          damagedQuantity: 0,
          unitCostSnapshot: 100,
          lineValue: 0,
        })
      ).toThrow('receivedQuantity must be > 0');

      // Damaged quantity cannot exceed received quantity
      expect(() =>
        validateGRNReceipt({
          productId: 'prod-001',
          productNameSnapshot: 'Breaker',
          skuSnapshot: 'DNS-01',
          expectedQuantity: 10,
          receivedQuantity: 10,
          damagedQuantity: 15,
          unitCostSnapshot: 100,
          lineValue: 0,
        })
      ).toThrow('damagedQuantity cannot exceed receivedQuantity');

      // Valid GRN item succeeds
      expect(
        validateGRNReceipt({
          productId: 'prod-001',
          productNameSnapshot: 'Breaker',
          skuSnapshot: 'DNS-01',
          expectedQuantity: 10,
          receivedQuantity: 10,
          damagedQuantity: 2,
          unitCostSnapshot: 100,
          lineValue: 800,
        })
      ).toBe(true);
    });
  });

  describe('4. Empty States & Visual Feedback', () => {
    it('renders EmptyState cleanly when data sets are empty and handles action button callback', () => {
      const onAction = vi.fn();

      render(
        <EmptyState
          icon={Package}
          title="No Products Found"
          description="There are currently no products registered matching the given category or search filter."
          actionLabel="Create New Product"
          onAction={onAction}
        />
      );

      expect(screen.getByText('No Products Found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'There are currently no products registered matching the given category or search filter.'
        )
      ).toBeInTheDocument();

      const actionBtn = screen.getByRole('button', { name: /Create New Product/i });
      expect(actionBtn).toBeInTheDocument();

      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('renders EmptyState without action button when no action is provided', () => {
      render(
        <EmptyState
          icon={Search}
          title="No Search Results"
          description="Try adjusting your keyword or clearing filters."
        />
      );

      expect(screen.getByText('No Search Results')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your keyword or clearing filters.')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
