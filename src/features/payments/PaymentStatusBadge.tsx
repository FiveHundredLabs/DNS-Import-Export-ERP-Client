import { PaymentStatus } from '../../types/payment';
import { Badge } from '../../components/ui/badge';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge variant="success" className={`gap-1 font-semibold ${className || ''}`}>
          <CheckCircle2 className="h-3 w-3" /> Approved by Finance
        </Badge>
      );
    case 'PENDING_APPROVAL':
      return (
        <Badge variant="warning" className={`gap-1 font-semibold ${className || ''}`}>
          <Clock className="h-3 w-3" /> Pending Finance Approval
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive" className={`gap-1 font-semibold ${className || ''}`}>
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
