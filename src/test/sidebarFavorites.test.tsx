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

      // Check for star toggle button in favorites list
      const removeOrdersBtn = screen.getAllByRole('button', {
        name: /remove sales orders from favorites/i,
      })[0];
      expect(removeOrdersBtn).toBeInTheDocument();

      // Switch to Finance tab to view non-favorited modules (e.g. Suppliers)
      const financeTab = screen.getByRole('button', { name: /finance & payments/i });
      fireEvent.click(financeTab);

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

      // Switch to Finance tab to find un-favorited Suppliers module
      const financeTab = screen.getByRole('button', { name: /finance & payments/i });
      fireEvent.click(financeTab);

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

    it('does not render a separate Favorites rail button or header button', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Separate rail button for favorites must NOT exist
      const favoritesRailBtn = screen.queryByRole('button', {
        name: /favorites dock/i,
      });
      expect(favoritesRailBtn).not.toBeInTheDocument();

      // Separate header button to view favorites must NOT exist
      const favoritesHeaderBtn = screen.queryByRole('button', {
        name: /^favorites \(\d+\)$/i,
      });
      expect(favoritesHeaderBtn).not.toBeInTheDocument();
    });

    it('renders right sidebar menu icons as small (h-3.5 w-3.5) and left rail icons as bit large (h-5 w-5)', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Check right flyout menu item rows have small icon size (h-3.5 w-3.5) and clean slate gray styling
      const salesOrdersLink = screen.getAllByRole('link', { name: /sales orders/i })[0];
      const salesOrdersIcon = salesOrdersLink.querySelector('svg');
      expect(salesOrdersIcon).toHaveClass('h-3.5');
      expect(salesOrdersIcon).toHaveClass('w-3.5');
      expect(salesOrdersIcon).toHaveClass('text-slate-500');
      expect(salesOrdersIcon).not.toHaveClass('text-emerald-700');
      expect(salesOrdersIcon).not.toHaveClass('text-purple-700');
      expect(salesOrdersIcon).not.toHaveClass('text-blue-700');

      // Check active favorite star (clean gray, h-3.5 w-3.5, not rainbow amber/emerald)
      const removeOrdersBtn = screen.getAllByRole('button', {
        name: /remove sales orders from favorites/i,
      })[0];
      const starIcon = removeOrdersBtn.querySelector('svg');
      expect(starIcon).toHaveClass('h-3.5');
      expect(starIcon).toHaveClass('w-3.5');
      expect(starIcon).toHaveClass('fill-slate-500');
      expect(starIcon).not.toHaveClass('text-amber-500');
      expect(starIcon).not.toHaveClass('fill-amber-500');
      expect(starIcon).not.toHaveClass('text-emerald-600');

      // Check left dock rail category icon is bit large (h-5 w-5)
      const dashboardRailBtn = screen.getByRole('button', { name: /dashboard & quick links/i });
      const railIcon = dashboardRailBtn.querySelector('svg');
      expect(railIcon).toHaveClass('h-5');
      expect(railIcon).toHaveClass('w-5');
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

    it('renders ONLY Favorites in the dashboard submenu and does NOT render ALL MODULES', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // On initial overview (activeCategory === 'all'), Favorites header is visible
      expect(screen.getByText('Favorites')).toBeInTheDocument();

      // "All Modules" and "Quick Links" must NOT be in the document
      expect(screen.queryByText('All Modules')).not.toBeInTheDocument();
      expect(screen.queryByText('Quick Links')).not.toBeInTheDocument();

      // Default favorites (like Sales Orders) are displayed
      expect(screen.getByRole('link', { name: /sales orders/i })).toBeInTheDocument();

      // Non-favorite module (like Suppliers) is NOT displayed in dashboard submenu
      expect(screen.queryByRole('link', { name: /suppliers/i })).not.toBeInTheDocument();
    });

    it('renders search bar only in the dashboard inner sidebar and NOT in category inner sidebars', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Search bar is present on Dashboard inner sidebar
      expect(screen.getByPlaceholderText(/search\.\.\./i)).toBeInTheDocument();

      // Switch to Sales category
      const salesTab = screen.getByRole('button', { name: /sales & orders/i });
      fireEvent.click(salesTab);

      // Search bar must NOT be rendered on category inner sidebar
      expect(screen.queryByPlaceholderText(/search\.\.\./i)).not.toBeInTheDocument();

      // Switch to Inventory category
      const inventoryTab = screen.getByRole('button', { name: /inventory & products/i });
      fireEvent.click(inventoryTab);

      // Search bar must still NOT be rendered
      expect(screen.queryByPlaceholderText(/search\.\.\./i)).not.toBeInTheDocument();
    });

    it('matches left dock rail to top header with bg-primary and keeps right flyout panel as neutral content shade', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      );

      // Left rail dock matches top header with bg-primary
      const leftRail = container.querySelector('.bg-primary');
      expect(leftRail).toBeInTheDocument();
      expect(leftRail).toHaveClass('text-primary-foreground');

      // Right flyout panel is neutral content page shade (bg-white) and does not change colors
      const rightFlyout = container.querySelector('.bg-white');
      expect(rightFlyout).toBeInTheDocument();
    });
  });
});
