import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Customer } from '../../types/customer';
import { customerService } from '../../services/CustomerService';
import { CustomerHubView } from './CustomerHubView';
import { Button } from '../../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../hooks/useAuth';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role, currentUser } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await customerService.getCustomer(id);
        setCustomer(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <TableLoadingSkeleton />;
  if (!customer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-semibold">Customer record not found.</h2>
        <Link to="/customers" className="text-primary text-xs underline mt-2 block">
          Return to Customer Master
        </Link>
      </div>
    );
  }

  // Role territory authorization check
  const isUnauthorized =
    (role === 'SALES_REP' && customer.assignedRepId !== currentUser.id) ||
    (role === 'AREA_MANAGER' && currentUser.areaId && customer.areaId !== currentUser.areaId);

  if (isUnauthorized) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="p-6 bg-white rounded-xl border border-rose-200 shadow-xs">
          <h2 className="text-base font-bold text-rose-700">Territory Access Restricted</h2>
          <p className="text-xs text-slate-600 mt-2">
            You do not have authorization to view customer account details for <span className="font-semibold">{customer.name}</span>.
            {role === 'SALES_REP'
              ? ' This account is assigned to another Sales Representative.'
              : ' This account belongs to another operational area.'}
          </p>
          <Link to="/customers" className="text-primary text-xs font-semibold underline mt-4 block">
            Return to Authorized Customer List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/customers">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to Customer Master
        </Button>
      </Link>
      <CustomerHubView customer={customer} />
    </div>
  );
}
