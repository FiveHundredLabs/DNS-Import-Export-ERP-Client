import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useNavigationContext } from '../../hooks/useSmartBack';
import { Customer, CustomerApprovalStage, CustomerStatus } from '../../types/customer';
import { useCustomer, useCustomerFinancials } from '../../api/customers/customers.hooks';
import { extractErrorMessage } from '../../api/client';
import { CustomerHubView } from './CustomerHubView';
import { Button } from '../../components/ui/button';
import { ArrowLeft, RefreshCw, ShieldAlert } from 'lucide-react';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { useAuth } from '../../hooks/useAuth';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role, currentUser } = useAuth();
  const { goBack, getReturnLabel } = useNavigationContext('/customers');

  const customerQuery = useCustomer(id ?? '');
  const financialsQuery = useCustomerFinancials(id ?? '', {
    enabled: Boolean(customerQuery.data),
  });

  const customer = useMemo<Customer | null>(() => {
    const c = customerQuery.data as any;
    if (!c) return null;
    const creditLimitNum = c.creditLimit ? Number(c.creditLimit) : 500000;
    const fin = financialsQuery.data;

    return {
      ...c,
      id: c.id,
      code: c.customerCode || c.id.slice(0, 8).toUpperCase(),
      customerCode: c.customerCode,
      name: c.displayName,
      displayName: c.displayName,
      companyName: c.companyName || undefined,
      type: c.customerType || 'DEALER',
      customerType: c.customerType || 'DEALER',
      areaId: c.areaId || '',
      areaName: c.area?.areaName || '',
      assignedRepId: c.salesRepId || '',
      assignedRepName: c.salesRep?.fullName || '',
      salesRepId: c.salesRepId,
      areaManagerId: c.areaManagerId,
      contactPerson: c.contactPerson,
      phone: c.primaryContactNumber,
      primaryContactNumber: c.primaryContactNumber,
      whatsappNumber: c.whatsappNumber || undefined,
      secondaryPhone: c.secondaryContactNumber || undefined,
      email: c.email,
      address: c.registrationAddress,
      registrationAddress: c.registrationAddress,
      tinNumber: c.tinNumber || undefined,
      vatNumber: c.vatNumber || undefined,
      creditPeriod: c.creditPeriod || 30,
      creditLimit: creditLimitNum,
      commercialTerms: {
        creditLimit: creditLimitNum,
        creditDays: c.creditPeriod || 30,
        paymentTermNotes: c.paymentTermNotes || undefined,
      },
      financials: {
        totalOutstanding: fin?.totalOutstanding ?? 0,
        currentDue: fin?.currentDue ?? 0,
        nearDue: fin?.nearDue ?? 0,
        overdue: fin?.overdue ?? 0,
        availableCredit: fin?.availableCredit ?? creditLimitNum,
        lastPaymentDate: fin?.lastPaymentDate ?? undefined,
        lastPaymentAmount: fin?.lastPaymentAmount ?? undefined,
      },
      approvalStage: c.approvalStage as CustomerApprovalStage,
      status: c.status as CustomerStatus,
      loyaltyLevel: c.loyaltyLevel,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }, [customerQuery.data, financialsQuery.data]);

  if (customerQuery.isLoading) return <TableLoadingSkeleton />;

  if (customerQuery.isError) {
    const err = customerQuery.error;
    const status = isAxiosError(err) ? err.response?.status : undefined;

    if (status === 401) {
      return (
        <div className="p-12 text-center max-w-md mx-auto">
          <div className="p-6 bg-white rounded-xl border border-amber-200 shadow-xs">
            <h2 className="text-base font-bold text-amber-800">Session Expired / Unauthorized</h2>
            <p className="text-xs text-slate-600 mt-2">
              Your session has expired or you are not authenticated. Please sign in again to view this customer.
            </p>
            <Link to="/login" className="text-primary text-xs font-semibold underline mt-4 block">
              Go to Login
            </Link>
          </div>
        </div>
      );
    }

    if (status === 403) {
      return (
        <div className="p-12 text-center max-w-md mx-auto">
          <div className="p-6 bg-white rounded-xl border border-rose-200 shadow-xs">
            <ShieldAlert className="h-6 w-6 text-rose-600 mx-auto mb-2" />
            <h2 className="text-base font-bold text-rose-700">Access Restricted (403 Forbidden)</h2>
            <p className="text-xs text-slate-600 mt-2">
              {extractErrorMessage(err, 'You do not have permission or territory access to view this customer account.')}
            </p>
            <Link to="/customers" className="text-primary text-xs font-semibold underline mt-4 block">
              Return to Authorized Customer List
            </Link>
          </div>
        </div>
      );
    }

    if (status === 404) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-base font-semibold">Customer record not found.</h2>
          <Link to="/customers" className="text-primary text-xs underline mt-2 block">
            Return to Customer Master
          </Link>
        </div>
      );
    }

    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <h2 className="text-base font-semibold text-rose-700">Failed to load customer details</h2>
        <p className="text-xs text-slate-600">
          {extractErrorMessage(err, 'An unexpected error occurred while fetching customer data.')}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => customerQuery.refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={goBack} className="text-xs">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

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
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={goBack}>
        <ArrowLeft className="h-4 w-4" /> Back to {getReturnLabel('Customer Master')}
      </Button>
      <CustomerHubView customer={customer} />
    </div>
  );
}
