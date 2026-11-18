import { useState, useMemo } from 'react';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { ReportHeaderNav } from './reports/ReportHeaderNav';
import { formatCurrency } from '../../../utils/formatters';
import { Award, Users, DollarSign, Search, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';

interface CommissionLedgerItem {
  id: string;
  repId: string;
  repName: string;
  period: string;
  orderNumber: string;
  saleValue: number;
  ratePercentage: number;
  accruedAmount: number;
  status: 'ACCRUED' | 'PAID';
  accrualDate: string;
}

const COMMISSION_ACCRUALS: CommissionLedgerItem[] = [];

export function FinanceCommissionsPage() {
  const { accounts } = useFinanceLedger();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACCRUED' | 'PAID'>('ALL');

  const commissionPayableAcc = useMemo(() => {
    return accounts.find((a) => a.code === '2030');
  }, [accounts]);

  const filteredAccruals = useMemo(() => {
    return COMMISSION_ACCRUALS.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.repName.toLowerCase().includes(q) ||
        item.orderNumber.toLowerCase().includes(q) ||
        item.period.toLowerCase().includes(q)
      );
    });
  }, [search, statusFilter]);

  const totalAccruedUnpaid = useMemo(() => {
    return COMMISSION_ACCRUALS.filter((i) => i.status === 'ACCRUED').reduce(
      (sum, i) => sum + i.accruedAmount,
      0
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Back and Report Navigation Bar */}
      <ReportHeaderNav />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Commissions Sub-Ledger</h1>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
              GL Code 2030 (Commission Payable)
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track earned sales commissions, accrued liabilities, and payable balances across all active sales reps.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Accrued Payable
            </span>
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">{formatCurrency(totalAccruedUnpaid)}</span>
            <span className="text-xs text-purple-600 font-medium">Under GL 2030</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              GL 2030 Balance
            </span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">
              {formatCurrency(commissionPayableAcc?.currentBalance || 185000)}
            </span>
            <span className="text-xs text-slate-500">Ledger Liability</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Sales Reps
            </span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">4</span>
            <span className="text-xs text-slate-500">Earning Commission</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by sales rep, order #, or period..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
            {(['ALL', 'ACCRUED', 'PAID'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-primary-text shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All Accruals' : status === 'ACCRUED' ? 'Accrued & Unpaid' : 'Settled'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Sales Representative</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3 text-right">Invoiced Value</th>
                <th className="px-4 py-3 text-right">Commission Rate</th>
                <th className="px-4 py-3 text-right">Accrued Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAccruals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No commission accruals found.
                  </td>
                </tr>
              ) : (
                filteredAccruals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-900">{item.repName}</td>
                    <td className="px-4 py-3.5 tabular-nums text-slate-600">{item.period}</td>
                    <td className="px-4 py-3.5 tabular-nums text-primary font-medium">{item.orderNumber}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">
                      {formatCurrency(item.saleValue)}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">{item.ratePercentage}%</td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-900">
                      {formatCurrency(item.accruedAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {item.status === 'ACCRUED' ? (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-semibold">Accrued</Badge>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">Paid Out</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
