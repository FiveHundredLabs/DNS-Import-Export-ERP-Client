import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CommercialNotesPage } from '../features/finance/pages/CommercialNotesPage';
import { ChartOfAccountsPage } from '../features/finance/pages/ChartOfAccountsPage';
import { customerCreditNoteService } from '../features/finance/services/customerCreditNoteService';
import { apService } from '../features/finance/services/apService';
import { arService } from '../features/finance/services/arService';
import { categoryService } from '../features/finance/services/categoryService';
import { financeRepository } from '../features/finance/api';

describe('Unified Commercial Notes Desk & Chart of Accounts Category Tree', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  describe('1. Unified Commercial Notes Desk (/finance/notes)', () => {
    it('defaults to Customer Credit Notes (AR) view when navigating to /finance/notes', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/notes']}>
          <Routes>
            <Route path="/finance/notes" element={<CommercialNotesPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify the unified segmented switcher is rendered
      expect(screen.getByRole('button', { name: /Customer Credit Notes \(AR\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Supplier Debit Notes \(AP\)/i })).toBeInTheDocument();

      // Verify AR view is active by default
      expect(screen.getByRole('heading', { name: /Customer Credit Notes/i })).toBeInTheDocument();
      expect(screen.getByText(/AR Returns & Revenue Reversal/i)).toBeInTheDocument();
    });

    it('switches to Supplier Debit Notes (AP) view when the segmented switch is clicked', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/notes']}>
          <Routes>
            <Route path="/finance/notes" element={<CommercialNotesPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Click Supplier Debit Notes (AP)
      const debitBtn = screen.getByRole('button', { name: /Supplier Debit Notes \(AP\)/i });
      fireEvent.click(debitBtn);

      // Verify AP Debit Notes view is displayed
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Supplier Debit Notes/i })).toBeInTheDocument();
      });
    });

    it('loads directly into Supplier Debit Notes (AP) when URL has ?tab=debit', async () => {
      render(
        <MemoryRouter initialEntries={['/finance/notes?tab=debit']}>
          <Routes>
            <Route path="/finance/notes" element={<CommercialNotesPage />} />
          </Routes>
        </MemoryRouter>
      );

      // AP Debit Notes should be active immediately
      expect(screen.getByRole('heading', { name: /Supplier Debit Notes/i })).toBeInTheDocument();
    });

    it('retains independent services: customerCreditNoteService and apService operate separately', async () => {
      const creditNotes = customerCreditNoteService.getCreditNotes();
      const debitNotes = apService.getDebitNotes();

      expect(Array.isArray(creditNotes)).toBe(true);
      expect(Array.isArray(debitNotes)).toBe(true);

      // Ensure customer credit notes have customerId and debit notes have supplierId
      if (creditNotes.length > 0) {
        expect(creditNotes[0].customerId).toBeDefined();
      }
      if (debitNotes.length > 0) {
        expect(debitNotes[0].supplierId).toBeDefined();
      }
    });
  });

  describe('2. Chart of Accounts Category Folder Tree Explorer (1000 Assets -> 1001 Current Assets)', () => {
    it('renders the Category Folder Tree explorer with 1000 Assets -> 1001 Current Assets branch', async () => {
      render(
        <MemoryRouter>
          <ChartOfAccountsPage />
        </MemoryRouter>
      );

      // Switch to Categories Tree view (Al Akleel segmented switcher)
      const catTreeBtn = screen.getByRole('button', { name: /Categories Tree/i });
      fireEvent.click(catTreeBtn);

      // Verify the sub-category folder tree branch appears: 1000 Assets -> 1001 Current Assets
      await waitFor(() => {
        expect(screen.getByText('1001 Current Assets')).toBeInTheDocument();
        expect(screen.getByText('1500 Non-Current Assets')).toBeInTheDocument();
      });

      // Switch back to Accounts Registry
      const accountsBtn = screen.getByRole('button', { name: /Accounts Registry/i });
      fireEvent.click(accountsBtn);

      // Check that accounts are displayed
      await waitFor(() => {
        expect(screen.getByText('Bank Account')).toBeInTheDocument();
      });
    });

    it('creates a custom sub-category under Assets and allows deletion when no accounts are attached', async () => {
      // Create custom category via service
      const newCat = categoryService.createCategory({
        code: '1099',
        name: 'Test Liquid Investments',
        accountClass: 'ASSET',
        accountSubClass: 'CURRENT_ASSET',
        parentId: 'cat-1000',
        description: 'Test subcategory',
      });

      expect(newCat.code).toBe('1099');
      expect(newCat.name).toBe('Test Liquid Investments');

      // Verify it can be retrieved
      const fetched = categoryService.getCategoryByCode('1099');
      expect(fetched).toBeDefined();

      // Deleting empty custom subcategory succeeds (not blocked by existing current assets)
      const deleted = categoryService.deleteCategory(newCat.id);
      expect(deleted).toBe(true);
      expect(categoryService.getCategoryByCode('1099')).toBeUndefined();
    });

    it('records an income receipt with a specific revenue account (4010) and credits revenue in GL', async () => {
      const receipt = await arService.createReceipt({
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'CUST-001',
        paymentMethod: 'BANK_TRANSFER',
        amount: 150000,
        incomeAccountId: 'acc-4010',
        incomeAccountCode: '4010',
        remarks: 'Direct wholesale consultation fee',
        autoApprove: true,
      });

      expect(receipt.status).toBe('APPROVED');
      expect(receipt.incomeAccountCode).toBe('4010');

      // Verify GL Journal Entry
      const journals = await financeRepository.getJournalEntries();
      const gl = journals.find((j) => j.reference === receipt.receiptNumber);
      expect(gl).toBeDefined();

      // Verify debit 1010 Bank and credit 4010 Revenue
      const creditLine = gl?.lines.find((l) => l.credit === 150000);
      expect(creditLine?.accountId).toBe('acc-4010');
    });
  });
});
