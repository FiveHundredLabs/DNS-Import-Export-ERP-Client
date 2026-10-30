import { Customer } from '../../types/customer';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatCurrency } from '../../utils/formatters';
import { RefreshCw, UserCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CustomerSummaryCardProps {
  customer: Customer;
  onChangeCustomer?: () => void;
  onChange?: () => void;
  className?: string;
}

export function CustomerSummaryCard({
  customer,
  onChangeCustomer,
  onChange,
  className,
}: CustomerSummaryCardProps) {
  const handleChange = onChangeCustomer || onChange;
  const isCreditOverdue = customer.financials.overdue > 0;
  const isCreditNearLimit = customer.financials.availableCredit < customer.commercialTerms.creditLimit * 0.1;

  return (
    <Card className={cn('bg-slate-50 border-slate-200/90 shadow-2xs', className)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0">
                {customer.code}
              </span>
              <Badge variant="outline" className="whitespace-nowrap shrink-0 text-[10px] px-1.5 py-0 h-4">
                {customer.type}
              </Badge>
              {customer.loyaltyTier && (
                <Badge variant="purple" className="whitespace-nowrap shrink-0 text-[10px] px-1.5 py-0 h-4 font-medium">
                  Loyalty: {customer.loyaltyTier}
                </Badge>
              )}
            </div>
            <h4 className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1.5 truncate">
              <UserCheck className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{customer.name}</span>
            </h4>
            {customer.address && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{customer.address}</p>
            )}
            {customer.contactPerson && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Contact: <span className="font-medium text-slate-700">{customer.contactPerson}</span>
                {customer.phone && ` (${customer.phone})`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={customer.approvalStage === 'APPROVED' ? 'success' : 'warning'} className="text-[10px]">
              {customer.approvalStage}
            </Badge>
            {handleChange && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleChange}
                className="text-xs h-7 gap-1 bg-white hover:bg-slate-50 text-slate-700"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Change</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Credit Limit</span>
            <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(customer.commercialTerms.creditLimit)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Credit Days</span>
            <span className="font-semibold text-slate-900 tabular-nums">{customer.commercialTerms.creditDays} Days</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Outstanding</span>
            <span className={`font-semibold tabular-nums ${isCreditOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
              {formatCurrency(customer.financials.totalOutstanding)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Available Credit</span>
            <span className={`font-semibold tabular-nums ${isCreditNearLimit ? 'text-amber-600' : 'text-emerald-700'}`}>
              {formatCurrency(customer.financials.availableCredit)}
            </span>
          </div>
        </div>

        {isCreditOverdue && (
          <div className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700 font-medium border border-rose-200">
            ⚠️ Overdue balance: {formatCurrency(customer.financials.overdue)} pending collection.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
