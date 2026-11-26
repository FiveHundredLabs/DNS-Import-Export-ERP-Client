import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AreaListPage } from '../features/administration/AreaListPage';
import { AreaStatus } from '../api/areas/areas.types';

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function createMockAreasList() {
  return [
    {
      id: 'area-1',
      areaCode: 'MHR',
      areaName: 'Maharagama',
      description: 'Region: Western',
      status: 'ACTIVE' as AreaStatus,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      users: [],
      customers: [],
      _count: { users: 0, customers: 0 },
    },
    {
      id: 'area-2',
      areaCode: 'KOT',
      areaName: 'Kottawa',
      description: 'Region: Western',
      status: 'ACTIVE' as AreaStatus,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      users: [],
      customers: [],
      _count: { users: 0, customers: 0 },
    },
    {
      id: 'area-3',
      areaCode: 'COL',
      areaName: 'Colombo',
      description: 'Region: Western',
      status: 'INACTIVE' as AreaStatus,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      users: [],
      customers: [],
      _count: { users: 0, customers: 0 },
    },
    {
      id: 'area-4',
      areaCode: 'KDY',
      areaName: 'Kandy',
      description: 'Region: Central',
      status: 'INACTIVE' as AreaStatus,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      users: [],
      customers: [],
      _count: { users: 0, customers: 0 },
    },
  ];
}

let mockAreasList = createMockAreasList();
const mockUpdateStatus = vi.fn();
const mockDeleteArea = vi.fn();

vi.mock('../api/areas/areas.api', () => ({
  areasApi: {
    listAreas: vi.fn().mockImplementation(async (params) => {
      let filtered = [...mockAreasList];
      if (params?.status && params.status !== 'ALL') {
        filtered = filtered.filter((a) => a.status === params.status);
      }
      return {
        data: filtered,
        total: filtered.length,
        page: 1,
        pageSize: 100,
      };
    }),
    createArea: vi.fn(),
    updateArea: vi.fn(),
    updateAreaStatus: vi.fn().mockImplementation(async (id, payload) => {
      mockUpdateStatus(id, payload);
      const target = mockAreasList.find((a) => a.id === id);
      if (target) target.status = payload.status;
      return target;
    }),
    deleteArea: vi.fn().mockImplementation(async (id) => {
      mockDeleteArea(id);
      const idx = mockAreasList.findIndex((a) => a.id === id);
      if (idx !== -1) mockAreasList.splice(idx, 1);
    }),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: {
      id: 'dir-1',
      name: 'Director User',
      email: 'director@example.com',
      role: 'DIRECTOR',
    },
    role: 'DIRECTOR',
    token: 'mock-token',
  }),
}));

describe('Area Management Redesign: Inactive Visibility, Status Toggle, Soft Delete Confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAreasList = createMockAreasList();
  });

  it('renders both ACTIVE and INACTIVE areas in the list with appropriate status badges', async () => {
    renderWithQuery(
      <MemoryRouter initialEntries={['/areas']}>
        <AreaListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maharagama')).toBeInTheDocument();
      expect(screen.getByText('Kottawa')).toBeInTheDocument();
      expect(screen.getByText('Colombo')).toBeInTheDocument();
      expect(screen.getByText('Kandy')).toBeInTheDocument();
    });

    // Check status badges
    const activeBadges = screen.getAllByText('ACTIVE');
    const inactiveBadges = screen.getAllByText('INACTIVE');
    expect(activeBadges.length).toBeGreaterThanOrEqual(2);
    expect(inactiveBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('filters areas by status when using the status filter dropdown', async () => {
    renderWithQuery(
      <MemoryRouter initialEntries={['/areas']}>
        <AreaListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maharagama')).toBeInTheDocument();
      expect(screen.getByText('Colombo')).toBeInTheDocument();
    });

    // Find the Status Filter trigger combobox
    const comboboxes = screen.getAllByRole('combobox');
    const statusFilterTrigger = comboboxes[0];

    // Filter to Active Only
    fireEvent.click(statusFilterTrigger);
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Active Only' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Active Only' }));

    await waitFor(() => {
      expect(screen.getByText('Maharagama')).toBeInTheDocument();
      expect(screen.getByText('Kottawa')).toBeInTheDocument();
      expect(screen.queryByText('Colombo')).not.toBeInTheDocument();
      expect(screen.queryByText('Kandy')).not.toBeInTheDocument();
    });

    // Filter to Inactive Only
    fireEvent.click(statusFilterTrigger);
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Inactive Only' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Inactive Only' }));

    await waitFor(() => {
      expect(screen.queryByText('Maharagama')).not.toBeInTheDocument();
      expect(screen.queryByText('Kottawa')).not.toBeInTheDocument();
      expect(screen.getByText('Colombo')).toBeInTheDocument();
      expect(screen.getByText('Kandy')).toBeInTheDocument();
    });
  });

  it('provides dedicated Activate/Deactivate action that calls updateAreaStatus without deleting', async () => {
    renderWithQuery(
      <MemoryRouter initialEntries={['/areas']}>
        <AreaListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maharagama')).toBeInTheDocument();
    });

    // Find Deactivate button for Maharagama (first ACTIVE area)
    const deactivateBtns = screen.getAllByTitle('Deactivate Area');
    expect(deactivateBtns.length).toBeGreaterThan(0);
    fireEvent.click(deactivateBtns[0]);

    await waitFor(() => {
      expect(mockUpdateStatus).toHaveBeenCalledWith('area-1', { status: 'INACTIVE' });
    });
  });

  it('provides separate Delete action with confirmation modal and removes area from list on confirm', async () => {
    renderWithQuery(
      <MemoryRouter initialEntries={['/areas']}>
        <AreaListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maharagama')).toBeInTheDocument();
    });

    // Click Delete button on Maharagama
    const deleteBtns = screen.getAllByTitle('Delete Area');
    fireEvent.click(deleteBtns[0]);

    // Verify confirmation modal opens with explicit required text
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Delete Area/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete the area/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Historical records and existing relationships will be preserved/i)
      ).toBeInTheDocument();
    });

    // Confirm delete inside the modal
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete Area' });
    const confirmDeleteBtn = deleteButtons[deleteButtons.length - 1];
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteArea).toHaveBeenCalledWith('area-1');
      expect(screen.queryByText('Maharagama')).not.toBeInTheDocument();
    });
  });
});
