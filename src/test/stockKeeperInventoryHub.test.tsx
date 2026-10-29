import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { GRNListPage } from '../features/inventory/GRNListPage';
import { GRNCreateEditPage } from '../features/inventory/GRNCreateEditPage';
import { UnitBarcodeModal } from '../components/inventory/UnitBarcodeModal';
import { unitBarcodeService } from '../services/UnitBarcodeService';
import { serialNumberService } from '../services/SerialNumberService';
import { GRNItem } from '../types/inventory';
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
    it('displays Inventory Hub and GRN, and confirms Serial Numbers and Bar Codes are removed', async () => {
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
        expect(screen.queryByRole('link', { name: /serial numbers/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /bar codes/i })).not.toBeInTheDocument();
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

  describe('5. GRN Create Page (Mandatory PO Intake Enforcement — BR-01)', () => {
    it('renders GRN creation with mandatory PO intake requirement', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <GRNCreateEditPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /create goods receipt note/i })).toBeInTheDocument();
      expect(screen.getByText(/Purchase Order Receiving \(Mandatory Linkage\)/i)).toBeInTheDocument();
      expect(screen.getByText(/BR-01 Enforced/i)).toBeInTheDocument();
      expect(screen.getByText(/Warehouse Isolation Mode Active/i)).toBeInTheDocument();
    });

    it('loads purchase order items and barcodes upon selecting an approved PO', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <GRNCreateEditPage />
        </MemoryRouter>
      );

      // Select approved PO from selector or quick pills
      const poPill = screen.getByRole('button', { name: 'PO-2026-0891' });
      fireEvent.click(poPill);

      // Verify PO items populated
      await waitFor(() => {
        expect(screen.getByText(/Purchase Order items and unit barcodes populated into the line items list/i)).toBeInTheDocument();
      });

      // Financial columns must remain hidden for Stock Keeper in physical warehouse mode
      expect(screen.queryByText(/Unit Cost \(LKR\)/i)).toBeNull();
      expect(screen.queryByText(/Line Value/i)).toBeNull();
    });
  });

  describe('6. Unit-Wise Barcode Generation, Sticker Studio & Approval Gating Workflow', () => {
    it('UnitBarcodeService: generates unit-wise barcodes for received units (5 units -> 5 barcodes)', () => {
      const mockItem: GRNItem = {
        productId: 'prod-001',
        productNameSnapshot: 'Schneider Acti9 32A MCB',
        skuSnapshot: 'DNS-MCB-32A-2P',
        expectedQuantity: 5,
        receivedQuantity: 5,
        damagedQuantity: 0,
        unitCostSnapshot: 1500,
        lineValue: 7500,
      };

      const records = unitBarcodeService.generateUnitBarcodesForLine(mockItem, 'GRN-2026-0891');
      expect(records).toHaveLength(5);
      expect(records[0].unitBarcode).toBe('DNS-DNSMCB32A2-0891-001');
      expect(records[0].unitIndex).toBe(1);
      expect(records[0].status).toBe('PENDING_LABEL');
      expect(records[4].unitBarcode).toBe('DNS-DNSMCB32A2-0891-005');
      expect(records[4].unitIndex).toBe(5);

      // Links serial numbers when serialized
      const serializedItem: GRNItem = {
        ...mockItem,
        receivedQuantity: 2,
        serialNumbers: ['SN-SCH-001', 'SN-SCH-002'],
      };
      const serializedRecords = unitBarcodeService.generateUnitBarcodesForLine(serializedItem, 'GRN-0891');
      expect(serializedRecords).toHaveLength(2);
      expect(serializedRecords[0].serialNumber).toBe('SN-SCH-001');
      expect(serializedRecords[1].serialNumber).toBe('SN-SCH-002');
    });

    it('UnitBarcodeService: handles sticker affixing confirmation and labeling checks', () => {
      const mockItem: GRNItem = {
        productId: 'prod-001',
        productNameSnapshot: 'Schneider Acti9 32A MCB',
        skuSnapshot: 'DNS-MCB-32A',
        expectedQuantity: 3,
        receivedQuantity: 3,
        damagedQuantity: 0,
        unitCostSnapshot: 1500,
        lineValue: 4500,
      };

      const withRecords = unitBarcodeService.generateAllForGRN([mockItem], 'GRN-0100');
      expect(withRecords[0].unitRecords).toHaveLength(3);
      expect(unitBarcodeService.isGRNFullyLabeled(withRecords)).toBe(false);

      const summaryBefore = unitBarcodeService.getSummary(withRecords);
      expect(summaryBefore.totalUnits).toBe(3);
      expect(summaryBefore.confirmedUnits).toBe(0);
      expect(summaryBefore.pendingUnits).toBe(3);
      expect(summaryBefore.isFullyConfirmed).toBe(false);

      // Confirm affixing
      const confirmed = unitBarcodeService.confirmAllAffixed(withRecords);
      expect(unitBarcodeService.isGRNFullyLabeled(confirmed)).toBe(true);

      const summaryAfter = unitBarcodeService.getSummary(confirmed);
      expect(summaryAfter.confirmedUnits).toBe(3);
      expect(summaryAfter.pendingUnits).toBe(0);
      expect(summaryAfter.isFullyConfirmed).toBe(true);
    });

    it('UnitBarcodeModal: displays unit barcode stickers with SVG Code-128 and confirms warehouse affixing', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      const testItems: GRNItem[] = [
        {
          productId: 'prod-001',
          productNameSnapshot: 'Schneider Acti9 32A MCB',
          skuSnapshot: 'DNS-MCB-32A',
          expectedQuantity: 2,
          receivedQuantity: 2,
          damagedQuantity: 0,
          unitCostSnapshot: 1500,
          lineValue: 3000,
          unitRecords: [
            {
              unitIndex: 1,
              unitBarcode: 'DNS-MCB32A-001',
              status: 'PENDING_LABEL',
            },
            {
              unitIndex: 2,
              unitBarcode: 'DNS-MCB32A-002',
              status: 'PENDING_LABEL',
            },
          ],
        },
      ];

      render(
        <UnitBarcodeModal
          isOpen={true}
          onClose={onClose}
          items={testItems}
          grnNumber="GRN-2026-001"
          supplierName="Schneider Electric"
          warehouseId="WH-MAIN"
          onConfirmLabeled={onConfirm}
        />
      );

      // Modal titles and instructions
      expect(screen.getByText('Unit Barcode Stickers Studio')).toBeInTheDocument();
      expect(screen.getByText(/System-generated unit barcodes/i)).toBeInTheDocument();

      // Unit stickers preview
      expect(screen.getByText('Unit 1/2')).toBeInTheDocument();
      expect(screen.getByText('Unit 2/2')).toBeInTheDocument();
      expect(screen.getByText('DNS-MCB32A-001')).toBeInTheDocument();
      expect(screen.getByText('DNS-MCB32A-002')).toBeInTheDocument();

      // Test affixing confirmation button
      const confirmAffixedBtn = screen.getByRole('button', {
        name: /Confirm: All 2 Barcode Stickers Affixed in Receiving Bay/i,
      });
      expect(confirmAffixedBtn).toBeInTheDocument();
      fireEvent.click(confirmAffixedBtn);

      expect(onConfirm).toHaveBeenCalledTimes(1);
      const confirmedArg = onConfirm.mock.calls[0][0];
      expect(confirmedArg[0].barcodesConfirmed).toBe(true);
      expect(confirmedArg[0].unitRecords[0].status).toBe('LABELED');
    });

    it('GRN Intake: generates unit barcodes on PO selection, gates manager submission if pending stickers', async () => {
      setupStockKeeper();

      render(
        <MemoryRouter>
          <GRNCreateEditPage />
        </MemoryRouter>
      );

      // Select approved PO from selector or quick pills
      const poPill = screen.getByRole('button', { name: 'PO-2026-0891' });
      fireEvent.click(poPill);

      await waitFor(() => {
        expect(screen.getByText(/Purchase Order items and unit barcodes populated into the line items list/i)).toBeInTheDocument();
      });

      // Attempt to submit for manager approval without confirming physical affixing
      const submitBtn = screen.getByRole('button', { name: /Submit for Manager Approval/i });
      fireEvent.click(submitBtn);

      // Gating modal prompt must appear
      await waitFor(() => {
        expect(screen.getByText(/Unit Barcode Stickers Not Confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/Stock Keeper procedure requires all received units to have physical barcode stickers affixed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Confirm Affixed & Submit/i })).toBeInTheDocument();
      });

      // Confirm physical affixing from prompt
      const confirmAndSubmitBtn = screen.getByRole('button', { name: /Confirm Affixed & Submit/i });
      fireEvent.click(confirmAndSubmitBtn);

      // Verify prompt closes
      await waitFor(() => {
        expect(screen.queryByText(/Unit Barcode Stickers Not Confirmed/i)).toBeNull();
      });
    });
  });
});