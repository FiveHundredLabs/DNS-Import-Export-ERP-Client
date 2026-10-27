import { useParams, useNavigate } from 'react-router-dom';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { A4PurchaseOrderViewer } from './components/A4PurchaseOrderViewer';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { Button } from '../../components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export function PurchaseOrderPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { purchaseOrders, loading } = usePurchaseOrders();

  const po = purchaseOrders.find((p) => p.id === id);

  if (loading && !po) {
    return (
      <div className="p-6">
        <TableLoadingSkeleton />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Purchase Order Not Found</h2>
        <Button onClick={() => navigate('/purchasing/orders')}>Back to Orders</Button>
      </div>
    );
  }

  return (
    <div className="py-2">
      <A4PurchaseOrderViewer
        purchaseOrder={po}
        onBack={() => navigate(`/purchasing/orders/${po.id}`)}
      />
    </div>
  );
}
