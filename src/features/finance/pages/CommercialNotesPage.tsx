import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CustomerCreditNotesPage } from './ar/CustomerCreditNotesPage';
import { SupplierDebitNotesPage } from './ap/SupplierDebitNotesPage';
import { cn } from '../../../utils/cn';
import { RotateCcw, Undo2, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';

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
    <div className="space-y-4 w-full" data-testid="commercial-notes-desk">
      {/* Unified Segmented Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/finance')}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-xs">Finance</span>
          </Button>
          <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80">
            <button
              type="button"
              onClick={() => handleTabChange('credit')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
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
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'debit'
                  ? 'bg-background text-foreground shadow-xs border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Undo2 className="h-3.5 w-3.5 text-amber-600" />
              <span>Supplier Debit Notes (AP)</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {activeTab === 'credit'
            ? 'Accounts Receivable: Sales returns, allowances, and revenue reversals'
            : 'Accounts Payable: Purchase returns, vendor debits, and inventory credits'}
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
