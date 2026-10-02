import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SalesManagerDashboard } from './src/features/dashboard/SalesManagerDashboard';
import { useSalesManagerDashboard } from './src/hooks/useSalesManagerDashboard';
import { expect, test, vi } from 'vitest';

vi.mock('./src/hooks/useSalesManagerDashboard');

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

test('renders dashboard successfully without throwing', async () => {
  vi.mocked(useSalesManagerDashboard).mockReturnValue({
    data: {
      kpis: { teamSales: 1000, unpaidInvoices: 2000, activeAreaManagers: 2, totalSalesReps: 10 },
      areaPerformances: [
        {
          areaId: 'area-1',
          areaName: 'Area 1',
          target: 1000,
          achieved: 500,
          salesReps: [
            { repId: 'rep-1', repName: 'Rep 1', target: 500, achieved: 250, achievementPercentage: 50 }
          ]
        }
      ],
      agingBuckets: [
        { bucket: 'Current', amount: 0, customerCount: 0 },
        { bucket: '30 Days', amount: 0, customerCount: 0 }
      ]
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
  });

  render(<SalesManagerDashboard />);
  await waitFor(() => {
    expect(screen.getByText('Team Sales')).toBeInTheDocument();
  });
});
