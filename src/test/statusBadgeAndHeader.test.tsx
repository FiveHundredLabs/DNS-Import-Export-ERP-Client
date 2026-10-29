import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatusBadge, createStatusBadgeAdapter } from '../components/common/StatusBadge';
import { PageHeader } from '../components/common/PageHeader';
import { ApprovalTimeline, TimelineEntry } from '../components/approval/ApprovalTimeline';
import { Button } from '../components/ui/button';

describe('Canonical StatusBadge Primitive', () => {
  it('renders canonical status mappings with correct label and semantic styling', () => {
    const { rerender } = render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();

    rerender(<StatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();

    rerender(<StatusBadge status="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('preserves distinct domain meanings without conflation', () => {
    const { container, rerender } = render(<StatusBadge status="ISSUED" />);
    expect(screen.getByText('Issued')).toBeInTheDocument();
    // ISSUED uses navy/primary default variant
    expect(container.firstElementChild?.className).toContain('bg-primary');

    rerender(<StatusBadge status="PAID" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
    // PAID uses success variant
    expect(container.firstElementChild?.className).toContain('bg-emerald-50');

    rerender(<StatusBadge status="SENT_TO_SUPPLIER" />);
    expect(screen.getByText('Sent to Vendor')).toBeInTheDocument();

    rerender(<StatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain('line-through');
  });

  it('formats unknown statuses gracefully in Title Case fallback', () => {
    render(<StatusBadge status="UNKNOWN_CUSTOM_STEP" />);
    expect(screen.getByText('Unknown Custom Step')).toBeInTheDocument();
  });

  it('allows label override and variant override', () => {
    render(<StatusBadge status="APPROVED" label="Audit Verified" variant="info" />);
    expect(screen.getByText('Audit Verified')).toBeInTheDocument();
    expect(screen.queryByText('Approved')).toBeNull();
  });

  it('supports size="sm" and showIcon={false}', () => {
    const { container } = render(
      <StatusBadge status="ACTIVE" size="sm" showIcon={false} />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.firstElementChild?.className).toContain('text-[10.5px]');
  });

  it('works with createStatusBadgeAdapter helper', () => {
    const CustomAdapter = createStatusBadgeAdapter<'CUSTOM_ONE' | 'CUSTOM_TWO'>({
      CUSTOM_ONE: { label: 'Custom First', variant: 'purple' },
    });

    render(<CustomAdapter status="CUSTOM_ONE" />);
    expect(screen.getByText('Custom First')).toBeInTheDocument();
  });
});

describe('Canonical PageHeader Primitive', () => {
  it('renders title, subtitle, badge, and actions in structured slots', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Purchase Orders"
          subtitle="Manage procurement requests and approval flows"
          badge={<StatusBadge status="ACTIVE" />}
          actions={<Button>Create PO</Button>}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Purchase Orders/i })).toBeInTheDocument();
    expect(screen.getByText(/Manage procurement requests/i)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create PO/i })).toBeInTheDocument();
  });

  it('renders breadcrumbs navigation with correct hierarchy and links', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="PO-2026-001"
          breadcrumbs={[
            { label: 'Purchasing', href: '/purchasing' },
            { label: 'Orders', href: '/purchasing/orders' },
            { label: 'PO-2026-001' },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Purchasing' })).toHaveAttribute('href', '/purchasing');
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/purchasing/orders');
    expect(screen.getByRole('heading', { level: 1, name: 'PO-2026-001' })).toBeInTheDocument();
    expect(screen.getAllByText('PO-2026-001')).toHaveLength(2);
  });

  it('handles back button navigation and invokes onBack callback', () => {
    const onBackMock = vi.fn();
    render(
      <MemoryRouter>
        <PageHeader
          title="Order Details"
          onBack={onBackMock}
          backLabel="Back to Orders"
        />
      </MemoryRouter>
    );

    const backBtn = screen.getByRole('button', { name: /Back to Orders/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});

describe('ApprovalTimeline Contrast Fix (APR-009 / CM-08)', () => {
  it('uses high-contrast background classes for submit, escalate, and issue action markers', () => {
    const history: TimelineEntry[] = [
      {
        id: '1',
        actorName: 'John Buyer',
        actorRole: 'Procurement Specialist',
        action: 'SUBMIT',
        timestamp: '2026-10-29T10:00:00Z',
      },
      {
        id: '2',
        actorName: 'Alice Manager',
        actorRole: 'Sales Manager',
        action: 'ESCALATE',
        timestamp: '2026-10-29T11:00:00Z',
      },
      {
        id: '3',
        actorName: 'Bob Warehouse',
        actorRole: 'Warehouse Officer',
        action: 'ISSUE',
        timestamp: '2026-10-29T12:00:00Z',
      },
    ];

    const { container } = render(<ApprovalTimeline history={history} />);

    // Check that icons are rendered inside their respective colored circle markers
    const markers = container.querySelectorAll('.rounded-full.text-white');
    expect(markers.length).toBe(3);

    // SUBMIT marker must use solid navy bg-primary (contrast > 11:1 with white text)
    expect(markers[0].className).toContain('bg-primary');
    expect(markers[0].className).not.toContain('bg-primary-light');

    // ESCALATE marker must use bg-sky-600 (contrast > 4.5:1 with white text)
    expect(markers[1].className).toContain('bg-sky-600');
    expect(markers[1].className).not.toContain('bg-primary-light');

    // ISSUE marker must use bg-indigo-600 (contrast > 6.8:1 with white text)
    expect(markers[2].className).toContain('bg-indigo-600');
    expect(markers[2].className).not.toContain('bg-primary-light');
  });
});
