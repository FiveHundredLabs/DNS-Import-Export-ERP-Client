import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { SerialNumbersPage } from '../features/inventory/SerialNumbersPage';
import { BarcodesPage } from '../features/inventory/BarcodesPage';
import { GRNListPage } from '../features/inventory/GRNListPage';
import { serialNumberService } from '../services/SerialNumberService';
import { canAccessRoute } from '../rules/permissions';
import { UserRole } from '../types/auth';

// Helper to mock useAuth for different roles
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Stock Keeper & Inventory Hub — GRN, Serial Numbers & Bar Codes', () => {
  beforeEach(() => {
    serialNumberService.resetToDefaults();
  });

  const setupStockKeeper = () => {
    mockUseAuth.mockReturnValue({
      role: 'STOCK_KEEPER' as UserRole,
      currentUser: {
        id: 'usr-stock-01',
        name: 'Amal Perera',
        role: 'STOCK_KEEPER' as UserRole,
        email: 'amal@dns.lk',
        phone: '0771234567',
        status: 'ACTIVE',
      },
      canAccessRoute: (path: string) => canAccessRoute('STOCK_KEEPER', path),
      hasPermission: () => true,
      isAuthenticated: true,
    });
  };

  describe('1. Sidebar Navigation in Inventory Hub for Stock Keeper', () => {
    it('displays GRN, Serial Numbers, and Bar Codes in Inventory Hub for Stock Keeper', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );

      // Verify the Inventory rail button is present
      const inventoryRail = screen.getByTitle('Inventory & Products');
      expect(inventoryRail).toBeInTheDocument();

      // Click to open Inventory Hub
      fireEvent.click(inventoryRail);

      // Wait for Inventory Hub flyout panel and child links to render
      await waitFor(() => {
        expect(screen.getAllByText('Inventory Hub').length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: /^grn$/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /serial numbers/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /bar codes/i })).toBeInTheDocument();
      });
    });

    it('ensures Sales Rep and Cashier cannot access or see Inventory Hub items', () => {
      mockUseAuth.mockReturnValue({
        role: 'SALES_REP' as UserRole,
        currentUser: { id: 'usr-rep-01', name: 'Kasun Rep', role: 'SALES_REP' as UserRole },
        canAccessRoute: (path: string) => canAccessRoute('SALES_REP', path),
        hasPermission: () => true,
        isAuthenticated: true,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={() => {}} />
        </MemoryRouter>
      );

      // Inventory & Products category is completely hidden from SALES_REP
      expect(screen.queryByTitle('Inventory & Products')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^grn$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /serial numbers/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /bar codes/i })).not.toBeInTheDocument();
    });
  });

  describe('2. Serial Numbers Page (Stock Keeper Serialization Workspace)', () => {
    it('renders Serial Numbers tracking page with Stock Keeper operations badge and KPI stats', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <SerialNumbersPage />
        </MemoryRouter>
      );

      // Header and badge
      expect(screen.getByRole('heading', { name: 'Serial Numbers' })).toBeInTheDocument();
      expect(screen.getByText(/Stock Keeper Operations/i)).toBeInTheDocument();
      expect(screen.getByText(/Physical Serialization Mode/i)).toBeInTheDocument();

      // KPI stat cards
      await waitFor(() => {
        expect(screen.getByText('Total Registered')).toBeInTheDocument();
        expect(screen.getByText('In Warehouse')).toBeInTheDocument();
        expect(screen.getByText('Allocated')).toBeInTheDocument();
        expect(screen.getByText('Dispatched')).toBeInTheDocument();
        expect(screen.getByText('Damaged')).toBeInTheDocument();
      });

      // Seeded serial numbers are rendered in the table
      await waitFor(() => {
        expect(screen.getByText('SN-RHD-2025-001')).toBeInTheDocument();
        expect(screen.getAllByText('Schneider Acti9 32A Double Pole MCB').length).toBeGreaterThan(0);
      });
    });

    it('filters serial numbers by search keyword', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <SerialNumbersPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('SN-RHD-2025-001')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search serial number, product, sku, grn/i);
      fireEvent.change(searchInput, { target: { value: 'SN-GW-5K' } });

      await waitFor(() => {
        expect(screen.getByText('SN-GW-5K-0881')).toBeInTheDocument();
        expect(screen.queryByText('SN-RHD-2025-001')).not.toBeInTheDocument();
      });
    });

    it('opens Serial Scanner & Verification modal and tests serial lookup', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <SerialNumbersPage />
        </MemoryRouter>
      );

      const scanBtn = screen.getByRole('button', { name: /scan \/ verify serial/i });
      fireEvent.click(scanBtn);

      await waitFor(() => {
        expect(screen.getByText('Serial Scanner & Verification')).toBeInTheDocument();
      });

      // Type serial into lookup input and click Verify
      const input = screen.getByPlaceholderText(/scan or enter serial/i);
      fireEvent.change(input, { target: { value: 'SN-RHD-2025-001' } });
      const verifyBtn = screen.getByRole('button', { name: /^verify$/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText(/Unit Verified in Warehouse/i)).toBeInTheDocument();
      });
    });

    it('opens Register Serial Numbers modal and submits new serials', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <SerialNumbersPage />
        </MemoryRouter>
      );

      const registerBtn = screen.getByRole('button', { name: /register serial numbers/i });
      fireEvent.click(registerBtn);

      await waitFor(() => {
        expect(screen.getByText('Register Unit Serial Numbers')).toBeInTheDocument();
      });

      // Enter bulk serials
      const textarea = screen.getByPlaceholderText(/enter serial numbers separated/i);
      fireEvent.change(textarea, { target: { value: 'SN-TEST-9901\nSN-TEST-9902' } });

      // Click submit
      const submitBtn = screen.getByRole('button', { name: /^register serials$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('SN-TEST-9901')).toBeInTheDocument();
        expect(screen.getByText('SN-TEST-9902')).toBeInTheDocument();
      });
    });
  });

  describe('3. Bar Codes Page (Stock Keeper Barcode & Labels Center)', () => {
    it('renders Bar Codes workspace with tabs for directory, scanner, and printable labels', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <BarcodesPage />
        </MemoryRouter>
      );

      // Header and badge
      expect(screen.getByText('Bar Codes')).toBeInTheDocument();
      expect(screen.getByText(/Stock Keeper Operations/i)).toBeInTheDocument();

      // Tabs
      expect(screen.getByRole('tab', { name: /barcode directory & print queue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /warehouse scanner station/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /printable label studio/i })).toBeInTheDocument();

      // Product barcode records
      expect(screen.getByText('8901020304011')).toBeInTheDocument();
      expect(screen.getByText('Schneider Acti9 32A Double Pole MCB')).toBeInTheDocument();
    });

    it('switches to Warehouse Scanner Station and processes barcode scan', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <BarcodesPage />
        </MemoryRouter>
      );

      const scannerTab = screen.getByRole('tab', { name: /warehouse scanner station/i });
      fireEvent.click(scannerTab);

      await waitFor(() => {
        expect(screen.getByText('Barcode Scanner Gun')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/ready to scan barcode/i)).toBeInTheDocument();
      });

      // Type barcode and process scan
      const input = screen.getByPlaceholderText(/ready to scan barcode/i);
      fireEvent.change(input, { target: { value: '8901020304011' } });
      const processBtn = screen.getByRole('button', { name: /process scan/i });
      fireEvent.click(processBtn);

      await waitFor(() => {
        expect(screen.getByText(/Valid Product Identified/i)).toBeInTheDocument();
        expect(screen.getByText(/Session Scan Log & Cycle Count/i)).toBeInTheDocument();
      });
    });

    it('adds labels to print queue and switches to Printable Label Studio', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <BarcodesPage />
        </MemoryRouter>
      );

      // Click "+ Label" button for first product
      const addLabelBtns = screen.getAllByRole('button', { name: /\+ label/i });
      fireEvent.click(addLabelBtns[0]);

      // Switch to Printable Label Studio tab
      const studioTab = screen.getByRole('tab', { name: /printable label studio/i });
      fireEvent.click(studioTab);

      await waitFor(() => {
        expect(screen.getByText(/Print Layout Preview/i)).toBeInTheDocument();
        expect(screen.getAllByText(/DNS ERP • WAREHOUSE/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('4. GRN List Page (Stock Keeper Warehouse Isolation)', () => {
    it('displays Warehouse Isolation banner and physical quantity units for Stock Keeper', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <GRNListPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/Goods Received Notes \(GRN\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Stock Keeper Intake/i)).toBeInTheDocument();
      expect(screen.getByText(/Warehouse Isolation Active/i)).toBeInTheDocument();

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByText(/Received Units \(Damaged\)/i)).toBeInTheDocument();
      });

      // Total value financial column must NOT be shown for Stock Keeper
      expect(screen.queryByText(/^Total Value$/i)).toBeNull();
    });

    it('displays Total Value financial column for Director/Finance without isolation banner', async () => {
      mockUseAuth.mockReturnValue({
        role: 'DIRECTOR' as UserRole,
        currentUser: { id: 'usr-dir-01', name: 'Devin Director', role: 'DIRECTOR' as UserRole },
        canAccessRoute: () => true,
        hasPermission: () => true,
        isAuthenticated: true,
      });

      render(
        <MemoryRouter>
          <GRNListPage />
        </MemoryRouter>
      );

      expect(screen.queryByText(/Warehouse Isolation Active/i)).toBeNull();

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByText('Total Value')).toBeInTheDocument();
      });
    });
  });
});
