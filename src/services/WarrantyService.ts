import { IWarrantyRepository } from '../repositories/IWarrantyRepository';
import { MockWarrantyRepository } from '../repositories/mock/MockWarrantyRepository';
import { ICustomerRepository } from '../repositories/ICustomerRepository';
import { MockCustomerRepository } from '../repositories/mock/MockCustomerRepository';
import { IProductRepository } from '../repositories/IProductRepository';
import { MockProductRepository } from '../repositories/mock/MockProductRepository';
import { IInventoryRepository } from '../repositories/IInventoryRepository';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import {
  WarrantyRecord,
  WarrantyClaim,
  ShopWarrantyFollowUp,
  WarrantyFilters,
  ClaimFilters,
  WarrantySaleType,
  ClaimResolutionType,
  WarrantyNote,
  WarrantyNoteFilters,
  RecordWarrantyNoteDTO,
  UnitWarrantyStatus,
  UnitBarcodeWarrantyDetail,
  DistributorWarrantySummary,
  SalesRepWarrantySummary,
  ProductBarcodeDossier,
  RegisterEndCustomerWarrantyDTO,
  CustomerWarrantyTally,
  CustomerWarrantyTallyItem,
} from '../types/warranty';
import { Invoice, InvoiceItem } from '../types/invoice';
import { User } from '../types/auth';
import { PaginatedResult } from '../types/common';
import {
  calculateWarrantyExpiry,
  isWarrantyValid,
  calculatePendingWarrantyNotes,
  determineWarrantyStartDate,
  canProcessWarrantyClaim,
  classifyUnitWarrantyStatus,
  calculateRemainingWarranty,
} from '../rules/warrantyRules';
import { MOCK_PRODUCTS } from '../mock/mockProducts';
import { MOCK_INVOICES } from '../mock/mockInvoices';
import { MOCK_GRNS } from '../mock/mockInventory';
import { MOCK_CUSTOMERS } from '../mock/mockCustomers';

export interface CreateClaimDTO {
  warrantyRecordId: string;
  complaintDate: string;
  complaintReason: string;
  serialNumber?: string;
}

export class WarrantyService {
  private repo: IWarrantyRepository;
  private customerRepo: ICustomerRepository;
  private productRepo: IProductRepository;
  private inventoryRepo: IInventoryRepository;

  constructor(
    repo?: IWarrantyRepository,
    customerRepo?: ICustomerRepository,
    productRepo?: IProductRepository,
    inventoryRepo?: IInventoryRepository
  ) {
    this.repo = repo || new MockWarrantyRepository();
    this.customerRepo = customerRepo || new MockCustomerRepository();
    this.productRepo = productRepo || new MockProductRepository();
    this.inventoryRepo = inventoryRepo || new MockInventoryRepository();
  }

