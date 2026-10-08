import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManualJournalPage } from '../features/finance/pages/journal/ManualJournalPage';
import { financeRepository } from '../features/finance/api';

describe('Manual Journal Entry Templates & Searchable Selection', () => {
  beforeEach(async () => {
    localStorage.clear();
    await financeRepository.resetToDefaults();
  });

  it('renders templates library sidebar and allows real-time live search', async () => {
    render(
      <MemoryRouter>
        <ManualJournalPage />
      </MemoryRouter>
    );

    // Initial templates visible in sidebar
    const sidebarList = await screen.findByTestId('sidebar-templates-list');
    expect(within(sidebarList).getByText('Monthly Depreciation')).toBeDefined();
    expect(within(sidebarList).getByText('Office Utilities Accrual')).toBeDefined();
    expect(within(sidebarList).getByText('Payroll & Statutory Accrual')).toBeDefined();

    // Find the template search input
    const searchInput = screen.getByTestId('template-search-input');
    expect(searchInput).toBeDefined();

    // Search for "Payroll"
    fireEvent.change(searchInput, { target: { value: 'Payroll' } });

    // Should match Payroll and hide Depreciation in sidebar
    expect(within(sidebarList).getByText('Payroll & Statutory Accrual')).toBeDefined();
    expect(within(sidebarList).queryByText('Monthly Depreciation')).toBeNull();

    // Search by Account code "6010"
    fireEvent.change(searchInput, { target: { value: '6010' } });
    expect(within(sidebarList).getByText('Monthly Depreciation')).toBeDefined();
    expect(within(sidebarList).getByText('Payroll & Statutory Accrual')).toBeDefined();
    expect(within(sidebarList).queryByText('Office Utilities Accrual')).toBeNull();

    // Clear search
    const clearBtn = screen.getByRole('button', { name: /Clear template search/i });
    fireEvent.click(clearBtn);
    expect(within(sidebarList).getByText('Office Utilities Accrual')).toBeDefined();
  });

  it('filters templates by category chips', async () => {
    render(
      <MemoryRouter>
        <ManualJournalPage />
      </MemoryRouter>
    );

    const sidebarList = await screen.findByTestId('sidebar-templates-list');
    expect(within(sidebarList).getByText('Monthly Depreciation')).toBeDefined();

    // Click 'Payroll' category chip
    const payrollChip = screen.getByRole('button', { name: 'Payroll' });
    fireEvent.click(payrollChip);

    expect(within(sidebarList).getByText('Payroll & Statutory Accrual')).toBeDefined();
    expect(within(sidebarList).queryByText('Monthly Depreciation')).toBeNull();

    // Click 'All' category chip
    const allChip = screen.getByRole('button', { name: 'All' });
    fireEvent.click(allChip);
    expect(within(sidebarList).getByText('Monthly Depreciation')).toBeDefined();
  });

  it('applies a template to populate journal entry voucher memo and lines', async () => {
    render(
      <MemoryRouter>
        <ManualJournalPage />
      </MemoryRouter>
    );

    const sidebarList = await screen.findByTestId('sidebar-templates-list');

    // Click template "Monthly Depreciation" inside sidebar
    const tmplBtn = within(sidebarList).getByText('Monthly Depreciation');
    fireEvent.click(tmplBtn);

    // Verify memo is populated
    await waitFor(() => {
      const memoInput = screen.getByPlaceholderText(/Monthly utilities, showroom expenses/i) as HTMLInputElement;
      expect(memoInput.value).toBe('Monthly straight-line depreciation on plant and vehicles');
    });

    // Verify account lines populated (Depreciation Expense 6010 and Accumulated Depreciation 1510)
    expect(screen.getByDisplayValue(/Monthly depreciation expense on capital assets/i)).toBeDefined();
    expect(screen.getByDisplayValue(/Accumulated depreciation contra-asset reserve/i)).toBeDefined();
  });

  it('opens Create Template dialog and enforces name and line balance invariants', async () => {
    render(
      <MemoryRouter>
        <ManualJournalPage />
      </MemoryRouter>
    );

    // Click "New Template" button
    const newTmplBtn = screen.getAllByRole('button', { name: /New Template/i })[0];
    fireEvent.click(newTmplBtn);

    // Dialog title visible
    expect(await screen.findByText('Create Journal Entry Template')).toBeDefined();

    // Try saving without entering a name
    const saveBtn = screen.getByTestId('save-template-submit-button');
    fireEvent.click(saveBtn);

    // Dialog remains open because name is required
    expect(screen.getByText('Create Journal Entry Template')).toBeDefined();

    // Enter template name
    const nameInput = screen.getByTestId('template-name-input');
    fireEvent.change(nameInput, { target: { value: 'Annual Audit Fee Provision' } });

    // Wait for accounts to be loaded into template select dropdowns
    await waitFor(() => {
      const selects = screen.getAllByTestId('template-line-account-select') as HTMLSelectElement[];
      expect(selects.length).toBeGreaterThanOrEqual(2);
      expect(selects[0].options.length).toBeGreaterThan(1);
    });

    const accountSelects = screen.getAllByTestId('template-line-account-select') as HTMLSelectElement[];
    fireEvent.change(accountSelects[0], { target: { value: accountSelects[0].options[1].value } });
    fireEvent.change(accountSelects[1], { target: { value: accountSelects[1].options[2].value } });

    // Click Save Template
    fireEvent.click(saveBtn);

    // Template is created and dialog closes
    await waitFor(() => {
      const list = screen.getByTestId('sidebar-templates-list');
      expect(within(list).getAllByText('Annual Audit Fee Provision').length).toBeGreaterThan(0);
      expect(within(list).getByText('Custom')).toBeDefined();
    });

    // Verify persistence in localStorage
    const saved = localStorage.getItem('dns_finance_journal_templates');
    expect(saved).not.toBeNull();
    expect(saved).toContain('Annual Audit Fee Provision');
  });

  it('allows deleting custom templates', async () => {
    // Seed localStorage with a custom template
    localStorage.setItem(
      'dns_finance_journal_templates',
      JSON.stringify([
        {
          id: 'custom-to-delete',
          name: 'Temporary Test Template',
          category: 'General Adjustments',
          description: 'To be deleted in test',
          memo: 'Test memo',
          isCustom: true,
          lines: [
            { accountCode: '6030', accountName: 'Operating Expense', description: 'Test Dr', isDebit: true },
            { accountCode: '1010', accountName: 'Bank Account', description: 'Test Cr', isDebit: false },
          ],
        },
      ])
    );

    render(
      <MemoryRouter>
        <ManualJournalPage />
      </MemoryRouter>
    );

    const sidebarList = await screen.findByTestId('sidebar-templates-list');

    // Custom template is rendered
    expect(within(sidebarList).getByText('Temporary Test Template')).toBeDefined();

    // Delete custom template
    const deleteBtn = screen.getByRole('button', { name: 'Delete Temporary Test Template' });
    fireEvent.click(deleteBtn);

    // Template is removed from UI
    await waitFor(() => {
      expect(within(sidebarList).queryByText('Temporary Test Template')).toBeNull();
    });

    // Removed from localStorage
    const saved = localStorage.getItem('dns_finance_journal_templates');
    expect(saved).not.toContain('Temporary Test Template');
  });

  it('supports quick template dropdown selection from the toolbar', async () => {
    render(
      <MemoryRouter>
        <ManualJournalPage />
      </MemoryRouter>
    );

    await screen.findByTestId('sidebar-templates-list');

    // Quick select dropdown
    const quickSelect = screen.getByRole('combobox', { name: /Quick Select Template/i });
    expect(quickSelect).toBeDefined();

    // Select "Office Utilities Accrual"
    fireEvent.change(quickSelect, { target: { value: 'utilities' } });

    // Memo updated
    await waitFor(() => {
      const memoInput = screen.getByPlaceholderText(/Monthly utilities, showroom expenses/i) as HTMLInputElement;
      expect(memoInput.value).toBe('Monthly utilities and telecoms accrual');
    });
  });
});
