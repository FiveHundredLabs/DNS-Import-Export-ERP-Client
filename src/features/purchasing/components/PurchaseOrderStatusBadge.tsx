import React from 'react';
import { PurchaseOrderStatus } from '../../../types/purchasing';
import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../utils/cn';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  PackageCheck,
  CheckCheck,
  Ban,
} from 'lucide-react';

interface PurchaseOrderStatusBadgeProps {
  status: PurchaseOrderStatus;
  className?: string;
  showIcon?: boolean;
}

export function PurchaseOrderStatusBadge({
  status,
  className,
  showIcon = true,
}: PurchaseOrderStatusBadgeProps) {
  const config: Record<
    PurchaseOrderStatus,
    { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    DRAFT: {
      label: 'Draft',
      className: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: FileText,
    },
    PENDING_APPROVAL: {
      label: 'Pending Approval',
      className: 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse',
      icon: Clock,
    },
    APPROVED: {
      label: 'Approved',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
      icon: CheckCircle2,
    },
    REJECTED: {
      label: 'Rejected',
      className: 'bg-rose-50 text-rose-800 border-rose-300',
      icon: XCircle,
    },
    SENT_TO_SUPPLIER: {
      label: 'Sent to Supplier',
      className: 'bg-blue-50 text-blue-800 border-blue-300 font-medium',
      icon: Send,
    },
    PARTIALLY_RECEIVED: {
      label: 'Partially Received',
      className: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      icon: PackageCheck,
    },
    COMPLETED: {
      label: 'Fully Received',
      className: 'bg-teal-50 text-teal-800 border-teal-300',
      icon: CheckCheck,
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-gray-100 text-gray-500 border-gray-300 line-through',
      icon: Ban,
    },
  };

  const current = config[status] || {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: FileText,
  };

  const Icon = current.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-mono text-[11px] uppercase tracking-wider py-0.5 px-2.5 rounded-full inline-flex items-center shadow-2xs',
        current.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{current.label}</span>
    </Badge>
  );
}
