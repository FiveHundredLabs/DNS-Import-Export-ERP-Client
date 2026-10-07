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
    it('provides exactly the 3 predefined color options (Dark Blue, Red, Black)', () => {
      const colors = themeService.getAllPrimaryColors();
      expect(colors).toHaveLength(3);

      const hexes = colors.map((c) => c.hex.toUpperCase());
      expect(hexes).toContain('#263183'); // Dark Blue
      expect(hexes).toContain('#EC1B27'); // Red
      expect(hexes).toContain('#161511'); // Black
      expect(hexes).not.toContain('#FA8223'); // Orange removed
      expect(hexes).not.toContain('#6AAED3'); // Light Blue removed
    });

    it('sets Dark Blue (#263183) as the initial default color', () => {
      localStorage.clear();
      // Instantiate fresh service logic check
      const current = themeService.getPrimaryColor();
      expect(current.hex.toUpperCase()).toBe('#263183');
      expect(current.name).toBe('Dark Blue');
    });

    it('generates appropriate hover, active, light, and accessible text tokens', () => {
      const darkBlue = PRIMARY_COLOR_OPTIONS.find((c) => c.id === 'dark-blue')!;
      expect(darkBlue.hover).toBeDefined();
      expect(darkBlue.active).toBeDefined();
      expect(darkBlue.light).toBeDefined();
      expect(darkBlue.border).toBeDefined();
      expect(darkBlue.text).toBeDefined();
      expect(darkBlue.foreground).toBe('#FFFFFF');
    });
  });

  describe('2. Security & Role Permissions', () => {
    it('allows DIRECTOR role to set primary color', () => {
      const res = themeService.setPrimaryColor('#EC1B27', 'DIRECTOR');
      expect(res.success).toBe(true);
      expect(themeService.getPrimaryColor().hex).toBe('#EC1B27');
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

    it('rejects arbitrary, non-approved color hex codes and removed colors (Orange, Light Blue)', () => {
      const res = themeService.setPrimaryColor('#123456', 'DIRECTOR');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalid color value/i);

      // Verify orange and light blue are also rejected
      const orangeRes = themeService.setPrimaryColor('#FA8223', 'DIRECTOR');
      expect(orangeRes.success).toBe(false);
      const lightBlueRes = themeService.setPrimaryColor('#6AAED3', 'DIRECTOR');
      expect(lightBlueRes.success).toBe(false);
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
    it('renders all 3 circular color swatches with names and live preview for Director', () => {
      render(
        <MemoryRouter>
          <AppearanceSettings />
        </MemoryRouter>
      );

      // Check title and breadcrumbs
      expect(screen.getByText(/primary color system/i)).toBeInTheDocument();
      expect(screen.getByText(/appearance/i)).toBeInTheDocument();

      // Check all 3 approved colors are rendered
      expect(screen.getAllByText('Dark Blue').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('Black')).toBeInTheDocument();

      // Check removed colors are NOT rendered
      expect(screen.queryByText('Orange')).not.toBeInTheDocument();
      expect(screen.queryByText('Light Blue')).not.toBeInTheDocument();

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

      // Click the Red swatch
      const redSwatch = screen.getByRole('button', { name: /select red/i });
      fireEvent.click(redSwatch);

      // Click Save Changes
      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/primary color successfully updated & saved/i)
        ).toBeInTheDocument();
      });

      // Verify global theme is now Red
      expect(themeService.getPrimaryColor().hex).toBe('#EC1B27');
    });

    it('immediately updates global CSS variables and localStorage upon clicking a swatch', () => {
      render(
        <MemoryRouter>
          <AppearanceSettings />
        </MemoryRouter>
      );

      // Click Black swatch
      const blackSwatch = screen.getByRole('button', { name: /select black/i });
      fireEvent.click(blackSwatch);

      // Verify immediate update without needing to click save
      expect(localStorage.getItem('erp-primary-color')).toBe('#161511');
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#161511');
      expect(themeService.getPrimaryColor().hex).toBe('#161511');
    });

    it('tests all three primary colors switching reactively across the application', () => {
      render(
        <MemoryRouter>
          <AppearanceSettings />
        </MemoryRouter>
      );

      const colorTests = [
        { name: /select dark blue/i, hex: '#263183' },
        { name: /select red/i, hex: '#EC1B27' },
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
