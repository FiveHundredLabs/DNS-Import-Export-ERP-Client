import { Supplier } from '../../features/finance/api/types';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatCurrency } from '../../utils/formatters';
import { Building2, Mail, Phone, MapPin, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SupplierSummaryCardProps {
  supplier: Supplier;
  onChangeSupplier?: () => void;
  className?: string;
}

export function SupplierSummaryCard({
  supplier,
  onChangeSupplier,
  className,
}: SupplierSummaryCardProps) {
  return (
    <Card className={cn('bg-slate-50 border-slate-200/90 shadow-2xs', className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                {supplier.code}
              </span>
              <Badge
                variant={supplier.status === 'ACTIVE' ? 'success' : 'secondary'}
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {supplier.status}
              </Badge>
              {supplier.taxNumber && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  VAT: {supplier.taxNumber}
                </Badge>
              )}
            </div>
            <h4 className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1.5 truncate">
              <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="truncate">{supplier.name}</span>
            </h4>
            {supplier.address && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{supplier.address}</span>
              </p>
            )}
          </div>

          {onChangeSupplier && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onChangeSupplier}
              className="text-xs h-7 gap-1 shrink-0 bg-white hover:bg-slate-50 text-slate-700"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Change</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Contact Person</span>
            <span className="font-semibold text-slate-800 truncate block">
              {supplier.contactPerson || '—'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Phone / Mobile</span>
            <span className="font-semibold text-slate-800 font-mono flex items-center gap-1">
              <Phone className="h-2.5 w-2.5 text-slate-400" />
              {supplier.phone || '—'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Payment Terms</span>
            <span className="font-semibold text-slate-800">
              {supplier.paymentTerms || 'Standard'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px]">Payable Balance</span>
            <span className="font-semibold text-slate-900 font-mono tabular-nums">
              {formatCurrency(supplier.balance ?? 0)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
