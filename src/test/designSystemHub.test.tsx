import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Import from the single central UI primitives hub
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Textarea,
  Alert,
  Skeleton,
} from '../components/ui';

// Import from the master central components directory
import {
  Button as MasterButton,
  CustomerSummaryCard,
  InvoiceStatusBadge,
  PaymentStatusBadge,
} from '../components';

describe('Design System Hub & Centralized Components Export Audit', () => {
  it('correctly exports and renders UI primitives from @/components/ui in one place', () => {
    render(
      <div>
        <Button variant="default">Save Changes</Button>
        <Input placeholder="Enter username" />
        <Textarea placeholder="Enter description" />
        <Badge variant="outline">Active</Badge>
        <Alert title="Alert Notice">Operation completed successfully.</Alert>
        <Skeleton className="h-4 w-32" />
        <Card>
          <CardHeader>
            <CardTitle>Card Header Title</CardTitle>
          </CardHeader>
          <CardContent>Card Body Details</CardContent>
        </Card>
      </div>
    );

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Alert Notice')).toBeInTheDocument();
    expect(screen.getByText('Card Header Title')).toBeInTheDocument();
    expect(screen.getByText('Card Body Details')).toBeInTheDocument();
  });

  it('correctly exports and renders Shadcn Radix Select from the UI hub', () => {
    render(
      <Select defaultValue="test-opt">
        <SelectTrigger>
          <SelectValue placeholder="Choose an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="test-opt">Option Alpha</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByText('Option Alpha')).toBeInTheDocument();
  });

  it('correctly exports and renders composite and feature components from @/components in one place', () => {
    render(
      <MemoryRouter>
        <div>
          <MasterButton>Master Export Button</MasterButton>
          <InvoiceStatusBadge status="ISSUED" />
          <PaymentStatusBadge status="APPROVED" />
          <CustomerSummaryCard
            customer={{
              id: 'c-test',
              code: 'CUST-001',
              name: 'Central Test Customer',
              type: 'DEALER',
              areaId: 'area-1',
              areaName: 'Western',
              assignedRepId: 'rep-1',
              assignedRepName: 'John',
              contactPerson: 'Manager',
              phone: '0112345678',
              email: 'test@example.com',
              address: 'Colombo',
              commercialTerms: {
                creditLimit: 500000,
                creditDays: 30,
                defaultDiscountPercentage: 5,
                maxDiscountPercentage: 10,
              },
              financials: {
                totalOutstanding: 100000,
                currentDue: 50000,
                nearDue: 25000,
                overdue: 25000,
                availableCredit: 400000,
                creditUtilizationRate: 20,
              },
              approvalStage: 'APPROVED',
              status: 'ACTIVE',
              createdAt: '2025-01-01',
              updatedAt: '2025-01-01',
            }}
          />
        </div>
      </MemoryRouter>
    );

    expect(screen.getByText('Master Export Button')).toBeInTheDocument();
    expect(screen.getByText('Issued')).toBeInTheDocument();
    expect(screen.getByText('Approved by Finance')).toBeInTheDocument();
    expect(screen.getByText('Central Test Customer')).toBeInTheDocument();
  });
});
