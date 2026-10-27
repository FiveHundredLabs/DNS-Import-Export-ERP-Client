import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PurchaseOrderService } from '../services/PurchaseOrderService';
import { MockPurchaseOrderRepository } from '../repositories/mock/MockPurchaseOrderRepository';
import { formatCurrency } from '../utils/formatters';
import { SUPPORTED_CURRENCIES } from '../types/purchasing';
import { PurchaseOrderCreateEditPage } from '../features/purchasing/PurchaseOrderCreateEditPage';
import { StandardPurchaseOrderTemplate } from '../features/purchasing/components/StandardPurchaseOrderTemplate';
import { paginatePurchaseOrder } from '../features/purchasing/utils/purchaseOrderPaginator';
import { User } from '../types';

const mockUser: User = {
  id: 'usr-po-officer',
  name: 'Amara Weerasinghe',
  email: 'amara.w@dns.lk',
  role: 'PURCHASING_OFFICER',
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('Purchase Order Multi-Currency Support', () => {
  let service: PurchaseOrderService;
  let repo: MockPurchaseOrderRepository;

  beforeEach(() => {
    repo = new MockPurchaseOrderRepository();
    service = new PurchaseOrderService(repo);
  });

  describe('formatCurrency utility', () => {
    it('formats LKR correctly as default and with explicit code', () => {
      const formattedDefault = formatCurrency(12500.5);
      expect(formattedDefault).toMatch(/(LKR|Rs\.?)\s*12,500\.50/);

      const formattedExplicit = formatCurrency(12500.5, 'LKR');
      expect(formattedExplicit).toMatch(/(LKR|Rs\.?)\s*12,500\.50/);
    });

    it('formats Chinese Yuan (CNY) with ¥ symbol', () => {
      const formatted = formatCurrency(8888.5, 'CNY');
      // zh-CN Intl.NumberFormat produces ¥ or CN¥
      expect(formatted).toMatch(/(¥|CN¥)\s*8,888\.50/);
    });

    it('formats US Dollar (USD) with $ symbol', () => {
      const formatted = formatCurrency(4500.75, 'USD');
      expect(formatted).toMatch(/\$\s*4,500\.75/);
    });

    it('formats Euro (EUR) with € symbol', () => {
      const formatted = formatCurrency(3200, 'EUR');
      expect(formatted).toMatch(/€|EUR/);
    });
  });

  describe('SUPPORTED_CURRENCIES configuration', () => {
    it('includes LKR, CNY, USD and other key international trade currencies', () => {
      const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
      expect(codes).toContain('LKR');
      expect(codes).toContain('CNY');
      expect(codes).toContain('USD');
      expect(codes).toContain('EUR');
      expect(codes).toContain('SGD');
    });
  });

  describe('PurchaseOrderService Currency Handling', () => {
    it('creates PO with Chinese Yuan (CNY)', async () => {
      const po = await service.createPurchaseOrder(
        {
          supplierId: 'sup-cny-1',
          supplierName: 'Shanghai Electric & Automation Co.',
          supplierCode: 'SUP-SHA-01',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-15',
          paymentTerms: 'Letter of Credit (LC)',
          currency: 'CNY',
          items: [
            {
              productId: 'prod-cny-1',
              productCode: 'CH-BRK-001',
              productName: 'Chint 3-Phase Contactor 32A',
              quantity: 50,
              unitPrice: 120, // 120 CNY
              taxRate: 0,
            },
          ],
        },
        mockUser
      );

      expect(po.currency).toBe('CNY');
      expect(po.subtotal).toBe(6000);
      expect(po.grandTotal).toBe(6000);
    });

    it('creates PO with US Dollar (USD)', async () => {
      const po = await service.createPurchaseOrder(
        {
          supplierId: 'sup-usd-1',
          supplierName: 'Eaton Global Power Distribution',
          supplierCode: 'SUP-EAT-01',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-20',
          paymentTerms: 'Net 45 TT',
          currency: 'USD',
          items: [
            {
              productId: 'prod-usd-1',
              productCode: 'EAT-MCCB-400',
              productName: 'Eaton 400A Molded Case Circuit Breaker',
              quantity: 10,
              unitPrice: 350.5, // 350.50 USD
              discountPercent: 10,
              taxRate: 0,
            },
          ],
        },
        mockUser
      );

      expect(po.currency).toBe('USD');
      expect(po.subtotal).toBe(3505);
      expect(po.totalDiscount).toBe(350.5);
      expect(po.grandTotal).toBe(3154.5);
    });

    it('defaults to LKR when currency is not specified', async () => {
      const po = await service.createPurchaseOrder(
        {
          supplierId: 'sup-lkr-1',
          supplierName: 'Kelani Cables PLC',
          supplierCode: 'SUP-KEL-01',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-05',
          paymentTerms: 'Net 30',
          items: [
            {
              productId: 'prod-lkr-1',
              productCode: 'KEL-CAB-2.5',
              productName: 'Kelani 2.5mm Earth Cable 100m Roll',
              quantity: 20,
              unitPrice: 15000,
              taxRate: 18,
            },
          ],
        },
        mockUser
      );

      expect(po.currency).toBe('LKR');
    });

    it('persists currency updates when editing a draft purchase order', async () => {
      const draft = await service.createPurchaseOrder(
        {
          supplierId: 'sup-1',
          supplierName: 'ABB Power Lanka',
          supplierCode: 'SUP-ABB-01',
          orderDate: '2026-10-27',
          expectedDeliveryDate: '2026-11-05',
          paymentTerms: 'Net 30',
          currency: 'LKR',
          items: [
            {
              productId: 'prod-1',
              productCode: 'ABB-REL-01',
              productName: 'ABB Thermal Overload Relay',
              quantity: 5,
              unitPrice: 8500,
            },
          ],
        },
        mockUser
      );

      expect(draft.currency).toBe('LKR');

      // Update currency to CNY
      const updated = await service.updatePurchaseOrder(
        draft.id,
        {
          currency: 'CNY',
          items: [
            {
              productId: 'prod-1',
              productCode: 'ABB-REL-01',
              productName: 'ABB Thermal Overload Relay',
              quantity: 5,
              unitPrice: 195, // 195 CNY
            },
          ],
        },
        mockUser
      );

      expect(updated.currency).toBe('CNY');
      expect(updated.subtotal).toBe(975);
    });
  });

  describe('StandardPurchaseOrderTemplate Multi-Currency Rendering', () => {
    it('renders Chinese Yuan (CNY) symbol and currency header in printable template', () => {
      const po: any = {
        id: 'po-cny-print',
        poNumber: 'PO-2026-CNY-001',
        supplierId: 'sup-cny',
        supplierName: 'Guangdong Chint Electrics Ltd',
        supplierCode: 'SUP-CHINT',
        orderDate: '2026-10-27',
        expectedDeliveryDate: '2026-11-20',
        paymentTerms: '100% Advance TT',
        currency: 'CNY',
        status: 'PENDING_APPROVAL',
        items: [
          {
            id: 'item-1',
            productId: 'p-1',
            productCode: 'CHINT-MCB-16A',
            productName: 'Chint Miniature Circuit Breaker 16A 1P',
            quantity: 100,
            unitPrice: 12.5,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: 0,
            taxAmount: 0,
            total: 1250,
          },
        ],
        subtotal: 1250,
        totalDiscount: 0,
        taxTotal: 0,
        shippingCharges: 150,
        otherCharges: 0,
        grandTotal: 1400,
        createdBy: 'usr-1',
        createdByName: 'Amara Weerasinghe',
        createdAt: '2026-10-27',
        updatedAt: '2026-10-27',
      };

      const pages = paginatePurchaseOrder(po);
      render(
        <MemoryRouter>
          <StandardPurchaseOrderTemplate purchaseOrder={po} page={pages[0]} />
        </MemoryRouter>
      );

      // Verify table headers show Unit Price (CNY) and Line Total (CNY)
      expect(screen.getByText(/Unit Price \(CNY\)/i)).toBeDefined();
      expect(screen.getByText(/Line Total \(CNY\)/i)).toBeDefined();
      // Verify Grand Total (CNY)
      expect(screen.getByText(/Grand Total \(CNY\)/i)).toBeDefined();
    });

    it('renders US Dollar (USD) currency headers and total in printable template', () => {
      const po: any = {
        id: 'po-usd-print',
        poNumber: 'PO-2026-USD-002',
        supplierId: 'sup-usd',
        supplierName: 'Schneider Electric USA Inc',
        supplierCode: 'SUP-SCH-US',
        orderDate: '2026-10-27',
        expectedDeliveryDate: '2026-11-30',
        paymentTerms: 'Net 60',
        currency: 'USD',
        status: 'APPROVED',
        items: [
          {
            id: 'item-1',
            productId: 'p-1',
            productCode: 'SCH-VFD-15KW',
            productName: 'Altivar Process Variable Speed Drive 15kW',
            quantity: 2,
            unitPrice: 1850,
            discountPercent: 5,
            discountAmount: 185,
            taxRate: 0,
            taxAmount: 0,
            total: 3515,
          },
        ],
        subtotal: 3700,
        totalDiscount: 185,
        taxTotal: 0,
        shippingCharges: 250,
        otherCharges: 0,
        grandTotal: 3765,
        createdBy: 'usr-1',
        createdByName: 'Amara Weerasinghe',
        createdAt: '2026-10-27',
        updatedAt: '2026-10-27',
      };

      const pages = paginatePurchaseOrder(po);
      render(
        <MemoryRouter>
          <StandardPurchaseOrderTemplate purchaseOrder={po} page={pages[0]} />
        </MemoryRouter>
      );

      expect(screen.getByText(/Unit Price \(USD\)/i)).toBeDefined();
      expect(screen.getByText(/Line Total \(USD\)/i)).toBeDefined();
      expect(screen.getByText(/Grand Total \(USD\)/i)).toBeDefined();
    });
  });

  describe('PurchaseOrderCreateEditPage Form Currency Selection', () => {
    it('renders currency selection dropdown with Chinese Yuan (CNY), US Dollar (USD), and Sri Lankan Rupee (LKR)', () => {
      render(
        <MemoryRouter>
          <PurchaseOrderCreateEditPage />
        </MemoryRouter>
      );

      const currencySelect = screen.getByLabelText(/Currency/i) as HTMLSelectElement;
      expect(currencySelect).toBeDefined();

      // Verify options are present
      const options = Array.from(currencySelect.options).map((o) => o.value);
      expect(options).toContain('LKR');
      expect(options).toContain('CNY');
      expect(options).toContain('USD');

      // Verify default is LKR
      expect(currencySelect.value).toBe('LKR');
    });

    it('allows changing currency and dynamically updates table headers to the selected currency', () => {
      render(
        <MemoryRouter>
          <PurchaseOrderCreateEditPage />
        </MemoryRouter>
      );

      const currencySelect = screen.getByLabelText(/Currency/i) as HTMLSelectElement;

      // Check initial LKR header
      expect(screen.getByText(/Unit Price \(LKR\)/i)).toBeDefined();

      // Change currency to Chinese Yuan (CNY)
      fireEvent.change(currencySelect, { target: { value: 'CNY' } });
      expect(currencySelect.value).toBe('CNY');
      expect(screen.getByText(/Unit Price \(CNY\)/i)).toBeDefined();
      expect(screen.getByText(/Line Total \(CNY\)/i)).toBeDefined();
      expect(screen.getByText(/Grand Total \(CNY\)/i)).toBeDefined();

      // Change currency to US Dollar (USD)
      fireEvent.change(currencySelect, { target: { value: 'USD' } });
      expect(currencySelect.value).toBe('USD');
      expect(screen.getByText(/Unit Price \(USD\)/i)).toBeDefined();
      expect(screen.getByText(/Line Total \(USD\)/i)).toBeDefined();
      expect(screen.getByText(/Grand Total \(USD\)/i)).toBeDefined();
    });
  });
});
