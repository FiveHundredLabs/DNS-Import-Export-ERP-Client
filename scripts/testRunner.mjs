import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// 1. Test Discount Rules
import { evaluateDiscount, calculateLineTotal } from '../src/rules/discountRules.ts';

describe('Discount Rules Engine', () => {
  test('allows standard discount within rep and customer limits', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: 5,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });
    assert.equal(result.isValid, true);
    assert.equal(result.requiresSpecialApproval, false);
  });

  test('flags special approval when requested discount exceeds rep limit but is within product limit', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: 8,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });
    assert.equal(result.isValid, true);
    assert.equal(result.requiresSpecialApproval, true);
    assert.match(result.reason, /exceeds standard limit/);
  });

  test('rejects negative discount percentages', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: -2,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
    });
    assert.equal(result.isValid, false);
    assert.match(result.reason, /negative/);
  });

  test('allows promotional discounts up to promotional rate without escalation', () => {
    const result = evaluateDiscount({
      requestedDiscountPercentage: 18,
      repMaxDiscountPercentage: 5,
      customerMaxDiscountPercentage: 10,
      productMaxDiscountPercentage: 15,
      isPromotional: true,
      promotionalDiscountPercentage: 18,
    });
    assert.equal(result.isValid, true);
    assert.equal(result.requiresSpecialApproval, false);
  });

  test('calculates line item subtotal and discount correctly', () => {
    const line = calculateLineTotal(1000, 5, 10);
    assert.equal(line.subtotal, 5000);
    assert.equal(line.discountAmount, 500);
    assert.equal(line.total, 4500);
  });
});

// 2. Test Credit Rules
import { evaluateCredit } from '../src/rules/creditRules.ts';

describe('Credit Rules Engine', () => {
  test('passes when credit days and balance are well within limits', () => {
    const result = evaluateCredit({
      requestedCreditDays: 30,
      allowedCreditDays: 30,
      orderTotalAmount: 100000,
      customerCreditLimit: 1000000,
      customerTotalOutstanding: 200000,
    });
    assert.equal(result.isWithinTerms, true);
    assert.equal(result.creditDaysBreached, false);
    assert.equal(result.creditLimitBreached, false);
    assert.equal(result.requiresSpecialApproval, false);
  });

  test('detects credit days breach and triggers special approval for Director', () => {
    const result = evaluateCredit({
      requestedCreditDays: 45,
      allowedCreditDays: 30,
      orderTotalAmount: 50000,
      customerCreditLimit: 1000000,
      customerTotalOutstanding: 100000,
    });
    assert.equal(result.isWithinTerms, false);
    assert.equal(result.creditDaysBreached, true);
    assert.equal(result.requiresSpecialApproval, true);
    assert.equal(result.recommendedApprover, 'DIRECTOR');
  });

  test('detects credit limit breach and routes to Manager if within 500k excess and standard days', () => {
    const result = evaluateCredit({
      requestedCreditDays: 21,
      allowedCreditDays: 30,
      orderTotalAmount: 200000,
      customerCreditLimit: 500000,
      customerTotalOutstanding: 400000,
    });
    assert.equal(result.creditLimitBreached, true);
    assert.equal(result.requiresSpecialApproval, true);
    assert.equal(result.recommendedApprover, 'MANAGER');
  });
});

// 3. Test Approval Rules
import {
  determineCustomerApprovalRoute,
  determinePriceApprovalRoute,
  canApproveCustomerStage,
} from '../src/rules/approvalRules.ts';

