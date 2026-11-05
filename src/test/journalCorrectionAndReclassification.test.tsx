import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ManualJournalPage } from '../features/finance/pages/journal/ManualJournalPage';
import { financeRepository } from '../features/finance/api';
import { periodLockService } from '../features/finance/services/periodLockService';

describe('Journal Entry Re-Correction & Reclassification Module', () => {
  beforeEach(async () => {
    localStorage.clear();
    await financeRepository.resetToDefaults();
    periodLockService.reset();
  });

  describe('Repository & Service Engine: Correct & Reissue', () => {
    it('1. Voids original posted journal and generates linked draft replacement voucher with lineage', async () => {
      // Get baseline balances before transaction
      const initialAcc6030 = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-6030')!.currentBalance);
      const initialAcc1010 = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-1010')!.currentBalance);

      // 1. Create and post a journal
      const original = await financeRepository.createJournalEntry({
        date: '2026-11-01',
        description: 'Office Maintenance Service Invoice #8812',
        reference: 'INV-8812',
        status: 'POSTED',
        lines: [
          { accountId: 'acc-6030', debit: 25000, credit: 0, description: 'Maintenance fee' },
          { accountId: 'acc-1010', debit: 0, credit: 25000, description: 'Bank transfer' },
        ],
      });

      expect(original.status).toBe('POSTED');
      expect(original.entryNumber).toBeDefined();

      // Verify that after posting, acc-6030 was debited and acc-1010 was credited
      const acc6030Posted = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-6030')!.currentBalance);
      expect(acc6030Posted).toBe(initialAcc6030 + 25000);

      // 2. Perform Re-correction
      const { original: voidedOriginal, replacement } = await financeRepository.correctAndReissueJournalEntry(
        original.id,
        'Wrong expense classification: should have been 6020 Logistics'
      );

      // Verify original is voided and cross-linked
      expect(voidedOriginal.status).toBe('VOIDED');
      expect(voidedOriginal.voidReason).toContain('Wrong expense classification');
      expect(voidedOriginal.correctedBy).toBe(replacement.entryNumber);

      // Verify replacement draft
      expect(replacement.status).toBe('DRAFT');
      expect(replacement.correctionOf).toBe(original.entryNumber);
      expect(replacement.correctionType).toBe('REISSUE');
      expect(replacement.correctionReason).toBe('Wrong expense classification: should have been 6020 Logistics');
      expect(replacement.lines.length).toBe(2);
      expect(replacement.lines[0].debit).toBe(25000);
      expect(replacement.lines[1].credit).toBe(25000);

      // Verify GL account balances were reversed back to baseline when original was voided
      const acc6030After = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-6030')!.currentBalance);
      const acc1010After = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-1010')!.currentBalance);

      expect(acc6030After).toBe(initialAcc6030);
      expect(acc1010After).toBe(initialAcc1010);
    });

    it('2. Protects closed periods and rejects direct voiding of past transactions in locked period', async () => {
      // 1. Create an entry in October when period is open
      const octEntry = await financeRepository.createJournalEntry({
        date: '2026-10-15',
        description: 'October Supplies Expense',
        status: 'POSTED',
        lines: [
          { accountId: 'acc-6030', debit: 12000, credit: 0 },
          { accountId: 'acc-1010', debit: 0, credit: 12000 },
        ],
      });

      // 2. Now lock October
      periodLockService.setConfig(true, '2026-10-31', '2026-10-31');

      // 3. Attempting to void or re-correct an entry in locked period directly is blocked
      await expect(
        financeRepository.correctAndReissueJournalEntry(octEntry.id, 'Attempting to re-correct locked period entry')
      ).rejects.toThrow(/closed financial period/i);
    });
  });

  describe('Repository & Service Engine: Reclassification AJE', () => {
    it('3. Generates a balanced 2-line Adjusting Journal Entry (AJE) transferring line amount between accounts', async () => {
      // 1. Create and post a journal with an erroneous line
      const original = await financeRepository.createJournalEntry({
        date: '2026-11-02',
        description: 'Office Equipment Repair and Software',
        status: 'POSTED',
        lines: [
          { accountId: 'acc-6030', debit: 40000, credit: 0, description: 'Software license' }, // Transfer to 6020
          { accountId: 'acc-1010', debit: 0, credit: 40000, description: 'Bank payment' },
        ],
      });

      // Check balance of 6020 and 6030 before reclassification
      const acc6030Before = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-6030')!.currentBalance);
      const acc6020Before = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-6020')!.currentBalance);

      // 2. Post reclassification for line 0 from 6030 to 6020
      const aje = await financeRepository.createReclassificationEntry({
        originalEntryId: original.id,
        lineIndex: 0,
        targetAccountId: 'acc-6020',
        amount: 40000,
        reason: 'Transfer software license to Delivery Van Fuel & Maintenance GL',
      });

      expect(aje.status).toBe('POSTED');
      expect(aje.correctionType).toBe('RECLASSIFICATION');
      expect(aje.correctionOf).toBe(original.entryNumber);
      expect(aje.lines.length).toBe(2);

      // Line 1: Target account debited
      expect(aje.lines[0].accountId).toBe('acc-6020');
      expect(aje.lines[0].debit).toBe(40000);
      expect(aje.lines[0].credit).toBe(0);

      // Line 2: Source account credited (relieving 6030)
      expect(aje.lines[1].accountId).toBe('acc-6030');
      expect(aje.lines[1].debit).toBe(0);
      expect(aje.lines[1].credit).toBe(40000);

      // Verify account balance mutations in GL
      const acc6030After = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-6030')!.currentBalance);
      const acc6020After = await financeRepository.getAccounts().then((accs) => accs.find((a) => a.id === 'acc-6020')!.currentBalance);

      expect(acc6030After).toBe(acc6030Before - 40000);
      expect(acc6020After).toBe(acc6020Before + 40000);
    });
  });

  describe('UI Workflow Integration: ManualJournalPage', () => {
    it('4. Renders Correct & Reissue button and modal on posted journal entry', async () => {
      const original = await financeRepository.createJournalEntry({
        date: '2026-11-03',
        description: 'Vendor Consulting Retainer',
        status: 'POSTED',
        lines: [
          { accountId: 'acc-6030', debit: 50000, credit: 0 },
          { accountId: 'acc-1010', debit: 0, credit: 50000 },
        ],
      });

      render(
        <MemoryRouter initialEntries={[`/finance/journal?id=${original.id}`]}>
          <Routes>
            <Route path="/finance/journal" element={<ManualJournalPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Verify loaded journal is audit locked
      await waitFor(() => {
        expect(screen.getByText(/Audit Lock Active — Read Only \(POSTED\)/i)).toBeDefined();
      });

      // Verify Correct & Reissue button exists
      const correctButtons = screen.getAllByRole('button', { name: /correct & reissue/i });
      expect(correctButtons.length).toBeGreaterThan(0);

      // Click Correct & Reissue
      fireEvent.click(correctButtons[0]);

      // Modal appears
      await waitFor(() => {
        expect(screen.getByText(/Correct & Reissue Journal Voucher/i)).toBeDefined();
        expect(screen.getByTestId('reissue-reason-input')).toBeDefined();
      });

      // Enter correction reason
      const reasonInput = screen.getByTestId('reissue-reason-input');
      fireEvent.change(reasonInput, { target: { value: 'Fix wrong retainer line amount and add VAT' } });

      // Submit reissue
      const confirmBtn = screen.getByTestId('confirm-reissue-button');
      fireEvent.click(confirmBtn);

      // Verify replacement draft voucher is loaded into the form
      await waitFor(() => {
        expect(screen.getByText(/Corrected Replacement Voucher:/i)).toBeDefined();
      });
    });

    it('5. Renders Reclassify button in line item table and allows posting an AJE', async () => {
      const original = await financeRepository.createJournalEntry({
        date: '2026-11-04',
        description: 'Annual License Subscriptions',
        status: 'POSTED',
        lines: [
          { accountId: 'acc-6030', debit: 75000, credit: 0 },
          { accountId: 'acc-1010', debit: 0, credit: 75000 },
        ],
      });

      render(
        <MemoryRouter initialEntries={[`/finance/journal?id=${original.id}`]}>
          <Routes>
            <Route path="/finance/journal" element={<ManualJournalPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Audit Lock Active — Read Only \(POSTED\)/i)).toBeDefined();
      });

      // Find Reclassify action button for the line
      const reclassifyButtons = screen.getAllByRole('button', { name: /reclassify/i });
      expect(reclassifyButtons.length).toBeGreaterThan(0);

      fireEvent.click(reclassifyButtons[0]);

      // Reclassification dialog opens
      await waitFor(() => {
        expect(screen.getByText(/Reclassify Line Item \(Adjusting Journal Entry\)/i)).toBeDefined();
      });

      // Enter reason
      const reasonInputs = screen.getAllByPlaceholderText(/e\.g\. Corrected misclassification of marketing expenses/i);
      fireEvent.change(reasonInputs[0], { target: { value: 'Transfer from 6030 to 6020' } });

      // Click Post Reclassification AJE
      const postBtn = screen.getByRole('button', { name: /post reclassification aje/i });
      fireEvent.click(postBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Reclassify Line Item \(Adjusting Journal Entry\)/i)).toBeNull();
      });
    });
  });
});
