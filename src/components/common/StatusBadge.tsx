import React from 'react';
import { Badge, BadgeProps } from '../ui/badge';
import { cn } from '../../utils/cn';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileEdit,
  FileText,
  Send,
  PackageCheck,
  CheckCheck,
  Ban,
  ArrowUpRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  RefreshCw,
  Wrench,
  AlertCircle,
  Eye,
  Sparkles,
} from 'lucide-react';

export type StatusVariant =
  | 'auto'
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'purple'
  | 'outline';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The raw status string or enum key (e.g., 'APPROVED', 'PENDING_APPROVAL', 'PAID') */
  status: string;
  /** Optional human-readable label override (defaults to canonical status mapping or formatted string) */
  label?: string;
  /** Visual variant. Defaults to 'auto', which resolves variant and styling based on status semantics */
  variant?: StatusVariant;
  /** Size modifier for compact tables vs detail hero headers */
  size?: 'default' | 'sm';
  /** Whether to render the leading semantic icon. Defaults to true. */
  showIcon?: boolean;
  /** Custom icon component override */
  icon?: React.ComponentType<{ className?: string }>;
  /** Additional CSS class names */
  className?: string;
}

interface StatusMeta {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
  icon: React.ComponentType<{ className?: string }>;
  extraClass?: string;
}

/**
 * Canonical semantic status mapping preserving domain-specific meanings across all modules.
 * Note: Statuses with distinct business semantics (e.g. ISSUED != DELIVERED != APPROVED != PAID)
 * maintain their specific color, icon, and label conventions.
 */
