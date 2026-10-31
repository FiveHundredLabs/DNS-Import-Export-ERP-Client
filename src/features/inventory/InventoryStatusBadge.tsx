import React from 'react';
import { Badge } from '../../components/ui/badge';
import { CheckCircle2, Layers, Truck, AlertTriangle, Boxes, Clock, FileEdit } from 'lucide-react';
import { cn } from '../../utils/cn';

export type InventoryStatusType =
  | 'AVAILABLE'
  | 'In Stock'
  | 'RESERVED'
  | 'Reserved'
  | 'DISPATCHED'
  | 'Dispatched'
  | 'DELIVERED'
  | 'Delivered'
  | 'REJECTED'
  | 'DAMAGED'
  | 'QUARANTINED'
  | 'Quarantined'
  | 'LOW_STOCK'
  | 'Low Stock'
  | 'OUT_OF_STOCK'
  | 'Out of Stock'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'DRAFT'
  | 'COSTED'
  | string;

interface InventoryStatusBadgeProps {
  status: InventoryStatusType;
  className?: string;
  label?: string;
}

export function InventoryStatusBadge({ status, className, label }: InventoryStatusBadgeProps) {
  const normalized = (status || '').toUpperCase().trim();

  switch (normalized) {
    case 'AVAILABLE':
    case 'IN STOCK':
    case 'IN_STOCK':
      return (
        <Badge
          variant="success"
          className={cn('gap-1 font-semibold text-xs py-0.5 px-2.5 shadow-2xs', className)}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
          <span>{label || 'Available'}</span>
        </Badge>
      );

    case 'RESERVED':
      return (
        <Badge
          variant="secondary"
          className={cn(
            'gap-1 font-semibold bg-blue-50 text-blue-700 border-blue-200 text-xs py-0.5 px-2.5 shadow-2xs',
            className
          )}
        >
          <Layers className="h-3 w-3 text-blue-600 shrink-0" />
          <span>{label || 'Reserved'}</span>
        </Badge>
      );

    case 'DISPATCHED':
      return (
        <Badge
          variant="secondary"
          className={cn(
            'gap-1 font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 text-xs py-0.5 px-2.5 shadow-2xs',
            className
          )}
        >
          <Truck className="h-3 w-3 text-indigo-600 shrink-0" />
          <span>{label || 'Dispatched'}</span>
        </Badge>
      );

    case 'DELIVERED':
      return (
        <Badge
          variant="success"
          className={cn('gap-1 font-semibold text-xs py-0.5 px-2.5 shadow-2xs', className)}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
          <span>{label || 'Delivered'}</span>
        </Badge>
      );

    case 'REJECTED':
    case 'DAMAGED':
    case 'QUARANTINED':
      return (
        <Badge
          variant="destructive"
          className={cn(
            'gap-1 font-semibold bg-rose-50 text-rose-700 border-rose-200 text-xs py-0.5 px-2.5 shadow-2xs',
            className
          )}
        >
          <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
          <span>{label || 'Quarantined'}</span>
        </Badge>
      );

    case 'APPROVED':
    case 'COSTED':
      return (
        <Badge
          variant="success"
          className={cn('gap-1 font-semibold text-xs py-0.5 px-2.5 shadow-2xs', className)}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
          <span>{label || 'Approved'}</span>
        </Badge>
      );

    case 'SUBMITTED':
      return (
        <Badge
          variant="warning"
          className={cn(
            'gap-1 font-semibold bg-amber-50 text-amber-700 border-amber-200 text-xs py-0.5 px-2.5 shadow-2xs',
            className
          )}
        >
          <Clock className="h-3 w-3 text-amber-600 shrink-0" />
          <span>{label || 'Submitted'}</span>
        </Badge>
      );

    case 'DRAFT':
      return (
        <Badge
          variant="outline"
          className={cn(
            'gap-1 font-bold bg-amber-50 text-amber-800 border-amber-300 text-xs py-0.5 px-2.5 shadow-2xs',
            className
          )}
        >
          <FileEdit className="h-3 w-3 text-amber-600 shrink-0" />
          <span>{label || 'Draft'}</span>
        </Badge>
      );

    case 'LOW_STOCK':
    case 'LOW STOCK':
      return (
        <Badge
          variant="warning"
          className={cn(
            'gap-1 font-semibold bg-amber-50 text-amber-700 border-amber-200 text-xs py-0.5 px-2.5 shadow-2xs',
            className
          )}
        >
          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
          <span>{label || 'Low Stock'}</span>
        </Badge>
      );

    case 'OUT_OF_STOCK':
    case 'OUT OF STOCK':
      return (
        <Badge
          variant="destructive"
          className={cn(
            'gap-1 font-semibold bg-rose-50 text-rose-700 border-rose-200 text-xs py-0.5 px-2.5 shadow-2xs',
            className
          )}
        >
          <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
          <span>{label || 'Out of Stock'}</span>
        </Badge>
      );

    default:
      return (
        <Badge variant="outline" className={cn('gap-1 text-xs py-0.5 px-2.5 font-medium', className)}>
          <Boxes className="h-3 w-3 text-slate-500 shrink-0" />
          <span>{label || status}</span>
        </Badge>
      );
  }
}
