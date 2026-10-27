import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { OrderDetailPage } from '../orders/OrderDetailPage';

export function OrderApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="w-full space-y-4">
      {/* Approver Header Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Link to="/approvals">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Back to Approvals Engine
            </Button>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            Special Sales Order Approval Review
          </span>
        </div>
      </div>

      {/* Render the full OrderDetailPage containing Loyalty Tier, Permitted vs Requested Discount comparison,
          Margin Impact Analysis, Area Manager Review & Forward, and Sales Manager Approval actions */}
      <OrderDetailPage />
    </div>
  );
}

export default OrderApprovalDetailPage;