const CANONICAL_STATUS_MAP: Record<string, StatusMeta> = {
  // --- Draft / Preparation ---
  DRAFT: {
    label: 'Draft',
    variant: 'outline',
    icon: FileEdit,
    extraClass: 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs',
  },
  NEW: {
    label: 'New',
    variant: 'secondary',
    icon: Sparkles,
  },

  // --- Submissions & Pending Reviews ---
  SUBMITTED: {
    label: 'Submitted',
    variant: 'info',
    icon: Send,
  },
  PENDING: {
    label: 'Pending',
    variant: 'warning',
    icon: Clock,
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    variant: 'warning',
    icon: Clock,
  },
  PENDING_SALES_REVIEW: {
    label: 'Pending Sales Review',
    variant: 'warning',
    icon: Clock,
  },
  PENDING_MANAGER_APPROVAL: {
    label: 'Pending Manager Approval',
    variant: 'warning',
    icon: Clock,
  },
  PENDING_DIRECTOR_APPROVAL: {
    label: 'Pending Director Approval',
    variant: 'warning',
    icon: Clock,
  },
  PENDING_FINANCE_APPROVAL: {
    label: 'Pending Finance Approval',
    variant: 'warning',
    icon: Clock,
  },
  IN_REVIEW: {
    label: 'In Review',
    variant: 'warning',
    icon: Eye,
  },
  IN_INSPECTION: {
    label: 'In Inspection',
    variant: 'warning',
    icon: Eye,
  },

  // --- Escalation ---
  ESCALATED: {
    label: 'Escalated',
    variant: 'info',
    icon: ArrowUpRight,
  },

  // --- Approvals & Active States ---
  APPROVED: {
    label: 'Approved',
    variant: 'success',
    icon: CheckCircle2,
  },
  ACTIVE: {
    label: 'Active',
    variant: 'success',
    icon: CheckCircle2,
  },
  OPEN: {
    label: 'Open',
    variant: 'success',
    icon: CheckCircle2,
  },
  POSTED: {
    label: 'Posted',
    variant: 'success',
    icon: CheckCheck,
  },
  AUTHORIZED: {
    label: 'Authorized',
    variant: 'success',
    icon: ShieldCheck,
  },

  // --- Procurement, Dispatch & Receiving States (Domain Specific) ---
  ISSUED: {
    label: 'Issued',
    variant: 'default',
    icon: FileText,
    extraClass: 'bg-primary hover:bg-primary-hover text-primary-foreground',
  },
  SENT_TO_SUPPLIER: {
    label: 'Sent to Vendor',
    variant: 'info',
    icon: Send,
    extraClass: 'bg-blue-50 text-blue-800 border-blue-300 font-medium',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    variant: 'purple',
    icon: Truck,
  },
  PARTIALLY_RECEIVED: {
    label: 'Partially Received',
    variant: 'purple',
    icon: PackageCheck,
    extraClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
  },
  RECEIVED: {
    label: 'Received',
    variant: 'success',
    icon: PackageCheck,
    extraClass: 'bg-teal-50 text-teal-800 border-teal-300',
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'success',
    icon: CheckCheck,
    extraClass: 'bg-teal-50 text-teal-800 border-teal-300',
  },
  DELIVERED: {
    label: 'Delivered',
    variant: 'success',
    icon: CheckCheck,
  },
  REPLACED: {
    label: 'Replaced',
    variant: 'success',
    icon: RefreshCw,
  },
  REPAIRED: {
    label: 'Repaired',
    variant: 'success',
    icon: Wrench,
  },

  // --- Financial Settlements & Invoicing States (Domain Specific) ---
  INVOICED: {
    label: 'Invoiced',
    variant: 'default',
    icon: FileText,
    extraClass: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
  PARTIALLY_INVOICED: {
    label: 'Partially Invoiced',
    variant: 'purple',
    icon: FileText,
    extraClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 font-medium',
  },
  PAID: {
    label: 'Paid',
    variant: 'success',
    icon: CheckCircle2,
  },
  COLLECTED: {
    label: 'Collected',
    variant: 'info',
    icon: CheckCircle2,
    extraClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  PARTIALLY_PAID: {
    label: 'Partially Paid',
    variant: 'warning',
    icon: Clock,
  },
  PARTIALLY_COLLECTED: {
    label: 'Partially Collected',
    variant: 'warning',
    icon: Clock,
    extraClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  OVERDUE: {
    label: 'Overdue',
    variant: 'destructive',
    icon: AlertTriangle,
  },

  // --- Negative / Invalidation / Lifecycle Termination ---
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'outline',
    icon: Ban,
    extraClass: 'text-slate-500 line-through',
  },
  EXPIRED: {
    label: 'Expired',
    variant: 'secondary',
    icon: AlertCircle,
  },
  VOIDED: {
    label: 'Voided',
    variant: 'outline',
    icon: Ban,
    extraClass: 'bg-slate-100 text-slate-600 border-slate-300 line-through',
  },
  REVERSED: {
    label: 'Reversed',
    variant: 'outline',
    icon: RotateCcw,
    extraClass: 'bg-slate-100 text-slate-600 border-slate-300',
  },
  CLOSED: {
    label: 'Closed',
    variant: 'secondary',
    icon: CheckCircle2,
  },
};

/**
 * Format arbitrary UPPERCASE_OR_SNAKE_CASE strings into readable Title Case.
 */
function formatStatusFallback(status: string): string {
  if (!status) return '';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Canonical StatusBadge component for the DNS ERP application.
 * Automatically resolves color variants, semantic icons, and human labels
 * while allowing full overrides where custom behavior is required.
 */
export function StatusBadge({
  status,
  label,
  variant = 'auto',
  size = 'default',
  showIcon = true,
  icon: CustomIcon,
  className,
  ...props
}: StatusBadgeProps) {
  const normalizedKey = (status || '').toUpperCase().trim();
  const meta = CANONICAL_STATUS_MAP[normalizedKey];

  const resolvedVariant: NonNullable<BadgeProps['variant']> =
    variant === 'auto'
      ? meta?.variant || 'outline'
      : (variant as NonNullable<BadgeProps['variant']>);

  const displayLabel = label || meta?.label || formatStatusFallback(status);
  const IconComponent = CustomIcon || (meta?.icon ?? FileText);

  const sizeClasses =
    size === 'sm'
      ? 'text-[10.5px] px-2 py-0 h-5 gap-1'
      : 'text-[11.5px] px-2.5 py-0.5 gap-1.5';

  return (
    <Badge
      variant={resolvedVariant}
      className={cn(
        'font-medium inline-flex items-center tracking-normal whitespace-nowrap shadow-2xs transition-colors',
        sizeClasses,
        variant === 'auto' && meta?.extraClass,
        className
      )}
      {...props}
    >
      {showIcon && IconComponent && (
        <IconComponent
          className={cn(
            'shrink-0',
            size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'
          )}
        />
      )}
      <span>{displayLabel}</span>
    </Badge>
  );
}

/**
 * Helper to adapt custom legacy status badges to the canonical StatusBadge props.
 */
export function createStatusBadgeAdapter<T extends string>(
  statusOverrides?: Partial<Record<T, Partial<StatusMeta>>>
) {
  return function AdaptedStatusBadge({
    status,
    className,
    showIcon = true,
    size = 'default',
  }: {
    status: T;
    className?: string;
    showIcon?: boolean;
    size?: 'default' | 'sm';
  }) {
    const override = statusOverrides?.[status];
    return (
      <StatusBadge
        status={status}
        label={override?.label}
        variant={override?.variant ? (override.variant as StatusVariant) : 'auto'}
        icon={override?.icon}
        showIcon={showIcon}
        size={size}
        className={cn(override?.extraClass, className)}
      />
    );
  };
}
