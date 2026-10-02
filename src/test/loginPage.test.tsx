import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { authService } from '../services/AuthService';
import { MOCK_USERS } from '../mock/mockUsers';

describe('LoginPage and Example Users For Each Role', () => {
  beforeEach(() => {
    localStorage.clear();
    authService.logout();
  });

  it('renders all 8 example user roles on the login page', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    // Verify all 8 mock users are displayed by name
    MOCK_USERS.forEach((user) => {
      expect(screen.getAllByText(user.name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(user.email).length).toBeGreaterThan(0);
    });

    // Check specific role badges
    expect(screen.getByText('Director')).toBeDefined();
    expect(screen.getByText('Operations Manager')).toBeDefined();
    expect(screen.getByText('Sales Manager')).toBeDefined();
    expect(screen.getByText('Finance Manager')).toBeDefined();
    expect(screen.getByText('Area Manager')).toBeDefined();
    expect(screen.getByText('Sales Representative')).toBeDefined();
    expect(screen.getByText('Stock Keeper')).toBeDefined();
    expect(screen.getByText('Showroom Cashier')).toBeDefined();
  });

  it('allows clicking an example user card to prefill the email input', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('user@dnserp.com') as HTMLInputElement;

    // Click card to select user
    fireEvent.click(screen.getByText('Dilani Fernando'));
    expect(emailInput.value).toBe('finance@dnserp.com');
  });

  it('allows 1-click login as Cashier and updates authService', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const cashierLoginBtn = screen.getByRole('button', { name: /Login as Showroom Cashier/i });
    expect(cashierLoginBtn).toBeDefined();

    fireEvent.click(cashierLoginBtn);

    await waitFor(() => {
      expect(authService.getCurrentUser()?.role).toBe('CASHIER');
      expect(authService.getCurrentUser()?.email).toBe('cashier@dnserp.com');
    });
  });

  it('filters role cards when category tabs or search input is used', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    // Click "Executive & Management"
    const mgmtTab = screen.getByRole('button', { name: /Executive & Management/i });
    fireEvent.click(mgmtTab);

    // Director, Manager, Sales Manager visible
    expect(screen.getByText('Saman Jayasuriya')).toBeDefined();
    expect(screen.getByText('Ruwan Wijesinghe')).toBeDefined();
    expect(screen.getByText('Kamal Perera')).toBeDefined();

    // Cashier should be filtered out from grid
    expect(screen.queryByText('Chathura Alwis')).toBeNull();

    // Use search box
    const searchInput = screen.getByPlaceholderText('Search role or name...');
    fireEvent.change(searchInput, { target: { value: 'Saman' } });

    expect(screen.getByText('Saman Jayasuriya')).toBeDefined();
    expect(screen.queryByText('Ruwan Wijesinghe')).toBeNull();
  });
});
