import { Navigate, useParams } from 'react-router-dom';

/** Approval decisions now live on the API-backed purchase order detail page. */
export function PurchaseOrderApprovalPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/purchasing/approvals" replace />;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return <Navigate to="/purchasing/approvals" replace />;
  }
  return <Navigate to={`/purchasing/orders/${encodeURIComponent(id)}`} replace />;
}
