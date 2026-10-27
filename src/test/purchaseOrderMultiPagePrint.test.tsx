import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PurchaseOrder, PurchaseOrderItem } from '../types/purchasing';
import { paginatePurchaseOrder } from '../features/purchasing/utils/purchaseOrderPaginator';
import { StandardPurchaseOrderTemplate } from '../features/purchasing/components/StandardPurchaseOrderTemplate';
import { A4PurchaseOrderViewer } from '../features/purchasing/components/A4PurchaseOrderViewer';
import { pdfService } from '../services/PdfService';

// Helper to generate mock PO with N items
function generateMockPO(
  itemCount: number,
  options?: {
    status?: PurchaseOrder['status'];
    approvedByName?: string;
    approvedAt?: string;
    longDescriptions?: boolean;
    longNotes?: boolean;
  }
): PurchaseOrder {
  const items: PurchaseOrderItem[] = [];
  let subtotal = 0;

  for (let i = 1; i <= itemCount; i++) {
    const qty = 10 + (i % 5);
    const unitPrice = 1000 + i * 50;
    const total = qty * unitPrice;
    subtotal += total;

    items.push({
      id: `item-${i}`,
      productId: `prod-${i}`,
      productCode: `EL-SKU-${String(i).padStart(4, '0')}`,
      productName: options?.longDescriptions
        ? `Schneider Electric Acti9 iC60N Miniature Circuit Breaker ${i}P 10kA C-Curve DIN-Rail Mount High Voltage Specification Unit #${i}`
        : `Product Model ${i} - High Performance Industrial Component`,
      quantity: qty,
      unitPrice,
      discountPercent: i % 4 === 0 ? 5 : 0,
      taxRate: 18,
      total,
      notes: options?.longDescriptions
        ? `Batch QA inspection certificate required. Serial batch #${202600 + i}. Ensure moisture barrier bag.`
        : undefined,
    });
  }

  const taxTotal = Math.round(subtotal * 0.18);
  const grandTotal = subtotal + taxTotal;

  return {
    id: `po-test-${itemCount}`,
    poNumber: `PO-2026-TEST-${itemCount}`,
    supplierId: 'sup-001',
    supplierName: 'Siemens Lanka Industrial Automation Ltd',
    supplierCode: 'SUP-SIE-001',
    supplierContactPerson: 'Dhammika Perera',
    supplierEmail: 'orders@siemens.lk',
    supplierPhone: '+94 11 267 8900',
    supplierAddress: '15 Foster Lane, Colombo 10, Sri Lanka',
    supplierVatNumber: '109847291-7000',
    status: options?.status || 'PENDING_APPROVAL',
    orderDate: '2026-10-25T10:00:00Z',
    expectedDeliveryDate: '2026-11-05T10:00:00Z',
    currency: 'LKR',
    paymentTerms: 'Net 30 Days',
    items,
    subtotal,
    totalDiscount: 0,
    taxTotal,
    shippingCharges: 5000,
    otherCharges: 0,
    grandTotal: grandTotal + 5000,
    notes: options?.longNotes
      ? 'Comprehensive procurement order for Western Province infrastructure deployment phase 2. Delivery must be cleared before 16:30 PM with original commercial invoice in triplicate.'
      : 'Standard procurement delivery.',
    deliveryInstructions: 'Deliver to Central Warehouse Loading Dock 3. Forklift assistance on site.',
    createdById: 'usr-110',
    createdByName: 'Ruwan Wickramasinghe',
    createdAt: '2026-10-25T10:00:00Z',
    updatedAt: '2026-10-25T10:00:00Z',
    approvedById: options?.approvedByName ? 'usr-102' : undefined,
    approvedByName: options?.approvedByName,
    approvedAt: options?.approvedAt,
  };
}

