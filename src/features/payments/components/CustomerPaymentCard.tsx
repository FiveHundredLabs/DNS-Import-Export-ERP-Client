import React from 'react';
import { Customer } from '../../../types/customer';
import { Invoice } from '../../../types/invoice';
import {
  evaluateCustomerPaymentStatus,
  CustomerPaymentStatusMeta,
} from '../../../rules/customerPaymentRules';
import { AmountDisplay } from '../../../components/common/AmountDisplay';
import { Button } from '../../../components/ui/button';
import {
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Receipt,
  CreditCard,
  User,
} from 'lucide-react';
import { whatsAppService } from '../../../services/WhatsAppService';
import { cn } from '../../../utils/cn';

interface CustomerPaymentCardProps {
  customer: Customer;
  invoices?: Invoice[];
  onSelectCustomer: (customer: Customer) => void;
  className?: string;
}

export function CustomerPaymentCard({
  customer,
  invoices = [],
  onSelectCustomer,
  className,
}: CustomerPaymentCardProps) {
  const meta: CustomerPaymentStatusMeta = evaluateCustomerPaymentStatus(customer, invoices);

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    whatsAppService.openChat(
      customer.phone,
      `Hello ${customer.contactPerson}, this is your DNS ERP Sales Representative regarding outstanding invoices for ${customer.name}.`
    );
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${customer.phone.replace(/\s+/g, '')}`;
  };

  const isOverdue = meta.filterStatus === 'OVERDUE';
  const isSettled = meta.filterStatus === 'SETTLED';
  const isPendingCollection = meta.filterStatus === 'PENDING_COLLECTION';

  return (
    <div
      onClick={() => onSelectCustomer(customer)}
      className={cn(
        'group relative bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 cursor-pointer overflow-hidden p-4 sm:p-5 shadow-xs hover:shadow-md active:scale-[0.99] min-w-0',
        isOverdue
          ? 'border-rose-200/90 hover:border-rose-300 bg-gradient-to-br from-rose-500/[0.04] via-rose-50/20 to-white'
          : isPendingCollection
          ? 'border-amber-200/90 hover:border-amber-300 bg-gradient-to-br from-amber-500/[0.04] via-amber-50/20 to-white'
          : isSettled
          ? 'border-emerald-200/80 hover:border-emerald-300 bg-gradient-to-br from-emerald-500/[0.03] to-white'
          : 'border-slate-200/90 hover:border-primary/40 bg-white',
        className
      )}
    >
      {/* Header: Customer Name, Code, Proximity Badge, and Status Pill */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
              {customer.code}
            </span>

            {meta.isNearDue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="h-3 w-3 text-amber-600" />
                {meta.nearDueLabel || 'Near Due'}
              </span>
            )}

            <span className="text-[10.5px] text-slate-400 font-medium truncate hidden min-[400px]:inline">
              • {customer.areaName}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 truncate group-hover:text-primary transition-colors">
            {customer.name}
          </h3>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
            <span className="flex items-center gap-1 truncate">
              <User className="h-3 w-3 text-slate-400 shrink-0" />
              {customer.contactPerson}
            </span>
          </div>
        </div>

        {/* Status Pill */}
        <div className="shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs',
              isOverdue
                ? 'bg-rose-100/90 text-rose-800 border-rose-200'
                : isPendingCollection
                ? 'bg-amber-100/90 text-amber-800 border-amber-200'
                : isSettled
                ? 'bg-emerald-100/90 text-emerald-800 border-emerald-200'
                : 'bg-blue-100/80 text-blue-800 border-blue-200'
            )}
          >
            {isOverdue ? (
              <AlertCircle className="h-3 w-3 shrink-0 text-rose-600" />
            ) : isSettled ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
            ) : (
              <Clock className="h-3 w-3 shrink-0 text-blue-600" />
            )}
            <span className="truncate">{meta.badgeLabel}</span>
          </span>
        </div>
      </div>

      {/* Financials & Invoices Summary Bar */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-center">
        {/* Total Outstanding */}
        <div className="min-w-0">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
            Total Outstanding
          </span>
          <div className="mt-0.5 min-w-0">
            <AmountDisplay
              amount={meta.totalOutstanding}
              className={cn(
                'font-extrabold',
                isSettled ? 'text-slate-400' : 'text-slate-900'
              )}
            />
          </div>
        </div>

        {/* Overdue Amount (if any) or Invoices count */}
        <div className="min-w-0">
          {meta.totalOverdue > 0 ? (
            <>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-rose-600 block truncate">
                Past Due Amount
              </span>
              <div className="mt-0.5 min-w-0">
                <AmountDisplay
                  amount={meta.totalOverdue}
                  className="text-rose-600 font-extrabold"
                />
              </div>
            </>
          ) : (
            <>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block truncate">
                Open Invoices
              </span>
              <div className="text-sm sm:text-base font-bold text-slate-700 mt-0.5 tabular-nums truncate">
                {meta.openInvoicesCount} {meta.openInvoicesCount === 1 ? 'Invoice' : 'Invoices'}
              </div>
            </>
          )}
        </div>

        {/* Action Button & In-Route Status */}
        <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1.5 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={handleCall}
            aria-label="Call customer"
            className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 flex items-center justify-center transition-all shrink-0"
            title={`Call ${customer.phone}`}
          >
            <Phone className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            aria-label="WhatsApp customer"
            className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 flex items-center justify-center transition-all shrink-0"
            title="Chat on WhatsApp"
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCustomer(customer);
            }}
            className={cn(
              'h-9 px-3.5 gap-1.5 text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex-1 sm:flex-initial shadow-xs',
              isOverdue
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : isSettled
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                : 'bg-primary hover:bg-primary-hover text-primary-foreground'
            )}
          >
            {isSettled ? (
              <>
                <Receipt className="h-3.5 w-3.5" /> View Invoices
              </>
            ) : (
              <>
                <CreditCard className="h-3.5 w-3.5" /> Collect Payment
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
