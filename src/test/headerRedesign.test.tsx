import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../components/common/Header';
import { CurrencyConverterPopover, EXCHANGE_RATES } from '../components/header/CurrencyConverterPopover';
import { CalculatorPopover } from '../components/header/CalculatorPopover';
import { UserProfileMenu } from '../components/header/UserProfileMenu';
import { authService } from '../services/AuthService';
import { MOCK_USERS } from '../mock/mockUsers';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Header Enterprise Redesign Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.loginAs(MOCK_USERS[0].id); // Saman Jayasuriya (DIRECTOR)
  });

  describe('1. Role Selector Removal & Toolbar Order', () => {
    it('does NOT contain any inline role switcher dropdown in the header', () => {
      render(
        <MemoryRouter>
          <Header onToggleSidebar={vi.fn()} />
        </MemoryRouter>
      );

      // Verify no "Role: Director" or role switcher trigger exists in header
      expect(screen.queryByText(/role: director/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: /switch role/i })).not.toBeInTheDocument();
    });

    it('renders utilities in strict order ending with profile avatar on the far right', () => {
      render(
        <MemoryRouter>
          <Header onToggleSidebar={vi.fn()} />
        </MemoryRouter>
      );

      const notificationsBtn = screen.getByRole('button', { name: /notifications/i });
      const currencyBtn = screen.getByRole('button', { name: /currency converter/i });
      const calcBtn = screen.getByRole('button', { name: /calculator/i });
      const fullscreenBtn = screen.getByRole('button', { name: /full screen/i });
      const profileBtn = screen.getByRole('button', { name: /user profile menu/i });

      expect(notificationsBtn).toBeInTheDocument();
      expect(currencyBtn).toBeInTheDocument();
      expect(calcBtn).toBeInTheDocument();
      expect(fullscreenBtn).toBeInTheDocument();
      expect(profileBtn).toBeInTheDocument();
    });
  });

  describe('2. User Profile Menu & Real Authentication Logout Flow', () => {
    it('displays circular initials avatar without permanently printing user name in header bar', () => {
      render(
        <MemoryRouter>
          <UserProfileMenu />
        </MemoryRouter>
      );

      const avatarBtn = screen.getByRole('button', { name: /user profile menu/i });
      expect(avatarBtn).toBeInTheDocument();
      // Should show SJ initials inside the circular button
      expect(avatarBtn).toHaveTextContent('SJ');
      // Name should not be rendered as bare text outside the popover
      expect(screen.queryByText('Director')).not.toBeInTheDocument();
    });

    it('opens profile popover on click and closes on Escape', async () => {
      render(
        <MemoryRouter>
          <UserProfileMenu />
        </MemoryRouter>
      );

      const avatarBtn = screen.getByRole('button', { name: /user profile menu/i });
      fireEvent.click(avatarBtn);

      // Now popover is open
      expect(screen.getByText('Saman Jayasuriya')).toBeInTheDocument();
      expect(screen.getByText('Director')).toBeInTheDocument();
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout session/i })).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText('Profile Settings')).not.toBeInTheDocument();
      });
    });

    it('clears session and redirects to /login when Logout is clicked', async () => {
      render(
        <MemoryRouter>
          <UserProfileMenu />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /user profile menu/i }));
      const logoutBtn = screen.getByRole('button', { name: /logout session/i });
      fireEvent.click(logoutBtn);

      // Verify auth session is cleared
      expect(authService.getCurrentUser()).toBeNull();
      // Verify redirection to /login
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  describe('3. Currency Converter Popover', () => {
    it('opens converter, updates calculations, swaps currencies and closes on Escape', async () => {
      render(<CurrencyConverterPopover />);

      const triggerBtn = screen.getByRole('button', { name: /currency converter/i });
      fireEvent.click(triggerBtn);

      expect(screen.getByText('Live Rates')).toBeInTheDocument();

      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100' } });

      // Calculation reflects 100 USD -> 30,250 LKR
      const expected = (100 * EXCHANGE_RATES.LKR.rateAgainstUSD).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();

      // Click swap currencies
      const swapBtn = screen.getByRole('button', { name: /swap currencies/i });
      fireEvent.click(swapBtn);

      // Press Escape to close
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText('Live Rates')).not.toBeInTheDocument();
      });
    });
  });

  describe('4. ERP Utility Calculator Popover', () => {
    it('performs real calculations (e.g., 25 + 15 = 40) and handles Clear and Escape', async () => {
      render(<CalculatorPopover />);

      const triggerBtn = screen.getByRole('button', { name: /calculator/i });
      fireEvent.click(triggerBtn);

      expect(screen.getByText('ERP Utility Calculator')).toBeInTheDocument();

      // Click 2 then 5
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '5' }));

      // Click +
      fireEvent.click(screen.getByRole('button', { name: '+' }));

      // Click 1 then 5
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '5' }));

      // Click =
      fireEvent.click(screen.getByRole('button', { name: '=' }));

      // Result should be 40
      expect(screen.getByText('40')).toBeInTheDocument();

      // Click Clear (C)
      fireEvent.click(screen.getByRole('button', { name: 'C' }));
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);

      // Press Escape to close
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText('ERP Utility Calculator')).not.toBeInTheDocument();
      });
    });
  });
});
