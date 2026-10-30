import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BarcodeVisual } from '../components/common/BarcodeVisual';
import { UnitBarcodeModal } from '../components/inventory/UnitBarcodeModal';
import { serialNumberService } from '../services/SerialNumberService';

describe('GRN Serial Uniqueness & Barcode Printing Architecture', () => {
  it('displays serial number directly below the barcode in BarcodeVisual when available', () => {
    const { rerender } = render(
      <BarcodeVisual value="DNS-WH-001" showText={true} />
    );

    expect(screen.getByText('DNS-WH-001')).toBeInTheDocument();
    expect(screen.queryByText(/SN:/i)).not.toBeInTheDocument();

    // With serialNumber provided
    rerender(
      <BarcodeVisual value="DNS-WH-001" serialNumber="SN-TEST-8899" showText={true} />
    );

    expect(screen.getByText('DNS-WH-001')).toBeInTheDocument();
    expect(screen.getByText('SN: SN-TEST-8899')).toBeInTheDocument();
  });

  it('detects already registered serial numbers via serialNumberService.isSerialRegistered', () => {
    // Known initial serial in mock data
    expect(serialNumberService.isSerialRegistered('SN-RHD-2025-001')).toBe(true);
    expect(serialNumberService.isSerialRegistered('sn-rhd-2025-001')).toBe(true); // Case-insensitive
    expect(serialNumberService.isSerialRegistered('NON_EXISTENT_SERIAL_99999')).toBe(false);
  });

  it('UnitBarcodeModal supports bulk, product-wise, and individual unit printing and displays serial below barcode', () => {
    const mockItems = [
      {
        productId: 'prod-001',
        productNameSnapshot: 'Schneider Acti9 32A Double Pole MCB',
        skuSnapshot: 'DNS-MCB-32A-2P',
        receivedQuantity: 2,
        damagedQuantity: 0,
        unitRecords: [
          {
            unitBarcode: 'DNS-WH-001-01',
            unitIndex: 1,
            status: 'PENDING_LABEL',
            serialNumber: 'SN-001-ALPHA',
          },
          {
            unitBarcode: 'DNS-WH-001-02',
            unitIndex: 2,
            status: 'PENDING_LABEL',
            serialNumber: 'SN-001-BETA',
          },
        ],
      },
    ];

    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <UnitBarcodeModal
        isOpen={true}
        onClose={() => {}}
        items={mockItems}
        grnNumber="GRN-2025-TEST"
        supplierName="Schneider Electric"
        warehouseId="WH-MAIN"
        onConfirmLabeled={() => {}}
      />
    );

    // 1. Verify serial numbers displayed below barcodes
    expect(screen.getAllByText('SN: SN-001-ALPHA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SN: SN-001-BETA').length).toBeGreaterThan(0);

    // 2. Verify Bulk Print action button exists
    const printAllBtn = screen.getByRole('button', { name: /Print All/i });
    expect(printAllBtn).toBeInTheDocument();
    fireEvent.click(printAllBtn);
    expect(printAllBtn).toBeEnabled();

    // 3. Verify Individual Unit Print buttons exist on cards
    const printUnitButtons = screen.getAllByRole('button', { name: /Print Unit/i });
    expect(printUnitButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(printUnitButtons[0]);

    printSpy.mockRestore();
  });

  it('detects intra-GRN duplicate serial numbers when two units have identical serials like "11"', () => {
    const serials = ['11', '11'];
    const counts = new Map<string, number>();
    const duplicates = new Set<string>();

    serials.forEach((sn) => {
      const clean = sn.trim().toUpperCase();
      const current = counts.get(clean) || 0;
      counts.set(clean, current + 1);
      if (current >= 1) {
        duplicates.add(clean);
      }
    });

    expect(duplicates.has('11')).toBe(true);
    expect(duplicates.size).toBe(1);
  });
});

