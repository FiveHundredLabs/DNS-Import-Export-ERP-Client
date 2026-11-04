import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { supplierReturnService } from '../services/SupplierReturnService';
import { apService } from '../features/finance/services/apService';
import { SupplierReturnsPage } from '../features/purchasing/SupplierReturnsPage';
import { User } from '../types/auth';

const mockOfficerUser: User = {
  id: 'usr-officer-01',
  name: 'Kasun Bandara',
  email: 'kasun@dnserp.lk',
  role: 'PURCHASING_OFFICER',
  assignedTerritories: [],
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockManagerUser: User = {
  id: 'usr-mgr-01',
  name: 'Anura Perera',
  email: 'anura@dnserp.lk',
  role: 'MANAGER',
  assignedTerritories: [],
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

let currentUserState: User = mockManagerUser;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentUserState,
    role: currentUserState.role,
    isAuthenticated: true,
  }),
}));

describe('Batch 6: Supplier Returns & AP Debit Notes (BR-08, PM-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserState = mockManagerUser;
  });

  it('allows a Purchasing Officer to create a return in PENDING_APPROVAL state', async () => {
    const newReturn = await supplierReturnService.createReturn(
      {
        supplierId: 'sup-001',
        supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
        supplierCode: 'SUP-SCH-001',
        originalPoNumber: 'PO-2026-101',
        grnNumber: 'GRN-2026-001',
        reasonCategory: 'DEFECTIVE_DAMAGED',
        reasonDescription: 'Coil resistance defect detected during QA testing',
        warehouseId: 'WH-MAIN',
        items: [
          {
            productId: 'prod-001',
            productCode: 'DNS-MCB-32A-2P',
            productName: 'Schneider Acti9 32A Double Pole MCB',
            returnedQuantity: 10,
            unitCost: 2800,
          },
        ],
      },
      mockOfficerUser
    );

    expect(newReturn).toBeDefined();
    expect(newReturn.status).toBe('PENDING_APPROVAL');
    expect(newReturn.totalAmount).toBe(28000);
    expect(newReturn.createdBy).toBe('usr-officer-01');
    expect(newReturn.linkedDebitNoteNumber).toBeUndefined();
  });

  it('rejects approval attempts by unauthorized roles (PM-02 boundary)', async () => {
    const unapproved = await supplierReturnService.createReturn(
      {
        supplierId: 'sup-001',
        supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
        supplierCode: 'SUP-SCH-001',
        reasonCategory: 'NOT_AS_ORDERED',
        reasonDescription: 'Incorrect voltage rating supplied',
        items: [
          {
            productId: 'prod-002',
            productCode: 'DNS-MCB-63A-3P',
            productName: 'Schneider Acti9 63A Triple Pole MCB',
            returnedQuantity: 2,
            unitCost: 7500,
          },
        ],
      },
      mockOfficerUser
    );

    await expect(
      supplierReturnService.approveReturn(unapproved.id, mockOfficerUser)
    ).rejects.toThrow(/Only Purchasing Manager or Executive Management can approve supplier returns/i);
  });

  it('creates and links an Accounts Payable Debit Note upon Manager approval (BR-08)', async () => {
    const postDebitNoteSpy = vi.spyOn(apService, 'postSupplierDebitNote');

    const created = await supplierReturnService.createReturn(
      {
        supplierId: 'sup-001',
        supplierName: 'Schneider Electric Lanka (Pvt) Ltd',
        supplierCode: 'SUP-SCH-001',
        reasonCategory: 'DEFECTIVE_DAMAGED',
        reasonDescription: 'Burn marks on terminals upon unboxing',
        items: [
          {
            productId: 'prod-001',
            productCode: 'DNS-MCB-32A-2P',
            productName: 'Schneider Acti9 32A Double Pole MCB',
            returnedQuantity: 4,
            unitCost: 2800,
          },
        ],
      },
      mockOfficerUser
    );

    const approved = await supplierReturnService.approveReturn(created.id, mockManagerUser);

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedBy).toBe('usr-mgr-01');
    expect(approved.linkedDebitNoteNumber).toBeDefined();
    expect(postDebitNoteSpy).toHaveBeenCalledTimes(1);
    expect(postDebitNoteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: 'sup-001',
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            damagedQuantity: 4,
            unitCost: 2800,
          }),
        ]),
      })
    );
  });

  it('renders Supplier Returns page with metrics, canonical PageHeader and action to create return', async () => {
    render(
      <BrowserRouter>
        <SupplierReturnsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Supplier Returns & Vendor RMA/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new supplier return/i })).toBeInTheDocument();
    expect(screen.getByText(/Automated AP Debit Note & GL Ledger Linkage/i)).toBeInTheDocument();
  });

  it('navigates to create view on New Supplier Return, auto-links PO from GRN, lists products/barcodes, and navigates back to list', async () => {
    render(
      <BrowserRouter>
        <SupplierReturnsPage />
      </BrowserRouter>
    );

    // Initial state: only "New Supplier Return" button in actions
    const newReturnBtn = screen.getByRole('button', { name: /new supplier return/i });
    fireEvent.click(newReturnBtn);

    // Now in CREATE view
    expect(screen.getByText(/New Supplier Return/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /back to returns/i })[0]).toBeInTheDocument();

    // Verify GRN and auto-linked PO
    expect(screen.getByText(/Inward GRN Manifest & Automatic PO Linkage/i)).toBeInTheDocument();
    expect(screen.getByText(/Purchase Order #/i)).toBeInTheDocument();

    // Verify products and barcodes are listed
    expect(screen.getByText(/Select Products & Unit Barcodes to Return/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Unit Barcodes/i)[0]).toBeInTheDocument();

    // Click "Back to Returns" button
    const backBtn = screen.getAllByRole('button', { name: /back to returns/i })[0];
    fireEvent.click(backBtn);

    // Returns back to registry list view
    expect(screen.getByText(/Supplier Returns & Vendor RMA/i)).toBeInTheDocument();
  });

  it('allows selecting between multiple GRNs from the same supplier and searching products by barcode', async () => {
    render(
      <BrowserRouter>
        <SupplierReturnsPage />
      </BrowserRouter>
    );

    const newReturnBtn = screen.getByRole('button', { name: /new supplier return/i });
    fireEvent.click(newReturnBtn);

    // Schneider Electric Lanka has multiple GRNs (GRN-2025-001, GRN-2025-005, GRN-2025-050)
    expect(screen.getByText(/Schneider Electric Lanka \(Pvt\) Ltd has/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GRN-2025-005/i })).toBeInTheDocument();

    // Click GRN-2025-005 to switch to it
    fireEvent.click(screen.getByRole('button', { name: /GRN-2025-005/i }));
    expect(screen.getAllByText('GRN-2025-005').length).toBeGreaterThan(0);

    // Test searching product by barcode
    const barcodeInput = screen.getByPlaceholderText(/search product by unit barcode/i);
    expect(barcodeInput).toBeInTheDocument();

    // Type a specific barcode from GRN-2025-005 (e.g., DNS-DNSMCB32A2)
    fireEvent.change(barcodeInput, { target: { value: 'DNS-DNSMCB32A2' } });

    // Verify search indicator and filtered product
    expect(screen.getByText(/Showing products matching barcode/i)).toBeInTheDocument();
    expect(screen.getByText(/Schneider Acti9 32A Double Pole MCB/i)).toBeInTheDocument();
  });
});
