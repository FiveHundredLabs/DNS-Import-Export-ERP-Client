import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MonthlyTransactionsAuditPage, getAffectedTablesForJournal } from '../features/finance/pages/reports/MonthlyTransactionsAuditPage';
import { financeRepository } from '../features/finance/api';
import { JournalEntry } from '../features/finance/api/types';

describe('MonthlyTransactionsAuditPage (Finance Manager Audit View)', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  it('correctly maps affected relational database tables for a sales invoice journal', () => {
    const salesJournal: JournalEntry = {
      id: 'je-test-sales',
      entryNumber: 'JE-TEST-1',
      date: '2026-10-02',
      description: 'Sales Invoice',
      reference: 'INV-2026-0001',
      source: 'SALES',
      status: 'POSTED',
      lines: [
        {
          id: 'l1',
          accountId: 'acc-1020',
          accountCode: '1020',
          accountName: 'Accounts Receivable',
          debit: 1180,
          credit: 0,
          customerId: 'cust-1',
          customerName: 'Test Customer',
        },
        {
          id: 'l2',
          accountId: 'acc-4010',
          accountCode: '4010',
          accountName: 'Sales Revenue',
          debit: 0,
          credit: 1000,
        },
        {
          id: 'l3',
          accountId: 'acc-2020',
          accountCode: '2020',
          accountName: 'VAT Payable (18%)',
          debit: 0,
          credit: 180,
        },
      ],
      totalDebit: 1180,
      totalCredit: 1180,
      createdBy: 'System Auto-Posting',
      createdAt: '2026-10-02T09:00:00.000Z',
    };

    const tables = getAffectedTablesForJournal(salesJournal);
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('journal_entries');
    expect(tableNames).toContain('journal_lines');
    expect(tableNames).toContain('chart_of_accounts');
    expect(tableNames).toContain('customer_subledger');
    expect(tableNames).toContain('vat_statutory_schedules');
    expect(tableNames).toContain('sales_invoices');
  });

  it('correctly maps affected relational database tables for an inventory GRN journal', () => {
    const grnJournal: JournalEntry = {
      id: 'je-test-grn',
      entryNumber: 'JE-TEST-2',
      date: '2026-10-05',
      description: 'Vendor Bill from GRN',
      reference: 'BILL-2026-001',
      source: 'GRN',
      status: 'POSTED',
      lines: [
        {
          id: 'l1',
          accountId: 'acc-1030',
          accountCode: '1030',
          accountName: 'Inventory',
          debit: 5000,
          credit: 0,
        },
        {
          id: 'l2',
          accountId: 'acc-2010',
          accountCode: '2010',
          accountName: 'Accounts Payable',
          debit: 0,
          credit: 5000,
          supplierId: 'sup-1',
          supplierName: 'Test Supplier',
        },
      ],
      totalDebit: 5000,
      totalCredit: 5000,
      createdBy: 'System Auto-Posting',
      createdAt: '2026-10-05T10:00:00.000Z',
    };

    const tables = getAffectedTablesForJournal(grnJournal);
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('journal_entries');
    expect(tableNames).toContain('journal_lines');
    expect(tableNames).toContain('chart_of_accounts');
    expect(tableNames).toContain('inventory_valuation_ledger');
    expect(tableNames).toContain('supplier_subledger');
    expect(tableNames).toContain('goods_received_notes');
  });

  it('renders monthly audit header and automated vs manual transaction filters', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/reports/monthly-audit']}>
        <Routes>
          <Route path="/finance/reports/monthly-audit" element={<MonthlyTransactionsAuditPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify main page title and badge
    expect(await screen.findByText('Monthly Transactions & Double-Entry Audit')).toBeDefined();
    expect(screen.getByText('Finance Manager Audit View')).toBeDefined();

    // Verify filter buttons exist
    expect(screen.getByRole('button', { name: /All Postings/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Automated/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Manual/i })).toBeDefined();
  });

  it('filters between Automated and Manual journal postings interactively', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/reports/monthly-audit']}>
        <Routes>
          <Route path="/finance/reports/monthly-audit" element={<MonthlyTransactionsAuditPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for data to load
    await screen.findByText('Monthly Transactions & Double-Entry Audit');
    await screen.findByText('JE-1006');

    // Click on Automated filter button
    const autoBtn = screen.getByRole('button', { name: /Automated/i });
    fireEvent.click(autoBtn);

    // Verify that automated entries exist in table
    expect(screen.getByText('JE-1006')).toBeDefined();
    expect(screen.getAllByText(/INV-2026-0105/).length).toBeGreaterThan(0);

    // Click on Manual filter button
    const manualBtn = screen.getByRole('button', { name: /Manual/i });
    fireEvent.click(manualBtn);

    // Verify manual entries are shown (JE-1008 or JE-1011)
    expect(await screen.findByText('JE-1008')).toBeDefined();
  });

  it('expands a transaction row to inspect double-entry postings and affected database tables', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/reports/monthly-audit']}>
        <Routes>
          <Route path="/finance/reports/monthly-audit" element={<MonthlyTransactionsAuditPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for table to load
    await screen.findByText('JE-1006');

    // Click the toggle button for JE-1006
    const toggleBtn = screen.getByRole('button', { name: 'Toggle JE-1006' });
    fireEvent.click(toggleBtn);

    // After click, drawer opens with Double-Entry and Affected Tables headings
    expect(await screen.findByText(/Double-Entry Postings/i)).toBeDefined();
    expect(await screen.findByText('Database Tables Effected')).toBeDefined();
    expect(screen.getByText('journal_entries')).toBeDefined();
    expect(screen.getByText('journal_lines')).toBeDefined();
    expect(screen.getByText('customer_subledger')).toBeDefined();
    expect(screen.getByText('vat_statutory_schedules')).toBeDefined();
  });
});
