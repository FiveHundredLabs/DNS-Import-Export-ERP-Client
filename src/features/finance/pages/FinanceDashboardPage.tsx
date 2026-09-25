import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  DollarSign,
  TrendingUp,
  Scale,
  BookOpen,
  Receipt,
  Users,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  PieChart,
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

export function FinanceDashboardPage() {
  const { accounts, journals, getProfitLoss, getBalanceSheet } = useFinanceLedger();
  const [netProfit, setNetProfit] = useState<number>(0);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [totalLiabilities, setTotalLiabilities] = useState<number>(0);
  const [totalEquity, setTotalEquity] = useState<number>(0);

  useEffect(() => {
    async function loadKpis() {
      try {
        const [pnl, bs] = await Promise.all([getProfitLoss(), getBalanceSheet()]);
        setNetProfit(pnl.netOperatingProfit);
        setTotalAssets(bs.totalAssets);
        setTotalLiabilities(bs.totalLiabilities);
        setTotalEquity(bs.totalEquity);
      } catch {
        // Handled
      }
    }
    loadKpis();
  }, [getProfitLoss, getBalanceSheet]);

  const bankAccount = accounts.find((a) => a.code === '1010');
  const arAccount = accounts.find((a) => a.code === '1020');
  const apAccount = accounts.find((a) => a.code === '2010');

  const quickNav = [
    {
      title: 'Finance Desk (Journal Entry)',
      description: 'Universal debit/credit form for expenses, assets, and manual vouchers.',
      path: '/finance/desk',
      icon: Zap,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      title: 'Chart of Accounts',
      description: 'Hierarchical general ledger account tree and custom sub-accounts.',
      path: '/finance/accounts',
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: 'Cash Verification Desk',
      description: 'Approve sales rep & POS cash/cheque collections into bank float.',
      path: '/finance/payment-approvals',
      icon: Clock,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: 'Supplier Management',
      description: 'Vendor directory, tax registrations, and accounts payable terms.',
      path: '/finance/suppliers',
      icon: Building2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: 'Profit & Loss (P&L)',
      description: 'Revenue, landed COGS, overheads, and net operating margin statement.',
      path: '/finance/reports/pnl',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: 'Balance Sheet',
      description: 'Real-time statement proving Assets = Liabilities + Equity.',
      path: '/finance/reports/balance-sheet',
      icon: Scale,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      title: 'Trial Balance',
      description: 'Account-level debit & credit totals verifying zero net variance.',
      path: '/finance/reports/trial-balance',
      icon: FileSpreadsheet,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    {
      title: 'General Ledger Explorer',
      description: 'Detailed chronological transaction statements per account.',
      path: '/finance/reports/general-ledger',
      icon: BookOpen,
      color: 'bg-slate-50 text-slate-700 border-slate-200',
    },
    {
      title: 'VAT Summary (18%)',
      description: 'Statutory 18% VAT collected on supplies for IRD tax filing.',
      path: '/finance/reports/vat',
      icon: Receipt,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: 'Commissions Sub-Ledger',
      description: 'Sales representative accrued commissions under GL Code 2030.',
      path: '/finance/commissions',
      icon: Users,
      color: 'bg-violet-50 text-violet-700 border-violet-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Finance & Accounting Command Hub</h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
              Phase 9 Master Ledger
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time double-entry general ledger, sub-ledger reconciliation, automated cash verification, and financial reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/finance/desk">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Zap className="h-4 w-4" />
              <span>Open Finance Desk</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bank Float (1010)</span>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(bankAccount?.currentBalance || 0)}
          </div>
          <span className="text-[11px] text-slate-400">Available Operating Liquidity</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accounts Receivable (1020)</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(arAccount?.currentBalance || 0)}
          </div>
          <span className="text-[11px] text-indigo-600 font-medium">Customer Outstandings</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accounts Payable (2010)</span>
            <Receipt className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(apAccount?.currentBalance || 0)}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Vendor Liabilities</span>
        </Card>

        <Card className="p-4 border-slate-200 bg-emerald-50/40 border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Net Operating Profit</span>
            <PieChart className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900 font-mono">
            {formatCurrency(netProfit)}
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Period Bottom Line</span>
        </Card>
      </div>

      {/* Module Navigation Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Finance & Accounting Workspaces</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className="group block">
                <Card className="h-full p-4 border-slate-200 transition-all hover:border-indigo-300 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${item.color} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Posted General Ledger Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Recent Ledger Activity</h2>
          <Link to="/finance/reports/general-ledger" className="text-xs font-semibold text-indigo-600 hover:underline">
            View All Account Statements →
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {journals.slice(0, 5).map((je) => (
                  <tr key={je.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">{je.entryNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(je.date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{je.description}</div>
                      {je.reference && <div className="text-[11px] text-slate-400 font-mono">Ref: {je.reference}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {je.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(je.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(je.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        <span>Posted</span>
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
