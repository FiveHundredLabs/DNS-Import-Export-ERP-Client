import { Customer } from '../../types/customer';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { formatCurrency } from '../../utils/formatters';

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onReviewCommercials?: (customer: Customer) => void;
}

export function CustomerTable({
  customers,
  onView,
}: CustomerTableProps) {

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <Table>

        <TableHeader>
          <TableRow>
            <TableHead>Customer / Code</TableHead>
            <TableHead>Type & Area</TableHead>
            <TableHead>Assigned Rep</TableHead>
            <TableHead className="text-right">Credit / Available Limit</TableHead>
            <TableHead className="text-right">Total Outstanding</TableHead>
            <TableHead className="text-right">Overdue</TableHead>
            <TableHead className="text-center">Approval Stage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => {
            const hasOverdue = c.financials.overdue > 0;
            const availableCredit = Math.max(0, c.commercialTerms.creditLimit - c.financials.totalOutstanding);

            return (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-slate-50/80 transition-colors focus:outline-hidden focus:bg-slate-50"
                tabIndex={0}
                onClick={() => onView(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onView(c);
                  }
                }}
              >
                <TableCell>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    {c.name}
                    {c.loyaltyTier && <Badge variant="warning">{c.loyaltyTier}</Badge>}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    <span className="font-mono text-slate-600">{c.code}</span> • {c.contactPerson} ({c.phone})
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{c.type}</Badge>
                  <div className="text-[11px] text-slate-500 mt-0.5">{c.areaName}</div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-700 font-medium">{c.assignedRepName}</span>
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-slate-700">
                  <div>{formatCurrency(c.commercialTerms.creditLimit)}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    Avail: {formatCurrency(availableCredit)}
                  </div>
                  <div className="text-[10px] text-slate-400">{c.commercialTerms.creditDays} Days</div>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-xs text-slate-900">
                  {formatCurrency(c.financials.totalOutstanding)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {hasOverdue ? (
                    <span className="font-bold text-rose-600">
                      {formatCurrency(c.financials.overdue)}
                    </span>
                  ) : (
                    <span className="text-slate-400">LKR 0.00</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={
                      c.approvalStage === 'APPROVED'
                        ? 'success'
                        : c.approvalStage === 'REJECTED'
                        ? 'destructive'
                        : 'warning'
                    }
                  >
                    {c.approvalStage}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
