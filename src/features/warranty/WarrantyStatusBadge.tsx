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
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      );
    case 'EXPIRING_SOON':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Expiring Soon
        </span>
      );
    case 'EXPIRED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Expired
        </span>
      );
    case 'NOT_REGISTERED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Not Registered
        </span>
      );
    case 'CLAIMED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs ${className || ''}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
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
      return <Badge variant="success">Approved</Badge>;
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
