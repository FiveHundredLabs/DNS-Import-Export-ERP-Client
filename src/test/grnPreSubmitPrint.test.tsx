import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GRNCreateEditPage } from '../features/inventory/GRNCreateEditPage';
import { User } from '../types/auth';

const mockStockKeeper: User = {
  id: 'usr-107',
  name: 'Gamini Silva',
  email: 'warehouse@dnserp.com',
  role: 'STOCK_KEEPER',
  phone: '+94 77 789 0123',
  isActive: true,
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: mockStockKeeper,
    role: 'STOCK_KEEPER',
    user: mockStockKeeper,
  }),
}));

describe('GRN Pre-Submission Print & Enterprise Layout', () => {
  it('allows stock keeper to preview and print official GRN before submitting for approval', async () => {
    render(
      <MemoryRouter>
        <GRNCreateEditPage />
      </MemoryRouter>
    );

    // Initial load: Step 1 (Receiving Details & Inbound Source)
    expect(screen.getByText(/Step 1: Receiving Details & Inbound Source/i)).toBeInTheDocument();

    // Select an existing PO via quick select button
    const poButtons = screen.getAllByRole('button', { name: /PO-202/i });
    expect(poButtons.length).toBeGreaterThan(0);
    fireEvent.click(poButtons[0]);

    // Or supplier name input
    const supplierInput = screen.getByPlaceholderText(/Type or select supplier/i);
    expect(supplierInput).toBeInTheDocument();
    fireEvent.change(supplierInput, { target: { value: 'Schneider Electric Lanka (Pvt) Ltd' } });

    // Click Next Step to Step 2
    const nextBtn = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn);

    // Now in Step 2, items are preloaded or can be reviewed
    // Check that "Print GRN" button is accessible in navigation bar once items exist
    await waitFor(() => {
      const printBtn = screen.getByRole('button', { name: /^Print GRN$/i });
      expect(printBtn).toBeInTheDocument();
      
      // Click Print GRN to open preview before submitting
      fireEvent.click(printBtn);
    });

    // The enterprise standard A4 print preview dialog should open
    await waitFor(() => {
      expect(screen.getByText('Official Goods Received Note — Print Preview')).toBeInTheDocument();
      expect(screen.getByText('DNS Import & Export (Pvt) Ltd')).toBeInTheDocument();
      expect(screen.getByText(/Received & Counted By/i)).toBeInTheDocument();
      expect(screen.getByText(/Verified & Approved By/i)).toBeInTheDocument();
    });

    // Verify Print (A4) action button is present inside the preview modal
    const printA4Btn = screen.getByRole('button', { name: /Print \(A4\)/i });
    expect(printA4Btn).toBeInTheDocument();
  });
});
