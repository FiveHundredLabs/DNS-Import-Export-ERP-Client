import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Decimal from 'decimal.js';

import { financeRepository } from '../features/finance/api';
import { arService } from '../features/finance/services/arService';
import { pdcVaultService } from '../features/finance/services/pdcVaultService';
import { customerCreditNoteService } from '../features/finance/services/customerCreditNoteService';
import { periodLockService } from '../features/finance/services/periodLockService';

import { ReceiptApprovalQueuePage } from '../features/finance/pages/ar/ReceiptApprovalQueuePage';
import { PDCVaultPage } from '../features/finance/pages/ar/PDCVaultPage';
import { CustomerCreditNotesPage } from '../features/finance/pages/ar/CustomerCreditNotesPage';

describe('Phase 3 Master Test Suite: AR, Collections, PDC Vault & Credit Notes', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
    arService.reset();
    pdcVaultService.reset();
    customerCreditNoteService.reset();
    periodLockService.setConfig(false, null);
  });

  describe('1. Unified Receipt Approval & Inline Auto-FIFO Settlement (/finance/ar/approvals)', () => {
    it('seeds and renders pending cash, cheque, and bank transfer collections in the unified queue', async () => {
      render(
        <MemoryRouter>
          <ReceiptApprovalQueuePage />
        </MemoryRouter>
      );

      expect(screen.getByText('Receipt Approval Queue')).toBeDefined();
      expect(screen.getByText('REC-2026-0491')).toBeDefined(); // Bank transfer
      expect(screen.getByText('REC-2026-0492')).toBeDefined(); // Cash
      expect(screen.getByText('REC-2026-0493')).toBeDefined(); // Cheque
    });

    it('opens approval modal with "Apply via Auto-FIFO" checkbox and settles oldest unpaid invoices sequentially', async () => {
      render(
        <MemoryRouter>
          <ReceiptApprovalQueuePage />
        </MemoryRouter>
      );

      // Verify open invoices before approval for Lanka Electrical (cust-001)
      const openInvoicesBefore = arService.getOpenInvoicesForCustomer('cust-001');
      expect(openInvoicesBefore.length).toBeGreaterThanOrEqual(3);
      const totalDueBefore = openInvoicesBefore.reduce((sum, inv) => sum + inv.balanceDue, 0);

      // Approve REC-2026-0491 (LKR 3,835,000)
      const approveButtons = screen.getAllByRole('button', { name: /^approve$/i });
      fireEvent.click(approveButtons[0]);

      // Approval Modal is open
      await waitFor(() => {
        expect(screen.getByText(/Verify & Approve Customer Collection Receipt/i)).toBeDefined();
        expect(screen.getByLabelText(/Apply via Auto-FIFO/i)).toBeDefined();
      });

      // Confirm approval with Auto-FIFO enabled
      const confirmBtn = screen.getByRole('button', { name: /confirm approval & inline settle/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Verify & Approve Customer Collection Receipt/i)).toBeNull();
      });

      // Verify open invoices were settled by FIFO
      const openInvoicesAfter = arService.getOpenInvoicesForCustomer('cust-001');
      const totalDueAfter = openInvoicesAfter.reduce((sum, inv) => sum + inv.balanceDue, 0);
      expect(totalDueAfter).toBeLessThan(totalDueBefore);

      // Verify GL entries posted: Dr 1010 Bank Account, Cr 1020 A/R
      const journals = await financeRepository.getJournalEntries();
      const approvalJournal = journals.find((j) => j.reference === 'REC-2026-0491');
      expect(approvalJournal).toBeDefined();

      const bankLine = approvalJournal?.lines.find((l) => l.accountCode === '1010');
      const arLine = approvalJournal?.lines.find((l) => l.accountCode === '1020');
      expect(bankLine?.debit).toBe(3835000);
      expect(arLine?.credit).toBe(3835000);
      expect(arLine?.customerId).toBe('cust-001');
    });

    it('allows approving receipt with Auto-FIFO unchecked leaving open invoices intact', async () => {
      const openInvoicesBefore = arService.getOpenInvoicesForCustomer('cust-002');
      const balBefore = openInvoicesBefore[0].balanceDue;

      await arService.approveReceipt('rcpt-402', { autoFIFO: false });

      const openInvoicesAfter = arService.getOpenInvoicesForCustomer('cust-002');
      expect(openInvoicesAfter[0].balanceDue).toBe(balBefore);

      const approvedRcpt = arService.getReceiptById('rcpt-402');
      expect(approvedRcpt?.status).toBe('APPROVED');
      expect(approvedRcpt?.isAllocated).toBeUndefined();
    });

    it('rejects receipt with reason and updates status to REJECTED', async () => {
      render(
        <MemoryRouter>
          <ReceiptApprovalQueuePage />
        </MemoryRouter>
      );

      const rejectButtons = screen.getAllByRole('button', { name: /^reject$/i });
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Reject Customer Payment Receipt/i)).toBeDefined();
      });

      const textarea = screen.getByPlaceholderText(/deposit slip seal is illegible/i);
      fireEvent.change(textarea, { target: { value: 'Bank rubber stamp missing signature' } });

      const confirmRejectBtn = screen.getByRole('button', { name: /confirm rejection/i });
      fireEvent.click(confirmRejectBtn);

      await waitFor(() => {
        const rcpt = arService.getReceiptById('rcpt-401');
        expect(rcpt?.status).toBe('REJECTED');
        expect(rcpt?.rejectionReason).toBe('Bank rubber stamp missing signature');
      });
    });
  });

  describe('2. Post-Dated Cheque (PDC) Vault & GL 1018 Account (/finance/ar/pdc-vault)', () => {
    it('seeds GL 1018 Cheques in Hand system asset account in Chart of Accounts', async () => {
      const accounts = await financeRepository.getAccounts();
      const chq1018 = accounts.find((a) => a.code === '1018');
      expect(chq1018).toBeDefined();
      expect(chq1018?.name).toBe('Cheques in Hand');
      expect(chq1018?.classification).toBe('ASSET');
      expect(chq1018?.accountSubClass).toBe('CURRENT_ASSET');
      expect(chq1018?.isActive).toBe(true);
    });

    it('stops recognizing un-cleared cheques as 1010 Bank cash, routing collected cheques to 1018 Cheques in Hand', async () => {
      // Approve Cheque Receipt rcpt-403 (LKR 531,000)
      const approved = await arService.approveReceipt('rcpt-403', {
        autoFIFO: true,
        chequeDetails: {
          chequeNumber: 'CHQ-772910',
          drawerBank: 'Commercial Bank of Ceylon',
          chequeDate: '2026-10-15',
        },
      });

      expect(approved.status).toBe('APPROVED');
      expect(approved.depositAccountCode).toBe('1018');

      // Verify Double-Entry Journal: Dr 1018 Cheques in Hand, Cr 1020 A/R
      const journals = await financeRepository.getJournalEntries();
      const chequeJournal = journals.find((j) => j.reference === 'REC-2026-0493');
      expect(chequeJournal).toBeDefined();

      const line1018 = chequeJournal?.lines.find((l) => l.accountCode === '1018');
      const line1020 = chequeJournal?.lines.find((l) => l.accountCode === '1020');
      const line1010 = chequeJournal?.lines.find((l) => l.accountCode === '1010');

      expect(line1018?.debit).toBe(531000);
      expect(line1020?.credit).toBe(531000);
      // Critical check: 1010 Bank MUST NOT be debited on initial cheque receipt
      expect(line1010).toBeUndefined();

      // Verify cheque was registered in PDC Vault
      const pdc = pdcVaultService.getPDCById(approved.pdcId!);
      expect(pdc).toBeDefined();
      expect(pdc?.status).toBe('IN_HAND');
      expect(pdc?.holdingAccountCode).toBe('1018');
    });

    it('clears matured cheque from PDC Vault on realization date transferring 1018 to 1010 Bank cash', async () => {
      render(
        <MemoryRouter>
          <PDCVaultPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Post-Dated Cheque (PDC) Vault')).toBeDefined();
      expect(screen.getByText('CHQ-772910')).toBeDefined();

      // Click Clear to Bank on matured cheque pdc-001
      const clearButtons = screen.getAllByRole('button', { name: /clear to bank/i });
      fireEvent.click(clearButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Manually Clear Cheque to Bank Operating Account/i)).toBeDefined();
      });

      const confirmClearBtn = screen.getByRole('button', { name: /confirm bank clearance/i });
      fireEvent.click(confirmClearBtn);

      await waitFor(() => {
        const pdcAfter = pdcVaultService.getPDCById('pdc-001');
        expect(pdcAfter?.status).toBe('CLEARED');
        expect(pdcAfter?.clearedAccountCode).toBe('1010');
      });

      // Verify GL Double-Entry Transfer: Dr 1010 Bank Account, Cr 1018 Cheques in Hand
      const journals = await financeRepository.getJournalEntries();
      const clearanceJournal = journals.find((j) => j.reference === 'PDC-CHQ-772910');
      expect(clearanceJournal).toBeDefined();

      const bankDebit = clearanceJournal?.lines.find((l) => l.accountCode === '1010');
      const chqCredit = clearanceJournal?.lines.find((l) => l.accountCode === '1018');
      expect(bankDebit?.debit).toBe(531000);
      expect(chqCredit?.credit).toBe(531000);
    });

    it('dishonors/bounces a cheque and reinstates Accounts Receivable (Dr 1020 A/R, Cr 1018)', async () => {
      const bounced = await pdcVaultService.bounceCheque('pdc-002', 'Payment stopped by drawer');
      expect(bounced.status).toBe('BOUNCED');
      expect(bounced.bounceReason).toBe('Payment stopped by drawer');

      const journals = await financeRepository.getJournalEntries();
      const bounceJournal = journals.find((j) => j.reference === 'BOUNCE-CHQ-884021');
      expect(bounceJournal).toBeDefined();

      const arDebit = bounceJournal?.lines.find((l) => l.accountCode === '1020');
      const chqCredit = bounceJournal?.lines.find((l) => l.accountCode === '1018');
      expect(arDebit?.debit).toBe(1200000);
      expect(chqCredit?.credit).toBe(1200000);
    });
  });

  describe('3. Customer Credit Notes & Sales Returns (/finance/ar/credit-notes)', () => {
    it('seeds and renders Customer Credit Notes registry and KPI metrics', async () => {
      render(
        <MemoryRouter>
          <CustomerCreditNotesPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Customer Credit Notes')).toBeDefined();
      expect(screen.getByText('CN-2026-001')).toBeDefined();
      expect(screen.getByText('CN-2026-002')).toBeDefined();
      expect(screen.getByText('Revenue Reversed (4010)')).toBeDefined();
      expect(screen.getByText('Stock Restored (1100/5010)')).toBeDefined();
    });

    it('posts a customer return, reversing revenue (Dr 4010), tax (Dr 2020), crediting AR (Cr 1020), and returning goods to inventory (Dr 1100, Cr 5010)', async () => {
      const createdCN = await customerCreditNoteService.postCustomerCreditNote({
        customerId: 'cust-001',
        customerName: 'Lanka Electrical & Hardware Superstore',
        customerCode: 'DLR-COL-001',
        invoiceId: 'inv-001',
        invoiceNumber: 'INV-2026-0035',
        date: new Date().toISOString().slice(0, 10),
        reason: 'Customer return of 2 units of 5kW Solar Inverter in good condition',
        returnToInventory: true,
        lineItems: [
          {
            productId: 'prod-001',
            productName: 'Hybrid Solar Inverter 5kW Pure Sine',
            sku: 'INV-5KW-HYB',
            returnedQuantity: 2,
            unitPrice: 60000.0,
            unitCost: 40000.0,
            taxRate: 0.18,
            subtotal: 120000.0,
            vatAmount: 21600.0,
            lineTotal: 141600.0,
            costTotal: 80000.0,
          },
        ],
      });

      expect(createdCN.status).toBe('ISSUED');
      expect(createdCN.subtotal).toBe(120000.0);
      expect(createdCN.vatAmount).toBe(21600.0);
      expect(createdCN.totalAmount).toBe(141600.0);
      expect(createdCN.totalCostAmount).toBe(80000.0);

      // Verify Compound Universal Journal Entry
      const journals = await financeRepository.getJournalEntries();
      const cnJournal = journals.find((j) => j.reference === createdCN.creditNoteNumber);
      expect(cnJournal).toBeDefined();

      // Check lines:
      // 1. Dr 4010 Sales Revenue (120,000)
      const salesLine = cnJournal?.lines.find((l) => l.accountCode === '4010');
      expect(salesLine?.debit).toBe(120000);

      // 2. Dr 2020 VAT Payable (21,600)
      const vatLine = cnJournal?.lines.find((l) => l.accountCode === '2020');
      expect(vatLine?.debit).toBe(21600);

      // 3. Cr 1020 Accounts Receivable (141,600)
      const arLine = cnJournal?.lines.find((l) => l.accountCode === '1020');
      expect(arLine?.credit).toBe(141600);
      expect(arLine?.customerId).toBe('cust-001');

      // 4. Dr 1100 or 1030 Merchandise Inventory (80,000)
      const inventoryLine = cnJournal?.lines.find((l) => l.accountCode === '1100' || l.accountCode === '1030');
      expect(inventoryLine?.debit).toBe(80000);

      // 5. Cr 5010 Cost of Goods Sold (80,000)
      const cogsLine = cnJournal?.lines.find((l) => l.accountCode === '5010');
      expect(cogsLine?.credit).toBe(80000);

      // Verify Double-Entry Balance Invariant:
      // Total Debits = 120,000 + 21,600 + 80,000 = 221,600
      // Total Credits = 141,600 + 80,000 = 221,600
      expect(cnJournal?.totalDebit).toBe(221600);
      expect(cnJournal?.totalCredit).toBe(221600);
    });

    it('enforces financial period lock preventing posting customer returns into locked periods', async () => {
      // Lock period for 2025-12-31
      periodLockService.setConfig(true, '2025-12-31');

      await expect(
        customerCreditNoteService.postCustomerCreditNote({
          customerId: 'cust-001',
          customerName: 'Lanka Electrical',
          date: '2025-11-15',
          reason: 'Attempted return in closed period',
          lineItems: [
            {
              productId: 'prod-001',
              productName: 'Hybrid Solar Inverter',
              sku: 'INV-5KW',
              returnedQuantity: 1,
              unitPrice: 50000,
              unitCost: 35000,
              taxRate: 0.18,
              subtotal: 50000,
              vatAmount: 9000,
              lineTotal: 59000,
              costTotal: 35000,
            },
          ],
        })
      ).rejects.toThrow(/closed financial period/i);
    });
  });
});
