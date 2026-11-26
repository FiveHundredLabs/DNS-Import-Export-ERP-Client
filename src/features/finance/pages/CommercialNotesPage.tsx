import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CustomerCreditNotesPage } from './ar/CustomerCreditNotesPage';
import { SupplierDebitNotesPage } from './ap/SupplierDebitNotesPage';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../utils/cn';
import { RotateCcw, Undo2, Receipt, Landmark, Store } from 'lucide-react';

interface CommercialNotesPageProps {
  defaultTab?: 'credit' | 'debit';
}

export function CommercialNotesPage({ defaultTab }: CommercialNotesPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'credit' | 'debit'>(() => {
    if (queryTab === 'debit' || defaultTab === 'debit') return 'debit';
    return 'credit';
  });

  useEffect(() => {
    if (queryTab === 'debit' && activeTab !== 'debit') {
      setActiveTab('debit');
    } else if (queryTab === 'credit' && activeTab !== 'credit') {
      setActiveTab('credit');
    }
  }, [queryTab]);

  const handleTabChange = (tab: 'credit' | 'debit') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6 w-full pb-16" data-testid="commercial-notes-desk">
      {/* Canonical Page Header */}
      <PageHeader
        title={activeTab === 'credit' ? 'Customer Credit Notes' : 'Supplier Debit Notes (Purchase Returns)'}
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Commercial Notes', href: '/finance/notes' },
          { label: activeTab === 'credit' ? 'Customer Credit Notes (AR)' : 'Supplier Debit Notes (AP)' },
        ]}
        onBack={() => navigate('/finance')}
        badge={
          activeTab === 'credit' ? (
            <Badge variant="outline" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
              AR Returns & Revenue Reversal
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-medium bg-rose-50 text-rose-800 border-rose-300">
              Accounts Payable
            </Badge>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/income')}
              className="text-xs h-8 gap-1.5 font-medium border-border"
            >
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Income Desk</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/expense')}
              className="text-xs h-8 gap-1.5 font-medium border-border"
            >
              <Store className="h-3.5 w-3.5 text-primary" />
              <span>Expense Desk</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finance/ar/pdc-vault')}
              className="text-xs h-8 gap-1.5 font-medium border-border"
            >
              <Landmark className="h-3.5 w-3.5 text-primary" />
              <span>PDC Vault (1018)</span>
            </Button>
          </div>
        }
      />

      {/* Uniform Segmented Desk Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange('credit')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              activeTab === 'credit'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <RotateCcw className="h-3.5 w-3.5 text-primary" />
            <span>Customer Credit Notes (AR)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('debit')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              activeTab === 'debit'
                ? 'bg-background text-foreground shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Undo2 className="h-3.5 w-3.5 text-amber-600" />
            <span>Supplier Debit Notes (AP)</span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground hidden sm:block font-medium">
          {activeTab === 'credit'
            ? 'Accounts Receivable: Sales returns, allowances & revenue reversals'
            : 'Accounts Payable: Purchase returns, vendor debits & inventory credits'}
        </div>
      </div>

      {/* Render Active View */}
      {activeTab === 'credit' ? (
        <CustomerCreditNotesPage hideTopSwitcher />
      ) : (
        <SupplierDebitNotesPage hideTopSwitcher />
      )}
    </div>
  );
}
