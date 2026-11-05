import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BatchSupplierPaymentPage } from './ap/BatchSupplierPaymentPage';
import { VendorBillCostingPage } from './ap/VendorBillCostingPage';
import { PaymentVouchersRegistry } from '../components/PaymentVouchersRegistry';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../utils/cn';
import {
  CreditCard,
  Receipt,
  Coins,
  ArrowRight,
  RotateCcw,
  Store,
  Clock,
  ShieldCheck,
  Plus,
  FileText,
} from 'lucide-react';

interface ExpenseDeskPageProps {
  defaultTab?: 'voucher' | 'costing';
}

export function ExpenseDeskPage({ defaultTab }: ExpenseDeskPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryTab = searchParams.get('tab');
  const queryView = searchParams.get('view');
  const [activeTab, setActiveTab] = useState<'voucher' | 'costing'>(() => {
    if (queryTab === 'costing' || defaultTab === 'costing') return 'costing';
    return 'voucher';
  });

  const [voucherSubTab, setVoucherSubTab] = useState<'ENTRY' | 'REGISTRY'>(() => {
    if (queryView === 'registry') return 'REGISTRY';
    return 'ENTRY';
  });
  const [selectedVoucherNumber, setSelectedVoucherNumber] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (queryTab === 'costing' && activeTab !== 'costing') {
      setActiveTab('costing');
    } else if (queryTab === 'voucher' && activeTab !== 'voucher') {
      setActiveTab('voucher');
    }
  }, [queryTab]);

  useEffect(() => {
    if (queryView === 'entry') {
      setVoucherSubTab('ENTRY');
    } else if (queryView === 'registry') {
      setVoucherSubTab('REGISTRY');
    }
  }, [queryView]);

  const handleTabChange = (tab: 'voucher' | 'costing') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-5 w-full pb-16" data-testid="unified-expense-desk">
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
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span>Supplier Advances</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/notes?tab=debit')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <span>Debit Notes (AP)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/suppliers')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <Store className="h-3.5 w-3.5 text-primary" />
              <span>Suppliers</span>
            </Button>
          </div>
        }
      />

      {/* Al Akleel-Style Top Segmented Desk Switcher & Sub-view Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80">
            <button
              type="button"
              onClick={() => handleTabChange('voucher')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'voucher'
                  ? 'bg-background text-foreground shadow-xs border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span>Supplier Payment Voucher</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('costing')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'costing'
                  ? 'bg-background text-foreground shadow-xs border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Receipt className="h-3.5 w-3.5 text-emerald-600" />
              <span>Vendor Bill Costing (Landed Costs)</span>
            </button>
          </div>

          {activeTab === 'voucher' && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setVoucherSubTab('ENTRY')}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-all',
                  voucherSubTab === 'ENTRY'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Voucher Entry
              </button>
              <button
                type="button"
                onClick={() => setVoucherSubTab('REGISTRY')}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-all',
                  voucherSubTab === 'REGISTRY'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Vouchers Registry
              </button>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground hidden lg:flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>
            {activeTab === 'voucher'
              ? 'Pay suppliers, settle open GRN bills with advance offset, or issue pre-payments'
              : 'Apportion customs duty, port clearing, freight charges, and cost inbound inventory'}
          </span>
        </div>
      </div>

      {/* Desk Content */}
      {activeTab === 'voucher' ? (
        voucherSubTab === 'ENTRY' ? (
          <BatchSupplierPaymentPage
            hideTopNav={true}
            voucherNumber={selectedVoucherNumber}
            onViewRegistry={() => {
              setVoucherSubTab('REGISTRY');
              setSearchParams({ tab: 'voucher', view: 'registry' });
            }}
          />
        ) : (
          <PaymentVouchersRegistry
            onNewVoucher={() => {
              setSelectedVoucherNumber(undefined);
              setVoucherSubTab('ENTRY');
              setSearchParams({ tab: 'voucher', view: 'entry' });
            }}
            onSelectVoucher={(v) => {
              setSelectedVoucherNumber(v.voucherNumber);
              setVoucherSubTab('ENTRY');
              setSearchParams({ tab: 'voucher', view: 'entry' });
            }}
          />
        )
      ) : (
        <VendorBillCostingPage />
      )}
    </div>
  );
}
