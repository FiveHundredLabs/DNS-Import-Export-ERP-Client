import { describe, it, expect } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuotationStatusBadge } from '../features/quotations/QuotationStatusBadge';
import { QuotationConvertModal } from '../features/quotations/QuotationConvertModal';
import { QuotationListPage } from '../features/quotations/QuotationListPage';
import { MOCK_QUOTATIONS } from '../mock/mockQuotations';

describe('Quotation UI Components & Type Checking', () => {
  it('renders QuotationStatusBadge with correct variants', () => {
    const { rerender } = render(<QuotationStatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();

    rerender(<QuotationStatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();

    rerender(<QuotationStatusBadge status="DRAFT" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<QuotationStatusBadge status="CONVERTED" />);
    expect(screen.getByText('Converted')).toBeInTheDocument();

    rerender(<QuotationStatusBadge status="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    rerender(<QuotationStatusBadge status="EXPIRED" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('renders QuotationListPage without crash', async () => {
    render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Quotation Management')).toBeInTheDocument();
    expect(screen.getByText('New Quotation')).toBeInTheDocument();
  });

  it('renders QuotationConvertModal when open', () => {
    const mockQuotation = MOCK_QUOTATIONS[0];
    render(
      <QuotationConvertModal
        isOpen={true}
        onClose={() => {}}
        quotation={mockQuotation}
        onConfirmConvert={async () => ({} as any)}
      />
    );

    expect(screen.getByText('Convert Quotation to Sales Order')).toBeInTheDocument();
    expect(screen.getByText('Confirm Conversion')).toBeInTheDocument();
  });
});
