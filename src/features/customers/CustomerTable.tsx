import { Customer } from '../../types/customer';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import { Eye, Edit3, CheckCircle2, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onReviewCommercials?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

export function CustomerTable({
  customers,
  onView,
  onEdit,
  onReviewCommercials,
  onDelete,
}: CustomerTableProps) {
  const { role } = useAuth();
  const canCommercialReview =
    role === 'SALES_MANAGER' || role === 'MANAGER' || role === 'DIRECTOR';

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <Table>

        <TableHeader>
          <TableRow>
            <TableHead>Customer / Code</TableHead>
            <TableHead>Type & Area</TableHead>
            <TableHead>Assigned Rep</TableHead>
            <TableHead className="text-right">Credit Limit</TableHead>
            <TableHead className="text-right">Total Outstanding</TableHead>
            <TableHead className="text-right">Overdue</TableHead>
            <TableHead className="text-center">Approval Stage</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => {
            const hasOverdue = c.financials.overdue > 0;
            const isPendingReview = c.approvalStage !== 'APPROVED';

            return (
              <TableRow key={c.id}>
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
                  {formatCurrency(c.commercialTerms.creditLimit)}
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
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(c)}
                      title="Customer 360 Hub"
                    >
                      <Eye className="h-4 w-4 text-slate-600" />
                    </Button>
                    {isPendingReview && canCommercialReview && onReviewCommercials && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReviewCommercials(c)}
                        title="Review Commercial Terms"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(c)}
                        title="Edit Customer"
                      >
                        <Edit3 className="h-4 w-4 text-slate-600" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if(window.confirm('Are you sure you want to delete this customer?')) {
                            onDelete(c);
                          }
                        }}
                        title="Delete Customer"
                        className="hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
