import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { useFavorites, getStorageKey, getDefaultFavoritesForRole } from '../hooks/useFavorites';
import { authService } from '../services/AuthService';

describe('Sidebar Favorites Feature Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    authService.switchRole('DIRECTOR');
  });

  describe('1. useFavorites Hook Functionality', () => {
    it('returns role-specific default favorites when localStorage is empty', () => {
      const { result } = renderHook(() => useFavorites());
      // DIRECTOR default favorites
      expect(result.current.favoriteIds).toEqual([
        'orders',
        'customers',
        'invoices',
        'inventory',
        'finance',
        'approvals',
      ]);
      expect(result.current.isFavorite('orders')).toBe(true);
      expect(result.current.isFavorite('suppliers')).toBe(false);
    });

    it('toggles favorite on and off and persists to localStorage', () => {
      const { result } = renderHook(() => useFavorites());
      const user = authService.getCurrentUser()!;
      const storageKey = getStorageKey(user.id);

      // Unfavorite 'orders'
      act(() => {
        result.current.toggleFavorite('orders', 'Sales Orders');
      });
      expect(result.current.isFavorite('orders')).toBe(false);
      expect(JSON.parse(localStorage.getItem(storageKey)!)).not.toContain('orders');

      // Favorite 'suppliers'
      act(() => {
        result.current.toggleFavorite('suppliers', 'Suppliers');
      });
      expect(result.current.isFavorite('suppliers')).toBe(true);
      expect(JSON.parse(localStorage.getItem(storageKey)!)).toContain('suppliers');
    });

    it('provides role-appropriate default favorites for various user roles', () => {
      expect(getDefaultFavoritesForRole('SALES_REP')).toContain('quotations');
      expect(getDefaultFavoritesForRole('STOCK_KEEPER')).toContain('products');
      expect(getDefaultFavoritesForRole('CASHIER')).toContain('pos');
    });
  });

  describe('2. Sidebar Interactive Star & Favorites UI', () => {
    it('renders star toggle buttons with correct accessibility attributes', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );

      // Check for star toggle buttons
      const removeOrdersBtn = screen.getAllByRole('button', {
        name: /remove sales orders from favorites/i,
      })[0];
      expect(removeOrdersBtn).toBeInTheDocument();

      const addSuppliersBtn = screen.getByRole('button', {
        name: /add suppliers to favorites/i,
      });
      expect(addSuppliersBtn).toBeInTheDocument();
    });

    it('toggles item favorite status when star button is clicked without closing sidebar or navigating', () => {
      const onClose = vi.fn();
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={onClose} />
        </MemoryRouter>
      );

      const addSuppliersBtn = screen.getByRole('button', {
        name: /add suppliers to favorites/i,
      });

      // Click star to add Suppliers to favorites
      fireEvent.click(addSuppliersBtn);

      // onClose must NOT be called when clicking star
      expect(onClose).not.toHaveBeenCalled();

      // Suppliers button is now "Remove Suppliers from favorites"
      const removeSuppliersBtns = screen.getAllByRole('button', {
        name: /remove suppliers from favorites/i,
      });
      expect(removeSuppliersBtns.length).toBeGreaterThan(0);
    });

    it('renders dedicated Favorites rail button with badge count', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Rail button with label "Favorites dock (N)"
      const favoritesRailBtn = screen.getByRole('button', {
        name: /^favorites dock \(\d+\)$/i,
      });
      expect(favoritesRailBtn).toBeInTheDocument();
    });

    it('navigates to Favorites view and displays only favorited modules', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Click the Favorites rail button
      const favoritesRailBtn = screen.getByRole('button', {
        name: /^favorites dock \(\d+\)$/i,
      });
      fireEvent.click(favoritesRailBtn);

      // Panel title should now be "Favorites"
      expect(screen.getByRole('heading', { level: 2, name: /favorites/i })).toBeInTheDocument();

      // "Show All" button appears
      const showAllBtn = screen.getByRole('button', { name: /show all/i });
      expect(showAllBtn).toBeInTheDocument();

      // Clicking Show All switches back to Dashboard & Quick Links
      fireEvent.click(showAllBtn);
      expect(screen.getByRole('heading', { level: 2, name: /dashboard/i })).toBeInTheDocument();
    });

    it('displays empty state when all favorites are removed and viewing Favorites category', () => {
      const user = authService.getCurrentUser()!;
      localStorage.setItem(getStorageKey(user.id), JSON.stringify([]));

      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Click Favorites rail button
      const favoritesRailBtn = screen.getByRole('button', {
        name: /^favorites dock \(0\)$/i,
      });
      fireEvent.click(favoritesRailBtn);

      // Empty state visible
      expect(screen.getByText('No Favorites Yet')).toBeInTheDocument();
      expect(screen.getByText(/click the star icon next to any module/i)).toBeInTheDocument();

      const browseBtn = screen.getByRole('button', { name: /browse all modules/i });
      expect(browseBtn).toBeInTheDocument();

      fireEvent.click(browseBtn);
      expect(screen.getByRole('heading', { level: 2, name: /dashboard/i })).toBeInTheDocument();
    });

    it('supports searching across modules and allows starring items from search results', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/search\.\.\./i);
      fireEvent.change(searchInput, { target: { value: 'pos' } });

      // Search results list Showroom POS
      expect(screen.getByText('Showroom POS')).toBeInTheDocument();

      const starPosBtn = screen.getByRole('button', {
        name: /add showroom pos to favorites/i,
      });
      expect(starPosBtn).toBeInTheDocument();

      fireEvent.click(starPosBtn);

      expect(
        screen.getByRole('button', { name: /remove showroom pos from favorites/i })
      ).toBeInTheDocument();
    });
  });
});
