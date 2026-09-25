import { Badge } from '../../components/ui/badge';
import { WarrantyStatus, ClaimStatus } from '../../types/warranty';

export function WarrantyStatusBadge({ status }: { status: WarrantyStatus }) {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">ACTIVE</Badge>;
    case 'EXPIRED':
      return <Badge variant="secondary">EXPIRED</Badge>;
    case 'CLAIMED':
      return <Badge variant="warning">CLAIMED</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  switch (status) {
    case 'SUBMITTED':
      return <Badge variant="info">SUBMITTED</Badge>;
    case 'IN_INSPECTION':
      return <Badge variant="warning">IN INSPECTION</Badge>;
    case 'APPROVED':
      return <Badge variant="default">APPROVED</Badge>;
    case 'REPLACED':
      return <Badge variant="success">REPLACED</Badge>;
    case 'REPAIRED':
      return <Badge variant="success">REPAIRED</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">REJECTED</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