describe('Purchase Order Multi-Page A4 Printing & Document Architecture', () => {
  // 1. Requirement 1: PO Status absence from printable document
  describe('1. PO Status Display in Printable Document', () => {
    it('omits PO status badges such as PENDING APPROVAL or APPROVED from the printable document', () => {
      const pendingPO = generateMockPO(3, { status: 'PENDING_APPROVAL' });
      const { container } = render(
        <MemoryRouter>
          <StandardPurchaseOrderTemplate purchaseOrder={pendingPO} />
        </MemoryRouter>
      );

      // The status badge text "PENDING APPROVAL" must NOT be rendered in the document
      expect(screen.queryByText(/PENDING APPROVAL/i)).not.toBeInTheDocument();
      // Ensure PO number and vendor info are preserved
      expect(screen.getByText(pendingPO.poNumber)).toBeInTheDocument();
      expect(screen.getAllByText('Siemens Lanka Industrial Automation Ltd').length).toBeGreaterThan(0);
    });

    it('does not display DRAFT or REJECTED status badges in the printable output', () => {
      const draftPO = generateMockPO(3, { status: 'DRAFT' });
      render(
        <MemoryRouter>
          <StandardPurchaseOrderTemplate purchaseOrder={draftPO} />
        </MemoryRouter>
      );

      // Status badge is absent
      expect(screen.queryByText(/DRAFT/i)).not.toBeInTheDocument();
      expect(screen.getByText(draftPO.poNumber)).toBeInTheDocument();
    });
  });

  // 2. Requirement 2, 3, 4: Multi-page Pagination Engine
  describe('2. Multi-Page Pagination Engine (paginatePurchaseOrder)', () => {
    it('paginates a 3-item PO onto exactly 1 page with summary and signatures', () => {
      const po = generateMockPO(3);
      const pages = paginatePurchaseOrder(po);

      expect(pages.length).toBe(1);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].totalPages).toBe(1);
      expect(pages[0].isFirstPage).toBe(true);
      expect(pages[0].isLastPage).toBe(true);
      expect(pages[0].items.length).toBe(3);
      expect(pages[0].showVendorMeta).toBe(true);
      expect(pages[0].showSummaryAndTerms).toBe(true);
      expect(pages[0].showSignatures).toBe(true);
    });

    it('paginates a 20-item PO onto multiple pages with continuous item numbering', () => {
      const po = generateMockPO(20);
      const pages = paginatePurchaseOrder(po);

      expect(pages.length).toBeGreaterThanOrEqual(2);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].totalPages).toBe(pages.length);
      expect(pages[0].showVendorMeta).toBe(true);
      expect(pages[0].showSummaryAndTerms).toBe(false); // only on closing page

      // Check all 20 items are accounted for across all pages
      const allPaginatedItems = pages.flatMap((p) => p.items);
      expect(allPaginatedItems.length).toBe(20);

      // Verify item numbers flow 1 to 20 without resetting
      allPaginatedItems.forEach((pi, idx) => {
        expect(pi.itemNumber).toBe(idx + 1);
      });

      // Verify final page contains summary and signatures
      const lastPage = pages[pages.length - 1];
      expect(lastPage.showSummaryAndTerms).toBe(true);
      expect(lastPage.showSignatures).toBe(true);
    });

    it('paginates a 50-item PO ensuring no items are missing or duplicated', () => {
      const po = generateMockPO(50);
      const pages = paginatePurchaseOrder(po);

      expect(pages.length).toBeGreaterThanOrEqual(3);

      const allItems = pages.flatMap((p) => p.items);
      expect(allItems.length).toBe(50);

      // Verify consecutive 1 to 50 numbering
      for (let i = 0; i < 50; i++) {
        expect(allItems[i].itemNumber).toBe(i + 1);
        expect(allItems[i].item.id).toBe(`item-${i + 1}`);
      }

      // Check first page has vendor details, continuation pages do not repeat vendor panel
      expect(pages[0].showVendorMeta).toBe(true);
      for (let p = 1; p < pages.length; p++) {
        expect(pages[p].showVendorMeta).toBe(false);
      }
    });

    it('paginates a 100-item PO reliably without layout errors', () => {
      const po = generateMockPO(100);
      const pages = paginatePurchaseOrder(po);

      expect(pages.length).toBeGreaterThanOrEqual(5);

      const allItems = pages.flatMap((p) => p.items);
      expect(allItems.length).toBe(100);

      // Verify first and last item
      expect(allItems[0].itemNumber).toBe(1);
      expect(allItems[99].itemNumber).toBe(100);

      // Verify totalPages is consistent across all pages
      pages.forEach((p) => {
        expect(p.totalPages).toBe(pages.length);
      });
    });

    it('adapts row height when products have long descriptions and notes', () => {
      const po = generateMockPO(25, { longDescriptions: true });
      const pages = paginatePurchaseOrder(po);

      // Longer descriptions consume more height and naturally result in more pages
      expect(pages.length).toBeGreaterThanOrEqual(2);
      const allItems = pages.flatMap((p) => p.items);
      expect(allItems.length).toBe(25);
    });
  });

  // 3. Document Template Component Rendering
  describe('3. StandardPurchaseOrderTemplate Rendering', () => {
    it('renders column headers on every continuation page that has products', () => {
      const po = generateMockPO(25);
      render(
        <MemoryRouter>
          <StandardPurchaseOrderTemplate purchaseOrder={po} />
        </MemoryRouter>
      );

      // Table headers "Product / SKU & Description" should appear on every page with products
      const tableHeaders = screen.getAllByText('Product / SKU & Description');
      expect(tableHeaders.length).toBeGreaterThanOrEqual(2);

      // Check page badges
      expect(screen.getAllByText(/Page 1 of/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Page 2 of/i).length).toBeGreaterThanOrEqual(1);
    });

    it('displays the financial summary and grand total only once at the end', () => {
      const po = generateMockPO(30);
      render(
        <MemoryRouter>
          <StandardPurchaseOrderTemplate purchaseOrder={po} />
        </MemoryRouter>
      );

      // Grand total should only appear once
      const grandTotalLabels = screen.getAllByText(/Grand Total \(LKR\):/i);
      expect(grandTotalLabels.length).toBe(1);

      // Order Notes should only appear once
      const orderNotesLabels = screen.getAllByText(/Order Notes:/i);
      expect(orderNotesLabels.length).toBe(1);
    });

    it('renders signature blocks with proper authorization status without fabricating signatures', () => {
      // 1. Unapproved PO
      const unapprovedPO = generateMockPO(5, { status: 'PENDING_APPROVAL' });
      const { unmount } = render(
        <MemoryRouter>
          <StandardPurchaseOrderTemplate purchaseOrder={unapprovedPO} />
        </MemoryRouter>
      );

      expect(screen.getByText('Pending Authorization')).toBeInTheDocument();
      expect(screen.queryByText(/Digitally Signed & Approved/i)).not.toBeInTheDocument();
      unmount();

      // 2. Approved PO
      const approvedPO = generateMockPO(5, {
        status: 'APPROVED',
        approvedByName: 'Ruwan Wijesinghe (Operations Manager)',
        approvedAt: '2026-10-26T14:30:00Z',
      });
      render(
        <MemoryRouter>
          <StandardPurchaseOrderTemplate purchaseOrder={approvedPO} />
        </MemoryRouter>
      );

      expect(screen.getByText('Ruwan Wijesinghe (Operations Manager)')).toBeInTheDocument();
      expect(screen.getByText(/Digitally Signed & Approved/i)).toBeInTheDocument();
    });
  });

  // 4. A4 Purchase Order Viewer Controls & Responsiveness
  describe('4. A4PurchaseOrderViewer Toolbar and Multi-Page View', () => {
    it('displays the total page count badge in the viewer toolbar', () => {
      const po = generateMockPO(25);
      render(
        <MemoryRouter>
          <A4PurchaseOrderViewer purchaseOrder={po} />
        </MemoryRouter>
      );

      // Toolbar indicates multi-page A4
      expect(screen.getByText(/Pages \(A4\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Print A4/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export PDF/i })).toBeInTheDocument();
    });
  });

  // 5. Standalone PDF Service HTML Generation
  describe('5. PdfService HTML Generation', () => {
    it('generates clean standalone multi-page HTML matching A4 print requirements', () => {
      const po = generateMockPO(15);
      const html = pdfService.generatePurchaseOrderHtml(po);

      expect(html).toContain('DNS DISTRIBUTION (PVT) LTD');
      expect(html).toContain(po.poNumber);
      expect(html).toContain('PURCHASE ORDER');
      expect(html).toContain('@page {');
      expect(html).toContain('size: A4 portrait');
      // Status badge should NOT be in HTML
      expect(html).not.toContain('PENDING_APPROVAL');
      expect(html).toContain('Page 1 of');
    });
  });
});
