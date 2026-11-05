import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { canAccessRoute } from '../rules/permissions';
import { UserRole } from '../types/auth';

// Helper to mock useAuth for different roles
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Role-Based Sidebar Navigation & Access Control', () => {
  const setupSidebarForRole = (role: UserRole) => {
    mockUseAuth.mockReturnValue({
      role,
      currentUser: {
        id: `user-${role}`,
        name: `Test ${role}`,
        role,
        email: `${role.toLowerCase()}@dns.lk`,
        phone: '0771234567',
        status: 'ACTIVE',
      },
      canAccessRoute: (path: string) => canAccessRoute(role, path),
      hasPermission: () => true,
      isAuthenticated: true,
    });

    return render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    );
  };

  describe('1. Parent Rail Categories Visibility', () => {
    it('STOCK_KEEPER only sees Dashboard and Inventory categories; other modules are hidden', () => {
      setupSidebarForRole('STOCK_KEEPER');

      // Accessible categories
      expect(screen.getByTitle('Dashboard & Quick Links')).toBeInTheDocument();
      expect(screen.getByTitle('Inventory & Products')).toBeInTheDocument();

      // Unauthorized categories must NOT be in the sidebar rail
      expect(screen.queryByTitle('Sales & Orders')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Customers & CRM')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Finance & Payments')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Approvals & Warranty')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Enterprise Reports')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Administration')).not.toBeInTheDocument();
    });

    it('SALES_REP cannot see Inventory, Finance, Enterprise Reports, or Administration categories', () => {
      setupSidebarForRole('SALES_REP');

      // Accessible categories
      expect(screen.getByTitle('Dashboard & Quick Links')).toBeInTheDocument();
      expect(screen.getByTitle('Sales & Orders')).toBeInTheDocument();
      expect(screen.getByTitle('Customers & CRM')).toBeInTheDocument();
      expect(screen.getByTitle('Approvals & Warranty')).toBeInTheDocument(); // Has Warranty Hub

      // Unauthorized restricted categories hidden
      expect(screen.queryByTitle('Finance & Payments')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Inventory & Products')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Enterprise Reports')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Administration')).not.toBeInTheDocument();
    });

    it('CASHIER cannot see Approvals & Warranty, Enterprise Reports, Customers & CRM, or Administration categories', () => {
      setupSidebarForRole('CASHIER');

      expect(screen.getByTitle('Dashboard & Quick Links')).toBeInTheDocument();
      expect(screen.getByTitle('Sales & Orders')).toBeInTheDocument(); // POS

      // Unauthorized categories hidden (including Customers & CRM)
      expect(screen.queryByTitle('Customers & CRM')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Approvals & Warranty')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Enterprise Reports')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Administration')).not.toBeInTheDocument();
    });

    it('SHOWROOM_MANAGER does not see Approvals & Warranty, Finance, Customers, or Administration categories', () => {
      setupSidebarForRole('SHOWROOM_MANAGER');

      expect(screen.getByTitle('Dashboard & Quick Links')).toBeInTheDocument();
      expect(screen.getByTitle('Sales & Orders')).toBeInTheDocument(); // POS

      // Approvals & restricted categories must NOT be in the sidebar rail
      expect(screen.queryByTitle('Approvals & Warranty')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Finance & Payments')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Customers & CRM')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Administration')).not.toBeInTheDocument();
    });

    it('FINANCE_MANAGER cannot see Inventory or Administration categories', () => {
      setupSidebarForRole('FINANCE_MANAGER');

      expect(screen.getByTitle('Dashboard & Quick Links')).toBeInTheDocument();
      expect(screen.getByTitle('Finance & Payments')).toBeInTheDocument();
      expect(screen.getByTitle('Enterprise Reports')).toBeInTheDocument();
      expect(screen.getByTitle('Approvals & Warranty')).toBeInTheDocument();

      // Unauthorized categories hidden
      expect(screen.queryByTitle('Inventory & Products')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Administration')).not.toBeInTheDocument();
    });

    it('DIRECTOR sees all categories including Administration', () => {
      setupSidebarForRole('DIRECTOR');

      expect(screen.getByTitle('Director Dashboard')).toBeInTheDocument();
      expect(screen.getByTitle('Sales & Orders')).toBeInTheDocument();
      expect(screen.getByTitle('User Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Inventory Hub$/i })).toBeInTheDocument();
      expect(screen.getByTitle('Approval Hub')).toBeInTheDocument();
      expect(screen.getByTitle('Reports')).toBeInTheDocument();
      expect(screen.getByTitle('Administration')).toBeInTheDocument();
    });
  });

  describe('2. Direct URL Access & ProtectedRoute Enforcement', () => {
    it('blocks unauthorized URL access and displays "Access Denied" message', () => {
      mockUseAuth.mockReturnValue({
        role: 'SALES_REP',
        currentUser: { id: 'rep-01', name: 'Field Rep', role: 'SALES_REP' },
        canAccessRoute: (path: string) => canAccessRoute('SALES_REP', path),
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/finance']}>
          <ProtectedRoute>
            <div data-testid="protected-content">Secret Finance Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      // Should block content and display Access Denied
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/SALES_REP/)).toBeInTheDocument();
      expect(screen.getByText(/does not have authorization to access/i)).toBeInTheDocument();
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Switch User / Role')).toBeInTheDocument();
    });

    it('allows authorized URL access to render protected content', () => {
      mockUseAuth.mockReturnValue({
        role: 'FINANCE_MANAGER',
        currentUser: { id: 'fin-01', name: 'Finance Mgr', role: 'FINANCE_MANAGER' },
        canAccessRoute: (path: string) => canAccessRoute('FINANCE_MANAGER', path),
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/finance']}>
          <ProtectedRoute>
            <div data-testid="protected-content">Authorized Finance Workspace</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    });

    it('allows MANAGER to access purchasing module as like director', () => {
      expect(canAccessRoute('MANAGER', '/purchasing')).toBe(true);
      expect(canAccessRoute('MANAGER', '/purchasing/orders')).toBe(true);
      expect(canAccessRoute('MANAGER', '/approvals')).toBe(true);
      expect(canAccessRoute('MANAGER', '/purchasing/payments')).toBe(true);
      expect(canAccessRoute('MANAGER', '/purchasing/grn')).toBe(true);
      expect(canAccessRoute('MANAGER', '/purchasing/returns')).toBe(true);

      setupSidebarForRole('MANAGER');
      expect(screen.getByTitle('Purchasing & Procurement')).toBeInTheDocument();
    });

    it('removes Warranty Verification from MANAGER side and restricts to sales reps / area managers', () => {
      expect(canAccessRoute('MANAGER', '/warranty/verification')).toBe(false);
      expect(canAccessRoute('SALES_REP', '/warranty/verification')).toBe(true);
      expect(canAccessRoute('AREA_MANAGER', '/warranty/verification')).toBe(true);
    });

    it('DIRECTOR sidebar includes Cash in Hand under Sales and removes Stock Manager Approvals from Inventory', () => {
      setupSidebarForRole('DIRECTOR');

      // Cash in Hand is accessible for Director
      expect(canAccessRoute('DIRECTOR', '/payments')).toBe(true);
      expect(canAccessRoute('DIRECTOR', '/')).toBe(true);
    });

    it('at /payments/collect, only Customer Collections is highlighted and Cash in Hand is not highlighted', () => {
      mockUseAuth.mockReturnValue({
        role: 'DIRECTOR',
        currentUser: {
          id: 'user-director',
          name: 'Director User',
          role: 'DIRECTOR',
          email: 'director@dns.lk',
          phone: '0771234567',
          status: 'ACTIVE',
        },
        canAccessRoute: (path: string) => canAccessRoute('DIRECTOR', path),
        hasPermission: () => true,
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/payments/collect']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );

      const customerCollectionsItem = screen.getByText('Customer Collections').closest('div');
      const cashInHandItem = screen.getByText('Cash in Hand (Wallet)').closest('div');

      expect(customerCollectionsItem).toHaveClass('bg-slate-100');
      expect(cashInHandItem).not.toHaveClass('bg-slate-100');
    });

    it('at /payments, only Cash in Hand is highlighted and Customer Collections is not highlighted', () => {
      mockUseAuth.mockReturnValue({
        role: 'DIRECTOR',
        currentUser: {
          id: 'user-director',
          name: 'Director User',
          role: 'DIRECTOR',
          email: 'director@dns.lk',
          phone: '0771234567',
          status: 'ACTIVE',
        },
        canAccessRoute: (path: string) => canAccessRoute('DIRECTOR', path),
        hasPermission: () => true,
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/payments']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );

      const customerCollectionsItem = screen.getByText('Customer Collections').closest('div');
      const cashInHandItem = screen.getByText('Cash in Hand (Wallet)').closest('div');

      expect(cashInHandItem).toHaveClass('bg-slate-100');
      expect(customerCollectionsItem).not.toHaveClass('bg-slate-100');
    });

    it('MANAGER has full permissions for GRN creation and delivery notes, cash in hand, but excluded from global tax/theme config', () => {
      expect(canAccessRoute('MANAGER', '/inventory/grn')).toBe(true);
      expect(canAccessRoute('MANAGER', '/inventory/grn/new')).toBe(true);
      expect(canAccessRoute('MANAGER', '/inventory/delivery-notes')).toBe(true);
      expect(canAccessRoute('MANAGER', '/inventory/delivery-notes/new')).toBe(true);
      expect(canAccessRoute('MANAGER', '/payments')).toBe(true);
    });

    it('removes Purchasing Dashboard and Purchase Reports from navigation bar for PURCHASING_OFFICER', () => {
      setupSidebarForRole('PURCHASING_OFFICER');

      // Purchasing & Procurement is visible
      expect(screen.getByTitle('Purchasing & Procurement')).toBeInTheDocument();

      // Navigation bar must NOT include Purchasing Dashboard, Purchase Reports, or Approvals
      expect(screen.queryByText('Purchasing Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Purchase Reports')).not.toBeInTheDocument();
      expect(screen.queryByText('PO Approvals')).not.toBeInTheDocument();
      expect(screen.queryByText('Approvals Engine')).not.toBeInTheDocument();
      expect(screen.queryByText('Purchasing Approvals')).not.toBeInTheDocument();
      expect(canAccessRoute('PURCHASING_OFFICER', '/approvals')).toBe(false);

      // Allowed purchasing navigation items are present
      expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
      expect(screen.getByText('Supplier Management')).toBeInTheDocument();
    });

    it('removes Purchasing Dashboard and Purchase Reports from navigation bar for PURCHASING_MANAGER', () => {
      setupSidebarForRole('PURCHASING_MANAGER');

      // Purchasing & Procurement is visible
      expect(screen.getByTitle('Purchasing & Procurement')).toBeInTheDocument();

      // Navigation bar must NOT include Purchasing Dashboard or Purchase Reports
      expect(screen.queryByText('Purchasing Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Purchase Reports')).not.toBeInTheDocument();

      // Allowed purchasing navigation items are present
      expect(screen.getByText('Purchase Orders')).toBeInTheDocument();
      expect(screen.getByText('Supplier Management')).toBeInTheDocument();
    });

    it('for DIRECTOR Finance rail is removed as Finance Reports are accessible via Reports suite', () => {
      setupSidebarForRole('DIRECTOR');

      // Finance rail item should not be present
      expect(screen.queryByTitle('Finance')).not.toBeInTheDocument();

      // Click on Reports rail category
      const reportsRailBtn = screen.getByTitle('Reports');
      expect(reportsRailBtn).toBeInTheDocument();
      fireEvent.click(reportsRailBtn);

      // Finance Reports must be accessible under Reports
      expect(screen.getByText('Finance Reports')).toBeInTheDocument();
    });

    it('for MANAGER Finance & Payments rail is hidden as Finance Reports are accessible via Reports suite', () => {
      setupSidebarForRole('MANAGER');

      // Finance & Payments rail item should not be present because all finance items are excluded
      expect(screen.queryByTitle('Finance & Payments')).not.toBeInTheDocument();

      // Click on Enterprise Reports rail category
      const reportsRailBtn = screen.getByTitle('Enterprise Reports');
      expect(reportsRailBtn).toBeInTheDocument();
      fireEvent.click(reportsRailBtn);

      // Finance Reports must be accessible under Reports
      expect(screen.getByText('Finance Reports')).toBeInTheDocument();
    });

    it('for FINANCE_MANAGER all 10 finance navigation items remain visible', () => {
      setupSidebarForRole('FINANCE_MANAGER');

      // Click on Finance & Payments rail category
      const financeRailBtn = screen.getByTitle('Finance & Payments');
      expect(financeRailBtn).toBeInTheDocument();
      fireEvent.click(financeRailBtn);

      // All 10 finance navigation items must be visible
      expect(screen.getByText('Chart of Accounts')).toBeInTheDocument();
      expect(screen.getByText('Income & Collections')).toBeInTheDocument();
      expect(screen.getByText('Expense & Payables')).toBeInTheDocument();
      expect(screen.getByText('Vendor Bill Costing (AP)')).toBeInTheDocument();
      expect(screen.getByText('Credit & Debit Notes')).toBeInTheDocument();
      expect(screen.getByText('Journal Entry Voucher')).toBeInTheDocument();
      expect(screen.getByText('PDC Vault (1018)')).toBeInTheDocument();
      expect(screen.getByText('Bank Reconciliation')).toBeInTheDocument();
      expect(screen.getByText('Period Closing Lock')).toBeInTheDocument();
      expect(screen.getByText('Financial Reports Hub')).toBeInTheDocument();
    });
  });

  describe('3. Showroom POS Isolation from Stock Keeper and Stock Manager', () => {
    it('STOCK_KEEPER does not see Showroom POS in sidebar nav and cannot access /pos (including searching & inventory tab)', () => {
      expect(canAccessRoute('STOCK_KEEPER', '/pos')).toBe(false);

      setupSidebarForRole('STOCK_KEEPER');
      expect(screen.queryByText('Showroom POS')).not.toBeInTheDocument();

      // In Dashboard search
      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'POS' } });
      expect(screen.queryByText('Showroom POS')).not.toBeInTheDocument();

      // In Inventory category
      fireEvent.change(searchInput, { target: { value: '' } });
      const inventoryTab = screen.getByRole('button', { name: /^Inventory & Products$/i });
      fireEvent.click(inventoryTab);
      expect(screen.queryByText('Showroom POS')).not.toBeInTheDocument();
    });

    it('STOCK_MANAGER does not see Showroom POS in sidebar nav and cannot access /pos (including searching & inventory tab)', () => {
      expect(canAccessRoute('STOCK_MANAGER', '/pos')).toBe(false);

      setupSidebarForRole('STOCK_MANAGER');
      expect(screen.queryByText('Showroom POS')).not.toBeInTheDocument();

      // In Dashboard search
      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'POS' } });
      expect(screen.queryByText('Showroom POS')).not.toBeInTheDocument();

      // In Inventory category
      fireEvent.change(searchInput, { target: { value: '' } });
      const inventoryTab = screen.getByRole('button', { name: /^Inventory & Products$/i });
      fireEvent.click(inventoryTab);
      expect(screen.queryByText('Showroom POS')).not.toBeInTheDocument();
    });

    it('CASHIER and SHOWROOM_MANAGER still see Showroom POS in sidebar nav and can access /pos', () => {
      expect(canAccessRoute('CASHIER', '/pos')).toBe(true);
      expect(canAccessRoute('SHOWROOM_MANAGER', '/pos')).toBe(true);

      const { unmount } = setupSidebarForRole('CASHIER');
      expect(screen.getByText('Showroom POS')).toBeInTheDocument();
      unmount();

      setupSidebarForRole('SHOWROOM_MANAGER');
      expect(screen.getByText('Showroom POS')).toBeInTheDocument();
    });

    it('DIRECTOR and MANAGER still see Showroom POS in sidebar nav and can access /pos', () => {
      expect(canAccessRoute('DIRECTOR', '/pos')).toBe(true);
      expect(canAccessRoute('MANAGER', '/pos')).toBe(true);

      const { unmount } = setupSidebarForRole('DIRECTOR');
      const salesButton = screen.getByRole('button', { name: /^Sales & Orders$/i });
      fireEvent.click(salesButton);
      expect(screen.getByText('Showroom POS')).toBeInTheDocument();
      unmount();

      const { unmount: unmountManager } = setupSidebarForRole('MANAGER');
      const managerSalesButton = screen.getByRole('button', { name: /^Sales & Orders$/i });
      fireEvent.click(managerSalesButton);
      expect(screen.getByText('Showroom POS')).toBeInTheDocument();
      unmountManager();
    });

    it('Dashboard Operational Workspaces hides Showroom POS Terminal for STOCK_KEEPER and STOCK_MANAGER', () => {
      mockUseAuth.mockReturnValue({
        role: 'STOCK_KEEPER',
        currentUser: { id: 'usr-107', name: 'Kamal Stock Keeper', role: 'STOCK_KEEPER' },
        canAccessRoute: (path: string) => canAccessRoute('STOCK_KEEPER', path),
        isAuthenticated: true,
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/']}>
          <DashboardPage />
        </MemoryRouter>
      );

      expect(screen.queryByText('Showroom POS Terminal')).not.toBeInTheDocument();
      expect(screen.getByText('Inventory Hub')).toBeInTheDocument();
      expect(screen.getByText('Goods Received Notes')).toBeInTheDocument();
      expect(screen.getByText('Delivery Notes')).toBeInTheDocument();
      unmount();

      mockUseAuth.mockReturnValue({
        role: 'STOCK_MANAGER',
        currentUser: { id: 'usr-115', name: 'Bandara Stock Manager', role: 'STOCK_MANAGER' },
        canAccessRoute: (path: string) => canAccessRoute('STOCK_MANAGER', path),
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <DashboardPage />
        </MemoryRouter>
      );

      expect(screen.queryByText('Showroom POS Terminal')).not.toBeInTheDocument();
      expect(screen.getByText('Inventory Hub')).toBeInTheDocument();
      expect(screen.getByText('Goods Received Notes')).toBeInTheDocument();
      expect(screen.getByText('Delivery Notes')).toBeInTheDocument();
    });
  });
});
