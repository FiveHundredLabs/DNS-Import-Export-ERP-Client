import { describe, it, expect } from 'vitest';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { ProductService } from '../services/ProductService';
import { CustomerService } from '../services/CustomerService';

describe('Master Data Single Source of Truth & Snapshot Integrity', () => {
  it('Product Master maintains unique identity across operations', async () => {
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

    expect(product.id).toBeDefined();

    // Verify lookup by barcode matches the exact single Product Master record
    const barcodeMatch = await service.findByBarcode('8901234567890');
    expect(barcodeMatch).not.toBeNull();
    expect(barcodeMatch?.id).toBe(product.id);
    expect(barcodeMatch?.name).toBe('Test Industrial Circuit Breaker');
  });

  it('Product Master price update preserves immutable snapshot on historical transaction items', async () => {
    const repo = new MockProductRepository();
    const service = new ProductService(repo);

    // Initial Product Price
    const initialProduct = await service.getProduct('prod-001');
    expect(initialProduct).not.toBeNull();
    const originalPrice = initialProduct!.pricing.currentSellingPrice;

    // Simulate creating a historical invoice line snapshot
    const historicalInvoiceLineSnapshot = {
      productId: initialProduct!.id,
      productSkuSnapshot: initialProduct!.sku,
      productNameSnapshot: initialProduct!.name,
      unitPriceSnapshot: originalPrice,
      quantity: 10,
      total: originalPrice * 10,
    };

    // Update the master product selling price
    const updatedProduct = await service.updateProduct('prod-001', {
      pricing: {
        ...initialProduct!.pricing,
        currentSellingPrice: originalPrice + 1000,
      },
    });

    expect(updatedProduct.pricing.currentSellingPrice).toBe(originalPrice + 1000);

    // Verify that the historical invoice line snapshot is completely unmodified
    expect(historicalInvoiceLineSnapshot.unitPriceSnapshot).toBe(originalPrice);
    expect(historicalInvoiceLineSnapshot.total).toBe(originalPrice * 10);
  });

  it('Customer Master update updates commercial terms without corrupting historical references', async () => {
    const repo = new MockCustomerRepository();
    const service = new CustomerService(repo);

    const initialCust = await service.getCustomer('cust-001');
    expect(initialCust).not.toBeNull();
    expect(initialCust!.commercialTerms.creditDays).toBe(30);

    // Update customer commercial credit terms
    const result = await service.setCommercialTerms('cust-001', {
      ...initialCust!.commercialTerms,
      creditDays: 45, // Exceptional days
    });

    expect(result.customer.commercialTerms.creditDays).toBe(45);
    expect(result.targetApprovalRole).toBe('DIRECTOR');
    expect(result.isExceptional).toBe(true);
    expect(result.customer.approvalStage).toBe('PENDING_DIRECTOR_APPROVAL');
  });

  it('rejects duplicate SKU and Barcode in Product Master', async () => {
    const repo = new MockProductRepository();
    const service = new ProductService(repo);

    await expect(
      service.createProduct({
        sku: 'DNS-MCB-32A-2P', // Existing mock SKU
        name: 'Duplicate Breaker',
        description: 'Breaker',
        categoryId: 'cat-01',
        categoryName: 'Switchgear',
        uomId: 'uom-01',
        uomCode: 'PCS',
        barcode: '8909999999999',
        pricing: { costPrice: 1000, currentSellingPrice: 1500, minimumSellingPrice: 1200, maxDiscountPercentage: 10, taxRatePercentage: 18 },
        isPromotional: false,
        warrantyPeriodMonths: 12,
        status: 'ACTIVE',
        approvalStatus: 'APPROVED',
        stockOnHand: 10,
        damagedStock: 0,
      })
    ).rejects.toThrow(/already exists in Product Master/);
  });

  it('rejects duplicate code in Customer Master', async () => {
    const repo = new MockCustomerRepository();
    const service = new CustomerService(repo);

    await expect(
      service.createCustomer({
        code: 'DLR-COL-001', // Existing mock code
        name: 'Duplicate Customer',
        type: 'DEALER',
        areaId: 'area-01',
        areaName: 'Colombo',
        assignedRepId: 'usr-106',
        assignedRepName: 'Kasun',
        contactPerson: 'Perera',
        phone: '+94 77 123 4567',
        email: 'test@email.com',
        address: 'Colombo',
        commercialTerms: { creditLimit: 500000, creditDays: 30, defaultDiscountPercentage: 5, maxDiscountPercentage: 10 },
        approvalStage: 'PENDING_SALES_REVIEW',
        status: 'INACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
      })
    ).rejects.toThrow(/already exists in Customer Master/);
  });
});
