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
        return <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50">Submitted</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'SPECIAL_APPROVAL':
        return <Badge variant="destructive" className="bg-amber-600 text-white hover:bg-amber-700">Special Approval</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'PICKING':
        return <Badge variant="info" className="bg-sky-600 text-white">Picking</Badge>;
      case 'PARTIALLY_ISSUED':
        return <Badge variant="warning" className="bg-amber-500 text-white">Partially Issued</Badge>;
      case 'ISSUED':
        return <Badge variant="info" className="bg-blue-600 text-white">Issued</Badge>;
      case 'INVOICED':
        return <Badge variant="default" className="bg-purple-600 text-white hover:bg-purple-700">Invoiced</Badge>;
      case 'DISPATCHED':
        return <Badge variant="default" className="bg-teal-600 text-white hover:bg-teal-700">Dispatched</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="bg-emerald-700 text-white">Delivered</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-slate-500 border-slate-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {getBadge()}
      {isSpecialApproval && status !== 'SPECIAL_APPROVAL' && status !== 'CANCELLED' && status !== 'REJECTED' && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          Special Approval
        </span>
      )}
    </div>
  );
}
