import { GRNItem, UnitBarcodeRecord } from '../types/inventory';
import { MOCK_PRODUCTS } from '../mock/mockProducts';

/**
 * Service to manage unit-level barcode generation, physical sticker printing,
 * and confirmation workflow for GRN inbound receiving.
 */
export class UnitBarcodeService {
  /**
   * Generates a unit-wise barcode set for a GRN line item.
   * If good quantity is 5, generates 5 distinct system barcodes.
   * Also checks if the product is serialized and links the serial number if available.
   */
  generateUnitBarcodesForLine(item: GRNItem, grnNumber: string = 'GRN-NEW'): UnitBarcodeRecord[] {
    const goodQty = Math.max(0, item.receivedQuantity - (item.damagedQuantity || 0));
    if (goodQty === 0) return [];

    const cleanSku = (item.skuSnapshot || 'ITEM')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 10);
    const grnSuffix = grnNumber.replace(/[^A-Za-z0-9]/g, '').slice(-4).toUpperCase() || 'WH1';

    const records: UnitBarcodeRecord[] = [];

    for (let i = 1; i <= goodQty; i++) {
      const seq = String(i).padStart(3, '0');
      // Format: DNS-{CLEAN_SKU}-{GRN_SUFFIX}-{SEQ} e.g. DNS-MCB32A2P-0891-001
      const unitBarcode = `DNS-${cleanSku}-${grnSuffix}-${seq}`;

      // Check for matching unit serial number (if product has serials)
      const serialNumber = item.serialNumbers && item.serialNumbers[i - 1]
        ? item.serialNumbers[i - 1]
        : undefined;

      records.push({
        unitIndex: i,
        unitBarcode,
        serialNumber,
        status: 'PENDING_LABEL',
        labeledAt: undefined,
      });
    }

    return records;
  }

  /**
   * Generates unit barcodes for all line items in a GRN.
   */
  generateAllForGRN(items: GRNItem[], grnNumber: string = 'GRN-NEW'): GRNItem[] {
    return items.map((item) => {
      const goodQty = Math.max(0, item.receivedQuantity - (item.damagedQuantity || 0));
      if (goodQty === 0) return item;

      // If already generated and length matches current goodQty, preserve it
      if (item.unitRecords && item.unitRecords.length === goodQty) {
        return item;
      }

      const records = this.generateUnitBarcodesForLine(item, grnNumber);
      return {
        ...item,
        unitRecords: records,
        unitBarcodes: records.map((r) => r.unitBarcode),
        // If count changed, require re-confirmation
        barcodesConfirmed: item.barcodesConfirmed && records.length === item.unitRecords?.length,
      };
    });
  }

  /**
   * Confirms that all physical stickers for an item have been affixed to units in warehouse.
   */
  confirmItemAffixed(item: GRNItem): GRNItem {
    const now = new Date().toISOString();
    const updatedRecords = (item.unitRecords || []).map((r) => ({
      ...r,
      status: 'LABELED' as const,
      labeledAt: now,
    }));

    return {
      ...item,
      unitRecords: updatedRecords,
      unitBarcodes: updatedRecords.map((r) => r.unitBarcode),
      barcodesConfirmed: true,
      barcodesConfirmedAt: now,
    };
  }

  /**
   * Confirms all items across the GRN have been labeled.
   */
  confirmAllAffixed(items: GRNItem[]): GRNItem[] {
    return items.map((item) => {
      if (!item.unitRecords || item.unitRecords.length === 0) {
        const records = this.generateUnitBarcodesForLine(item);
        const now = new Date().toISOString();
        return {
          ...item,
          unitRecords: records.map((r) => ({ ...r, status: 'LABELED' as const, labeledAt: now })),
          unitBarcodes: records.map((r) => r.unitBarcode),
          barcodesConfirmed: true,
          barcodesConfirmedAt: now,
        };
      }
      return this.confirmItemAffixed(item);
    });
  }

  /**
   * Verifies if all received units in the GRN have had their barcodes generated and confirmed.
   */
  isGRNFullyLabeled(items: GRNItem[]): boolean {
    if (!items || items.length === 0) return false;
    return items.every((item) => {
      const goodQty = item.receivedQuantity - (item.damagedQuantity || 0);
      if (goodQty <= 0) return true;
      return (
        item.barcodesConfirmed === true &&
        item.unitRecords &&
        item.unitRecords.length >= goodQty
      );
    });
  }

  /**
   * Returns summary counts of total units, generated barcodes, and confirmed stickers.
   */
  getSummary(items: GRNItem[]) {
    let totalUnits = 0;
    let generatedBarcodes = 0;
    let confirmedUnits = 0;
    let serializedUnits = 0;

    items.forEach((item) => {
      const good = Math.max(0, item.receivedQuantity - (item.damagedQuantity || 0));
      totalUnits += good;

      if (item.unitRecords && item.unitRecords.length > 0) {
        generatedBarcodes += item.unitRecords.length;
        serializedUnits += item.unitRecords.filter((r) => !!r.serialNumber).length;
      }

      if (item.barcodesConfirmed) {
        confirmedUnits += good;
      }
    });

    return {
      totalUnits,
      generatedBarcodes,
      confirmedUnits,
      pendingUnits: totalUnits - confirmedUnits,
      serializedUnits,
      isFullyConfirmed: totalUnits > 0 && confirmedUnits >= totalUnits,
    };
  }
}

export const unitBarcodeService = new UnitBarcodeService();