  /**
   * Registers a canonical warranty record linked to customer, product, and invoice.
   * Single source of truth: does NOT duplicate product or customer master entities.
   */
  async registerWarranty(
    invoice: Invoice,
    item: InvoiceItem,
    saleType: WarrantySaleType,
    dealerSoldDate?: string,
    serialNumber?: string
  ): Promise<WarrantyRecord> {
    // Lookup product to fetch official warranty period months
    let periodMonths = 12;
    try {
      const prod = await this.productRepo.getById(item.productId);
      if (prod && prod.warrantyPeriodMonths) {
        periodMonths = prod.warrantyPeriodMonths;
      }
    } catch {
      // Fallback to default
    }

    const warrantyStartDate = determineWarrantyStartDate(
      saleType,
      invoice.issueDate,
      dealerSoldDate
    );
    const warrantyExpiryDate = calculateWarrantyExpiry(warrantyStartDate, periodMonths);
    const notesReceived = saleType === 'SHOWROOM' || !!dealerSoldDate;

    let warrantyNoteId: string | undefined;
    let warrantyNoteNumber: string | undefined;
    let warrantyNoteStatus: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | undefined;

    if (saleType === 'DEALER' && dealerSoldDate) {
      warrantyNoteNumber = `WN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      warrantyNoteStatus = 'VERIFIED';
    }

    const record = await this.repo.createRecord({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      productId: item.productId,
      productName: item.productNameSnapshot,
      sku: item.skuSnapshot,
      serialNumber: serialNumber || `SN-${item.skuSnapshot}-${Date.now().toString().slice(-6)}`,
      saleDate: invoice.issueDate,
      warrantyStartDate,
      warrantyPeriodMonths: periodMonths,
      warrantyExpiryDate,
      saleType,
      status: 'ACTIVE',
      dealerSoldDate,
      notesReceived,
      notesReceivedDate: notesReceived ? new Date().toISOString() : undefined,
      warrantyNoteId,
      warrantyNoteNumber,
      warrantyNoteStatus,
    });

    if (saleType === 'DEALER' && dealerSoldDate && warrantyNoteNumber) {
      try {
        const note = await this.repo.createWarrantyNote({
          noteNumber: warrantyNoteNumber,
          warrantyRecordId: record.id,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          distributorId: invoice.customerId,
          distributorName: invoice.customerName,
          productId: item.productId,
          productName: item.productNameSnapshot,
          sku: item.skuSnapshot,
          serialNumber: record.serialNumber || '',
          distributorSaleDate: dealerSoldDate,
          receivedDate: invoice.issueDate,
          status: 'VERIFIED',
          reviewNotes: 'Auto-verified with registered distributor delivery card.',
          enteredByUserId: invoice.salesRepId || 'usr-system',
          enteredByUserName: invoice.salesRepName || 'System / Field Sales',
          reviewedByUserId: 'usr-103',
          reviewedByUserName: 'Kamal Perera',
          reviewedAt: new Date().toISOString(),
        });
        await this.repo.updateRecord(record.id, {
          warrantyNoteId: note.id,
        });
        record.warrantyNoteId = note.id;
      } catch (err) {
        console.warn('Could not persist initial warranty note:', err);
      }
    }

    // Update shop follow-up tracking for dealer sales
    if (saleType === 'DEALER') {
      try {
        const customer = await this.customerRepo.getById(invoice.customerId);
        const existingFollowUp = await this.repo.getFollowUpByCustomerId(invoice.customerId);

        const baseSold = existingFollowUp?.totalUnitsSold ?? customer?.warrantyNotesExpected ?? 0;
        const baseReceived = existingFollowUp?.warrantyNotesReceived ?? customer?.warrantyNotesReceived ?? 0;

        const totalUnitsSold = baseSold + (item.quantity || 1);
        const warrantyNotesReceived = baseReceived + (notesReceived ? (item.quantity || 1) : 0);
        const pendingNotesCount = calculatePendingWarrantyNotes(totalUnitsSold, warrantyNotesReceived);

        await this.repo.saveFollowUp({
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          totalUnitsSold,
          warrantyNotesReceived,
          pendingNotesCount,
          lastFollowUpDate: existingFollowUp?.lastFollowUpDate || invoice.issueDate,
          followUpNotes: existingFollowUp?.followUpNotes || [],
        });

        // Sync Customer Master expected and received notes
        if (customer) {
          await this.customerRepo.update(customer.id, {
            warrantyNotesExpected: totalUnitsSold,
            warrantyNotesReceived: warrantyNotesReceived,
          });
        }
      } catch (err) {
        console.warn('Could not update dealer follow up stats:', err);
      }
    }

    return record;
  }

  async getWarrantyRecords(filters?: WarrantyFilters, user?: User): Promise<PaginatedResult<WarrantyRecord>> {
    const effectiveFilters = { ...filters };

    if (user?.role === 'SALES_REP') {
      const allowedCusts = MOCK_CUSTOMERS.filter((c) => c.assignedRepId === user.id);
      const allowedCustIds = new Set(allowedCusts.map((c) => c.id));

      if (effectiveFilters.customerId && !allowedCustIds.has(effectiveFilters.customerId)) {
        return { data: [], total: 0, page: 1, pageSize: filters?.pageSize || 10, totalPages: 0 };
      }

      const res = await this.repo.getAllRecords({ ...effectiveFilters, pageSize: 1000 });
      const scoped = res.data.filter((r) => allowedCustIds.has(r.customerId));
      return {
        data: scoped,
        total: scoped.length,
        page: 1,
        pageSize: filters?.pageSize || 100,
        totalPages: 1,
      };
    } else if (user?.role === 'AREA_MANAGER') {
      const allowedCusts = MOCK_CUSTOMERS.filter((c) => c.areaId === user.areaId);
      const allowedCustIds = new Set(allowedCusts.map((c) => c.id));

      if (effectiveFilters.customerId && !allowedCustIds.has(effectiveFilters.customerId)) {
        return { data: [], total: 0, page: 1, pageSize: filters?.pageSize || 10, totalPages: 0 };
      }

      const res = await this.repo.getAllRecords({ ...effectiveFilters, pageSize: 1000 });
      const scoped = res.data.filter((r) => allowedCustIds.has(r.customerId));
      return {
        data: scoped,
        total: scoped.length,
        page: 1,
        pageSize: filters?.pageSize || 100,
        totalPages: 1,
      };
    }

    return this.repo.getAllRecords(filters);
  }

  async getWarrantyById(id: string): Promise<WarrantyRecord | null> {
    return this.repo.getRecordById(id);
  }

  async getWarrantiesByCustomerId(customerId: string): Promise<WarrantyRecord[]> {
    return this.repo.getRecordsByCustomerId(customerId);
  }

  /**
   * Looks up a specific warranty unit by its unique individual unit barcode.
   * Barcodes are assigned to each individual unit, not to the product itself.
   */
  async getWarrantyByUnitBarcode(barcode: string): Promise<WarrantyRecord | null> {
    const term = barcode.trim().toLowerCase();
    if (!term) return null;
    const res = await this.repo.getAllRecords({ search: term, pageSize: 1000 });
    const records = res.data || (res as any).items || [];
    return (
      records.find(
        (r) =>
          (r.barcode && r.barcode.toLowerCase() === term) ||
          (r.serialNumber && r.serialNumber.toLowerCase() === term)
      ) || null
    );
  }

  /**
   * Barcode scanner & lookup engine.
   * Given a barcode or serial number, automatically retrieves all available lifecycle
   * information from the database:
   * - Product Name & SKU
   * - Barcode & Serial Number
   * - Distributor Invoice Number & Date
   * - GRN Number & Date
   * - Product Cost (LKR)
   * - Warranty Period
   * - Distributor & Supplier
   * - Sales Representative
   * - Existing End-Customer Warranty Registration details & remaining validity
   */
  async lookupProductByBarcode(barcodeQuery: string, user?: User): Promise<ProductBarcodeDossier | null> {
    const query = barcodeQuery.trim().toLowerCase();
    if (!query) return null;

    // 1. Check existing warranty records
    const existingRecord = await this.getWarrantyByUnitBarcode(query);

    // 2. Identify Product
    let product = MOCK_PRODUCTS.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query) ||
        p.sku.toLowerCase() === query ||
        (existingRecord && p.id === existingRecord.productId)
    );

    if (!product) {
      if (existingRecord) {
        product = MOCK_PRODUCTS.find((p) => p.name === existingRecord.productName) || MOCK_PRODUCTS[0];
      } else {
        product =
          MOCK_PRODUCTS.find((p) => p.barcode?.includes(query) || p.sku.toLowerCase().includes(query)) ||
          MOCK_PRODUCTS[0];
      }
    }

    // 3. Identify Distributor Invoice & Sales Rep
    let invoice = MOCK_INVOICES.find(
      (inv) =>
        (existingRecord &&
          (inv.id === existingRecord.invoiceId || inv.invoiceNumber === existingRecord.invoiceNumber)) ||
        inv.items.some((it) => it.productId === product?.id)
    );
    if (!invoice) {
      invoice = MOCK_INVOICES[0];
    }

    // 4. Identify GRN & Supplier
    let grn = MOCK_GRNS.find((g) => g.items.some((it) => it.productId === product?.id));
    if (!grn) {
      grn = MOCK_GRNS[0];
    }

    // 5. Customer / Distributor
    const customer =
      MOCK_CUSTOMERS.find((c) => c.id === (existingRecord?.customerId || invoice?.customerId)) ||
      MOCK_CUSTOMERS[0];

    // 6. Warranty Expiry & Status Computation
    const defaultWarrantyPeriodMonths = product?.warrantyPeriodMonths || 12;

    if (existingRecord) {
      const remainingInfo = calculateRemainingWarranty(existingRecord.warrantyExpiryDate);
      const isExpired = remainingInfo.isExpired;
      const canClaim = remainingInfo.status === 'ACTIVE';

      return {
        barcode: existingRecord.barcode || barcodeQuery,
        serialNumber: existingRecord.serialNumber || `SN-${barcodeQuery.slice(-5)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        categoryName: product.categoryName || 'Electrical Goods',
        productCost: product.pricing?.costPrice || 2200,
        sellingPrice: product.pricing?.currentSellingPrice || 3250,
        defaultWarrantyPeriodMonths: existingRecord.warrantyPeriodMonths || defaultWarrantyPeriodMonths,
        supplierId: grn?.supplierId || 'sup-001',
        supplierName: grn?.supplierName || 'Schneider Electric Lanka (Pvt) Ltd',
        grnId: grn?.id || 'GRN-2025-001',
        grnNumber: grn?.grnNumber || 'GRN-2025-001',
        grnDate: '2025-01-02',
        distributorInvoiceId: invoice.id,
        distributorInvoiceNumber: invoice.invoiceNumber,
        distributorInvoiceDate: invoice.issueDate,
        salesRepId: invoice.salesRepId || 'usr-106',
        salesRepName: invoice.salesRepName || 'Kasun Wickramasinghe',
        distributorId: customer.id,
        distributorName: customer.name,
        distributorCode: customer.code,
        isRegistered: true,
        warrantyRecordId: existingRecord.id,
        endCustomerSellingDate: existingRecord.dealerSoldDate || existingRecord.warrantyStartDate,
        warrantyStartDate: existingRecord.warrantyStartDate,
        warrantyPeriodMonths: existingRecord.warrantyPeriodMonths,
        warrantyExpiryDate: existingRecord.warrantyExpiryDate,
        warrantyStatus: remainingInfo.status,
        remainingPeriodText: remainingInfo.displayText,
        receiptPhotoUrl:
          existingRecord.receiptPhotoUrl ||
          'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        endCustomerName: existingRecord.endCustomerName || 'Perera Constructions',
        endCustomerPhone: existingRecord.endCustomerPhone || '+94 77 123 4567',
        canRegister: user && (user.role === 'AREA_MANAGER' || user.role === 'SALES_REP') ? false : true,
        canClaim: user && (user.role === 'AREA_MANAGER' || user.role === 'SALES_REP') ? false : canClaim,
        isExpired,
        claimBlockReason: isExpired
          ? `Warranty Expired: Product warranty expired on ${existingRecord.warrantyExpiryDate}. Under company policy, expired products cannot be registered for warranty claims.`
          : undefined,
      };
    }

    // Unregistered product dossier
    return {
      barcode: barcodeQuery,
      serialNumber: `SN-${product.sku.slice(0, 3)}-${barcodeQuery.slice(-5)}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      categoryName: product.categoryName || 'Electrical Goods',
      productCost: product.pricing?.costPrice || 2200,
      sellingPrice: product.pricing?.currentSellingPrice || 3250,
      defaultWarrantyPeriodMonths,
      supplierId: grn?.supplierId || 'sup-001',
      supplierName: grn?.supplierName || 'Schneider Electric Lanka (Pvt) Ltd',
      grnId: grn?.id || 'GRN-2025-001',
      grnNumber: grn?.grnNumber || 'GRN-2025-001',
      grnDate: '2025-01-02',
      distributorInvoiceId: invoice.id,
      distributorInvoiceNumber: invoice.invoiceNumber,
      distributorInvoiceDate: invoice.issueDate,
      salesRepId: invoice.salesRepId || 'usr-106',
      salesRepName: invoice.salesRepName || 'Kasun Wickramasinghe',
      distributorId: customer.id,
      distributorName: customer.name,
      distributorCode: customer.code,
      isRegistered: false,
      warrantyStatus: 'NOT_REGISTERED',
      remainingPeriodText: 'Not Registered',
      canRegister: user && (user.role === 'AREA_MANAGER' || user.role === 'SALES_REP') ? false : true,
      canClaim: false,
      isExpired: false,
      claimBlockReason: 'Warranty Not Registered: End-customer selling date must be registered before filing a claim.',
    };
  }

  /**
   * Registers an end-customer warranty.
   * Core rule:
   * Warranty Start Date = End Customer Selling Date (entered by Sales Manager from receipt photo)
   * Warranty Expiry Date = Selling Date + Warranty Period in months
   */
  async registerEndCustomerWarranty(
    dto: RegisterEndCustomerWarrantyDTO,
    user?: User
  ): Promise<WarrantyRecord> {
    if (user && (user.role === 'AREA_MANAGER' || user.role === 'SALES_REP')) {
      throw new Error(
        'Permission Denied: Area Managers and Sales Representatives cannot register warranties.'
      );
    }
    if (!dto.barcode) throw new Error('Product barcode is required.');
    if (!dto.sellingDate) throw new Error('End-customer selling date is required.');
    if (!dto.customerId) throw new Error('Distributor customer selection is required.');

    const sellingDate = dto.sellingDate.split('T')[0];
    const warrantyPeriodMonths = Number(dto.warrantyPeriodMonths) || 12;
    const warrantyExpiryDate = calculateWarrantyExpiry(sellingDate, warrantyPeriodMonths);
    const remainingInfo = calculateRemainingWarranty(warrantyExpiryDate);

    // Check if record exists
    const existing = await this.getWarrantyByUnitBarcode(dto.barcode);

    if (existing) {
      const updated = await this.repo.updateRecord(existing.id, {
        dealerSoldDate: sellingDate,
        warrantyStartDate: sellingDate,
        warrantyPeriodMonths,
        warrantyExpiryDate,
        status: remainingInfo.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE',
        notesReceived: true,
        notesReceivedDate: new Date().toISOString(),
        endCustomerName: dto.endCustomerName || existing.endCustomerName,
        endCustomerPhone: dto.endCustomerPhone || existing.endCustomerPhone,
        receiptPhotoUrl: dto.receiptPhotoUrl || existing.receiptPhotoUrl,
        warrantyNoteStatus: 'VERIFIED',
      });
      return updated;
    }

    const dossier = await this.lookupProductByBarcode(dto.barcode);
    const newRecord = await this.repo.createRecord({
      invoiceId: dossier?.distributorInvoiceId || 'inv-001',
      invoiceNumber: dossier?.distributorInvoiceNumber || 'INV-2025-0101',
      customerId: dto.customerId,
      customerName: dto.customerName || dossier?.distributorName || 'Distributor Customer',
      productId: dossier?.productId || 'prod-001',
      productName: dossier?.productName || 'Product',
      sku: dossier?.sku || 'SKU-001',
      barcode: dto.barcode,
      serialNumber: dossier?.serialNumber || `SN-${dto.barcode.slice(-5)}`,
      saleDate: dossier?.distributorInvoiceDate || '2025-01-05',
      warrantyStartDate: sellingDate,
      warrantyPeriodMonths,
      warrantyExpiryDate,
      saleType: 'DEALER',
      status: remainingInfo.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE',
      dealerSoldDate: sellingDate,
      notesReceived: true,
      notesReceivedDate: new Date().toISOString(),
      warrantyNoteStatus: 'VERIFIED',
      endCustomerName: dto.endCustomerName,
      endCustomerPhone: dto.endCustomerPhone,
      grnNumber: dossier?.grnNumber,
      grnDate: dossier?.grnDate,
      productCost: dossier?.productCost,
      distributorSupplierName: dossier?.supplierName,
      salesRepId: dossier?.salesRepId,
      salesRepName: dossier?.salesRepName,
      receiptPhotoUrl: dto.receiptPhotoUrl,
    });

    return newRecord;
  }

  /**
   * Retrieves full warranty tally for a customer.
   * Calculates:
   * Total Sold / Supplied: e.g. 25
   * Warranty Registered: e.g. 18
   * Pending Registration: e.g. 7
   * Provides items list for Sales Rep follow-up visits.
   */
  async getCustomerWarrantyTally(customerId: string, user?: User): Promise<CustomerWarrantyTally> {
    if (user?.role === 'SALES_REP') {
      const targetCustomer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
      if (targetCustomer && targetCustomer.assignedRepId !== user.id) {
        throw new Error('Permission Denied: Customer is not assigned to this Sales Representative.');
      }
    } else if (user?.role === 'AREA_MANAGER') {
      const targetCustomer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
      if (targetCustomer && targetCustomer.areaId !== user.areaId) {
        throw new Error('Permission Denied: Customer is outside your assigned area.');
      }
    }
    const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId) || MOCK_CUSTOMERS[0];
    const records = await this.repo.getRecordsByCustomerId(customerId);
    const customerInvoices = MOCK_INVOICES.filter((inv) => inv.customerId === customerId);

    const items: CustomerWarrantyTallyItem[] = [];

    // Map existing warranty records
    records.forEach((r, idx) => {
      const remainingInfo = calculateRemainingWarranty(r.warrantyExpiryDate);
      items.push({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        barcode: r.barcode || `890102030${idx + 100}`,
        serialNumber: r.serialNumber,
        quantity: 1,
        unit: 'PCS',
        invoiceNumber: r.invoiceNumber,
        invoiceDate: r.saleDate,
        sellingDate: r.dealerSoldDate || r.warrantyStartDate,
        isRegistered: !!r.dealerSoldDate && r.notesReceived,
        hasNoteReceipt: !!r.receiptPhotoUrl || r.notesReceived,
        receiptPhotoUrl: r.receiptPhotoUrl,
        warrantyStatus: remainingInfo.status,
        warrantyExpiryDate: r.warrantyExpiryDate,
        remainingPeriodText: remainingInfo.displayText,
      });
    });

    // Ensure realistic demonstration numbers if mock records are fewer
    const targetExpected = Math.max(items.length, customer.warrantyNotesExpected || 25);
    if (items.length < targetExpected) {
      const needed = targetExpected - items.length;
      for (let i = 1; i <= needed; i++) {
        const inv = customerInvoices[0] || MOCK_INVOICES[0];
        const prod = MOCK_PRODUCTS[i % MOCK_PRODUCTS.length];
        const dummyBarcode = `890102030${800 + i}`;
        items.push({
          id: `unreg-${customerId}-${i}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          barcode: dummyBarcode,
          serialNumber: `SN-${prod.sku.slice(0, 3)}-${1000 + i}`,
          quantity: 1,
          unit: 'PCS',
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.issueDate,
          sellingDate: undefined,
          isRegistered: false,
          hasNoteReceipt: false,
          warrantyStatus: 'NOT_REGISTERED',
          remainingPeriodText: 'Pending Registration',
        });
      }
    }

    const totalSupplied = items.length;
    const registeredCount = items.filter((i) => i.isRegistered).length;
    const pendingCount = Math.max(0, totalSupplied - registeredCount);

    return {
      customerId: customer.id,
      customerName: customer.name,
      customerCode: customer.code,
      assignedRepId: customer.assignedRepId,
      assignedRepName: customer.assignedRepName,
      totalSupplied,
      registeredCount,
      pendingCount,
      items,
    };
  }

  /**
   * Lodges a new warranty claim against an active warranty record.
   * Enforces strict expiration check against complaint date.
   * Enforces validation based on distributor warranty note for dealer/distributor sales.
   */
  async createClaim(data: CreateClaimDTO, user?: User): Promise<WarrantyClaim> {
    if (user && (user.role === 'AREA_MANAGER' || user.role === 'SALES_REP')) {
      throw new Error(
        'Permission Denied: Area Managers and Sales Representatives cannot create warranty claims.'
      );
    }
    const record = await this.repo.getRecordById(data.warrantyRecordId);
    if (!record) {
      throw new Error(`Warranty record with ID ${data.warrantyRecordId} not found`);
    }

    // Distributor sales validation:
    // Company sells to distributors, not direct end-customers. Therefore, warranty claims
    // must be validated based on the warranty note received from the distributor.
    if (record.saleType === 'DEALER') {
      const claimCheck = canProcessWarrantyClaim(
        record.saleType,
        record.notesReceived,
        record.warrantyNoteStatus
      );
      if (!claimCheck.allowed) {
        throw new Error(claimCheck.reason);
      }
    }

    const complaintDate = data.complaintDate || new Date().toISOString().split('T')[0];

    if (complaintDate < record.warrantyStartDate.split('T')[0]) {
      throw new Error(
        `Complaint date ${complaintDate} cannot precede warranty start date ${record.warrantyStartDate}.`
      );
    }

    const isValid = isWarrantyValid(record.warrantyExpiryDate, complaintDate, record.warrantyStartDate);

    if (!isValid) {
      throw new Error(
        `Warranty expired on ${record.warrantyExpiryDate}. Cannot lodge claim for complaint date ${complaintDate}.`
      );
    }

    const year = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const claimNumber = `CLM-${year}-${randomCode}`;

    const claim = await this.repo.createClaim({
      claimNumber,
      warrantyRecordId: record.id,
      invoiceId: record.invoiceId,
      customerId: record.customerId,
      customerName: record.customerName,
      productId: record.productId,
      productName: record.productName,
      sku: record.sku,
      serialNumber: data.serialNumber || record.serialNumber,
      complaintDate,
      complaintReason: data.complaintReason,
      status: 'SUBMITTED',
      warrantyNoteId: record.warrantyNoteId,
      warrantyNoteNumber: record.warrantyNoteNumber,
      distributorId: record.customerId,
      distributorName: record.customerName,
      endCustomerName: record.endCustomerName,
    });

    // Mark warranty record status as CLAIMED
    await this.repo.updateRecord(record.id, { status: 'CLAIMED' });

    return claim;
  }

  async getClaims(filters?: ClaimFilters): Promise<PaginatedResult<WarrantyClaim>> {
    return this.repo.getAllClaims(filters);
  }

  async getClaimById(id: string): Promise<WarrantyClaim | null> {
    return this.repo.getClaimById(id);
  }

  async getClaimsByCustomerId(customerId: string): Promise<WarrantyClaim[]> {
    return this.repo.getClaimsByCustomerId(customerId);
  }

  async inspectClaim(claimId: string, user: User, notes?: string): Promise<WarrantyClaim> {
    const claim = await this.repo.getClaimById(claimId);
    if (!claim) {
      throw new Error(`Warranty claim ${claimId} not found`);
    }
    return this.repo.updateClaim(claimId, {
      status: 'IN_INSPECTION',
      inspectedById: user.id,
      resolutionNotes: notes ? (claim.resolutionNotes ? `${claim.resolutionNotes}\n${notes}` : notes) : claim.resolutionNotes,
    });
  }

  async approveClaim(claimId: string, user: User, notes?: string): Promise<WarrantyClaim> {
    const claim = await this.repo.getClaimById(claimId);
    if (!claim) {
      throw new Error(`Warranty claim ${claimId} not found`);
    }

    // Verify distributor note validation before approving
    if (claim.warrantyRecordId) {
      const record = await this.repo.getRecordById(claim.warrantyRecordId);
      if (record && record.saleType === 'DEALER') {
        const claimCheck = canProcessWarrantyClaim(
          record.saleType,
          record.notesReceived,
          record.warrantyNoteStatus
        );
        if (!claimCheck.allowed) {
          throw new Error(claimCheck.reason);
        }
      }
    }

    return this.repo.updateClaim(claimId, {
      status: 'APPROVED',
      inspectedById: claim.inspectedById || user.id,
      resolutionNotes: notes ? (claim.resolutionNotes ? `${claim.resolutionNotes}\n${notes}` : notes) : claim.resolutionNotes,
    });
  }

  // ================= Distributor Warranty Notes =================

  /**
   * Enters and records a distributor warranty note in the system.
   * Specifically available for the Sales Manager (and authorized management: Manager/Director).
   * Validates the distributor sale, recalculates warranty lifecycle dates, and links to master records.
   */
  async recordWarrantyNote(data: RecordWarrantyNoteDTO, user: User): Promise<WarrantyNote> {
    const allowedRoles: string[] = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'];
    if (!allowedRoles.includes(user.role)) {
      throw new Error(
        'Access denied: Only the Sales Manager or authorized management can enter and record distributor warranty notes.'
      );
    }

    const record = await this.repo.getRecordById(data.warrantyRecordId);
    if (!record) {
      throw new Error(`Warranty record with ID ${data.warrantyRecordId} not found.`);
    }

    const noteNumber =
      data.noteNumber?.trim() ||
      `WN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const receivedDate = data.receivedDate || new Date().toISOString().split('T')[0];
    const isVerified = data.verifyImmediately ?? false;
    const status = isVerified ? 'VERIFIED' : 'PENDING_REVIEW';

    const note = await this.repo.createWarrantyNote({
      noteNumber,
      warrantyRecordId: record.id,
      invoiceId: record.invoiceId,
      invoiceNumber: record.invoiceNumber,
      distributorId: record.customerId,
      distributorName: record.customerName,
      productId: record.productId,
      productName: record.productName,
      sku: record.sku,
      barcode: data.barcode || record.barcode,
      serialNumber: data.serialNumber || record.serialNumber || '',
      distributorSaleDate: data.distributorSaleDate,
      receivedDate,
      endCustomerName: data.endCustomerName,
      endCustomerPhone: data.endCustomerPhone,
      status,
      reviewNotes: data.reviewNotes || (isVerified ? 'Verified upon entry by Sales Manager.' : undefined),
      reviewedByUserId: isVerified ? user.id : undefined,
      reviewedByUserName: isVerified ? user.name : undefined,
      reviewedAt: isVerified ? new Date().toISOString() : undefined,
      enteredByUserId: user.id,
      enteredByUserName: user.name,
    });

    // Recalculate warranty start date & expiry date based on distributor sold date
    const newStartDate = data.distributorSaleDate;
    const newExpiryDate = calculateWarrantyExpiry(newStartDate, record.warrantyPeriodMonths);

    await this.repo.updateRecord(record.id, {
      dealerSoldDate: data.distributorSaleDate,
      warrantyStartDate: newStartDate,
      warrantyExpiryDate: newExpiryDate,
      notesReceived: isVerified,
      notesReceivedDate: isVerified ? receivedDate : undefined,
      warrantyNoteId: note.id,
      warrantyNoteNumber: note.noteNumber,
      warrantyNoteStatus: note.status,
      endCustomerName: data.endCustomerName,
      barcode: data.barcode || record.barcode,
      serialNumber: data.serialNumber || record.serialNumber,
    });

    // Update shop follow-up tracking and Customer Master when note is verified
    if (isVerified) {
      try {
        const existingFollowUp = await this.repo.getFollowUpByCustomerId(record.customerId);
        const customer = await this.customerRepo.getById(record.customerId);

        const baseSold = existingFollowUp?.totalUnitsSold ?? customer?.warrantyNotesExpected ?? 0;
        const baseReceived = existingFollowUp?.warrantyNotesReceived ?? customer?.warrantyNotesReceived ?? 0;
        const newReceived = baseReceived + 1;
        const newPending = calculatePendingWarrantyNotes(baseSold, newReceived);

        await this.repo.saveFollowUp({
          customerId: record.customerId,
          customerName: record.customerName,
          totalUnitsSold: baseSold,
          warrantyNotesReceived: newReceived,
          pendingNotesCount: newPending,
          lastFollowUpDate: receivedDate,
          followUpNotes: existingFollowUp?.followUpNotes || [],
        });

        if (customer) {
          await this.customerRepo.update(customer.id, {
            warrantyNotesReceived: newReceived,
          });
        }
      } catch (err) {
        console.warn('Could not sync dealer follow-up stats for warranty note:', err);
      }
    }

    return note;
  }

  /**
   * Reviews and validates a warranty note received from a distributor.
   * Performed by the Sales Manager prior to processing any warranty claims.
   */
  async reviewWarrantyNote(
    noteId: string,
    action: 'VERIFY' | 'REJECT',
    reviewNotes: string,
    user: User
  ): Promise<WarrantyNote> {
    const allowedRoles: string[] = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'];
    if (!allowedRoles.includes(user.role)) {
      throw new Error(
        'Access denied: Only the Sales Manager or authorized management can review and validate distributor warranty notes.'
      );
    }

    const note = await this.repo.getWarrantyNoteById(noteId);
    if (!note) {
      throw new Error(`Warranty note with ID ${noteId} not found.`);
    }

    const newStatus = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
    const updatedNote = await this.repo.updateWarrantyNote(noteId, {
      status: newStatus,
      reviewNotes: reviewNotes || (action === 'VERIFY' ? 'Validated by Sales Manager.' : 'Rejected by Sales Manager.'),
      reviewedByUserId: user.id,
      reviewedByUserName: user.name,
      reviewedAt: new Date().toISOString(),
    });

    // Synchronize linked warranty record
    if (note.warrantyRecordId) {
      const record = await this.repo.getRecordById(note.warrantyRecordId);
      if (record) {
        await this.repo.updateRecord(record.id, {
          warrantyNoteStatus: newStatus,
          notesReceived: newStatus === 'VERIFIED',
          notesReceivedDate: newStatus === 'VERIFIED' ? updatedNote.receivedDate : undefined,
        });

        if (newStatus === 'VERIFIED') {
          try {
            const customer = await this.customerRepo.getById(record.customerId);
            const followUp = await this.repo.getFollowUpByCustomerId(record.customerId);
            const baseReceived = followUp?.warrantyNotesReceived ?? customer?.warrantyNotesReceived ?? 0;
            const baseSold = followUp?.totalUnitsSold ?? customer?.warrantyNotesExpected ?? 0;
            const newReceived = baseReceived + 1;

            await this.repo.saveFollowUp({
              customerId: record.customerId,
              customerName: record.customerName,
              totalUnitsSold: baseSold,
              warrantyNotesReceived: newReceived,
              pendingNotesCount: calculatePendingWarrantyNotes(baseSold, newReceived),
              lastFollowUpDate: updatedNote.receivedDate,
              followUpNotes: followUp?.followUpNotes || [],
            });

            if (customer) {
              await this.customerRepo.update(customer.id, {
                warrantyNotesReceived: newReceived,
              });
            }
          } catch (err) {
            console.warn('Could not sync follow up stats during note verification:', err);
          }
        }
      }
    }

    return updatedNote;
  }

  async getWarrantyNotes(filters?: WarrantyNoteFilters): Promise<PaginatedResult<WarrantyNote>> {
    return this.repo.getAllWarrantyNotes(filters);
  }

  async getWarrantyNoteById(id: string): Promise<WarrantyNote | null> {
    return this.repo.getWarrantyNoteById(id);
  }

  async getWarrantyNoteByRecordId(warrantyRecordId: string): Promise<WarrantyNote | null> {
    return this.repo.getWarrantyNoteByRecordId(warrantyRecordId);
  }

  async getWarrantyNotesByDistributorId(distributorId: string): Promise<WarrantyNote[]> {
    return this.repo.getWarrantyNotesByDistributorId(distributorId);
  }


  /**
   * Resolves a warranty claim (REPLACE, REPAIR, or REJECT).
   * Transitions state machine, attaches resolution audit, and performs stock movements:
   * - REPLACE: Deducts replacement unit from good stock and adds defective unit into damaged stock
   * - REPAIR: Deducts selected spare parts used from good stock
   */
  async resolveClaim(
    claimId: string,
    resolution: ClaimResolutionType,
    notes: string,
    user: User,
    options?: {
      replacementSerial?: string;
      spareParts?: Array<{ productId: string; productName: string; quantity: number; unitCost?: number }>;
    }
  ): Promise<WarrantyClaim> {
    const claim = await this.repo.getClaimById(claimId);
    if (!claim) {
      throw new Error(`Warranty claim ${claimId} not found`);
    }

    let nextStatus: 'REPLACED' | 'REPAIRED' | 'REJECTED';
    switch (resolution) {
      case 'REPLACE': {
        nextStatus = 'REPLACED';
        // Deduct replacement unit from good available stock and add defective unit into damaged stock
        const balances = await this.inventoryRepo.getAllBalances();
        let prodBalance = balances.find(
          (b) => b.productId === claim.productId && (b.locationType === 'WAREHOUSE' || b.locationId === 'WH-MAIN')
        );
        if (!prodBalance) {
          prodBalance = balances.find((b) => b.productId === claim.productId);
        }

        if (prodBalance) {
          prodBalance.availableQuantity = Math.max(0, prodBalance.availableQuantity - 1);
          prodBalance.damagedQuantity = (prodBalance.damagedQuantity || 0) + 1;
          prodBalance.lastUpdated = new Date().toISOString();
          await this.inventoryRepo.saveBalance(prodBalance);
        }

        await this.inventoryRepo.addMovement({
          id: `mov-${Date.now()}-repl`,
          productId: claim.productId,
          sourceLocation: prodBalance?.locationId || 'WH-MAIN',
          quantity: 1,
          movementType: 'SALES_ISSUE',
          referenceDocumentType: 'WARRANTY_CLAIM',
          referenceDocumentId: claim.claimNumber,
          performedById: user.id,
          performedByName: user.name,
          reason: `Warranty replacement issued for claim ${claim.claimNumber} (${claim.productName})`,
          timestamp: new Date().toISOString(),
        });

        await this.inventoryRepo.addMovement({
          id: `mov-${Date.now()}-dmg`,
          productId: claim.productId,
          targetLocation: 'DAMAGED',
          quantity: 1,
          movementType: 'ADJUSTMENT',
          referenceDocumentType: 'WARRANTY_CLAIM',
          referenceDocumentId: claim.claimNumber,
          performedById: user.id,
          performedByName: user.name,
          reason: `Defective unit returned to damaged stock for claim ${claim.claimNumber}`,
          timestamp: new Date().toISOString(),
        });
        break;
      }
      case 'REPAIR': {
        nextStatus = 'REPAIRED';
        if (options?.spareParts && options.spareParts.length > 0) {
          const allBalances = await this.inventoryRepo.getAllBalances();
          for (const part of options.spareParts) {
            let partBalance = allBalances.find(
              (b) => b.productId === part.productId && (b.locationType === 'WAREHOUSE' || b.locationId === 'WH-MAIN')
            );
            if (!partBalance) {
              partBalance = allBalances.find((b) => b.productId === part.productId);
            }
            if (partBalance) {
              partBalance.availableQuantity = Math.max(0, partBalance.availableQuantity - part.quantity);
              partBalance.lastUpdated = new Date().toISOString();
              await this.inventoryRepo.saveBalance(partBalance);
            }

            await this.inventoryRepo.addMovement({
              id: `mov-${Date.now()}-spare-${part.productId}`,
              productId: part.productId,
              sourceLocation: partBalance?.locationId || 'WH-MAIN',
              quantity: part.quantity,
              movementType: 'SALES_ISSUE',
              referenceDocumentType: 'WARRANTY_CLAIM',
              referenceDocumentId: claim.claimNumber,
              performedById: user.id,
              performedByName: user.name,
              reason: `Warranty repair spare part consumed (${part.productName || part.productId}) for claim ${claim.claimNumber}`,
              timestamp: new Date().toISOString(),
            });
          }
        }
        break;
      }
      case 'REJECT':
        nextStatus = 'REJECTED';
        break;
      default:
        throw new Error(`Invalid resolution type: ${resolution}`);
    }

    return this.repo.updateClaim(claimId, {
      status: nextStatus,
      resolutionType: resolution,
      resolutionNotes: notes,
      resolvedById: user.id,
      resolvedAt: new Date().toISOString(),
      replacementSerialNumber: options?.replacementSerial,
      sparePartsUsed: options?.spareParts,
    });
  }

  /**
   * Retrieves shop warranty card collection follow-up statuses.
   * If salesRepId is provided, scopes exclusively to dealers assigned to that sales representative.
   */
  async getShopWarrantyFollowUps(salesRepId?: string): Promise<ShopWarrantyFollowUp[]> {
    const followUps = await this.repo.getFollowUps(salesRepId);
    return followUps.map((f) => ({
      ...f,
      pendingNotesCount: calculatePendingWarrantyNotes(f.totalUnitsSold, f.warrantyNotesReceived),
    }));
  }

  /**
   * Records a field representative shop visit and updates warranty note collection.
   */
  async recordFollowUp(
    customerId: string,
    notes: string,
    user: User,
    receivedNotesIncrement: number = 0
  ): Promise<ShopWarrantyFollowUp> {
    let followUp = await this.repo.getFollowUpByCustomerId(customerId);
    const customer = await this.customerRepo.getById(customerId);

    if (!followUp) {
      followUp = {
        customerId,
        customerName: customer ? customer.name : 'Unknown Dealer',
        totalUnitsSold: customer ? customer.warrantyNotesExpected : 0,
        warrantyNotesReceived: customer ? customer.warrantyNotesReceived : 0,
        pendingNotesCount: customer
          ? calculatePendingWarrantyNotes(customer.warrantyNotesExpected, customer.warrantyNotesReceived)
          : 0,
        followUpNotes: [],
      };
    }

    const today = new Date().toISOString().split('T')[0];
    const logEntry = `[${today} - ${user.name}]: ${notes}${
      receivedNotesIncrement > 0 ? ` (+${receivedNotesIncrement} cards collected)` : ''
    }`;

    const newReceived = followUp.warrantyNotesReceived + receivedNotesIncrement;
    const newPending = calculatePendingWarrantyNotes(followUp.totalUnitsSold, newReceived);
    const updatedNotes = [...(followUp.followUpNotes || []), logEntry];

    const updated = await this.repo.saveFollowUp({
      ...followUp,
      warrantyNotesReceived: newReceived,
      pendingNotesCount: newPending,
      lastFollowUpDate: today,
      followUpNotes: updatedNotes,
    });

    // Sync Customer Master
    if (customer) {
      await this.customerRepo.update(customerId, {
        warrantyNotesReceived: newReceived,
      });
    }

    return updated;
  }

  /**
   * Retrieves warranty verification summaries for distributors.
   * If salesRepId is provided, scopes strictly to distributors assigned to that sales representative.
   * For Sales Managers or Directors without a salesRepId filter, returns all distributors.
   * Calculates statistics strictly from system records (reconciling physical barcodes, confirmed customer sales, and in-stock units).
   */
  async getDistributorWarrantySummaries(
    salesRepId?: string,
    userRole?: string
  ): Promise<DistributorWarrantySummary[]> {
    // 1. Fetch distributors
    const customerResult = await this.customerRepo.getAll({
      page: 1,
      pageSize: 200,
      type: 'DEALER',
      assignedRepId: salesRepId && salesRepId !== 'ALL' ? salesRepId : undefined,
    });

    let distributors = customerResult.data.filter((c) => c.type === 'DEALER');
    if (salesRepId && salesRepId !== 'ALL') {
      distributors = distributors.filter((c) => c.assignedRepId === salesRepId);
    }

    const summaries: DistributorWarrantySummary[] = [];

    for (const dist of distributors) {
      // 2. Fetch all unit warranty records for this distributor
      const records = await this.repo.getRecordsByCustomerId(dist.id);
      const followUp = await this.repo.getFollowUpByCustomerId(dist.id);

      let totalUnitsSold = 0;
      let warrantyNotesReceived = 0;
      let confirmedMissingCount = 0;
      let unaccountedInStockCount = 0;
      let lastSubmissionDate: string | undefined = undefined;

      if (records.length > 0) {
        totalUnitsSold = records.length;
        for (const record of records) {
          const classification = classifyUnitWarrantyStatus(record);
          if (
            classification.status === 'RECEIVED_VERIFIED' ||
            classification.status === 'RECEIVED_PENDING'
          ) {
            warrantyNotesReceived++;
            if (record.notesReceivedDate) {
              const recDate = record.notesReceivedDate.split('T')[0];
              if (!lastSubmissionDate || recDate > lastSubmissionDate) {
                lastSubmissionDate = recDate;
              }
            }
          } else if (classification.status === 'MISSING_CONFIRMED') {
            confirmedMissingCount++;
          } else {
            // IN_DISTRIBUTOR_STOCK
            unaccountedInStockCount++;
          }
        }
      } else {
        // Fallback to customer master / followUp metrics if individual barcode records not yet populated
        totalUnitsSold = dist.warrantyNotesExpected || (followUp ? followUp.totalUnitsSold : 0);
        warrantyNotesReceived = dist.warrantyNotesReceived || (followUp ? followUp.warrantyNotesReceived : 0);
        const outstanding = calculatePendingWarrantyNotes(totalUnitsSold, warrantyNotesReceived);
        confirmedMissingCount = outstanding;
        unaccountedInStockCount = 0;
      }

      if (!lastSubmissionDate && followUp?.lastFollowUpDate) {
        lastSubmissionDate = followUp.lastFollowUpDate;
      }

      const pendingNotesCount = calculatePendingWarrantyNotes(totalUnitsSold, warrantyNotesReceived);
      const collectionProgress =
        totalUnitsSold > 0 ? Math.round((warrantyNotesReceived / totalUnitsSold) * 100) : 100;

      summaries.push({
        distributorId: dist.id,
        distributorName: dist.name,
        customerCode: dist.code,
        phone: dist.phone,
        address: dist.address,
        assignedRepId: dist.assignedRepId,
        assignedRepName: dist.assignedRepName,
        totalUnitsSold,
        warrantyNotesReceived,
        pendingNotesCount,
        confirmedMissingCount,
        unaccountedInStockCount,
        collectionProgress,
        lastSubmissionDate,
        hasOutstandingNotes: pendingNotesCount > 0,
      });
    }

    return summaries;
  }

  /**
   * Retrieves aggregated warranty statistics for a specific sales representative across all assigned distributors.
   */
  async getSalesRepWarrantySummary(
    salesRepId: string,
    salesRepName?: string
  ): Promise<SalesRepWarrantySummary> {
    const distributorSummaries = await this.getDistributorWarrantySummaries(salesRepId, 'SALES_REP');

    let totalUnitsSold = 0;
    let warrantyNotesReceived = 0;
    let confirmedMissingCount = 0;
    let unaccountedInStockCount = 0;
    let distributorsWithOutstandingNotes = 0;

    for (const d of distributorSummaries) {
      totalUnitsSold += d.totalUnitsSold;
      warrantyNotesReceived += d.warrantyNotesReceived;
      confirmedMissingCount += d.confirmedMissingCount;
      unaccountedInStockCount += d.unaccountedInStockCount;
      if (d.hasOutstandingNotes) {
        distributorsWithOutstandingNotes++;
      }
    }

    const pendingNotesCount = calculatePendingWarrantyNotes(totalUnitsSold, warrantyNotesReceived);
    const collectionProgress =
      totalUnitsSold > 0 ? Math.round((warrantyNotesReceived / totalUnitsSold) * 100) : 100;

    return {
      salesRepId,
      salesRepName: salesRepName || (distributorSummaries[0]?.assignedRepName || 'Sales Representative'),
      totalUnitsSold,
      warrantyNotesReceived,
      pendingNotesCount,
      confirmedMissingCount,
      unaccountedInStockCount,
      collectionProgress,
      distributorsCount: distributorSummaries.length,
      distributorsWithOutstandingNotes,
    };
  }

  /**
   * Retrieves individual physical unit barcodes for a distributor with status classification and search/filtering.
   */
  async getUnitBarcodesForDistributor(
    distributorId: string,
    filters?: {
      search?: string;
      status?: UnitWarrantyStatus | 'ALL';
    }
  ): Promise<UnitBarcodeWarrantyDetail[]> {
    const records = await this.repo.getRecordsByCustomerId(distributorId);
    const distributor = await this.customerRepo.getById(distributorId);

    const units: UnitBarcodeWarrantyDetail[] = records.map((record) => {
      const classification = classifyUnitWarrantyStatus(record);
      return {
        id: record.id,
        barcode: record.barcode || 'N/A',
        serialNumber: record.serialNumber,
        productId: record.productId,
        productName: record.productName,
        sku: record.sku,
        distributorId: record.customerId,
        distributorName: record.customerName,
        customerCode: distributor?.code,
        saleDate: record.saleDate,
        invoiceNumber: record.invoiceNumber,
        orderNumber: record.invoiceNumber ? `SO-${record.invoiceNumber.replace('INV-', '')}` : undefined,
        warrantyStatus: classification.status,
        statusLabel: classification.label,
        warrantyNoteId: record.warrantyNoteId,
        warrantyNoteNumber: record.warrantyNoteNumber,
        warrantyNoteReceivedDate: record.notesReceivedDate,
        endCustomerSaleDate: record.dealerSoldDate,
        endCustomerName: record.endCustomerName,
        warrantyPeriodMonths: record.warrantyPeriodMonths,
        warrantyExpiryDate: record.warrantyExpiryDate,
      };
    });

    let filtered = units;

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((u) => u.warrantyStatus === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (u) =>
          u.barcode.toLowerCase().includes(q) ||
          (u.serialNumber && u.serialNumber.toLowerCase().includes(q)) ||
          u.productName.toLowerCase().includes(q) ||
          u.sku.toLowerCase().includes(q) ||
          u.invoiceNumber.toLowerCase().includes(q) ||
          (u.endCustomerName && u.endCustomerName.toLowerCase().includes(q))
      );
    }

    return filtered;
  }
}

export const warrantyService = new WarrantyService();
