import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomers } from '../../hooks/useCustomers';
import { CustomerTable } from './CustomerTable';
import { CustomerCreateModal } from './CustomerCreateModal';
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
import { Customer, CustomerApprovalStage } from '../../types/customer';
import { useAuth } from '../../hooks/useAuth';

export function CustomerListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, role, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Strictly filter for customers who have completed the onboarding process (approvalStage: APPROVED)
  const initialFilters = useMemo(() => {
    return {
      page: 1,
      pageSize: 50,
      assignedRepId: role === 'SALES_REP' ? currentUser.id : undefined,
      areaId: role === 'AREA_MANAGER' ? currentUser.areaId : undefined,
      approvalStage: 'APPROVED' as CustomerApprovalStage,
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
    setFilters,
  } = useCustomers(initialFilters);

  // Guarantee only approved (fully onboarded) customers are shown in Customer Master
  const approvedCustomers = useMemo(() => {
    return customers.filter((c) => c.approvalStage === 'APPROVED');
  }, [customers]);

  const handleSearch = (q: string) => {
    setSearchTerm(q);
    setFilters((prev) => ({
      ...prev,
      search: q,
      page: 1,
      assignedRepId: role === 'SALES_REP' ? currentUser.id : prev.assignedRepId,
      areaId: role === 'AREA_MANAGER' ? currentUser.areaId : prev.areaId,
      approvalStage: 'APPROVED',
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
      approvalStage: 'APPROVED',
    }));
  };

  const canCreate = hasPermission('customers:create');
  const canEdit = hasPermission('customers:edit');

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="Customer Master"
        subtitle={
          role === 'SALES_REP'
            ? `Displaying verified accounts assigned directly to you (${currentUser.name}).`
            : role === 'AREA_MANAGER'
            ? `Displaying verified active accounts in your managed area (${currentUser.areaName || 'Kelaniya'}).`
            : 'Single central repository of verified active dealers, credit lines, payment terms, and route assignments.'
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
              Active Directory
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

      {/* Customer Master Table or Empty/Loading States */}
      {loading ? (
        <TableLoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : approvedCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No onboarded customers found"
          description="Try adjusting your search criteria or clear active filters."
        />
      ) : (
        <CustomerTable
          customers={approvedCustomers}
          onView={(c) => navigate(`/customers/${c.id}`, { state: { from: location.pathname + location.search } })}
          onEdit={
            canEdit
              ? (c) => {
                  setEditingCustomer(c);
                  setModalMode('edit');
                  setCreateModalOpen(true);
                }
              : undefined
          }
          onDelete={(c) => deleteCustomer(c.id)}
        />
      )}

      {/* Customer Edit Drawer */}
      <CustomerCreateModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) {
            setEditingCustomer(null);
            setModalMode('edit');
          }
        }}
        onCreate={async (data) => {
          await createCustomer(data);
        }}
        onUpdate={async (id, data) => {
          await updateCustomer(id, data);
        }}
        editingCustomer={editingCustomer}
        mode={modalMode}
      />
    </div>
  );
}
