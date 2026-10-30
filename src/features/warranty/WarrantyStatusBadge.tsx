import { Badge } from '../../components/ui/badge';
import { WarrantyStatus, ClaimStatus } from '../../types/warranty';

export function WarrantyStatusBadge({
  status,
  className,
}: {
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NOT_REGISTERED' | 'CLAIMED' | string;
  className?: string;
}) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      );
    case 'EXPIRING_SOON':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Expiring Soon
        </span>
      );
    case 'EXPIRED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Expired
        </span>
      );
    case 'NOT_REGISTERED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Not Registered
        </span>
      );
    case 'CLAIMED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Claimed
        </span>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  switch (status) {
    case 'SUBMITTED':
      return <Badge variant="info">Submitted</Badge>;
    case 'IN_INSPECTION':
      return <Badge variant="warning">In Inspection</Badge>;
    case 'APPROVED':
      return <Badge variant="default">Approved</Badge>;
    case 'REPLACED':
      return <Badge variant="success">Replaced</Badge>;
    case 'REPAIRED':
      return <Badge variant="success">Repaired</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
