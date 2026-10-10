import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

    it('SALES_REP cannot see Inventory, Enterprise Reports, or Administration categories', () => {
      setupSidebarForRole('SALES_REP');

      // Accessible categories
      expect(screen.getByTitle('Dashboard & Quick Links')).toBeInTheDocument();
      expect(screen.getByTitle('Sales & Orders')).toBeInTheDocument();
      expect(screen.getByTitle('Customers & CRM')).toBeInTheDocument();
      expect(screen.getByTitle('Approvals & Warranty')).toBeInTheDocument(); // Has Warranty Hub
      expect(screen.getByTitle('Finance & Payments')).toBeInTheDocument(); // Has Payments & Commissions

      // Unauthorized categories hidden
      expect(screen.queryByTitle('Inventory & Products')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Enterprise Reports')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Administration')).not.toBeInTheDocument();
    });

    it('CASHIER cannot see Approvals & Warranty, Enterprise Reports, or Administration categories', () => {
      setupSidebarForRole('CASHIER');

      expect(screen.getByTitle('Dashboard & Quick Links')).toBeInTheDocument();
      expect(screen.getByTitle('Sales & Orders')).toBeInTheDocument(); // POS & Invoices
      expect(screen.getByTitle('Customers & CRM')).toBeInTheDocument();

      // Unauthorized categories hidden
      expect(screen.queryByTitle('Approvals & Warranty')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Enterprise Reports')).not.toBeInTheDocument();
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

      expect(screen.getByTitle('Dashboard & Quick Links')).toBeInTheDocument();
      expect(screen.getByTitle('Sales & Orders')).toBeInTheDocument();
      expect(screen.getByTitle('Customers & CRM')).toBeInTheDocument();
      expect(screen.getByTitle('Inventory & Products')).toBeInTheDocument();
      expect(screen.getByTitle('Finance & Payments')).toBeInTheDocument();
      expect(screen.getByTitle('Approvals & Warranty')).toBeInTheDocument();
      expect(screen.getByTitle('Enterprise Reports')).toBeInTheDocument();
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
  });
});
