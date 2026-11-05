import { useState, useMemo, useEffect } from 'react';
import { apService, SupplierPaymentRecord, VendorBill } from '../finance/services/apService';
import { SupplierAdvance } from '../finance/api/types';
import { useFinanceLedger } from '../finance/hooks/useFinanceLedger';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { PageHeader } from '../../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { TableLoadingSkeleton } from '../../components/common/LoadingSkeleton';
import {
  CreditCard,
  Landmark,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  FileText,
  Lock,
  Building2,
  Layers,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface UnifiedPaymentRow {
  id: string;
  paymentType: 'SETTLEMENT' | 'ADVANCE';
  referenceNumber: string;
  paymentReference: string;
  paymentDate: string;
  supplierId: string;
  supplierName: string;
  bankAccount: string;
  amount: number;
  status: string;
  linkedDocumentRef: string;
  notes?: string;
  rawRecord: SupplierPaymentRecord | SupplierAdvance;
}

export function PurchasingSupplierPaymentsPage() {
  const { currentUser } = useAuth();
  const { suppliers, loading: ledgerLoading } = useFinanceLedger();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<SupplierPaymentRecord[]>([]);
  const [advances, setAdvances] = useState<SupplierAdvance[]>([]);
  const [bills, setBills] = useState<VendorBill[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SETTLEMENT' | 'ADVANCE'>('ALL');

  // Inspection modal
  const [selectedPayment, setSelectedPayment] = useState<UnifiedPaymentRow | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadData = () => {
    try {
      setLoading(true);
      const pmts = apService.getSupplierPayments();
      const advs = apService.getSupplierAdvances();
      const allBills = apService.getAllBills();
      setPayments(pmts);
      setAdvances(advs);
      setBills(allBills);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Merge direct disbursements and supplier advances into a unified view-only list
  const unifiedRows = useMemo<UnifiedPaymentRow[]>(() => {
    const rows: UnifiedPaymentRow[] = [];

    // 1. Direct AP Payments
    for (const p of payments) {
      const billRefs = p.allocations
        .map((a) => a.vendorInvoiceNumber || a.billNumber || a.billId)
        .filter(Boolean)
        .join(', ');

      rows.push({
        id: p.id,
        paymentType: 'SETTLEMENT',
        referenceNumber: p.paymentNumber,
        paymentReference: p.paymentReference,
        paymentDate: p.paymentDate,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        bankAccount: p.bankAccountName || `${p.bankAccountCode} Operating Account`,
        amount: p.totalPaymentAmount,
        status: 'SETTLED',
        linkedDocumentRef: billRefs || 'Multiple Vendor Bills',
        notes: p.notes,
        rawRecord: p,
      });
    }

    // 2. Supplier Advances / Prepayments
    for (const a of advances) {
      rows.push({
        id: a.id,
        paymentType: 'ADVANCE',
        referenceNumber: a.advanceNumber,
        paymentReference: a.reference,
        paymentDate: a.paymentDate,
        supplierId: a.supplierId,
        supplierName: a.supplierName,
        bankAccount: `Bank Account (${a.bankAccountCode})`,
        amount: a.amount,
        status: a.status,
        linkedDocumentRef: a.purchaseOrderNumber || a.purchaseOrderId || 'Procurement Advance',
        notes: a.notes,
        rawRecord: a,
      });
    }

    // Sort descending by date
    return rows.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [payments, advances]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return unifiedRows.filter((r) => {
      if (typeFilter !== 'ALL' && r.paymentType !== typeFilter) return false;
      if (supplierFilter !== 'ALL' && r.supplierId !== supplierFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.referenceNumber.toLowerCase().includes(q) ||
          r.paymentReference.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          r.linkedDocumentRef.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [unifiedRows, typeFilter, supplierFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalDisbursed = payments.reduce((sum, p) => sum + p.totalPaymentAmount, 0);
    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    const activeUnappliedAdvances = advances
      .filter((a) => a.status === 'UNAPPLIED' || a.status === 'PARTIALLY_APPLIED')
      .reduce((sum, a) => sum + (a.unappliedBalance || 0), 0);

    const openPayables = bills
      .filter((b) => b.status === 'OPEN' || b.status === 'PARTIALLY_PAID')
      .reduce((sum, b) => sum + (b.balanceDue || 0), 0);

    return {
      totalDisbursed: totalDisbursed + totalAdvances,
      activeUnappliedAdvances,
      openPayables,
      settledTransactionsCount: payments.length + advances.length,
    };
  }, [payments, advances, bills]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Supplier Payments Register"
        subtitle="Audited supplier disbursements, advance prepayments, and invoice settlements synchronized from Finance Accounts Payable."
        badge={
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs gap-1 py-1 font-semibold">
            <Lock className="h-3 w-3 text-emerald-700" />
            <span>Finance Audited • View-Only Access</span>
          </Badge>
        }
        breadcrumbs={[
          { label: 'Purchasing', href: '/purchasing/orders' },
          { label: 'Supplier Payments' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Ledger</span>
          </Button>
        }
      />

      {/* Role-Specific Read-Only Notice */}
      <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5 shadow-2xs">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-semibold text-blue-950">
            Procurement Payment Transparency Mode ({currentUser.role.replace('_', ' ')})
          </p>
          <p className="text-blue-800 text-[11px]">
            You have verified view-only visibility into supplier settlements and advance deposits. All disbursements are posted and governed by Finance AP.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Disbursements
            </CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-black text-slate-900 font-mono">
              {formatCurrency(metrics.totalDisbursed)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {metrics.settledTransactionsCount} total payments &amp; prepayments
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Prepayments
            </CardTitle>
            <Landmark className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-black text-indigo-700 font-mono">
              {formatCurrency(metrics.activeUnappliedAdvances)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Unapplied deposits against open POs
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Outstanding AP Balance
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-black text-amber-800 font-mono">
              {formatCurrency(metrics.openPayables)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Unsettled vendor bills pending payment
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Suppliers
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-black text-slate-900 font-mono">
              {suppliers.filter((s) => s.status === 'ACTIVE').length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Configured in Supplier Master
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search payment #, cheque/transfer ref, supplier, or linked invoice/PO..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs h-9 bg-slate-50/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={supplierFilter}
                onChange={(e) => {
                  setSupplierFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 text-xs w-48"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>

              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as any);
                  setPage(1);
                }}
                className="h-9 text-xs w-40"
              >
                <option value="ALL">All Payment Types</option>
                <option value="SETTLEMENT">Bill Settlements</option>
                <option value="ADVANCE">PO Prepayments</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-600" />
            <span>Disbursement Ledger Records ({filteredRows.length})</span>
          </CardTitle>
          <span className="text-xs text-slate-400">
            Showing Page {page} of {totalPages}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading || ledgerLoading ? (
            <div className="p-6">
              <TableLoadingSkeleton />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CreditCard className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Supplier Payments Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No disbursements or prepayments match your current search and filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Payment #</th>
                    <th className="py-3 px-4">Date Paid</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Linked Reference</th>
                    <th className="py-3 px-4">Bank / Cash Account</th>
                    <th className="py-3 px-4 text-right">Amount (LKR)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-20">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {row.referenceNumber}
                        <div className="font-mono text-[10px] text-slate-400">
                          Ref: {row.paymentReference}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {formatDate(row.paymentDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{row.supplierName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={
                            row.paymentType === 'SETTLEMENT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]'
                          }
                        >
                          {row.paymentType === 'SETTLEMENT' ? 'Bill Settlement' : 'PO Prepayment'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {row.linkedDocumentRef}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.bankAccount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={
                            row.status === 'SETTLED' || row.status === 'APPLIED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                              : row.status === 'PARTIALLY_APPLIED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                              : 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]'
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(row);
                            setDetailModalOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-primary hover:bg-slate-100"
                          title="Inspect Payment Details (View Only)"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read-Only Inspection Modal */}
      {selectedPayment && (
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  <span>Supplier Disbursement Details</span>
                </DialogTitle>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs">
                  {selectedPayment.referenceNumber}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Synchronized read-only disbursement audit record from Accounts Payable ledger.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Header Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Date</span>
                  <span className="font-semibold text-slate-900">{formatDate(selectedPayment.paymentDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Reference</span>
                  <span className="font-mono font-bold text-slate-900">{selectedPayment.paymentReference}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Type</span>
                  <span className="font-semibold text-slate-900">
                    {selectedPayment.paymentType === 'SETTLEMENT' ? 'Vendor Bill Settlement' : 'PO Prepayment Advance'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Amount</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{selectedPayment.supplierName}</div>
                <div className="text-slate-500 text-[11px]">
                  Disbursed via: <strong className="text-slate-700">{selectedPayment.bankAccount}</strong>
                </div>
                {selectedPayment.notes && (
                  <div className="text-slate-600 text-[11px] italic mt-1 pt-1 border-t border-slate-100">
                    Note: {selectedPayment.notes}
                  </div>
                )}
              </div>

              {/* Settlement Allocation Breakdown (if settlement) */}
              {selectedPayment.paymentType === 'SETTLEMENT' && 'allocations' in selectedPayment.rawRecord && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Settled Vendor Invoices &amp; Bills
                  </h4>
                  <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Bill #</th>
                          <th className="py-2 px-3">Supplier Invoice #</th>
                          <th className="py-2 px-3 text-right">Applied Amount (LKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedPayment.rawRecord as SupplierPaymentRecord).allocations.map((alloc, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              {alloc.billNumber || alloc.billId}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              {alloc.vendorInvoiceNumber || '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(alloc.amountToApply)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Advance Details Breakdown (if advance) */}
              {selectedPayment.paymentType === 'ADVANCE' && 'unappliedBalance' in selectedPayment.rawRecord && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-indigo-950 text-xs">Prepayment Allocation Status</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 block">Linked Purchase Order</span>
                      <span className="font-mono font-bold text-indigo-900">
                        {(selectedPayment.rawRecord as SupplierAdvance).purchaseOrderNumber || 'Direct Procurement Prepayment'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 block">Unapplied Balance</span>
                      <span className="font-mono font-bold text-indigo-900">
                        {formatCurrency((selectedPayment.rawRecord as SupplierAdvance).unappliedBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
