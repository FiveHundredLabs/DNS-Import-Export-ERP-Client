import React from 'react';
import { Customer } from '../../../types/customer';
import { Invoice } from '../../../types/invoice';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { getDaysOverdue } from '../../../rules/customerPaymentRules';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt,
  Building,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CustomerInvoicesQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  invoices: Invoice[];
}

export function CustomerInvoicesQuickModal({
  isOpen,
  onClose,
  customer,
  invoices,
}: CustomerInvoicesQuickModalProps) {
  const navigate = useNavigate();

  if (!customer) return null;

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const openInvoices = customerInvoices.filter(
    (i) => i.status !== 'CANCELLED' && i.status !== 'DRAFT' && i.balanceAmount > 0
  );
  const paidInvoices = customerInvoices.filter(
    (i) => i.status === 'PAID' || i.balanceAmount === 0
  );

  const totalOutstanding = openInvoices.reduce((sum, i) => sum + i.balanceAmount, 0);
  const totalOverdue = openInvoices
    .filter((i) => i.status === 'OVERDUE' || getDaysOverdue(i.dueDate) > 0)
    .reduce((sum, i) => sum + i.balanceAmount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <DialogHeader className="p-5 pb-3 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{customer.name}</span>
                  <Badge variant="outline" className="font-mono text-xs bg-slate-100 text-slate-700">
                    {customer.code}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Ledger Invoice Breakdown • Area: {customer.areaName || 'Colombo'} • Rep: {customer.assignedRepName || 'Assigned Rep'}
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/payments/collect/${customer.id}`);
              }}
              className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-xs"
            >
              <span>Collect FIFO Payment</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Quick Balance Summary Pills */}
          <div className="grid grid-cols-3 gap-2.5 pt-3">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-left">
              <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">Total Balance</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-left">
              <span className="text-[10.5px] uppercase font-bold text-rose-500 tracking-wider">Past Due Overdue</span>
              <p className="text-sm font-bold text-rose-600 mt-0.5">{formatCurrency(totalOverdue)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-left">
              <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">Credit Terms</span>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">
                {customer.commercialTerms?.creditDays ?? 30} Days • {formatCurrency(customer.commercialTerms?.creditLimit ?? 0)} limit
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Invoices List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Open / Outstanding Invoices ({openInvoices.length})</span>
              </h4>
              <span className="text-xs text-slate-400">Allocated in FIFO order</span>
            </div>

            {openInvoices.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">No open or overdue invoices</p>
                <p className="text-[11px] text-slate-400">All customer invoices are fully settled.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openInvoices.map((inv) => {
                  const daysOverdue = getDaysOverdue(inv.dueDate);
                  const isPastDue = daysOverdue > 0 || inv.status === 'OVERDUE';

                  return (
                    <div
                      key={inv.id}
                      className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isPastDue
                          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                          : 'bg-white border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                          {isPastDue ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] font-bold">
                              {daysOverdue > 0 ? `${daysOverdue}d Overdue` : 'Overdue'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-medium">
                              Open Due Soon
                            </Badge>
                          )}
                          <span className="text-slate-400 text-[11px]">SO: {inv.orderNumber || 'Direct Order'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                          <span>Issued: {formatDate(inv.issueDate)}</span>
                          <span>•</span>
                          <span className={isPastDue ? 'text-rose-600 font-semibold' : ''}>
                            Due: {formatDate(inv.dueDate)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right sm:text-right shrink-0">
                        <div className="text-xs text-slate-400">Balance / Total</div>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(inv.balanceAmount)}{' '}
                          <span className="text-slate-400 font-normal text-xs">/ {formatCurrency(inv.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settled Invoices Section */}
          {paidInvoices.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Recently Paid / Settled Invoices ({paidInvoices.length})</span>
              </h4>
              <div className="space-y-1.5">
                {paidInvoices.slice(0, 3).map((inv) => (
                  <div
                    key={inv.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs flex items-center justify-between text-slate-600"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-700">{inv.invoiceNumber}</span>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Fully Paid
                      </Badge>
                    </div>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(inv.totalAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

