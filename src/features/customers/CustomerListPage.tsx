import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../hooks/useCustomers';
import { CustomerTable } from './CustomerTable';
import { CustomerCreateModal } from './CustomerCreateModal';
import { CustomerCommercialApprovalModal } from './CustomerCommercialApprovalModal';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="Customer Master"
        subtitle={
          role === 'SALES_REP'
            ? `Displaying accounts assigned directly to you (${currentUser.name}).`
            : role === 'AREA_MANAGER'
            ? `Displaying accounts in your managed area (${currentUser.areaName || 'Kelaniya'}).`
            : 'Single central repository of dealers, credit lines, payment terms, and route assignments.'
        }
        badge={
          role === 'SALES_REP' ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold gap-1">
              <ShieldCheck className="h-3 w-3" /> Assigned Territory
            </Badge>
          ) : role === 'AREA_MANAGER' ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold gap-1">
              <ShieldCheck className="h-3 w-3" /> Area Scoped
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-mono">
              Directory
            </Badge>
          )
        }
        breadcrumbs={[
          { label: 'Sales & Orders', href: '/orders' },
          { label: 'Customer Master' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-9">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingCustomer(null);
                  setCreateModalOpen(true);
                }}
                className="gap-1.5 h-9 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Register Customer</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
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
            value={selectedType || '__all__'}
            onValueChange={(val) => handleTypeChange(val === '__all__' ? '' : val)}
          >
            <SelectTrigger className="text-xs h-9 rounded-md bg-white">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Types</SelectItem>
              <SelectItem value="DEALER">Dealer</SelectItem>
              <SelectItem value="SHOWROOM">Showroom</SelectItem>
              <SelectItem value="DIRECT">Direct Contractor</SelectItem>
            </SelectContent>
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
