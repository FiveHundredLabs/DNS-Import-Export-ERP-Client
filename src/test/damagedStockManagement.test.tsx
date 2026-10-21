import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DamagedStockPage } from '../features/inventory/DamagedStockPage';
import { apService } from '../features/finance/services/apService';
import { inventoryService } from '../services/InventoryService';
import { MockInventoryRepository } from '../repositories/mock/MockInventoryRepository';
import { StockBalance } from '../types/inventory';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'usr-admin',
      name: 'Admin User',
      email: 'admin@dnserp.com',
      role: 'MANAGER',
    },
    role: 'MANAGER',
    hasPermission: () => true,
  }),
}));

describe('Damaged Stock Management Subsystem (Phase 5)', () => {
  let invRepo: MockInventoryRepository;

  beforeEach(() => {
    invRepo = new MockInventoryRepository();
  });

  it('renders damaged stock workspace with header and KPI metrics', async () => {
    render(<DamagedStockPage />);

    expect(screen.getByText('Damaged Product & RMA Management')).toBeTruthy();
    expect(screen.getByText('Total Damaged Units')).toBeTruthy();
    expect(screen.getByText('Damaged Valuation')).toBeTruthy();
    expect(screen.getByText('Pending Debit Notes')).toBeTruthy();
    expect(screen.getByText('Damaged Inventory Registry')).toBeTruthy();
  });

  it('displays damaged product rows and action flow buttons', async () => {
    render(<DamagedStockPage />);

    await waitFor(() => {
      // Check for presence of Return to Supplier, Scrap, and Repair buttons
      const returnButtons = screen.getAllByText('Return to Supplier');
      const scrapButtons = screen.getAllByText('Scrap / Write-Off');
      const repairButtons = screen.getAllByText('Repair & Restore');

      expect(returnButtons.length).toBeGreaterThan(0);
      expect(scrapButtons.length).toBeGreaterThan(0);
      expect(repairButtons.length).toBeGreaterThan(0);
    });
  });

  it('opens Return to Supplier modal and submits Debit Note', async () => {
    const postDebitNoteSpy = vi.spyOn(apService, 'postSupplierDebitNote');

    render(<DamagedStockPage />);

    await waitFor(() => {
      const returnButtons = screen.getAllByText('Return to Supplier');
      expect(returnButtons.length).toBeGreaterThan(0);
    });

    // Click first Return to Supplier button
    const returnBtn = screen.getAllByText('Return to Supplier')[0];
    fireEvent.click(returnBtn);

    // Modal opens
    expect(screen.getByText('Return Damaged Stock to Supplier via Debit Note')).toBeTruthy();
    expect(screen.getByText('Post Debit Note & Deduct')).toBeTruthy();

    // Submit debit note
    const submitBtn = screen.getByText('Post Debit Note & Deduct');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postDebitNoteSpy).toHaveBeenCalled();
    });

    postDebitNoteSpy.mockRestore();
  });

  it('opens Scrap / Write-Off modal and clears damaged quantity', async () => {
    render(<DamagedStockPage />);

    await waitFor(() => {
      const scrapButtons = screen.getAllByText('Scrap / Write-Off');
      expect(scrapButtons.length).toBeGreaterThan(0);
    });

    const scrapBtn = screen.getAllByText('Scrap / Write-Off')[0];
    fireEvent.click(scrapBtn);

    expect(screen.getByText('Write-Off Damaged Stock to Scrap')).toBeTruthy();
    expect(screen.getByText('Confirm Scrap Write-Off')).toBeTruthy();

    const confirmBtn = screen.getByText('Confirm Scrap Write-Off');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText('Write-Off Damaged Stock to Scrap')).toBeNull();
    });
  });

  it('opens Repair & Restore modal and calls executeDamageReversal to restore available stock', async () => {
    const reversalSpy = vi.spyOn(inventoryService, 'executeDamageReversal');

    render(<DamagedStockPage />);

    await waitFor(() => {
      const repairButtons = screen.getAllByText('Repair & Restore');
      expect(repairButtons.length).toBeGreaterThan(0);
    });

    const repairBtn = screen.getAllByText('Repair & Restore')[0];
    fireEvent.click(repairBtn);

    expect(screen.getByText('Repair & Restore Stock to Available Inventory')).toBeTruthy();
    expect(screen.getByText('Restore to Available Stock')).toBeTruthy();

    const restoreBtn = screen.getByText('Restore to Available Stock');
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(reversalSpy).toHaveBeenCalled();
    });

    reversalSpy.mockRestore();
  });
});
