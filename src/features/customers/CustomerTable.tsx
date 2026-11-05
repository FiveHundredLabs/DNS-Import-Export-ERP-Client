import { Customer } from '../../types/customer';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ConfirmButton } from '../../components/ui/confirm-button';
import { formatCurrency } from '../../utils/formatters';
import {
  Phone,
  MessageSquare,
  ChevronRight,
  MapPin,
  User,
  AlertCircle,
  Trash2,
  Edit,
  Eye,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

function cleanPhoneForWhatsApp(phone?: string): string {
  return phone ? phone.replace(/[^0-9]/g, '') : '';
}

interface CustomerTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

export function CustomerTable({
  customers,
  onView,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  const { role, hasPermission } = useAuth();
  const canDelete = role === 'DIRECTOR' || role === 'MANAGER';
  const canEdit = hasPermission('customers:edit');

  return (
    <div>
      {/* 1. Mobile Cards View (Visible on small screens, hidden on md+) */}
      <div className="block md:hidden space-y-3">
        {customers.map((c) => {
          const hasOverdue = c.financials.overdue > 0;
          const availableCredit = Math.max(0, c.commercialTerms.creditLimit - c.financials.totalOutstanding);
          const cleanPhone = cleanPhoneForWhatsApp(c.whatsappNumber || c.phone);

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
                    <span className="font-mono text-xs font-semibold text-slate-500 whitespace-nowrap shrink-0">
                      {c.code}
                    </span>
                    <Badge variant="outline" className="text-[10.5px] py-0 whitespace-nowrap shrink-0">
                      {c.type}
                    </Badge>
                    {(c.loyaltyLevel || c.loyaltyTier) && (
                      <Badge variant="warning" className="text-[10px] py-0 uppercase font-semibold whitespace-nowrap shrink-0">
                        {c.loyaltyLevel || c.loyaltyTier}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
                    {c.name}
                  </h3>
                  {c.companyName && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {c.companyName}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-slate-600 truncate">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {c.areaName}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate font-medium text-slate-700">{c.contactPerson}</span>
                  </div>
                </div>

                {onDelete && canDelete && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <ConfirmButton
                      variant="ghost"
                      size="icon"
                      confirmTitle="Delete Customer?"
                      confirmMessage={`Are you sure you want to delete customer "${c.name}"? This action cannot be undone.`}
                      confirmLabel="Delete Customer"
                      confirmVariant="destructive"
                      onConfirm={() => onDelete(c)}
                      title="Delete Customer"
                      className="hover:text-rose-600 h-8 w-8 p-0 text-slate-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmButton>
                  </div>
                )}
              </div>

              {/* Financial Box */}
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Total Outstanding</span>
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(c.financials.totalOutstanding)}
                  </div>
                  {hasOverdue ? (
                    <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-rose-600 mt-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" /> Overdue: {formatCurrency(c.financials.overdue)}
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-emerald-600 font-medium block mt-0.5">
                      No Overdue
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-400 block">Available Credit</span>
                  <div className="text-sm font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(availableCredit)}
                  </div>
                  <span className="text-[10.5px] text-slate-500 block mt-0.5">
                    Limit: {formatCurrency(c.commercialTerms.creditLimit)} ({c.commercialTerms.creditDays}d)
                  </span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Call Button */}
                  <a
                    href={`tel:${c.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
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
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors border border-emerald-200 cursor-pointer"
                    title="Send WhatsApp Message"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Edit Customer Button */}
                  {onEdit && canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(c);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
                      title="Edit Customer Details"
                    >
                      <Edit className="h-3.5 w-3.5 text-slate-600" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                <span className="inline-flex items-center text-xs font-semibold text-primary gap-1">
                  View <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Desktop Table View (Hidden on small screens, visible on md+) */}
      <div className="hidden md:block rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/80">
              <TableHead className="w-[320px] text-xs font-bold text-slate-700 uppercase tracking-wider">
                Customer / Code
              </TableHead>
              <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Type &amp; Area
              </TableHead>
              <TableHead className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assigned Rep
              </TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                Credit / Terms
              </TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                Total Outstanding
              </TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                Overdue
              </TableHead>
              <TableHead className="text-right w-[100px] text-xs font-bold text-slate-700 uppercase tracking-wider">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => {
              const hasOverdue = c.financials.overdue > 0;
              const availableCredit = Math.max(0, c.commercialTerms.creditLimit - c.financials.totalOutstanding);
              const cleanPhone = cleanPhoneForWhatsApp(c.whatsappNumber || c.phone);

              return (
                <TableRow
                  key={c.id}
                  onClick={() => onView(c)}
                  className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 group-hover:text-primary transition-colors text-sm">
                        {c.name}
                      </span>
                      {(c.loyaltyLevel || c.loyaltyTier) && (
                        <Badge variant="warning" className="text-[9.5px] py-0 uppercase font-semibold">
                          {c.loyaltyLevel || c.loyaltyTier}
                        </Badge>
                      )}
                    </div>
                    {c.companyName && (
                      <div className="text-xs text-slate-500 font-normal truncate mt-0.5">
                        {c.companyName}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span className="font-mono text-slate-600 font-medium">{c.code}</span>
                      <span>•</span>
                      <span>{c.contactPerson}</span>
                      <span>•</span>
                      <span className="font-mono">{c.phone}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {c.type}
                    </Badge>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{c.areaName}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-[13px] text-slate-700 font-medium">{c.assignedRepName || 'Unassigned'}</span>
                  </TableCell>

                  <TableCell className="text-right tabular-nums text-[13px] text-slate-700">
                    <div className="font-bold text-slate-900">{formatCurrency(c.commercialTerms.creditLimit)}</div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                      Avail: {formatCurrency(availableCredit)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.commercialTerms.creditDays} Days Credit</div>
                  </TableCell>

                  <TableCell className="text-right tabular-nums font-bold text-[14px] text-slate-900">
                    {formatCurrency(c.financials.totalOutstanding)}
                  </TableCell>

                  <TableCell className="text-right tabular-nums text-[13.5px]">
                    {hasOverdue ? (
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                        {formatCurrency(c.financials.overdue)}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">LKR 0.00</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {/* View Details Button */}
                      <button
                        type="button"
                        onClick={() => onView(c)}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View Customer Details & Outstanding Invoices"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Edit Customer Button */}
                      {onEdit && canEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(c)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Customer Profile"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete Customer Button */}
                      {onDelete && canDelete && (
                        <ConfirmButton
                          variant="ghost"
                          size="icon"
                          confirmTitle="Delete Customer?"
                          confirmMessage={`Are you sure you want to delete customer "${c.name}"? This action cannot be undone.`}
                          confirmLabel="Delete Customer"
                          confirmVariant="destructive"
                          onConfirm={() => onDelete(c)}
                          title="Delete Customer"
                          className="hover:text-rose-600 h-8 w-8 p-0 text-slate-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmButton>
                      )}
                    </div>
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
