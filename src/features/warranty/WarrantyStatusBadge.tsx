import { Badge } from '../../components/ui/badge';
import { WarrantyStatus, ClaimStatus } from '../../types/warranty';

export function WarrantyStatusBadge({ status }: { status: WarrantyStatus }) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">Active</Badge>;
    case 'EXPIRED':
      return <Badge variant="secondary">Expired</Badge>;
    case 'CLAIMED':
      return <Badge variant="warning">Claimed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
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
