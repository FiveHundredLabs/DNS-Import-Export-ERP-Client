import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { themeService, PRIMARY_COLOR_OPTIONS, DEFAULT_PRIMARY_COLOR } from '../services/ThemeService';
import { AppearanceSettings } from '../features/dashboard/AppearanceSettings';
import { authService } from '../services/AuthService';

describe('Configurable Primary Color System Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default to DIRECTOR for tests
    authService.switchRole('DIRECTOR');
    // Reset to default
    themeService.setPrimaryColor(DEFAULT_PRIMARY_COLOR.hex, 'DIRECTOR');
  });

  describe('1. Available Primary Colors & Defaults', () => {
    it('provides exactly the 5 predefined color options', () => {
      const colors = themeService.getAllPrimaryColors();
      expect(colors).toHaveLength(5);

      const hexes = colors.map((c) => c.hex.toUpperCase());
      expect(hexes).toContain('#FA8223'); // Orange
      expect(hexes).toContain('#263183'); // Dark Blue
      expect(hexes).toContain('#EC1B27'); // Red
      expect(hexes).toContain('#6AAED3'); // Light Blue
      expect(hexes).toContain('#161511'); // Black
    });

    it('sets Light Blue (#6AAED3) as the initial default color', () => {
      localStorage.clear();
      // Instantiate fresh service logic check
      const current = themeService.getPrimaryColor();
      expect(current.hex.toUpperCase()).toBe('#6AAED3');
      expect(current.name).toBe('Light Blue');
    });

    it('generates appropriate hover, active, light, and accessible text tokens', () => {
      const orange = PRIMARY_COLOR_OPTIONS.find((c) => c.id === 'orange')!;
      expect(orange.hover).toBeDefined();
      expect(orange.active).toBeDefined();
      expect(orange.light).toBeDefined();
      expect(orange.border).toBeDefined();
      expect(orange.text).toBeDefined();
      expect(orange.foreground).toBe('#FFFFFF');
    });
  });

  describe('2. Security & Role Permissions', () => {
    it('allows DIRECTOR role to set primary color', () => {
      const res = themeService.setPrimaryColor('#FA8223', 'DIRECTOR');
      expect(res.success).toBe(true);
      expect(themeService.getPrimaryColor().hex).toBe('#FA8223');
    });

    it('strictly forbids other roles (MANAGER, SALES_REP, etc.) from updating primary color', () => {
      const nonDirectorRoles = ['MANAGER', 'SALES_REP', 'FINANCE_MANAGER', 'STOCK_KEEPER', 'CASHIER'];

      nonDirectorRoles.forEach((role) => {
        const res = themeService.setPrimaryColor('#EC1B27', role);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/only users with the director role/i);
      });

      // Ensure color did not change
      expect(themeService.getPrimaryColor().hex).not.toBe('#EC1B27');
    });

    it('rejects arbitrary, non-approved color hex codes', () => {
      const res = themeService.setPrimaryColor('#123456', 'DIRECTOR');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalid color value/i);
    });
  });

  describe('3. Database Persistence & CSS Variables', () => {
    it('persists selected color in canonical erp-primary-color storage', () => {
      themeService.setPrimaryColor('#263183', 'DIRECTOR');

      const savedHex = localStorage.getItem('erp-primary-color');
      expect(savedHex).toBe('#263183');

      // Also verifies backward-compatible company settings
      const savedRaw = localStorage.getItem('dns_erp_company_settings');
      expect(savedRaw).not.toBeNull();
      const parsed = JSON.parse(savedRaw!);
      expect(parsed.primaryColor).toBe('#263183');
    });

    it('immediately sets CSS variables on document.documentElement', () => {
      themeService.setPrimaryColor('#EC1B27', 'DIRECTOR');
      const rootStyle = document.documentElement.style;

      expect(rootStyle.getPropertyValue('--primary')).toBe('#EC1B27');
      expect(rootStyle.getPropertyValue('--primary-hover')).toBe('#D40F1B');
      expect(rootStyle.getPropertyValue('--primary-active')).toBe('#B60A14');
      expect(rootStyle.getPropertyValue('--primary-foreground')).toBe('#FFFFFF');
      expect(rootStyle.getPropertyValue('--primary-light')).toBe('#FEF2F2');
      expect(rootStyle.getPropertyValue('--primary-border')).toBe('#FECACA');
      expect(rootStyle.getPropertyValue('--primary-color')).toBe('#EC1B27');
    });
  });

  describe('4. Director Dashboard Appearance Settings Component', () => {
    it('renders all 5 circular color swatches with names and live preview for Director', () => {
      render(
        <MemoryRouter>
          <AppearanceSettings />
        </MemoryRouter>
      );

      // Check title and breadcrumbs
      expect(screen.getByText(/primary color system/i)).toBeInTheDocument();
      expect(screen.getByText(/appearance/i)).toBeInTheDocument();

      // Check all 5 colors are rendered
      expect(screen.getByText('Orange')).toBeInTheDocument();
      expect(screen.getByText('Dark Blue')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getAllByText('Light Blue').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Black')).toBeInTheDocument();

      // Check Save Changes button
      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      expect(saveBtn).toBeInTheDocument();

      // Check Live Component Preview section
      expect(screen.getByText(/live component preview/i)).toBeInTheDocument();
    });

    it('allows selecting swatches and saving changes with immediate notification', async () => {
      render(
        <MemoryRouter>
          <AppearanceSettings />
        </MemoryRouter>
      );

      // Click the Orange swatch
      const orangeSwatch = screen.getByRole('button', { name: /select orange/i });
      fireEvent.click(orangeSwatch);

      // Click Save Changes
      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/primary color successfully updated & saved/i)
        ).toBeInTheDocument();
      });

      // Verify global theme is now Orange
      expect(themeService.getPrimaryColor().hex).toBe('#FA8223');
    });

    it('immediately updates global CSS variables and localStorage upon clicking a swatch', () => {
      render(
        <MemoryRouter>
          <AppearanceSettings />
        </MemoryRouter>
      );

      // Click Dark Blue swatch
      const darkBlueSwatch = screen.getByRole('button', { name: /select dark blue/i });
      fireEvent.click(darkBlueSwatch);

      // Verify immediate update without needing to click save
      expect(localStorage.getItem('erp-primary-color')).toBe('#263183');
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#263183');
      expect(themeService.getPrimaryColor().hex).toBe('#263183');
    });

    it('tests all five primary colors switching reactively across the application', () => {
      render(
        <MemoryRouter>
          <AppearanceSettings />
        </MemoryRouter>
      );

      const colorTests = [
        { name: /select orange/i, hex: '#FA8223' },
        { name: /select dark blue/i, hex: '#263183' },
        { name: /select red/i, hex: '#EC1B27' },
        { name: /select light blue/i, hex: '#6AAED3' },
        { name: /select black/i, hex: '#161511' },
      ];

      colorTests.forEach(({ name, hex }) => {
        const swatch = screen.getByRole('button', { name });
        fireEvent.click(swatch);

        expect(localStorage.getItem('erp-primary-color')).toBe(hex);
        expect(document.documentElement.style.getPropertyValue('--primary')).toBe(hex);
        expect(themeService.getPrimaryColor().hex).toBe(hex);
      });
    });

    it('renders access restricted banner for non-Director users', () => {
      authService.switchRole('SALES_REP');

      render(
        <MemoryRouter>
          <AppearanceSettings />
        </MemoryRouter>
      );

      expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    });
  });
});
