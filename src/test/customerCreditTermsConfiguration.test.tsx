import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerCreditTermsSettings } from '../features/dashboard/CustomerCreditTermsSettings';
import { creditTermsConfigService } from '../services/CreditTermsConfigService';
import { customerService } from '../services/CustomerService';
import { DEFAULT_CREDIT_TERMS_CONFIG } from '../types/creditTerms';
import * as authHook from '../hooks/useAuth';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Customer Credit Terms Configuration & Auto-Assignment Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    creditTermsConfigService.resetToDefaults({
      id: 'usr-dir',
      name: 'Director User',
      role: 'DIRECTOR',
      email: 'director@dns.lk',
    } as any);
  });

  describe('1. CreditTermsConfigService Domain & Storage', () => {
    it('returns default 30 days and LKR 500,000 credit limit initially', () => {
      const config = creditTermsConfigService.getCreditTermsConfig();
      expect(config.defaultCreditDays).toBe(30);
      expect(config.defaultCreditLimit).toBe(500000);
      expect(config.gracePeriodDays).toBe(3);
    });

    it('updates default credit days and limit with audit metadata', () => {
      creditTermsConfigService.updateCreditTermsConfig(
        {
          defaultCreditDays: 45,
          defaultCreditLimit: 1500000,
        },
        {
          id: 'usr-mgr',
          name: 'Manager User',
          role: 'MANAGER',
          email: 'manager@dns.lk',
        } as any
      );

      const updated = creditTermsConfigService.getCreditTermsConfig();
      expect(updated.defaultCreditDays).toBe(45);
      expect(updated.defaultCreditLimit).toBe(1500000);
      expect(updated.updatedBy).toBe('Manager User');
      expect(updated.updatedByRole).toBe('MANAGER');
    });

    it('resets to corporate defaults when requested', () => {
      creditTermsConfigService.updateCreditTermsConfig(
        { defaultCreditDays: 60, defaultCreditLimit: 2000000 },
        null
      );
      expect(creditTermsConfigService.getCreditTermsConfig().defaultCreditDays).toBe(60);

      const reset = creditTermsConfigService.resetToDefaults();
      expect(reset.defaultCreditDays).toBe(DEFAULT_CREDIT_TERMS_CONFIG.defaultCreditDays);
      expect(reset.defaultCreditLimit).toBe(DEFAULT_CREDIT_TERMS_CONFIG.defaultCreditLimit);
    });
  });

  describe('2. Role-Based Access Control', () => {
    it('allows DIRECTOR role full access to configuration inputs and save button', () => {
      vi.spyOn(authHook, 'useAuth').mockReturnValue({
        role: 'DIRECTOR',
        currentUser: { id: 'usr-dir', name: 'Director', role: 'DIRECTOR' } as any,
        isAuthenticated: true,
      } as any);

      render(
        <MemoryRouter>
          <CustomerCreditTermsSettings />
        </MemoryRouter>
      );

      expect(screen.getByText('Customer Credit Terms Configuration')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
    });

    it('allows MANAGER role full access to configuration inputs and save button', () => {
      vi.spyOn(authHook, 'useAuth').mockReturnValue({
        role: 'MANAGER',
        currentUser: { id: 'usr-mgr', name: 'Manager', role: 'MANAGER' } as any,
        isAuthenticated: true,
      } as any);

      render(
        <MemoryRouter>
          <CustomerCreditTermsSettings />
        </MemoryRouter>
      );

      expect(screen.getByText('Customer Credit Terms Configuration')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.queryByText('Access Restricted')).not.toBeInTheDocument();
    });

    it('blocks unauthorized roles (SALES_REP) with an Access Restricted notification', () => {
      vi.spyOn(authHook, 'useAuth').mockReturnValue({
        role: 'SALES_REP',
        currentUser: { id: 'usr-rep', name: 'Sales Rep', role: 'SALES_REP' } as any,
        isAuthenticated: true,
      } as any);

      render(
        <MemoryRouter>
          <CustomerCreditTermsSettings />
        </MemoryRouter>
      );

      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    });
  });

  describe('3. UI Interactivity & Dynamic Approval Routing', () => {
    it('allows clicking quick preset pills to change draft credit days and credit limit', () => {
      vi.spyOn(authHook, 'useAuth').mockReturnValue({
        role: 'DIRECTOR',
        currentUser: { id: 'usr-dir', name: 'Director', role: 'DIRECTOR' } as any,
        isAuthenticated: true,
      } as any);

      render(
        <MemoryRouter>
          <CustomerCreditTermsSettings />
        </MemoryRouter>
      );

      // Click "14 Days (Fortnightly)"
      const preset14 = screen.getByText('14 Days');
      fireEvent.click(preset14);

      // Click "LKR 1,000,000"
      const preset1M = screen.getByText('LKR 1,000,000');
      fireEvent.click(preset1M);

      // Check live simulator displays 14 Days
      expect(screen.getByText('Fortnightly')).toBeInTheDocument();
      expect(screen.getAllByText('14 Days').length).toBeGreaterThan(0);
    });

    it('dynamically displays Director Approval escalation when limit exceeds LKR 1,000,000', () => {
      vi.spyOn(authHook, 'useAuth').mockReturnValue({
        role: 'DIRECTOR',
        currentUser: { id: 'usr-dir', name: 'Director', role: 'DIRECTOR' } as any,
        isAuthenticated: true,
      } as any);

      render(
        <MemoryRouter>
          <CustomerCreditTermsSettings />
        </MemoryRouter>
      );

      // Select LKR 2,500,000 preset
      const preset2_5M = screen.getByText('LKR 2,500,000');
      fireEvent.click(preset2_5M);

      // Check threshold alert appears
      expect(screen.getByText(/Director Authorization Threshold Triggered/i)).toBeInTheDocument();
    });

    it('saves updated settings and persists to the service on form submission', async () => {
      vi.spyOn(authHook, 'useAuth').mockReturnValue({
        role: 'DIRECTOR',
        currentUser: { id: 'usr-dir', name: 'Test Director', role: 'DIRECTOR' } as any,
        isAuthenticated: true,
      } as any);

      render(
        <MemoryRouter>
          <CustomerCreditTermsSettings />
        </MemoryRouter>
      );

      // Select 60 Days preset
      const preset60 = screen.getByText('60 Days');
      fireEvent.click(preset60);

      // Save changes
      const saveBtn = screen.getByText('Save Changes');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        const current = creditTermsConfigService.getCreditTermsConfig();
        expect(current.defaultCreditDays).toBe(60);
      });
    });
  });

  describe('4. Automatic Assignment to Newly Created Customers', () => {
    it('automatically applies configured credit days and credit limit to newly created customer', async () => {
      // Configure non-default settings: 45 Days, LKR 800,000
      creditTermsConfigService.updateCreditTermsConfig(
        {
          defaultCreditDays: 45,
          defaultCreditLimit: 800000,
        },
        { id: 'usr-dir', name: 'Director', role: 'DIRECTOR' } as any
      );

      // Create new customer via customerService
      const newCustomer = await customerService.createCustomer({
        code: `TEST-CUST-${Date.now().toString().slice(-4)}`,
        name: 'Auto-Term Test Dealer Ltd',
        type: 'DEALER',
        loyaltyLevel: 'NEW',
        loyaltyTier: 'BRONZE',
        areaId: 'area-01',
        areaName: 'Kelaniya',
        assignedRepId: 'usr-106',
        assignedRepName: 'Kasun Wickramasinghe',
        contactPerson: 'Perera Test',
        phone: '+94 77 999 8888',
        email: 'test@dealer.lk',
        address: '123 High Street, Colombo',
        approvalStage: 'PENDING_SALES_REVIEW',
        status: 'INACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
        commercialTerms: undefined as any,
      });

      expect(newCustomer.commercialTerms.creditDays).toBe(45);
      expect(newCustomer.commercialTerms.creditLimit).toBe(800000);
      expect(newCustomer.financials.availableCredit).toBe(800000);
    });
  });
});
