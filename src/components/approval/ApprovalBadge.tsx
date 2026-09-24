import { Badge } from '../ui/badge';
import { ApprovalRequestStatus } from '../../types/approval';

export function ApprovalBadge({ status }: { status: ApprovalRequestStatus | string }) {
  switch (status) {
    case 'APPROVED':
      return <Badge variant="success">Approved</Badge>;
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'PENDING_SALES_REVIEW':
    case 'PENDING_MANAGER_APPROVAL':
    case 'PENDING_DIRECTOR_APPROVAL':
      return <Badge variant="warning">Pending Approval</Badge>;
    case 'ESCALATED':
      return <Badge variant="info">Escalated</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
