import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { usePOS } from '../../hooks/usePOS';
import { POSSession, SessionSummary } from '../../types/pos';
import { formatCurrency } from '../../utils/formatters';
import {
  Calendar,
  Clock,
  DollarSign,
  Lock,
  Play,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Receipt,
  X,
  Printer,
  TrendingUp,
  Banknote,
  CreditCard,
  Building2,
  Store,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

export function POSSessionsPage() {
  const { sessions, loading, getSummary, activeSession } = usePOS();
  const [selectedSessionSummary, setSelectedSessionSummary] = useState<SessionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleViewSummary = async (sessionId: string) => {
    try {
      setLoadingSummary(true);
      const summary = await getSummary(sessionId);
      setSelectedSessionSummary(summary);
    } catch (e) {
      console.error('Failed to load session summary', e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const printSummary = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-5">
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Clock className="h-7 w-7 text-indigo-600" />
            Cashier Shift Sessions & Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift floats, Cash In/Out adjustments, daily sales totals, and drawer audit reconciliation.
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

      {/* Sessions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 text-[10px]">
              <tr>
                <th className="py-3 px-4">Shift Number</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Opened At</th>
                <th className="py-3 px-4">Closed At</th>
                <th className="py-3 px-4 text-right">Opening Float</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Counted Cash</th>
                <th className="py-3 px-4 text-center">Variance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Loading cashier shift sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    No shift sessions recorded yet.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const diff = sess.cashDifference;
                  const isBalanced = diff === 0;

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                        {sess.sessionNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {sess.cashierName}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {new Date(sess.openedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {sess.closedAt ? new Date(sess.closedAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                        {formatCurrency(sess.openingBalance)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                        {formatCurrency(sess.totalSales)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                        {sess.actualCash !== undefined ? formatCurrency(sess.actualCash) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {sess.status === 'OPEN' ? (
                          <span className="text-[11px] text-slate-400">In Progress</span>
                        ) : diff !== undefined ? (
                          isBalanced ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle className="h-3 w-3" /> Balanced
                            </span>
                          ) : diff > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200">
                              +{formatCurrency(diff)} Over
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                              {formatCurrency(diff)} Short
                            </span>
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {sess.status === 'OPEN' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <Play className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                            <Lock className="h-3 w-3" /> Closed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSummary(sess.id)}
                          className="h-7 text-xs text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                        >
                          View Summary
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Summary Breakdown Modal */}
      {selectedSessionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Shift Reconciliation Summary
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Shift #{selectedSessionSummary.session.sessionNumber} ({selectedSessionSummary.session.cashierName})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSessionSummary(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Shift Timing Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Shift Status</span>
                  <Badge variant={selectedSessionSummary.session.status === 'OPEN' ? 'warning' : 'outline'}>
                    {selectedSessionSummary.session.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Opened At</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedSessionSummary.session.openedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Closed At</span>
                  <span className="font-semibold text-slate-800">
                    {selectedSessionSummary.session.closedAt
                      ? new Date(selectedSessionSummary.session.closedAt).toLocaleString()
                      : 'Active / Not Closed'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Transactions</span>
                  <span className="font-bold text-indigo-700 text-sm">
                    {selectedSessionSummary.transactions.length}
                  </span>
                </div>
              </div>

              {/* Sales Breakdown by Payment Method */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center justify-between">
                  <span>Sales by Tender Method</span>
                  <span className="text-emerald-700 font-extrabold text-xs">
                    Total: {formatCurrency(selectedSessionSummary.session.totalSales)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                    <div className="text-emerald-600 font-bold flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5" /> Cash Sales
                    </div>
                    <div className="text-base font-extrabold text-emerald-900 mt-1">
                      {formatCurrency(selectedSessionSummary.cashSalesTotal)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-sky-50 border border-sky-100 p-2.5">
                    <div className="text-sky-600 font-bold flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" /> Card Sales
                    </div>
                    <div className="text-base font-extrabold text-sky-900 mt-1">
                      {formatCurrency(selectedSessionSummary.cardSalesTotal)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-100 p-2.5">
                    <div className="text-amber-600 font-bold flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" /> Cheque Sales
                    </div>
                    <div className="text-base font-extrabold text-amber-900 mt-1">
                      {formatCurrency(selectedSessionSummary.chequeSalesTotal)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Reconciliation Calculation */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Drawer Float Mathematical Reconciliation
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Opening Cash Float:</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(selectedSessionSummary.session.openingBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>(+) Total Cash In (Added Float):</span>
                  <span className="font-semibold">
                    + {formatCurrency(selectedSessionSummary.session.cashInTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span>(-) Total Cash Out (Safe Drops):</span>
                  <span className="font-semibold">
                    - {formatCurrency(selectedSessionSummary.session.cashOutTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-indigo-600">
                  <span>(+) Showroom Cash Sales:</span>
                  <span className="font-semibold">
                    + {formatCurrency(selectedSessionSummary.cashSalesTotal)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-900 text-sm">
                  <span>Expected Physical Cash in Register:</span>
                  <span className="text-indigo-700 font-mono">
                    {formatCurrency(selectedSessionSummary.reconciliation.expectedCash)}
                  </span>
                </div>
                {selectedSessionSummary.session.actualCash !== undefined && (
                  <>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Counted / Actual Cash:</span>
                      <span className="font-mono">{formatCurrency(selectedSessionSummary.session.actualCash)}</span>
                    </div>
                    <div
                      className={`rounded-lg p-2.5 border flex items-center justify-between font-bold ${
                        selectedSessionSummary.reconciliation.isBalanced
                          ? 'bg-emerald-100/70 border-emerald-200 text-emerald-800'
                          : selectedSessionSummary.reconciliation.difference > 0
                          ? 'bg-sky-100/70 border-sky-200 text-sky-800'
                          : 'bg-rose-100/70 border-rose-200 text-rose-800'
                      }`}
                    >
                      <span>Reconciliation Variance:</span>
                      <span>
                        {selectedSessionSummary.reconciliation.difference > 0 ? '+' : ''}
                        {formatCurrency(selectedSessionSummary.reconciliation.difference)} (
                        {selectedSessionSummary.reconciliation.status})
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Cash Movements Ledger */}
              {selectedSessionSummary.cashTransactions.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">
                    Mid-Shift Cash Movements
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectedSessionSummary.cashTransactions.map((c) => (
                      <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span
                            className={`font-bold mr-2 ${
                              c.type === 'CASH_IN' ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {c.type === 'CASH_IN' ? '+ CASH IN' : '- CASH DROP'}
                          </span>
                          <span className="text-slate-600">{c.reason}</span>
                          <span className="text-[10px] text-slate-400 ml-2">by {c.performedByName}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(c.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSessionSummary.session.notes && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-0.5">Shift Notes:</span>
                  {selectedSessionSummary.session.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedSessionSummary(null)}>
                Close
              </Button>
              <Button size="sm" onClick={printSummary} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5">
                <Printer className="h-4 w-4" />
                Print Shift Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
