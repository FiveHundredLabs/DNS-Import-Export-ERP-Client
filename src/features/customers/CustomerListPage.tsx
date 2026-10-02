import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../hooks/useCustomers';
import { CustomerTable } from './CustomerTable';
import { CustomerCreateModal } from './CustomerCreateModal';
import { CustomerCommercialApprovalModal } from './CustomerCommercialApprovalModal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Plus, Search, Users, RefreshCw, ShieldCheck } from 'lucide-react';
import { Customer } from '../../types/customer';
import { useAuth } from '../../hooks/useAuth';

export function CustomerListPage() {
  const navigate = useNavigate();
  const { hasPermission, role, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedCustomerForReview, setSelectedCustomerForReview] = useState<Customer | null>(null);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const initialFilters = useMemo(() => {
    return {
      page: 1,
      pageSize: 10,
      assignedRepId: role === 'SALES_REP' ? currentUser.id : undefined,
      areaId: role === 'AREA_MANAGER' ? currentUser.areaId : undefined,
    };
  }, [role, currentUser]);

  const {
    customers,
    loading,
    error,
    refetch,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    setCommercialTerms,
    setFilters,
  } = useCustomers(initialFilters);

  const handleSearch = (q: string) => {
    setSearchTerm(q);
    setFilters((prev) => ({
      ...prev,
      search: q,
      page: 1,
      assignedRepId: role === 'SALES_REP' ? currentUser.id : prev.assignedRepId,
      areaId: role === 'AREA_MANAGER' ? currentUser.areaId : prev.areaId,
    }));
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setFilters((prev) => ({
      ...prev,
      type: type || undefined,
      page: 1,
      assignedRepId: role === 'SALES_REP' ? currentUser.id : prev.assignedRepId,
      areaId: role === 'AREA_MANAGER' ? currentUser.areaId : prev.areaId,
    }));
  };

  const canCreate = hasPermission('customers:create');

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Customer Master</h1>
            {role === 'SALES_REP' && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-text bg-primary-light border border-primary-border px-2 py-0.5 rounded">
                <ShieldCheck className="h-3 w-3" /> Assigned Territory
              </span>
            )}
            {role === 'AREA_MANAGER' && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <ShieldCheck className="h-3 w-3" /> Area Scoped
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {role === 'SALES_REP'
              ? `Displaying accounts assigned directly to you (${currentUser.name}).`
              : role === 'AREA_MANAGER'
              ? `Displaying accounts in your managed area (${currentUser.areaName || 'Western Province'}).`
              : 'Single central repository of dealers, credit lines, payment terms, and route assignments.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => {
              setEditingCustomer(null);
              setCreateModalOpen(true);
            }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Register Customer
            </Button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1">

          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by code, customer name, contact person, or phone..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="text-xs"
          >
            <option value="">All Types</option>
            <option value="DEALER">Dealer</option>
            <option value="SHOWROOM">Showroom</option>
            <option value="DIRECT">Direct Contractor</option>
          </Select>
        </div>
      </div>

      {/* States */}
      {loading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Try adjusting your search criteria or register a new customer."
          actionLabel={canCreate ? 'Register Customer' : undefined}
          onAction={() => {
            setEditingCustomer(null);
            setCreateModalOpen(true);
          }}
        />
      ) : (
        <CustomerTable
          customers={customers}
          onView={(c) => navigate(`/customers/${c.id}`)}
          onEdit={(c) => {
            setEditingCustomer(c);
            setCreateModalOpen(true);
          }}
          onDelete={(c) => deleteCustomer(c.id)}
          onReviewCommercials={(c) => {
            setSelectedCustomerForReview(c);
            setReviewModalOpen(true);
          }}
        />
      )}

      {/* Area Manager Customer Creation Modal */}
      <CustomerCreateModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditingCustomer(null);
        }}
        onCreate={async (data) => {
          await createCustomer(data);
        }}
        onUpdate={async (id, data) => {
          await updateCustomer(id, data);
        }}
        editingCustomer={editingCustomer}
      />

      {/* Sales Manager Commercial Terms Setup Modal */}
      <CustomerCommercialApprovalModal
        customer={selectedCustomerForReview}
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        onSubmitTerms={async (customerId, terms) => {
          await setCommercialTerms(customerId, terms);
        }}
      />
    </div>
  );
}
