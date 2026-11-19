import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AreaListPage } from '../features/administration/AreaListPage';
import { TeamListPage } from '../features/administration/TeamListPage';

const mockAreasData = [
  {
    id: 'area-1',
    areaCode: 'KEL',
    areaName: 'Kelaniya',
    description: 'Region: Western',
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    users: [],
    customers: [],
    _count: { users: 0, customers: 0 },
  },
  {
    id: 'area-2',
    areaCode: 'MHR',
    areaName: 'Maharagama',
    description: 'Region: Western',
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    users: [],
    customers: [],
    _count: { users: 0, customers: 0 },
  },
  {
    id: 'area-3',
    areaCode: 'MLB',
    areaName: 'Malabe',
    description: 'Region: Western',
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    users: [],
    customers: [],
    _count: { users: 0, customers: 0 },
  },
  {
    id: 'area-4',
    areaCode: 'KOT',
    areaName: 'Kottawa',
    description: 'Region: Western',
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    users: [],
    customers: [],
    _count: { users: 0, customers: 0 },
  },
];

vi.mock('../api/areas/areas.api', () => ({
  areasApi: {
    listAreas: vi.fn().mockImplementation(async () => ({
      data: [...mockAreasData],
      total: mockAreasData.length,
      page: 1,
      pageSize: 100,
    })),
    createArea: vi.fn().mockImplementation(async (payload) => {
      const newArea = {
        id: `area-${Date.now()}`,
        areaCode: payload.areaName.slice(0, 3).toUpperCase(),
        areaName: payload.areaName,
        description: payload.description,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        users: [],
        customers: [],
        _count: { users: 0, customers: 0 },
      };
      mockAreasData.push(newArea);
      return newArea;
    }),
    updateArea: vi.fn(),
    updateAreaStatus: vi.fn(),
    deleteArea: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'user-director-1',
      name: 'Director User',
      email: 'director@example.com',
      role: 'DIRECTOR',
    },
    role: 'DIRECTOR',
    token: 'mock-token',
  }),
}));

describe('Area and Team Management Requirements', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe('1. Area Management (/areas) - Create Area', () => {
    it('displays all area managers in the dropdown and area manager selection is not mandatory', async () => {
      render(
        <MemoryRouter initialEntries={['/areas']}>
          <AreaListPage />
        </MemoryRouter>
      );

      // Open Create Area modal
      const createBtn = screen.getByRole('button', { name: /Create Area/i });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText('Create New Area')).toBeInTheDocument();
      });

      // Verify Area Manager label indicates optional
      expect(screen.getByText('Optional')).toBeInTheDocument();

      // Verify default unassigned/optional placeholder option is present
      expect(screen.getByText('-- No Area Manager (Optional) --')).toBeInTheDocument();

      // Open the Area Manager select dropdown (the combobox inside the modal)
      const comboboxes = screen.getAllByRole('combobox');
      const selectTrigger = comboboxes[comboboxes.length - 1];
      fireEvent.click(selectTrigger);

      // Verify all Area Managers are visible in dropdown options
      await waitFor(() => {
        expect(screen.getAllByText('Nimal Bandara').length).toBeGreaterThan(0);
        expect(screen.getByText('Sunil Shantha')).toBeInTheDocument();
        expect(screen.getByText('Pradeep Kumara')).toBeInTheDocument();
        expect(screen.getByText('Anura Senanayake')).toBeInTheDocument();
      });

      // Keep it optional / unassigned by choosing No Area Manager
      fireEvent.click(screen.getByRole('option', { name: /-- No Area Manager \(Optional\) --/i }));

      // Fill in Code and Name without selecting an Area Manager
      const codeInput = screen.getByPlaceholderText('e.g. KEL');
      const nameInput = screen.getByPlaceholderText('e.g. Kelaniya, Maharagama, Malabe, Kottawa');
      const regionInput = screen.getByPlaceholderText('e.g. Colombo & Suburbs');

      fireEvent.change(codeInput, { target: { value: 'NEG' } });
      fireEvent.change(nameInput, { target: { value: 'Negombo' } });
      fireEvent.change(regionInput, { target: { value: 'Gampaha Coastal' } });

      // Save without selecting area manager (modal footer submit button)
      const saveBtns = screen.getAllByRole('button', { name: 'Create Area' });
      fireEvent.click(saveBtns[saveBtns.length - 1]);

      // Verify newly created area appears
      await waitFor(() => {
        expect(screen.getByText('Negombo')).toBeInTheDocument();
        expect(screen.getByText('NEG')).toBeInTheDocument();
      });
    });
  });

  describe('2. Team Management (/teams) - Areas Dropdown', () => {
    it('displays all areas in the table area filter and add team member modal', async () => {
      render(
        <MemoryRouter initialEntries={['/teams']}>
          <TeamListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Team Management')).toBeInTheDocument();
      });

      // Verify All Areas filter is present on the page
      const filterTrigger = screen.getByRole('combobox');
      expect(filterTrigger).toBeInTheDocument();
      expect(screen.getByText('All Areas (Show All)')).toBeInTheDocument();

      // Open the filter dropdown to verify all areas are in the dropdown
      fireEvent.click(filterTrigger);
      await waitFor(() => {
        expect(screen.getByText(/Kelaniya \(KEL\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Maharagama \(MHR\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Malabe \(MLB\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Kottawa \(KOT\)/i)).toBeInTheDocument();
      });

      // Close filter dropdown by selecting All Areas
      fireEvent.click(screen.getByRole('option', { name: /All Areas \(Show All\)/i }));

      // Open Add Team Member modal using top action button
      const addBtns = screen.getAllByRole('button', { name: /Add Team Member/i });
      fireEvent.click(addBtns[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Add Team Member' })).toBeInTheDocument();
      });

      // Verify optional label on assigned area
      expect(screen.getByText('-- No Area Assigned (Optional) --')).toBeInTheDocument();

      // Open Assigned Area select dropdown inside the modal
      const modalAreaSelect = screen.getAllByRole('combobox');
      // modalAreaSelect[1] is the Assigned Area select (modalAreaSelect[0] is the Role select)
      fireEvent.click(modalAreaSelect[modalAreaSelect.length - 1]);

      // Verify all areas drop down in modal
      await waitFor(() => {
        expect(screen.getAllByText(/Kelaniya \(KEL\)/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Maharagama \(MHR\)/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Malabe \(MLB\)/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Kottawa \(KOT\)/i).length).toBeGreaterThan(0);
      });
    });
  });
});
