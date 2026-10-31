import { Badge } from '../../components/ui/badge';
import { OrderStatus } from '../../types/order';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  isSpecialApproval?: boolean;
}

export function OrderStatusBadge({ status, isSpecialApproval }: OrderStatusBadgeProps) {
  const getBadge = () => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Draft</Badge>;
      case 'SUBMITTED':
        return <Badge variant="info">Submitted</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'SPECIAL_APPROVAL':
        return <Badge variant="warning">Special Approval</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'PICKING':
        return <Badge variant="info">Picking</Badge>;
      case 'PARTIALLY_ISSUED':
        return <Badge variant="warning">Partially Issued</Badge>;
      case 'ISSUED':
        return <Badge variant="primary">Issued</Badge>;
      case 'PARTIALLY_INVOICED':
        return <Badge variant="purple">Partially Invoiced</Badge>;
      case 'INVOICED':
        return <Badge variant="purple">Invoiced</Badge>;
      case 'DISPATCHED':
        return <Badge variant="info">Dispatched</Badge>;
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary">Closed</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="line-through text-slate-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {getBadge()}
      {status === 'APPROVED' && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-300">
          Reserved / Stock Hold
        </span>
      )}
      {isSpecialApproval && status !== 'SPECIAL_APPROVAL' && status !== 'CANCELLED' && status !== 'REJECTED' && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
          Special Approval
        </span>
      )}
    </div>
  );
}
