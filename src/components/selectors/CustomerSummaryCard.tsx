import { Customer } from '../../types/customer';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { formatCurrency } from '../../utils/formatters';

export function CustomerSummaryCard({ customer }: { customer: Customer }) {
  const isCreditOverdue = customer.financials.overdue > 0;
  const isCreditNearLimit = customer.financials.availableCredit < customer.commercialTerms.creditLimit * 0.1;

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                {customer.code}
              </span>
              <Badge variant="outline">{customer.type}</Badge>
              {customer.loyaltyTier && <Badge variant="warning">{customer.loyaltyTier}</Badge>}
            </div>
            <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{customer.name}</h4>
            <p className="text-xs text-slate-500">{customer.address}</p>
          </div>
          <Badge variant={customer.approvalStage === 'APPROVED' ? 'success' : 'warning'}>
            {customer.approvalStage}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Credit Limit</span>
            <span className="font-semibold text-slate-900">{formatCurrency(customer.commercialTerms.creditLimit)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Credit Days</span>
            <span className="font-semibold text-slate-900">{customer.commercialTerms.creditDays} Days</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Outstanding</span>
            <span className={`font-bold ${isCreditOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
              {formatCurrency(customer.financials.totalOutstanding)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Available Credit</span>
            <span className={`font-semibold ${isCreditNearLimit ? 'text-amber-600' : 'text-emerald-700'}`}>
              {formatCurrency(customer.financials.availableCredit)}
            </span>
          </div>
        </div>

        {isCreditOverdue && (
          <div className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700 font-medium border border-rose-200">
            ⚠️ Overdue balance: {formatCurrency(customer.financials.overdue)} pending collection.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
