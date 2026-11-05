import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage, DEMO_MODULES, UNIQUE_DEMO_ROLES } from '../features/auth/LoginPage';
import { authService } from '../services/AuthService';

describe('LoginPage and Example Users For Each Role', () => {
  beforeEach(() => {
    localStorage.clear();
    authService.logout();
  });

  it('renders all modules in exact specified order with 12 unique roles and zero duplicates', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    // Verify modules in exact order
    expect(DEMO_MODULES[0].name).toBe('Administrator');
    expect(DEMO_MODULES[1].name).toBe('Sales Module');
    expect(DEMO_MODULES[2].name).toBe('Purchasing Module');
    expect(DEMO_MODULES[3].name).toBe('Inventory Management Module');
    expect(DEMO_MODULES[4].name).toBe('Finance Module');
    expect(DEMO_MODULES[5].name).toBe('Showroom POS');

    // Verify module headers are in the document
    expect(screen.getAllByText('Administrator').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sales Module').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Purchasing Module').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inventory Management Module').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Finance Module').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Showroom POS').length).toBeGreaterThan(0);

    // Verify all 12 unique demo roles are displayed
    expect(UNIQUE_DEMO_ROLES.length).toBe(12);
    UNIQUE_DEMO_ROLES.forEach((item) => {
      expect(screen.getAllByText(item.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(item.email).length).toBeGreaterThan(0);
      expect(screen.getAllByText(item.title).length).toBeGreaterThan(0);
    });

    // Check specific role titles
    expect(screen.getAllByText('Director').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sales Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Area Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sales Representative').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Purchasing Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Purchasing Officer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stock Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stock Keeper').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Finance Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Showroom Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cashier').length).toBeGreaterThan(0);
  });

  it('allows clicking an example user card to log in directly as that user', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    // Click card to login as Dilani Fernando (Finance Manager)
    fireEvent.click(screen.getByText('Dilani Fernando'));

    await waitFor(() => {
      expect(authService.getCurrentUser()?.email).toBe('finance@dnserp.com');
      expect(authService.getCurrentUser()?.role).toBe('FINANCE_MANAGER');
    });
  });

  it('allows 1-click login as Cashier and updates authService', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const cashierLoginBtn = screen.getByRole('button', { name: /Login as Cashier/i });
    expect(cashierLoginBtn).toBeDefined();

    fireEvent.click(cashierLoginBtn);

    await waitFor(() => {
      expect(authService.getCurrentUser()?.role).toBe('CASHIER');
      expect(authService.getCurrentUser()?.email).toBe('cashier@dnserp.com');
    });
  });

  it('allows 1-click login as Purchasing Officer and updates authService', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const poLoginBtn = screen.getByRole('button', { name: /Login as Purchasing Officer/i });
    expect(poLoginBtn).toBeDefined();

    fireEvent.click(poLoginBtn);

    await waitFor(() => {
      expect(authService.getCurrentUser()?.role).toBe('PURCHASING_OFFICER');
      expect(authService.getCurrentUser()?.email).toBe('purchasing@dnserp.com');
    });
  });

  it('filters role cards when module tabs or search input is used', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    // Click "Administrator" tab
    const adminTab = screen.getByRole('button', { name: /Administrator/i });
    fireEvent.click(adminTab);

    // Director and Manager are visible
    expect(screen.getByText('Saman Jayasuriya')).toBeDefined();
    expect(screen.getByText('Ruwan Wijesinghe')).toBeDefined();

    // Cashier and Sales Manager should be filtered out from grid
    expect(screen.queryByText('Chathura Alwis')).toBeNull();
    expect(screen.queryByText('Kamal Perera')).toBeNull();

    // Use search box
    const searchInput = screen.getByPlaceholderText('Search role or name...');
    fireEvent.change(searchInput, { target: { value: 'Saman' } });

    expect(screen.getByText('Saman Jayasuriya')).toBeDefined();
    expect(screen.queryByText('Ruwan Wijesinghe')).toBeNull();
  });

  it('submits standard login form and authenticates with credentials', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('user@dnserp.com');
    const submitBtn = screen.getByRole('button', { name: /Sign In to ERP Portal/i });

    fireEvent.change(emailInput, { target: { value: 'finance@dnserp.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.getCurrentUser()?.email).toBe('finance@dnserp.com');
      expect(authService.getCurrentUser()?.role).toBe('FINANCE_MANAGER');
    });
  });
});
