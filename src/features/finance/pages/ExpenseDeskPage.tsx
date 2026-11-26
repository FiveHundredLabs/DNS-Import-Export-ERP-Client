import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BatchSupplierPaymentPage } from './ap/BatchSupplierPaymentPage';
import { VendorBillCostingPage } from './ap/VendorBillCostingPage';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui/button';
import { Coins, RotateCcw, Store, Receipt } from 'lucide-react';

interface ExpenseDeskPageProps {
  defaultTab?: 'voucher' | 'costing';
}

export function ExpenseDeskPage({ defaultTab }: ExpenseDeskPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryTab = searchParams.get('tab');
  const queryView = searchParams.get('view');
  const isCosting = queryTab === 'costing' || defaultTab === 'costing';

  if (isCosting) {
    return <VendorBillCostingPage />;
  }

  return (
    <div className="space-y-6 w-full pb-16" data-testid="unified-expense-desk">
      {/* Canonical Page Header */}
      <PageHeader
        title="Expense & Payables Desk"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Expense & Payables' },
        ]}
        onBack={() => navigate('/finance')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ap/advances')}
              className="text-xs h-8 gap-1.5 font-medium border-border"
            >
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span>Supplier Advances</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/notes?tab=debit')}
              className="text-xs h-8 gap-1.5 font-medium border-border"
            >
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span>Debit Notes (AP)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ap/bills/new')}
              className="text-xs h-8 gap-1.5 font-medium border-border"
            >
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Vendor Bills (Costing)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/suppliers')}
              className="text-xs h-8 gap-1.5 font-medium border-border"
            >
              <Store className="h-3.5 w-3.5 text-primary" />
              <span>Suppliers</span>
            </Button>
          </div>
        }
      />

      {/* Main Payment Voucher Workspace */}
      <BatchSupplierPaymentPage
        initialMode={queryView === 'registry' ? 'REGISTRY' : 'SETTLE_BILLS'}
        hideTopNav={true}
      />
    </div>
  );
}
