import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormSection } from '../components/common/FormSection';
import { FormField } from '../components/common/FormField';
import { DocumentActionBar } from '../components/common/DocumentActionBar';
import { SupplierSelector } from '../components/selectors/SupplierSelector';
import { SupplierSummaryCard } from '../components/selectors/SupplierSummaryCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Building2, Save } from 'lucide-react';
import { Supplier } from '../features/finance/api/types';

const mockSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    code: 'SUP-001',
    name: 'Schneider Electric Lanka (Pvt) Ltd',
    contactPerson: 'Rohan Silva',
    email: 'rohan.s@schneider.lk',
    phone: '+94 11 234 5678',
    address: '123 Baseline Road, Colombo 09',
    taxNumber: 'VAT-11928374',
    paymentTerms: 'Net 30',
    status: 'ACTIVE',
    balance: 450000,
  },
  {
    id: 'sup-2',
    code: 'SUP-002',
    name: 'ABB Power Products Lanka',
    contactPerson: 'Nimal Fernando',
    email: 'nimal.f@abb.lk',
    phone: '+94 11 876 5432',
    address: '45 Galle Road, Colombo 03',
    taxNumber: 'VAT-88997766',
    paymentTerms: 'Net 45',
    status: 'INACTIVE',
    balance: 0,
  },
];

describe('FormSection Primitive (Batch 2 Data-Entry)', () => {
  it('renders section title, subtitle, icon, and right-aligned action buttons', () => {
    render(
      <FormSection
        icon={Building2}
        title="Vendor Details"
        description="Supplier parameters and credit terms"
        actions={<Button size="sm">Add Supplier</Button>}
      >
        <div data-testid="section-content">Content goes here</div>
      </FormSection>
    );

    expect(screen.getByText('Vendor Details')).toBeInTheDocument();
    expect(screen.getByText('Supplier parameters and credit terms')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Supplier/i })).toBeInTheDocument();
    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('honors noPadding=true for table containers', () => {
    const { container } = render(
      <FormSection title="Line Items" noPadding={true}>
        <table><tbody><tr><td>Row</td></tr></tbody></table>
      </FormSection>
    );

    // CardContent must have p-0
    const content = container.querySelector('.p-0');
    expect(content).toBeInTheDocument();
  });
});

describe('FormField Primitive (Batch 2 Data-Entry)', () => {
  it('renders label with red asterisk when required=true', () => {
    render(
      <FormField label="Supplier Name" required htmlFor="supplier-name">
        <Input id="supplier-name" />
      </FormField>
    );

    expect(screen.getByText('Supplier Name')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('text-rose-500');
  });

  it('renders hint on the right and error message below input', () => {
    render(
      <FormField
        label="Credit Limit"
        hint="Max LKR 5,000,000"
        error="Credit limit cannot be negative"
      >
        <Input type="number" />
      </FormField>
    );

    expect(screen.getByText('Max LKR 5,000,000')).toBeInTheDocument();
    const errorEl = screen.getByRole('alert');
    expect(errorEl).toHaveTextContent('Credit limit cannot be negative');
  });
});

describe('DocumentActionBar Primitive (Batch 2 Data-Entry)', () => {
  it('renders status, summary total, and action buttons in structured slots', () => {
    render(
      <DocumentActionBar
        status={<StatusBadge status="DRAFT" />}
        summary={<span>Total: LKR 125,000.00</span>}
        leftActions={<Button variant="ghost">Cancel</Button>}
        rightActions={<Button variant="default">Save Draft</Button>}
      />
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Total: LKR 125,000.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Draft/i })).toBeInTheDocument();
  });
});

describe('SupplierSelector and SupplierSummaryCard (Batch 2)', () => {
  it('filters suppliers in SupplierSelector by code or name and invokes onSelect', () => {
    const onSelectMock = vi.fn();
    render(
      <SupplierSelector
        suppliers={mockSuppliers}
        onSelect={onSelectMock}
      />
    );

    expect(screen.getByText('Schneider Electric Lanka (Pvt) Ltd')).toBeInTheDocument();
    expect(screen.getByText('ABB Power Products Lanka')).toBeInTheDocument();

    // Filter by search query
    const searchInput = screen.getByPlaceholderText(/Search Supplier Master/i);
    fireEvent.change(searchInput, { target: { value: 'ABB' } });

    expect(screen.queryByText('Schneider Electric Lanka (Pvt) Ltd')).toBeNull();
    const abbItem = screen.getByText('ABB Power Products Lanka');
    expect(abbItem).toBeInTheDocument();

    fireEvent.click(abbItem);
    expect(onSelectMock).toHaveBeenCalledWith(mockSuppliers[1]);
  });

  it('SupplierSummaryCard displays supplier details and triggers change callback', () => {
    const onChangeMock = vi.fn();
    render(
      <SupplierSummaryCard
        supplier={mockSuppliers[0]}
        onChangeSupplier={onChangeMock}
      />
    );

    expect(screen.getByText('SUP-001')).toBeInTheDocument();
    expect(screen.getByText('Schneider Electric Lanka (Pvt) Ltd')).toBeInTheDocument();
    expect(screen.getByText('Rohan Silva')).toBeInTheDocument();
    expect(screen.getByText('Net 30')).toBeInTheDocument();
    expect(screen.getByText(/VAT-11928374/i)).toBeInTheDocument();

    const changeBtn = screen.getByRole('button', { name: /Change/i });
    expect(changeBtn).toBeInTheDocument();
    fireEvent.click(changeBtn);
    expect(onChangeMock).toHaveBeenCalledTimes(1);
  });
});