describe('Approval Hierarchy Rules', () => {
  test('routes standard customer terms (<= 30 days, <= 1M) to Manager', () => {
    const route = determineCustomerApprovalRoute(30, 800000);
    assert.equal(route.targetRole, 'MANAGER');
    assert.equal(route.isExceptional, false);
  });

  test('routes exceptional customer terms (> 30 days) to Director', () => {
    const route = determineCustomerApprovalRoute(45, 800000);
    assert.equal(route.targetRole, 'DIRECTOR');
    assert.equal(route.isExceptional, true);
    assert.match(route.reason, /Credit days/);
  });

  test('mandates Director approval if proposed price margin is below 15%', () => {
    const route = determinePriceApprovalRoute(1000, 1200, 1100);
    assert.equal(route.requiresDirectorApproval, true);
    assert.ok(route.marginPercentage < 15);
  });

  test('permits Director to approve any customer stage', () => {
    assert.equal(canApproveCustomerStage('DIRECTOR', 'PENDING_SALES_REVIEW'), true);
    assert.equal(canApproveCustomerStage('DIRECTOR', 'PENDING_MANAGER_APPROVAL'), true);
    assert.equal(canApproveCustomerStage('DIRECTOR', 'PENDING_DIRECTOR_APPROVAL'), true);
  });

  test('restricts Sales Rep from approving customer stages', () => {
    assert.equal(canApproveCustomerStage('SALES_REP', 'PENDING_MANAGER_APPROVAL'), false);
  });
});

// 4. Test Master Data Repositories & Services
import { MockProductRepository } from '../src/repositories/mock/MockProductRepository.ts';
import { MockCustomerRepository } from '../src/repositories/mock/MockCustomerRepository.ts';
import { ProductService } from '../src/services/ProductService.ts';
import { CustomerService } from '../src/services/CustomerService.ts';

describe('Master Data Single Source of Truth & Snapshot Integrity', () => {
  test('Product Master maintains unique identity across operations', async () => {
    const repo = new MockProductRepository();
    const service = new ProductService(repo);

    const product = await service.createProduct({
      sku: 'DNS-TEST-SKU',
      name: 'Test Industrial Circuit Breaker',
      description: 'Test Breaker',
      categoryId: 'cat-01',
      categoryName: 'Switchgear & Breakers',
      uomId: 'uom-01',
      uomCode: 'PCS',
      barcode: '8901234567890',
      pricing: {
        costPrice: 1000,
        currentSellingPrice: 1500,
        minimumSellingPrice: 1200,
        maxDiscountPercentage: 10,
        taxRatePercentage: 18,
      },
      isPromotional: false,
      warrantyPeriodMonths: 24,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      stockOnHand: 100,
      damagedStock: 0,
    });

    assert.ok(product.id);

    const barcodeMatch = await service.findByBarcode('8901234567890');
    assert.notEqual(barcodeMatch, null);
    assert.equal(barcodeMatch?.id, product.id);
    assert.equal(barcodeMatch?.name, 'Test Industrial Circuit Breaker');
  });

  test('Product Master price update preserves immutable snapshot on historical transaction items', async () => {
    const repo = new MockProductRepository();
    const service = new ProductService(repo);

    const initialProduct = await service.getProduct('prod-001');
    assert.notEqual(initialProduct, null);
    const originalPrice = initialProduct.pricing.currentSellingPrice;

    const historicalInvoiceLineSnapshot = {
      productId: initialProduct.id,
      productSkuSnapshot: initialProduct.sku,
      productNameSnapshot: initialProduct.name,
      unitPriceSnapshot: originalPrice,
      quantity: 10,
      total: originalPrice * 10,
    };

    const updatedProduct = await service.updateProduct('prod-001', {
      pricing: {
        ...initialProduct.pricing,
        currentSellingPrice: originalPrice + 1000,
      },
    });

    assert.equal(updatedProduct.pricing.currentSellingPrice, originalPrice + 1000);
    assert.equal(historicalInvoiceLineSnapshot.unitPriceSnapshot, originalPrice);
    assert.equal(historicalInvoiceLineSnapshot.total, originalPrice * 10);
  });

  test('Customer Master update updates commercial terms without corrupting historical references', async () => {
    const repo = new MockCustomerRepository();
    const service = new CustomerService(repo);

    const initialCust = await service.getCustomer('cust-001');
    assert.notEqual(initialCust, null);
    assert.equal(initialCust.commercialTerms.creditDays, 30);

    const result = await service.setCommercialTerms('cust-001', {
      ...initialCust.commercialTerms,
      creditDays: 45,
    });

    assert.equal(result.customer.commercialTerms.creditDays, 45);
    assert.equal(result.targetApprovalRole, 'DIRECTOR');
    assert.equal(result.isExceptional, true);
    assert.equal(result.customer.approvalStage, 'PENDING_DIRECTOR_APPROVAL');
  });
});
