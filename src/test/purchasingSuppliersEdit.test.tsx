import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PurchasingSuppliersPage } from '../features/purchasing/PurchasingSuppliersPage';
import { financeRepository } from '../features/finance/api';
import { authService } from '../services/AuthService';

describe('Purchasing Suppliers Page & Supplier Edit Workflow', () => {
  beforeEach(async () => {
    await financeRepository.resetToDefaults();
  });

  it('hides create and edit buttons for PURCHASING_OFFICER (cannot create or edit suppliers)', async () => {
    authService.switchRole('PURCHASING_OFFICER');

    render(
      <MemoryRouter>
        <PurchasingSuppliersPage />
      </MemoryRouter>
    );

    // Wait for suppliers table to load
    await waitFor(() => {
      expect(screen.getByText('DNS Global Logistics & Electronics Ltd')).toBeInTheDocument();
    });

    // "New Supplier" create button must be hidden
    expect(screen.queryByRole('button', { name: /New Supplier/i })).not.toBeInTheDocument();

    // "Edit" action buttons in the table must be hidden
    expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument();

    // View / Inspect button is still available
    const viewButtons = screen.getAllByTitle('View supplier details & purchase history');
    expect(viewButtons.length).toBeGreaterThan(0);

    // Open inspection detail modal
    fireEvent.click(viewButtons[0]);

    // Wait for inspection dialog to open
    await waitFor(() => {
      expect(screen.getByText('Master vendor profile and transaction history in DNS ERP.')).toBeInTheDocument();
    });

    // "Edit Profile" button must be hidden for PURCHASING_OFFICER
    expect(screen.queryByRole('button', { name: /Edit Profile/i })).not.toBeInTheDocument();

    // Close button is present in the dialog
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('allows PURCHASING_MANAGER to see Edit button and update supplier details successfully', async () => {
    authService.switchRole('PURCHASING_MANAGER');

    render(
      <MemoryRouter>
        <PurchasingSuppliersPage />
      </MemoryRouter>
    );

    // Wait for suppliers table to load
    await waitFor(() => {
      expect(screen.getByText('DNS Global Logistics & Electronics Ltd')).toBeInTheDocument();
    });

    // "New Supplier" button is visible
    expect(screen.getByRole('button', { name: /New Supplier/i })).toBeInTheDocument();

    // Find and click the Edit button for the first supplier
    const editButtons = screen.getAllByRole('button', { name: /^Edit$/i });
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    // Verify Edit Supplier Record modal is opened
    await waitFor(() => {
      expect(screen.getByText('Edit Supplier Record')).toBeInTheDocument();
    });

    // Modify contact person and phone
    const contactInput = screen.getByPlaceholderText('Mr. Arjuna Weerasinghe');
    fireEvent.change(contactInput, { target: { value: 'Nimal Fernando Updated' } });

    const phoneInput = screen.getByPlaceholderText('+94 11 234 5678');
    fireEvent.change(phoneInput, { target: { value: '+94 77 111 2233' } });

    // Save changes
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    // Verify modal closes and updated details appear in the table
    await waitFor(() => {
      expect(screen.queryByText('Edit Supplier Record')).not.toBeInTheDocument();
      expect(screen.getByText('Nimal Fernando Updated')).toBeInTheDocument();
      expect(screen.getByText('+94 77 111 2233')).toBeInTheDocument();
    });
  });

  it('allows PURCHASING_MANAGER to edit a supplier from within the supplier inspection modal without modal layering conflict', async () => {
    authService.switchRole('PURCHASING_MANAGER');

    render(
      <MemoryRouter>
        <PurchasingSuppliersPage />
      </MemoryRouter>
    );

    // Wait for suppliers table to load
    await waitFor(() => {
      expect(screen.getByText('Apex International Importers')).toBeInTheDocument();
    });

    // Click on the row to open inspection detail modal
    const apexRow = screen.getByText('Apex International Importers').closest('tr');
    expect(apexRow).not.toBeNull();
    fireEvent.click(apexRow!);

    // Verify inspection modal is displayed with "Edit Profile"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument();
    });

    // Click "Edit Profile" from the inspection modal
    const editProfileBtn = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editProfileBtn);

    // Verify the Edit Supplier Record modal is opened and inspection modal is dismissed
    await waitFor(() => {
      expect(screen.getByText('Edit Supplier Record')).toBeInTheDocument();
      expect(screen.queryByText('Master vendor profile and transaction history in DNS ERP.')).not.toBeInTheDocument();
    });
  });
});
