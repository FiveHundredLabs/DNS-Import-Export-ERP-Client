import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DeliveryNoteCreatePage } from '../features/inventory/delivery-notes/DeliveryNoteCreatePage';
import { DeliveryNoteDetailPage } from '../features/inventory/delivery-notes/DeliveryNoteDetailPage';
import { deliveryNoteService } from '../services/DeliveryNoteService';
import { UserRole } from '../types/auth';

const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockStockKeeper = {
  id: 'sk-01',
  name: 'Sunil Weeraratne',
  email: 'sunil.stock@dnserp.com',
  role: 'STOCK_KEEPER' as UserRole,
  phone: '+94 77 123 4567',
  isActive: true,
};

describe('Delivery Note Permanent Lock & Double-Confirmation Workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    deliveryNoteService.resetToDefaults();
    mockUseAuth.mockReturnValue({
      role: 'STOCK_KEEPER' as UserRole,
      currentUser: mockStockKeeper,
      isAuthenticated: true,
      canAccessRoute: () => true,
      hasPermission: () => true,
    });
  });

  describe('1. Double-Confirmation Process Before Final Submission', () => {
    it('prompts the user with a double-confirmation modal before creating a Delivery Note', async () => {
      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/new?invoiceId=inv-draft-002']}>
          <Routes>
            <Route path="/inventory/delivery-notes/new" element={<DeliveryNoteCreatePage />} />
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for draft invoice items to load
      await waitFor(() => {
        expect(screen.getByText('ABB 100A 4P MCCB Adjustable 36kA')).toBeInTheDocument();
      });

      // Enter driver details & vehicle number
      const driverInput = screen.getByPlaceholderText(/e\.g\. Kamal Silva/i);
      fireEvent.change(driverInput, { target: { value: 'Saman Jayatilleke' } });

      const vehicleInput = screen.getByPlaceholderText(/e\.g\. WP WP-8921/i);
      fireEvent.change(vehicleInput, { target: { value: 'WP LH-7722' } });

      // Allocate stock barcodes
      const pickBtn = screen.getByRole('button', { name: /pick from stock/i });
      fireEvent.click(pickBtn);

      await waitFor(() => {
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
      });

      // Click "Save & Dispatch Delivery Note"
      const submitBtn = screen.getByRole('button', { name: /save & dispatch delivery note/i });
      fireEvent.click(submitBtn);

      // 1. Verify modal title & permanent lock badge
      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery Note Creation')).toBeInTheDocument();
        expect(screen.getByText('Permanent Lock')).toBeInTheDocument();
      });

      // 2. Verify explicit communication that DN cannot be edited after creation
      expect(
        screen.getByText(/CRITICAL: Once created, this Delivery Note cannot be edited/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Delivery Notes become permanently non-editable immediately upon creation/i
        )
      ).toBeInTheDocument();

      // 3. Verify verified details summary
      expect(screen.getByText('Saman Jayatilleke')).toBeInTheDocument();
      expect(screen.getByText('WP LH-7722')).toBeInTheDocument();
      expect(screen.getByText('Verified Goods & Allocated Unit Barcodes')).toBeInTheDocument();
      expect(screen.getAllByText(/2 Units/i).length).toBeGreaterThan(0);

      // 4. Verify Finalize button is disabled until acknowledgment checkbox is checked
      const finalizeBtn = screen.getByRole('button', {
        name: /confirm & finalize delivery note/i,
      });
      expect(finalizeBtn).toBeDisabled();

      // 5. Test "Go Back & Edit Details" closes the modal without submitting
      const goBackBtn = screen.getByRole('button', { name: /go back & edit details/i });
      fireEvent.click(goBackBtn);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Delivery Note Creation')).not.toBeInTheDocument();
      });

      // Form inputs should still retain their values
      expect(driverInput).toHaveValue('Saman Jayatilleke');
      expect(vehicleInput).toHaveValue('WP LH-7722');
    });

    it('successfully creates delivery note and navigates to detail page after acknowledgment', async () => {
      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/new?invoiceId=inv-draft-002']}>
          <Routes>
            <Route path="/inventory/delivery-notes/new" element={<DeliveryNoteCreatePage />} />
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('ABB 100A 4P MCCB Adjustable 36kA')).toBeInTheDocument();
      });

      const driverInput = screen.getByPlaceholderText(/e\.g\. Kamal Silva/i);
      fireEvent.change(driverInput, { target: { value: 'Gamini Dissanayake' } });

      const vehicleInput = screen.getByPlaceholderText(/e\.g\. WP WP-8921/i);
      fireEvent.change(vehicleInput, { target: { value: 'CP ND-4401' } });

      const pickBtn = screen.getByRole('button', { name: /pick from stock/i });
      fireEvent.click(pickBtn);

      await waitFor(() => {
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
      });

      // Open confirm modal
      const submitBtn = screen.getByRole('button', { name: /save & dispatch delivery note/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Confirm Delivery Note Creation')).toBeInTheDocument();
      });

      // Check acknowledgment checkbox
      const ackCheckbox = screen.getByRole('checkbox');
      expect(ackCheckbox).not.toBeChecked();
      fireEvent.click(ackCheckbox);
      expect(ackCheckbox).toBeChecked();

      // Finalize button should now be enabled
      const finalizeBtn = screen.getByRole('button', {
        name: /confirm & finalize delivery note/i,
      });
      expect(finalizeBtn).not.toBeDisabled();
      fireEvent.click(finalizeBtn);

      // Verifies navigation to detail page
      await waitFor(() => {
        expect(screen.getByText(/Dispatched \/ In Transit/i)).toBeInTheDocument();
        expect(screen.getByText('Gamini Dissanayake')).toBeInTheDocument();
        expect(screen.getByText('CP ND-4401')).toBeInTheDocument();
        expect(screen.getByText('Permanently Non-Editable')).toBeInTheDocument();
      });
    });
  });

  describe('2. Removal of Edit Option & Permanent Immutability', () => {
    it('ensures Edit Transport option and inline editing are completely removed from DeliveryNoteDetailPage', async () => {
      render(
        <MemoryRouter initialEntries={['/inventory/delivery-notes/dn-001']}>
          <Routes>
            <Route path="/inventory/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('DN-2026-0001')).toBeInTheDocument();
      });

      // 1. Verify "Edit Transport" button does NOT exist
      expect(screen.queryByRole('button', { name: /edit transport/i })).toBeNull();
      expect(screen.queryByText(/edit transport/i)).toBeNull();
      expect(screen.queryByText(/cancel edit/i)).toBeNull();

      // 2. Verify "Permanently Non-Editable" badge is present
      expect(screen.getByText('Permanently Non-Editable')).toBeInTheDocument();

      // 3. Verify audit lock notice in logistics card
      expect(screen.getByText(/Locked upon dispatch creation/i)).toBeInTheDocument();
      expect(screen.getByText(/Audit: Immutable/i)).toBeInTheDocument();

      // 4. Verify existing actions remain functional (Print, Barcodes)
      expect(screen.getByRole('button', { name: /print delivery note/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /print barcode stickers/i })).toBeInTheDocument();
    });

    it('backend/service strictly throws error when attempting to update a created Delivery Note', async () => {
      const allNotes = await deliveryNoteService.getAll();
      expect(allNotes.length).toBeGreaterThan(0);
      const targetNote = allNotes[0];

      // Attempting to modify driver details or vehicle number must throw an Error
      await expect(
        deliveryNoteService.updateDeliveryNote(targetNote.id, {
          driverName: 'Unauthorized Driver Change',
          vehicleNumber: 'WP XX-9999',
        })
      ).rejects.toThrow(/permanently non-editable/i);
    });

    it('newly created delivery notes have isLocked set to true', async () => {
      const draftInvoices = await deliveryNoteService.getDraftInvoices();
      const testInvoice = draftInvoices[0];

      const newDN = await deliveryNoteService.createDeliveryNote(
        {
          invoiceId: testInvoice.id,
          driverName: 'Nalin Perera',
          driverPhone: '+94 77 555 4321',
          vehicleNumber: 'WP AA-1234',
          dispatchDate: '2026-11-05',
          items: testInvoice.items.map((it) => ({
            productId: it.productId,
            productName: it.productNameSnapshot,
            sku: it.skuSnapshot,
            invoicedQuantity: it.quantity,
            unitBarcodes: [`BC-${it.productId}-001`],
          })),
        },
        mockStockKeeper
      );

      expect(newDN.isLocked).toBe(true);
      expect(newDN.driverName).toBe('Nalin Perera');

      // Attempting to edit this newly created DN must also fail
      await expect(
        deliveryNoteService.updateDeliveryNote(newDN.id, {
          driverName: 'Illegal Change',
        })
      ).rejects.toThrow(/permanently non-editable/i);
    });
  });
});
