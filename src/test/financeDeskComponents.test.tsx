import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinanceDeskPage } from '../features/finance/pages/FinanceDeskPage';
import { financeRepository } from '../features/finance/api';

describe('Phase F-3: The Finance Desk Universal Debit/Credit UI', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  it('renders the Finance Desk and blocks submission when lines are unbalanced', async () => {
    render(<FinanceDeskPage />);

    expect(screen.getByText('The Finance Desk')).toBeDefined();
    expect(screen.getByText('Awaiting Journal Line Items')).toBeDefined();

    const postBtn = screen.getByRole('button', { name: /post entry/i });
    expect(postBtn).toBeDefined();
    expect((postBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('applies one-click preset, balances the entry, and enables post commitment', async () => {
    render(<FinanceDeskPage />);

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('JE-1001')).toBeDefined();
    });

    const supplierPresetBtn = screen.getByRole('button', { name: /pay supplier bill/i });
    fireEvent.click(supplierPresetBtn);

    // Balancing bar becomes balanced
    await waitFor(() => {
      expect(screen.getByText('Entry In Balance (Σ Debits = Σ Credits)')).toBeDefined();
      expect(screen.getByText('Invariant Verified')).toBeDefined();
    });

    const postBtn = screen.getByRole('button', { name: /post entry/i });
    expect((postBtn as HTMLButtonElement).disabled).toBe(false);

    // Post Entry
    fireEvent.click(postBtn);

    // Form resets after submission
    await waitFor(() => {
      expect(screen.getByText('Awaiting Journal Line Items')).toBeDefined();
    });
  });
});
