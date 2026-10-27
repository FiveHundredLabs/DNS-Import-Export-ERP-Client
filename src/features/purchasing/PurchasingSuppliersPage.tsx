import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceLedger } from '../finance/hooks/useFinanceLedger';
import { Supplier, CreateSupplierDTO } from '../finance/api/types';
import { SupplierModal } from '../finance/components/SupplierModal';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Store,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  Edit,
  Receipt,
  FilePlus,
  ExternalLink,
  MapPin,
  FileText,
  Clock,
  ArrowUpDown,
  Eye,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';

export function PurchasingSuppliersPage() {
  const navigate = useNavigate();
  const { suppliers, loading, createSupplier, updateSupplier } = useFinanceLedger();
  const { purchaseOrders } = usePurchaseOrders();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'balance'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Supplier create / edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  // Supplier inspection detail dialog
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [inspectedSupplier, setInspectedSupplier] = useState<Supplier | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredSuppliers = useMemo(() => {
    let list = suppliers.filter((sup) => {
      if (statusFilter !== 'ALL' && sup.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        sup.name.toLowerCase().includes(q) ||
        sup.code.toLowerCase().includes(q) ||
        sup.contactPerson.toLowerCase().includes(q) ||
        sup.email.toLowerCase().includes(q) ||
        sup.phone.includes(q) ||
        (sup.taxNumber && sup.taxNumber.toLowerCase().includes(q))
      );
    });

    list.sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') comp = a.name.localeCompare(b.name);
      else if (sortBy === 'code') comp = a.code.localeCompare(b.code);
      else if (sortBy === 'balance') comp = (a.balance || 0) - (b.balance || 0);

      return sortOrder === 'asc' ? comp : -comp;
    });

    return list;
  }, [suppliers, search, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1;
  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page, pageSize]);

  // Supplier purchase orders history
  const inspectedSupplierPOs = useMemo(() => {
    if (!inspectedSupplier) return [];
    return purchaseOrders.filter((po) => po.supplierId === inspectedSupplier.id);
  }, [inspectedSupplier, purchaseOrders]);

  const handleOpenCreate = () => {
    setSupplierToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setSupplierToEdit(sup);
    setModalOpen(true);
  };

  const handleOpenInspect = (sup: Supplier) => {
    setInspectedSupplier(sup);
    setDetailModalOpen(true);
  };

  const handleSave = async (dto: CreateSupplierDTO): Promise<Supplier> => {
    if (supplierToEdit) {
      return updateSupplier(supplierToEdit.id, dto);
    } else {
      return createSupplier(dto);
    }
  };

  const toggleSort = (col: 'name' | 'code' | 'balance') => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  if (loading && suppliers.length === 0) {
    return (
      <div className="space-y-6">
        <TableLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Supplier Directory & Procurement
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              Procurement Master
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Registered vendors, contractual payment terms, historical pricing, and purchase order tracking.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-xs self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Supplier</span>
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Active Approved Vendors</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {suppliers.filter((s) => s.status === 'ACTIVE').length}{' '}
                <span className="text-xs text-slate-400 font-normal">of {suppliers.length} Total</span>
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Active Purchase Orders</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {purchaseOrders.filter((po) => po.status !== 'COMPLETED' && po.status !== 'CANCELLED').length}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Outstanding Payables</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
                {formatCurrency(suppliers.reduce((sum, s) => sum + (s.balance || 0), 0))}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search supplier name, code, contact, email, VAT..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'ALL' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort('code')}
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      <span>Code</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1 font-semibold">
                      <span>Supplier Name</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">Contact Person</th>
                  <th className="py-3 px-4 font-semibold">Payment Terms</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-900"
                    onClick={() => toggleSort('balance')}
                  >
                    <div className="flex items-center justify-end gap-1 font-semibold">
                      <span>AP Balance</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No suppliers found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedSuppliers.map((sup) => (
                    <tr
                      key={sup.id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => handleOpenInspect(sup)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {sup.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{sup.name}</div>
                        {sup.taxNumber && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            VAT: {sup.taxNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900">{sup.contactPerson}</div>
                        <div className="text-slate-400 text-[10px]">{sup.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-700">
                          {sup.paymentTerms}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(sup.balance || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={
                            sup.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                              : 'bg-slate-100 text-slate-500 border-slate-300 text-[10px]'
                          }
                        >
                          {sup.status}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4 text-right space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenInspect(sup)}
                          className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900"
                          title="View supplier details & purchase history"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(sup)}
                          className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900"
                          title="Edit supplier information"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/purchasing/orders/new?supplierId=${sup.id}`)}
                          className="h-7 text-xs px-2.5 gap-1 bg-white hover:bg-slate-50 text-slate-700"
                          title="Create Purchase Order for this supplier"
                        >
                          <FilePlus className="h-3.5 w-3.5 text-slate-500" />
                          <span className="hidden md:inline">Create PO</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3.5 border-t border-slate-200 text-xs text-slate-600">
              <div>
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, filteredSuppliers.length)} of {filteredSuppliers.length}{' '}
                suppliers
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs px-2.5"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs px-2.5"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Create/Edit Modal */}
      <SupplierModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        supplierToEdit={supplierToEdit}
      />

      {/* Supplier Inspection & Purchase History Detail Modal */}
      {inspectedSupplier && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>{inspectedSupplier.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {inspectedSupplier.code}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-1">
                    Master vendor profile and transaction history in DNS ERP.
                  </DialogDescription>
                </div>
                <Badge
                  variant="outline"
                  className={
                    inspectedSupplier.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }
                >
                  {inspectedSupplier.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Contact Information</span>
                  <div className="font-semibold text-slate-900">{inspectedSupplier.contactPerson}</div>
                  <div className="text-slate-600 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>{inspectedSupplier.phone}</span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span>{inspectedSupplier.email}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Commercial Terms</span>
                  <div className="text-slate-700">
                    <span className="font-semibold">Payment Terms:</span> {inspectedSupplier.paymentTerms}
                  </div>
                  <div className="text-slate-700">
                    <span className="font-semibold">Tax / VAT No:</span> {inspectedSupplier.taxNumber || 'N/A'}
                  </div>
                  <div className="text-slate-700 font-mono">
                    <span className="font-semibold">Current AP Balance:</span>{' '}
                    <span className="font-bold text-slate-900">
                      {formatCurrency(inspectedSupplier.balance || 0)}
                    </span>
                  </div>
                </div>

                {inspectedSupplier.address && (
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 text-slate-600 flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{inspectedSupplier.address}</span>
                  </div>
                )}
              </div>

              {/* Purchase Orders History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span>Purchase Orders History</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {inspectedSupplierPOs.length}
                    </Badge>
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailModalOpen(false);
                      navigate(`/purchasing/orders/new?supplierId=${inspectedSupplier.id}`);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Create PO</span>
                  </Button>
                </div>

                {inspectedSupplierPOs.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-xs">
                    No purchase orders recorded for this supplier yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">PO Number</th>
                          <th className="py-2 px-3">Order Date</th>
                          <th className="py-2 px-3 text-right">Grand Total</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inspectedSupplierPOs.map((po) => (
                          <tr
                            key={po.id}
                            className="hover:bg-slate-50 cursor-pointer"
                            onClick={() => {
                              setDetailModalOpen(false);
                              navigate(`/purchasing/orders/${po.id}`);
                            }}
                          >
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{po.poNumber}</td>
                            <td className="py-2 px-3 text-slate-500">{formatDate(po.orderDate)}</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                              {formatCurrency(po.grandTotal)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant="outline" className="text-[9px] font-mono">
                                {po.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(inspectedSupplier)}
                className="gap-1.5 text-xs"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
                className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
