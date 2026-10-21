export interface GlobalTaxConfig {
  /**
   * Whether tax is globally applied to newly created Quotations and Invoices.
   */
  taxEnabled: boolean;

  /**
   * Configurable tax percentage rate (e.g., 18 for 18% VAT).
   */
  taxRate: number;

  /**
   * Statutory tax name or label (e.g., 'VAT', 'GST', 'Sales Tax').
   * Default: 'VAT'
   */
  taxName: string;

  /**
   * Timestamp when the configuration was last modified.
   */
  updatedAt?: string;

  /**
   * User ID of the Director who saved the configuration.
   */
  updatedBy?: string;

  /**
   * Name of the Director who saved the configuration.
   */
  updatedByName?: string;

  /**
   * Optional notes, statutory reference, or description.
   */
  description?: string;
}

export interface TaxCalculationResult {
  subtotal: number;
  discountAmount: number;
  netAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  taxEnabled: boolean;
}
