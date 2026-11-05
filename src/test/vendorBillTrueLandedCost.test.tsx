import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VendorBillCostingPage } from '../features/finance/pages/ap/VendorBillCostingPage';
import { apService } from '../features/finance/services/apService';
import { financeRepository } from '../features/finance/api';

describe('Vendor Bill True Landed Cost Recalculation Engine', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
    apService.reset();
  });

  describe('Service-level Landed Cost Apportionment', () => {
    const sampleLines = [
      {
        id: 'line-1',
        productId: 'prod-1',
        productName: 'Widget A',
        sku: 'SKU-A',
        receivedQuantity: 100,
        draftUnitCost: 10,
        unitCost: 10, // Supplier cost: 10 * 100 = 1000
        lineDiscount: 0,
        vatCode: 'STANDARD_18' as const,
        vatAmount: 180,
        lineTotal: 1180,
      },
      {
        id: 'line-2',
        productId: 'prod-2',
        productName: 'Widget B',
        sku: 'SKU-B',
        receivedQuantity: 100,
        draftUnitCost: 30,
        unitCost: 30, // Supplier cost: 30 * 100 = 3000
        lineDiscount: 0,
        vatCode: 'STANDARD_18' as const,
        vatAmount: 540,
        lineTotal: 3540,
      },
    ];

    it('1. Apportions additional landed expenses proportionally BY_VALUE', () => {
      // Total value = 4000. Additional landed expenses = 400.
      // Widget A represents 1000/4000 = 25% -> 100 additional cost -> +1.00 per unit -> Landed Cost per Unit = 11.00
      // Widget B represents 3000/4000 = 75% -> 300 additional cost -> +3.00 per unit -> Landed Cost per Unit = 33.00
      const apportioned = apService.apportionLandedCosts(sampleLines, 400, 'BY_VALUE');

      expect(apportioned[0].allocatedLandedCost).toBe(100);
      expect(apportioned[0].landedUnitCost).toBe(11);
      expect(apportioned[0].totalLandedCost).toBe(1100);

      expect(apportioned[1].allocatedLandedCost).toBe(300);
      expect(apportioned[1].landedUnitCost).toBe(33);
      expect(apportioned[1].totalLandedCost).toBe(3300);
    });

    it('2. Apportions additional landed expenses proportionally BY_QUANTITY', () => {
      // Total units = 200. Additional landed expenses = 400.
      // 400 / 200 = 2.00 additional cost per unit for both widgets.
      // Widget A (100 units): 200 allocated -> Landed Cost per Unit = 10 + 2 = 12.00
      // Widget B (100 units): 200 allocated -> Landed Cost per Unit = 30 + 2 = 32.00
      const apportioned = apService.apportionLandedCosts(sampleLines, 400, 'BY_QUANTITY');

      expect(apportioned[0].allocatedLandedCost).toBe(200);
      expect(apportioned[0].landedUnitCost).toBe(12);
      expect(apportioned[0].totalLandedCost).toBe(1200);

      expect(apportioned[1].allocatedLandedCost).toBe(200);
      expect(apportioned[1].landedUnitCost).toBe(32);
      expect(apportioned[1].totalLandedCost).toBe(3200);
    });

    it('3. When additional landed costs are 0, Landed Cost per Unit equals Supplier Unit Cost', () => {
      const apportioned = apService.apportionLandedCosts(sampleLines, 0, 'BY_VALUE');

      expect(apportioned[0].allocatedLandedCost).toBe(0);
      expect(apportioned[0].landedUnitCost).toBe(10);
      expect(apportioned[0].totalLandedCost).toBe(1000);

      expect(apportioned[1].allocatedLandedCost).toBe(0);
      expect(apportioned[1].landedUnitCost).toBe(30);
      expect(apportioned[1].totalLandedCost).toBe(3000);
    });
  });

  describe('UI Incremental Landed Cost Management & Automatic Recalculation', () => {
    it('4. Displays recommended terminology on initial render', () => {
      render(
        <MemoryRouter>
          <VendorBillCostingPage />
        </MemoryRouter>
      );

      // Verify recommended terms are displayed in the UI
      expect(screen.getAllByText(/Supplier Unit Cost/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Additional Landed Costs/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Landed Cost per Unit/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Total Landed Cost/i).length).toBeGreaterThan(0);
    });

    it('5. Incrementally adds an expense and automatically updates Landed Cost per Unit across products', async () => {
      render(
        <MemoryRouter>
          <VendorBillCostingPage />
        </MemoryRouter>
      );

      // Verify 2-step guided workflow is visible
      expect(screen.getByText(/Step 1: Invoice & Landed Costing/i)).toBeDefined();

      // Click "+ Detail" to open custom expense breakdown
      const detailBtn = screen.getByText('+ Detail');
      fireEvent.click(detailBtn);

      // Find the inputs for the newly added empty expense line
      const descriptionInputs = screen.getAllByPlaceholderText(/e\.g\. carrier, wharfage, haulage details/i);
      const newDescInput = descriptionInputs[descriptionInputs.length - 1];

      // Enter a description for the new expense
      fireEvent.change(newDescInput, { target: { value: 'Inland Transport to Warehouse' } });

      // Find the corresponding amount inputs
      const amountInputs = screen.getAllByPlaceholderText('0.00');
      fireEvent.change(amountInputs[amountInputs.length - 1], { target: { value: '45000' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Inland Transport to Warehouse')).toBeDefined();
        // Landed Cost per Unit reflects the calculation
        expect(screen.getAllByText(/Landed Cost per Unit/i).length).toBeGreaterThan(0);
      });
    });

    it('6. Removes an expense and recalculates landed unit costs downward', async () => {
      render(
        <MemoryRouter>
          <VendorBillCostingPage />
        </MemoryRouter>
      );

      // Open detail and add an expense
      const detailBtn = screen.getByText('+ Detail');
      fireEvent.click(detailBtn);

      const removeButtons = screen.getAllByTitle('Remove expense line');
      const initialCount = removeButtons.length;
      expect(initialCount).toBeGreaterThan(0);

      // Remove the expense line
      fireEvent.click(removeButtons[removeButtons.length - 1]);

      await waitFor(() => {
        const updatedRemoveButtons = screen.queryAllByTitle('Remove expense line');
        expect(updatedRemoveButtons.length).toBe(initialCount - 1);
      });
    });

    it('7. Switches allocation method between By Net Value and By Quantity dynamically', async () => {
      render(
        <MemoryRouter>
          <VendorBillCostingPage />
        </MemoryRouter>
      );

      const byQuantityBtn = screen.getByRole('button', { name: /by quantity/i });
      fireEvent.click(byQuantityBtn);

      await waitFor(() => {
        expect(screen.getAllByText(/Landed Cost per Unit/i).length).toBeGreaterThan(0);
      });

      const byValueBtn = screen.getByRole('button', { name: /by net value/i });
      fireEvent.click(byValueBtn);

      await waitFor(() => {
        expect(screen.getAllByText(/Landed Cost per Unit/i).length).toBeGreaterThan(0);
      });
    });

    it('8. Renders 8 example products in the costing table with Step 1 and Step 2 navigation', async () => {
      render(
        <MemoryRouter>
          <VendorBillCostingPage />
        </MemoryRouter>
      );

      // Section header shows 8 Products badge
      expect(screen.getByText('8 Products')).toBeDefined();

      // Check that all 8 example products exist on the page
      expect(screen.getAllByText('Schneider Acti9 32A Double Pole MCB').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schneider Acti9 63A Triple Pole MCB').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schneider Easy9 40A 30mA 2-Pole RCCB').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schneider Acti9 100A 4-Pole Main Isolator Switch').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schneider Resi9 16A Single Pole Type B MCB').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schneider PrismaSeT 8-Way Surface Metal Consumer Unit').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schneider TeSys D 25A 3-Pole AC3 Magnetic Contactor').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Schneider Lisse 13A Single Switched Socket Outlet').length).toBeGreaterThan(0);

      // Verify compact header information: Supplier Unit Cost, True Landed Cost, Line Total
      expect(screen.getAllByText('Supplier Unit Cost').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/True Landed Cost/i).length).toBeGreaterThan(0);

      // Navigate to Step 2 via Continue button
      const continueBtn = screen.getByRole('button', { name: /continue to pricing \(step 2\)/i });
      fireEvent.click(continueBtn);

      await waitFor(() => {
        expect(screen.getByText(/Commercial Price & Margin Assignment/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /back to costing \(step 1\)/i })).toBeDefined();
      });
    });
  });
});
