import { describe, it, expect, beforeEach } from 'vitest';
import {
  getProductDiscountLevels,
  getAllowedDiscountLevels,
  getMaxAllowedDiscount,
  normalizeCustomerLoyaltyLevel,
  evaluateCustomerProductDiscount,
  evaluateDiscount,
  calculateLineTotal,
} from '../rules/discountRules';
import { Customer } from '../types/customer';
import { Product } from '../types/product';
import { quotationService } from '../services/QuotationService';
import { orderService } from '../services/OrderService';
import { invoiceService } from '../services/InvoiceService';
import { discountRuleService } from '../services/DiscountRuleService';

describe('Discount Level Management & Customer Loyalty Rules', () => {
  // Test Products
  const productA: Partial<Product> = {
    id: 'prod-3-levels',
    name: 'Laptop X (3 Levels)',
    sku: 'LAP-001',
    pricing: {
      costPrice: 800,
      currentSellingPrice: 1000,
      minSellingPrice: 850,
      promotionalDiscountPercentage: 0,
      maxDiscountPercentage: 15,
      discountLevels: [15, 5, 10], // Unsorted in input to verify sorting
    },
  };

  const productB: Partial<Product> = {
    id: 'prod-2-levels',
    name: 'Monitor Y (2 Levels)',
    sku: 'MON-002',
    pricing: {
      costPrice: 200,
      currentSellingPrice: 300,
      minSellingPrice: 250,
      maxDiscountPercentage: 10,
      discountLevels: [5, 10],
    },
  };

  const productC: Partial<Product> = {
    id: 'prod-1-level',
    name: 'Cable Z (1 Level)',
    sku: 'CAB-003',
    pricing: {
      costPrice: 10,
      currentSellingPrice: 20,
      minSellingPrice: 15,
      maxDiscountPercentage: 5,
      discountLevels: [5],
    },
  };

  const productD: Partial<Product> = {
    id: 'prod-0-levels',
    name: 'Special Item (0 Levels)',
    sku: 'SPC-004',
    pricing: {
      costPrice: 50,
      currentSellingPrice: 100,
      minSellingPrice: 80,
      maxDiscountPercentage: 0,
      discountLevels: [],
    },
  };

  // Test Customers
  const customerNew: Partial<Customer> = {
    id: 'cust-new',
    name: 'New Dealer Ltd',
    loyaltyLevel: 'NEW',
    commercialTerms: {
      paymentTerms: 'ADVANCE',
      creditLimit: 50000,
      creditDays: 0,
      defaultDiscountPercentage: 0,
      maxDiscountPercentage: 15,
    },
  };

  const customerPremium: Partial<Customer> = {
    id: 'cust-premium',
    name: 'Premium Enterprises',
    loyaltyLevel: 'PREMIUM',
    commercialTerms: {
      paymentTerms: 'NET_30',
      creditLimit: 200000,
      creditDays: 30,
      defaultDiscountPercentage: 5,
      maxDiscountPercentage: 15,
    },
  };

  const customerPlatinum: Partial<Customer> = {
    id: 'cust-platinum',
    name: 'Platinum Holdings',
    loyaltyLevel: 'PLATINUM',
    commercialTerms: {
      paymentTerms: 'NET_60',
      creditLimit: 500000,
      creditDays: 60,
      defaultDiscountPercentage: 10,
      maxDiscountPercentage: 15,
    },
  };

  describe('1. Product Discount Level Configuration & Sorting', () => {
    it('correctly sorts discount levels from lowest to highest and caps at 3 levels', () => {
      const levels = getProductDiscountLevels(productA);
      expect(levels).toEqual([5, 10, 15]);
    });

    it('handles products with 2, 1, and 0 discount levels', () => {
      expect(getProductDiscountLevels(productB)).toEqual([5, 10]);
      expect(getProductDiscountLevels(productC)).toEqual([5]);
      expect(getProductDiscountLevels(productD)).toEqual([]);
    });

    it('caps extra levels beyond 3', () => {
      const extraProduct: Partial<Product> = {
        discountLevels: [25, 5, 20, 10],
      };
      expect(getProductDiscountLevels(extraProduct)).toEqual([5, 10, 20]);
    });
  });

  describe('2. Customer Loyalty Level Access Rules (3 Discount Levels)', () => {
    // Product A has 5%, 10%, 15%
    it('NEW customer can only access lowest discount level (5%)', () => {
      const allowed = getAllowedDiscountLevels(productA, customerNew);
      expect(allowed).toEqual([5]);
      expect(getMaxAllowedDiscount(productA, customerNew)).toBe(5);

      // 5% is ALLOWED
      const res5 = evaluateCustomerProductDiscount({
        product: productA,
        customer: customerNew,
        requestedDiscountPercentage: 5,
      });
      expect(res5.status).toBe('ALLOWED');
      expect(res5.requiresApproval).toBe(false);

      // 10% requires approval
      const res10 = evaluateCustomerProductDiscount({
        product: productA,
        customer: customerNew,
        requestedDiscountPercentage: 10,
      });
      expect(res10.status).toBe('REQUIRES_APPROVAL');
      expect(res10.requiresApproval).toBe(true);
      expect(res10.warningMessage).toContain('exceeds the customer\'s allowed discount level');

      // 15% requires approval
      const res15 = evaluateCustomerProductDiscount({
        product: productA,
        customer: customerNew,
        requestedDiscountPercentage: 15,
      });
      expect(res15.status).toBe('REQUIRES_APPROVAL');
      expect(res15.requiresApproval).toBe(true);
    });

    it('PREMIUM customer can access lowest + second discount level (5%, 10%)', () => {
      const allowed = getAllowedDiscountLevels(productA, customerPremium);
      expect(allowed).toEqual([5, 10]);
      expect(getMaxAllowedDiscount(productA, customerPremium)).toBe(10);

      // 5% and 10% are ALLOWED
      expect(
        evaluateCustomerProductDiscount({
          product: productA,
          customer: customerPremium,
          requestedDiscountPercentage: 5,
        }).status
      ).toBe('ALLOWED');

      expect(
        evaluateCustomerProductDiscount({
          product: productA,
          customer: customerPremium,
          requestedDiscountPercentage: 10,
        }).status
      ).toBe('ALLOWED');

      // 15% requires approval
      const res15 = evaluateCustomerProductDiscount({
        product: productA,
        customer: customerPremium,
        requestedDiscountPercentage: 15,
      });
      expect(res15.status).toBe('REQUIRES_APPROVAL');
      expect(res15.requiresApproval).toBe(true);
      expect(res15.reason).toContain('exceeds the customer\'s permitted discount level of 10%');
    });

    it('PLATINUM customer can access all available discount levels (5%, 10%, 15%)', () => {
      const allowed = getAllowedDiscountLevels(productA, customerPlatinum);
      expect(allowed).toEqual([5, 10, 15]);
      expect(getMaxAllowedDiscount(productA, customerPlatinum)).toBe(15);

      // All 3 levels allowed
      expect(
        evaluateCustomerProductDiscount({
          product: productA,
          customer: customerPlatinum,
          requestedDiscountPercentage: 5,
        }).status
      ).toBe('ALLOWED');

      expect(
        evaluateCustomerProductDiscount({
          product: productA,
          customer: customerPlatinum,
          requestedDiscountPercentage: 10,
        }).status
      ).toBe('ALLOWED');

      expect(
        evaluateCustomerProductDiscount({
          product: productA,
          customer: customerPlatinum,
          requestedDiscountPercentage: 15,
        }).status
      ).toBe('ALLOWED');

      // 20% exceeds all product levels -> requires approval
      const res20 = evaluateCustomerProductDiscount({
        product: productA,
        customer: customerPlatinum,
        requestedDiscountPercentage: 20,
      });
      expect(res20.status).toBe('REQUIRES_APPROVAL');
      expect(res20.requiresApproval).toBe(true);
    });
  });

  describe('3. Products With 2 Discount Levels', () => {
    // Product B has 5%, 10%
    it('NEW customer receives 5% only', () => {
      expect(getAllowedDiscountLevels(productB, customerNew)).toEqual([5]);
      expect(getMaxAllowedDiscount(productB, customerNew)).toBe(5);
    });

    it('PREMIUM customer receives 5% and 10%', () => {
      expect(getAllowedDiscountLevels(productB, customerPremium)).toEqual([5, 10]);
      expect(getMaxAllowedDiscount(productB, customerPremium)).toBe(10);
    });

    it('PLATINUM customer receives 5% and 10%', () => {
      expect(getAllowedDiscountLevels(productB, customerPlatinum)).toEqual([5, 10]);
      expect(getMaxAllowedDiscount(productB, customerPlatinum)).toBe(10);
    });
  });

  describe('4. Products With 1 Discount Level', () => {
    // Product C has 5%
    it('NEW, PREMIUM, and PLATINUM all receive 5% only', () => {
      expect(getAllowedDiscountLevels(productC, customerNew)).toEqual([5]);
      expect(getAllowedDiscountLevels(productC, customerPremium)).toEqual([5]);
      expect(getAllowedDiscountLevels(productC, customerPlatinum)).toEqual([5]);
    });
  });

  describe('5. Products Without Any Discount Level', () => {
    // Product D has 0 levels
    it('0% discount is allowed directly', () => {
      const res0 = evaluateCustomerProductDiscount({
        product: productD,
        customer: customerPlatinum,
        requestedDiscountPercentage: 0,
      });
      expect(res0.status).toBe('ALLOWED');
      expect(res0.requiresApproval).toBe(false);
    });

    it('any discount > 0% requires Management Approval with exact user requirement message', () => {
      const res5 = evaluateCustomerProductDiscount({
        product: productD,
        customer: customerPlatinum,
        requestedDiscountPercentage: 5,
      });
      expect(res5.status).toBe('REQUIRES_APPROVAL');
      expect(res5.requiresApproval).toBe(true);
      expect(res5.warningMessage).toBe(
        'No discount is available for this product. Management approval is required to apply a discount.'
      );
    });
  });

  describe('6. Calculations Order: Unit Price → Discount → Tax → Final Total', () => {
    it('computes line totals in strict order without compounding errors', () => {
      const unitPrice = 1000;
      const quantity = 2;
      const discountPercentage = 10;
      const taxRatePercentage = 18;

      const calc = calculateLineTotal(unitPrice, quantity, discountPercentage, taxRatePercentage);

      // Subtotal = 1000 * 2 = 2000
      expect(calc.subtotal).toBe(2000);
      // Discount = 2000 * 10% = 200
      expect(calc.discountAmount).toBe(200);
      // Net = 1800
      expect(calc.netAfterDiscount).toBe(1800);
      // Tax = 1800 * 18% = 324
      expect(calc.taxAmount).toBe(324);
      // Final Total = 1800 + 324 = 2124
      expect(calc.lineTotal).toBe(2124);
    });

    it('computes line totals correctly when tax is 0% / disabled', () => {
      const calc = calculateLineTotal(500, 4, 15, 0);
      expect(calc.subtotal).toBe(2000);
      expect(calc.discountAmount).toBe(300);
      expect(calc.netAfterDiscount).toBe(1700);
      expect(calc.taxAmount).toBe(0);
      expect(calc.lineTotal).toBe(1700);
    });
  });

  describe('7. Management Approval Workflow & Status Tracking', () => {
    it('preserves approved discount when existingApprovalStatus is APPROVED', () => {
      const res = evaluateCustomerProductDiscount({
        product: productA,
        customer: customerNew,
        requestedDiscountPercentage: 15, // normally exceeds NEW customer's 5% limit
        existingApprovalStatus: 'APPROVED',
      });

      expect(res.status).toBe('APPROVED');
      expect(res.requiresApproval).toBe(false);
      expect(res.allowedDiscountPercentage).toBe(15);
    });

    it('manages discount approval requests via DiscountRuleService', async () => {
      const request = await discountRuleService.submitDiscountApprovalRequest({
        documentType: 'QUOTATION',
        documentId: 'quot-test-01',
        documentNumber: 'QUOT-TEST-001',
        productId: 'prod-001',
        productName: 'Laptop X',
        customerId: 'cust-002',
        customerName: 'Premium Customer',
        customerLoyaltyLevel: 'PREMIUM',
        requestedDiscountPercentage: 15,
        allowedDiscountPercentage: 10,
        requestedByUserId: 'usr-rep',
        requestedByUserName: 'Sales Rep Alice',
      });

      expect(request.status).toBe('PENDING_APPROVAL');
      expect(request.requestedDiscountPercentage).toBe(15);
      expect(request.allowedDiscountPercentage).toBe(10);

      // Approve request
      const approved = discountRuleService.approveDiscount(request.id, 'usr-dir', 'Director Bob', 'Approved for deal volume.');
      expect(approved?.status).toBe('APPROVED');
      expect(approved?.approvedByUserName).toBe('Director Bob');
      expect(approved?.approvalNote).toBe('Approved for deal volume.');
    });
  });

  describe('8. Quotation → Sales Order → Invoice Flow: Discount Preservation', () => {
    it('carries forward discount approval status without applying discount twice', async () => {
      // 1. Create quotation for PREMIUM customer with 15% discount (requires approval)
      const quote = await quotationService.createQuotation({
        customerId: 'cust-002', // Premium customer
        salesRepId: 'usr-106',
        items: [
          {
            productId: 'prod-001', // Has [5, 10, 15] discount levels
            quantity: 2,
            requestedDiscountPercentage: 15, // Exceeds Premium customer 10%
          },
        ],
        saveAsDraft: false,
      });

      expect(quote.status).toBe('PENDING_APPROVAL');
      expect(quote.items[0].discountApprovalStatus).toBe('PENDING_APPROVAL');
      expect(quote.items[0].discountPercentage).toBe(15);

      const mockManagerUser = {
        id: 'usr-102',
        name: 'Ruwan Wijesinghe',
        email: 'manager@dnserp.com',
        role: 'MANAGER' as const,
        isActive: true,
      };

      // 2. Approve quotation by Sales Manager / Director
      const approvedQuote = await quotationService.approveQuotation(
        quote.id,
        mockManagerUser,
        'Approved 15% special discount'
      );
      expect(approvedQuote.status).toBe('APPROVED');
      expect(approvedQuote.items[0].discountApprovalStatus).toBe('APPROVED');

      const mockRepUser = {
        id: 'usr-106',
        name: 'Kasun Wickramasinghe',
        email: 'rep.colombo@dnserp.com',
        role: 'SALES_REP' as const,
        isActive: true,
      };

      // 3. Convert quotation to Sales Order
      const convertedOrder = await orderService.createFromQuotation(quote.id, mockRepUser, {
        deliveryAddress: '123 Main Road, Colombo',
      });

      expect(convertedOrder.quotationNumber).toBe(quote.quotationNumber);
      expect(convertedOrder.items[0].discountPercentage).toBe(15);
      expect(convertedOrder.items[0].discountApprovalStatus).toBe('APPROVED');

      // Check order calculation preserves correct line total without double discounting
      const expectedUnit = quote.items[0].unitPriceSnapshot;
      const expectedSub = expectedUnit * 2;
      const expectedDisc = (expectedSub * 15) / 100;
      expect(convertedOrder.items[0].discountAmount).toBe(expectedDisc);
      expect(convertedOrder.discountAmount).toBe(expectedDisc);

      // 4. Issue & Convert Sales Order to Invoice
      // Mark order approved & invoiced
      await orderService.approveOrder(convertedOrder.id, mockManagerUser, 'Approved order');
      const invoice = await invoiceService.createInvoiceFromOrder(convertedOrder.id, mockRepUser);

      expect(invoice.items[0].discountPercentage).toBe(15);
      expect(invoice.items[0].discountApprovalStatus).toBe('APPROVED');
      expect(invoice.discountTotal).toBe(expectedDisc);
    });

    it('preserves historical snapshot even if customer loyalty level changes later', async () => {
      // Create and save an approved quotation for a customer
      const quote = await quotationService.createQuotation({
        customerId: 'cust-001', // Platinum customer
        salesRepId: 'rep-001',
        items: [
          {
            productId: 'prod-001',
            quantity: 1,
            requestedDiscountPercentage: 15,
          },
        ],
        saveAsDraft: true,
      });

      const originalTotal = quote.totalAmount;
      const originalDiscount = quote.discountTotal;

      // Simulate customer loyalty downgrade to NEW
      const customer = await import('../services/CustomerService').then(m => m.customerService.getCustomer('cust-001'));
      if (customer) {
        await import('../services/CustomerService').then(m =>
          m.customerService.updateCustomer('cust-001', { loyaltyLevel: 'NEW' })
        );
      }

      // Re-fetch existing quotation - totals must remain completely unchanged
      const fetchedQuote = await quotationService.getQuotationById(quote.id);
      expect(fetchedQuote?.totalAmount).toBe(originalTotal);
      expect(fetchedQuote?.discountTotal).toBe(originalDiscount);
      expect(fetchedQuote?.items[0].discountPercentage).toBe(15);
    });
  });
});
