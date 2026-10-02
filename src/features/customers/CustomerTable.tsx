import { Customer } from '../../types/customer';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { formatCurrency } from '../../utils/formatters';
import { Phone, MessageSquare, ChevronRight, MapPin, User, AlertCircle, ArrowUpRight } from 'lucide-react';
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
    <div>
      {/* 1. Mobile Cards View (Visible on small screens, hidden on md+) */}
      <div className="block md:hidden space-y-3">
        {customers.map((c) => {
          const hasOverdue = c.financials.overdue > 0;
          const availableCredit = Math.max(0, c.commercialTerms.creditLimit - c.financials.totalOutstanding);
          const cleanPhone = cleanPhoneForWhatsApp(c.phone);

          return (
            <div
              key={c.id}
              onClick={() => onView(c)}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-primary/50 transition-all cursor-pointer active:scale-[0.99]"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {c.code}
                    </span>
                    <Badge variant="outline" className="text-[10.5px] py-0">
                      {c.type}
                    </Badge>
                    {c.loyaltyTier && (
                      <Badge variant="warning" className="text-[10px] py-0">
                        {c.loyaltyTier}
                      </Badge>
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
                  <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
                    {c.name}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">{c.areaName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate font-medium text-slate-700">{c.contactPerson}</span>
                  </div>
                </div>

                <Badge
                  variant={
                    c.approvalStage === 'APPROVED'
                      ? 'success'
                      : c.approvalStage === 'REJECTED'
                      ? 'destructive'
                      : 'warning'
                  }
                  className="shrink-0 text-[10.5px]"
                >
                  {c.approvalStage}
                </Badge>
              </div>

              {/* Financial Box */}
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Outstanding</span>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(c.financials.totalOutstanding)}
                  </div>
                  {hasOverdue && (
                    <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-rose-600 mt-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" /> Overdue: {formatCurrency(c.financials.overdue)}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-400 block">Available Credit</span>
                  <div className="text-sm font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(availableCredit)}
                  </div>
                  <span className="text-[10.5px] text-slate-500 block mt-0.5">
                    Limit: {formatCurrency(c.commercialTerms.creditLimit)}
                  </span>
                </div>
              </div>

              {/* Quick Actions Bar (Touch friendly min 44px) */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Call Button */}
                  <a
                    href={`tel:${c.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    title={`Call ${c.contactPerson}`}
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-600" />
                    <span>Call</span>
                  </a>

                  {/* WhatsApp Button */}
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors border border-emerald-200"
                    title="Send WhatsApp Message"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                </div>

                <span className="inline-flex items-center text-xs font-semibold text-primary gap-1">
                  Details <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Desktop Full Table View (Hidden on mobile, block on md+) */}
      <div className="hidden md:block rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
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
                    <div className="text-xs text-slate-500 mt-0.5">
                      <span className="font-mono text-slate-600">{c.code}</span> • {c.contactPerson} ({c.phone})
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.type}</Badge>
                    <div className="text-xs text-slate-500 mt-1">{c.areaName}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-slate-700 font-normal">{c.assignedRepName}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[13px] text-slate-700">
                    <div className="font-medium text-slate-800">{formatCurrency(c.commercialTerms.creditLimit)}</div>
                    <div className="text-xs text-emerald-600 font-medium mt-0.5">
                      Avail: {formatCurrency(availableCredit)}
                    </div>
                    <div className="text-xs text-slate-400">{c.commercialTerms.creditDays} Days</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-[13.5px] text-slate-900">
                    {formatCurrency(c.financials.totalOutstanding)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-[13.5px]">
                    {hasOverdue ? (
                      <span className="font-semibold text-rose-600">
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
    </div>
  );
}
