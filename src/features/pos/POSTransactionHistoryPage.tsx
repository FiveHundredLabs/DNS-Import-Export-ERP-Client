import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { usePOS } from '../../hooks/usePOS';
import { POSTransaction } from '../../types/pos';
import { formatCurrency } from '../../utils/formatters';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import {
  Receipt,
  Search,
  RotateCcw,
  Printer,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  Banknote,
  Store,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

export function POSTransactionHistoryPage() {
  const { transactions, loading, refund, refresh } = usePOS();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'REFUNDED'>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Selected transaction for thermal receipt preview
  const [viewingTx, setViewingTx] = useState<POSTransaction | null>(null);

  // Refund Modal state
  const [refundingTx, setRefundingTx] = useState<POSTransaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredTransactions = transactions.filter((tx) => {
    if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
    if (methodFilter !== 'ALL' && tx.paymentMethod !== methodFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchReceipt = tx.receiptNumber.toLowerCase().includes(q);
      const matchCustomer = tx.customerName?.toLowerCase().includes(q);
      const matchCashier = tx.cashierName.toLowerCase().includes(q);
      const matchItem = tx.items.some(
        (i) =>
          i.productNameSnapshot.toLowerCase().includes(q) ||
          i.skuSnapshot.toLowerCase().includes(q)
      );
      if (!matchReceipt && !matchCustomer && !matchCashier && !matchItem) return false;
    }
    return true;
  });

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingTx) return;

    if (!refundReason.trim()) {
      setRefundError('A valid reason is required for processing a refund.');
      return;
    }

    try {
      setIsProcessingRefund(true);
      setRefundError(null);
      await refund(refundingTx.id, refundReason.trim());
      setActionSuccess(`Refund processed for receipt #${refundingTx.receiptNumber}. Stock returned to Showroom.`);
      setRefundingTx(null);
      setRefundReason('');
      await refresh();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setRefundError(err.message || 'Failed to process refund.');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <Banknote className="h-3 w-3" /> Cash
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200">
            <CreditCard className="h-3 w-3" /> Card
          </span>
        );
      case 'CHEQUE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <Building2 className="h-3 w-3" /> Cheque
          </span>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-indigo-600" />
            POS Showroom Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of retail checkouts, receipts, and inventory return movements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <NavLink
              to="/pos"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 transition-colors ${
                  isActive ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              POS Terminal
            </NavLink>
            <NavLink
              to="/pos/transactions"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 transition-colors ${
                  isActive ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              Past Sales
            </NavLink>
            <NavLink
              to="/pos/sessions"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 transition-colors ${
                  isActive ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              Shift Management
            </NavLink>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            {actionSuccess}
          </div>
          <button onClick={() => setActionSuccess(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search receipt #, customer, cashier, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash Only</option>
            <option value="CARD">Card Only</option>
            <option value="CHEQUE">Cheque Only</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 text-[10px]">
              <tr>
                <th className="py-3 px-4">Receipt Number</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    No POS transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {tx.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{tx.customerName || 'Walk-in Customer'}</div>
                      {tx.customerCode && <div className="text-[10px] text-slate-400">Code: {tx.customerCode}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-600">
                      {tx.items.length} line {tx.items.length === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-3.5 px-4">{getMethodBadge(tx.paymentMethod)}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      {formatCurrency(tx.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-600">
                      {tx.cashierName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {tx.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          <CheckCircle className="h-3 w-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                          <AlertCircle className="h-3 w-3" /> Refunded
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingTx(tx)}
                          className="h-7 text-xs flex items-center gap-1 text-slate-700"
                        >
                          <Printer className="h-3 w-3 text-indigo-600" />
                          Receipt
                        </Button>
                        {tx.status === 'COMPLETED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRefundingTx(tx);
                              setRefundReason('');
                              setRefundError(null);
                            }}
                            className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Refund
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal
        transaction={viewingTx}
        isOpen={!!viewingTx}
        onClose={() => setViewingTx(null)}
      />

      {/* Refund Confirmation Modal */}
      {refundingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <RotateCcw className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Process Sale Refund</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Receipt: {refundingTx.receiptNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRefundingTx(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="mt-4 space-y-4">
              {refundError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
                  {refundError}
                </div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Inventory Ledger Notice
                </div>
                <div>
                  Refunding this sale will automatically create a <strong>SALES_RETURN</strong> movement and add {refundingTx.items.reduce((sum, i) => sum + i.quantity, 0)} units back to the <strong>SHOWROOM</strong> location stock balance.
                </div>
                <div className="font-extrabold pt-1">
                  Total Refund Amount: {formatCurrency(refundingTx.totalAmount)}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Refund Reason / Customer Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer returned sealed items due to incorrect voltage rating requirement."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRefundingTx(null)}
                  disabled={isProcessingRefund}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isProcessingRefund ? 'Processing...' : 'Confirm Refund & Return Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
