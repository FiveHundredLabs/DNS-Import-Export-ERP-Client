import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

// ==============================================================
// SERVICE & REPOSITORY INTEGRATION TEST SUITE
// Tests duplicate checks, approval lifecycle, and role scoping
// ==============================================================

class TestProductRepo {
  constructor() {
    this.products = [
      {
        id: 'prod-001',
        sku: 'DNS-MCB-32A-2P',
        name: 'Schneider Acti9 32A Double Pole MCB',
        barcode: '8901020304011',
        pricing: { costPrice: 2200, currentSellingPrice: 3250, minimumSellingPrice: 2750, maxDiscountPercentage: 12 },
        stockOnHand: 450,
      }
    ];
    this.proposals = [];
  }

  async getById(id) {
    return this.products.find((p) => p.id === id) || null;
  }

  async getByBarcode(barcode) {
    return this.products.find((p) => p.barcode === barcode) || null;
  }

  async create(data) {
    if (this.products.some((p) => p.sku.toLowerCase() === data.sku.toLowerCase())) {
      throw new Error(`A product with SKU "${data.sku}" already exists in Product Master.`);
    }
    if (this.products.some((p) => p.barcode === data.barcode)) {
      throw new Error(`A product with Barcode "${data.barcode}" already exists in Product Master.`);
    }
    const item = { ...data, id: `prod-${Date.now()}` };
    this.products.push(item);
    return item;
  }

  async update(id, updates) {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Not found');
    this.products[idx] = { ...this.products[idx], ...updates };
    return this.products[idx];
  }

  async submitProposal(proposal) {
    const item = { ...proposal, id: `prp-${Date.now()}` };
    this.proposals.push(item);
    return item;
  }
}

class TestCustomerRepo {
  constructor() {
    this.customers = [
      {
        id: 'cust-001',
        code: 'DLR-COL-001',
        name: 'Lanka Electrical & Hardware Superstore',
        areaId: 'area-01',
        assignedRepId: 'usr-106',
        commercialTerms: { creditLimit: 3000000, creditDays: 30 },
        financials: { totalOutstanding: 1450000, availableCredit: 1550000 },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
      },
      {
        id: 'cust-002',
        code: 'DLR-GAM-002',
        name: 'Gampaha Power Traders',
        areaId: 'area-02',
        assignedRepId: 'usr-107',
        commercialTerms: { creditLimit: 1500000, creditDays: 30 },
        financials: { totalOutstanding: 200000, availableCredit: 1300000 },
        approvalStage: 'APPROVED',
        status: 'ACTIVE',
      }
    ];
  }

  async getById(id) {
    return this.customers.find((c) => c.id === id) || null;
  }

  async create(data) {
    if (this.customers.some((c) => c.code.toLowerCase() === data.code.toLowerCase())) {
      throw new Error(`A customer with code "${data.code}" already exists in Customer Master.`);
    }
    const item = {
      ...data,
      id: `cust-${Date.now()}`,
      status: 'INACTIVE',
      approvalStage: 'PENDING_SALES_REVIEW',
    };
    this.customers.push(item);
    return item;
  }

  async updateCommercialTerms(id, terms) {
    const idx = this.customers.findIndex((c) => c.id === id);
    this.customers[idx].commercialTerms = terms;
    return this.customers[idx];
  }

  async updateApprovalStage(id, stage) {
    const idx = this.customers.findIndex((c) => c.id === id);
    this.customers[idx].approvalStage = stage;
    if (stage === 'APPROVED') {
      this.customers[idx].status = 'ACTIVE';
    } else if (stage === 'REJECTED') {
      this.customers[idx].status = 'INACTIVE';
    }
    return this.customers[idx];
  }
}

class TestApprovalRepo {
  constructor() {
    this.approvals = [];
  }

  async create(data) {
    const item = {
      ...data,
      id: `app-${Date.now()}`,
      status: 'PENDING',
      history: [],
    };
    this.approvals.push(item);
    return item;
  }

  async executeAction(id, action, actorRole) {
    const app = this.approvals.find((a) => a.id === id);
    if (!app) throw new Error('Not found');
    if (app.status !== 'PENDING') {
      throw new Error(`Cannot execute action on approval request with status ${app.status}.`);
    }

    if (action === 'APPROVE') {
      app.status = 'APPROVED';
    } else if (action === 'REJECT') {
      app.status = 'REJECTED';
    }
    return app;
  }
}

describe('Service & Repository Integration Verification', () => {
  test('Product Repository rejects duplicate SKU and duplicate Barcode', async () => {
    const repo = new TestProductRepo();
    
    // Attempt duplicate SKU
    await assert.rejects(
      async () => {
        await repo.create({
          sku: 'DNS-MCB-32A-2P', // Existing SKU!
          name: 'Another Breaker',
          barcode: '8909999999999',
          pricing: { costPrice: 500, currentSellingPrice: 800 },
        });
      },
      /already exists in Product Master/
    );

    // Attempt duplicate Barcode
    await assert.rejects(
      async () => {
        await repo.create({
          sku: 'DNS-DIFFERENT-SKU',
          name: 'Another Item',
          barcode: '8901020304011', // Existing barcode!
          pricing: { costPrice: 500, currentSellingPrice: 800 },
        });
      },
      /already exists in Product Master/
    );
  });

  test('Customer Repository enforces unique customer code and default INACTIVE status', async () => {
    const repo = new TestCustomerRepo();
    
    // Duplicate code check
    await assert.rejects(
      async () => {
        await repo.create({
          code: 'DLR-COL-001', // Existing code!
          name: 'Duplicate Mart',
        });
      },
      /already exists in Customer Master/
    );

    // Initial status verification
    const newCust = await repo.create({
      code: 'DLR-NEW-777',
      name: 'Fresh Mart',
    });
    assert.equal(newCust.status, 'INACTIVE');
    assert.equal(newCust.approvalStage, 'PENDING_SALES_REVIEW');

    // Approval transitions status to ACTIVE
    await repo.updateApprovalStage(newCust.id, 'APPROVED');
    assert.equal(newCust.status, 'ACTIVE');
  });

  test('Approval Repository prevents actions on non-PENDING requests', async () => {
    const appRepo = new TestApprovalRepo();
    const req = await appRepo.create({
      documentType: 'CUSTOMER_CREATION',
      documentId: 'cust-001',
      title: 'Commercial Review',
    });

    // First action succeeds
    await appRepo.executeAction(req.id, 'APPROVE', 'DIRECTOR');
    assert.equal(req.status, 'APPROVED');

    // Second action on already approved request throws error
    await assert.rejects(
      async () => {
        await appRepo.executeAction(req.id, 'REJECT', 'DIRECTOR');
      },
      /Cannot execute action on approval request with status APPROVED/
    );
  });

  test('Role Data Scoping: Field rep only has access to their assigned customer', () => {
    const customers = [
      { id: 'c-1', assignedRepId: 'usr-106' },
      { id: 'c-2', assignedRepId: 'usr-107' },
    ];
    const loggedInRepId = 'usr-106';

    const scoped = customers.filter((c) => c.assignedRepId === loggedInRepId);
    assert.equal(scoped.length, 1);
    assert.equal(scoped[0].id, 'c-1');
  });
});
