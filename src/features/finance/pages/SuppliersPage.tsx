import { useState, useMemo } from 'react';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { Supplier, CreateSupplierDTO } from '../api/types';
import { SupplierModal } from '../components/SupplierModal';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  Edit,
  Trash2,
  Receipt,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';

export function SuppliersPage() {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useFinanceLedger();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
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
  }, [suppliers, search, statusFilter]);

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1;
  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page, pageSize]);

  const totalPayables = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  }, [suppliers]);

  const handleOpenCreate = () => {
    setSelectedSupplier(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setModalOpen(true);
  };

  const handleSave = async (dto: CreateSupplierDTO): Promise<Supplier> => {
    if (selectedSupplier) {
      return updateSupplier(selectedSupplier.id, dto);
    } else {
      return createSupplier(dto);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supplier Management</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Accounts Payable
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Maintain authorized trade vendors, payment terms, tax registrations, and running payable balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} className="gap-2 bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4" />
            <span>Register Supplier</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Vendors</span>
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {suppliers.filter((s) => s.status === 'ACTIVE').length}
            </span>
            <span className="text-xs text-slate-500">of {suppliers.length} Total</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Outstanding Payables
            </span>
            <Receipt className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalPayables)}</span>
            <span className="text-xs text-amber-600 font-medium">To Vendors</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Standard Terms</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">Net 30 Days</span>
            <span className="text-xs text-emerald-600 font-medium">Default Term</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search vendor by name, code, contact person, phone or tax ID..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500">Status:</span>
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === st ? 'bg-white text-primary-text shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Vendor / Code</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Contact Details</th>
                <th className="px-4 py-3">Tax Registration</th>
                <th className="px-4 py-3">Payment Terms</th>
                <th className="px-4 py-3 text-right">Outstanding Balance</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No suppliers match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{sup.name}</div>
                      <div className="font-mono text-[11px] text-primary font-medium">{sup.code}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{sup.contactPerson}</td>
                    <td className="px-4 py-3.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{sup.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{sup.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {sup.taxNumber ? (
                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {sup.taxNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Registered</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                        {sup.paymentTerms}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(sup.balance)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {sup.status === 'ACTIVE' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-200">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(sup)}
                          className="rounded p-1 text-slate-400 hover:bg-primary-light hover:text-primary transition-colors"
                          title="Edit supplier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSupplier(sup.id)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete supplier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <div>
              Showing page <span className="font-semibold text-slate-900">{page}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalPages}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Create/Edit Modal */}
      <SupplierModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        supplierToEdit={selectedSupplier}
      />
    </div>
  );
}
