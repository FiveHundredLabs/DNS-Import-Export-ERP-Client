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
  CheckCircle2,
  CreditCard,
  Landmark,
  FileText,
  Boxes,
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

  const dailyOperationalWorkflows = [
    {
      title: 'Review Pending Receipts',
      description: 'Verify customer payments, POS collections, and remittance float.',
      path: '/finance/ar/approvals',
      icon: CheckCircle2,
      badge: 'AR Daily',
      actionText: 'Review Receipts',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: 'Cost Pending GRNs',
      description: 'Convert verified Goods Received Notes into supplier liability bills.',
      path: '/finance/ap/bills/new',
      icon: Boxes,
      badge: 'AP Daily',
      actionText: 'Cost GRNs',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: 'Pay Suppliers',
      description: 'Batch process supplier disbursements, settlements, and debit notes.',
      path: '/finance/ap/payments/new',
      icon: CreditCard,
      badge: 'Disbursements',
      actionText: 'Pay Suppliers',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      title: 'Post Manual Journal',
      description: 'Create multi-line balanced vouchers with maker-checker approvals.',
      path: '/finance/journal/new',
      icon: FileText,
      badge: 'GL Engine',
      actionText: 'New Journal',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      title: 'Reconcile Bank',
      description: 'Match bank feed statements against 1010 Bank Operating Float.',
      path: '/finance/reconciliation',
      icon: Landmark,
      badge: 'Liquidity',
      actionText: 'Reconcile Bank',
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
  ];

  const quickNav = [
    {
      title: 'Manual Journal Engine',
      description: 'Universal debit/credit form with presets, auto-balancing, and maker-checker approval.',
      path: '/finance/journal/new',
      icon: Zap,
      color: 'bg-primary-light text-primary-text border-primary-border',
    },
    {
      title: 'Chart of Accounts',
      description: 'Hierarchical general ledger account tree and custom sub-accounts.',
      path: '/finance/accounts',
      icon: BookOpen,
      color: 'bg-primary-light text-blue-700 border-primary-border',
    },
    {
      title: 'Receipt Approval Queue (AR)',
      description: 'Approve sales rep & POS cash/cheque collections into bank float.',
      path: '/finance/ar/approvals',
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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Finance & Accounting Command Hub</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Phase 1 Executive Master
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time double-entry general ledger, sub-ledger reconciliation, automated cash verification, and financial reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/finance/journal/new">
            <Button className="gap-2 bg-primary hover:bg-primary-hover font-medium">
              <Zap className="h-4 w-4" />
              <span>Post Manual Journal</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bank Float (1010)</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(bankAccount?.currentBalance || 0)}
          </div>
          <span className="text-xs text-slate-400">Available Operating Liquidity</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accounts Receivable (1020)</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(arAccount?.currentBalance || 0)}
          </div>
          <span className="text-xs text-primary font-medium">Customer Outstandings</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accounts Payable (2010)</span>
            <Receipt className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(apAccount?.currentBalance || 0)}
          </div>
          <span className="text-xs text-amber-600 font-medium">Vendor Liabilities</span>
        </Card>

        <Card className="p-4 border-slate-200 bg-emerald-50/40 border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Net Operating Profit</span>
            <PieChart className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-900 tabular-nums">
            {formatCurrency(netProfit)}
          </div>
          <span className="text-xs text-emerald-700 font-medium">Period Bottom Line</span>
        </Card>
      </div>

      {/* Daily Operational Workflows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Daily Operational Workflows</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct one-click access to the 5 core daily financial tasks and transaction posting engines.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="daily-operational-workflows">
          {dailyOperationalWorkflows.map((workflow) => {
            const Icon = workflow.icon;
            return (
              <Card
                key={workflow.path}
                className="p-4 border-slate-200 hover:border-primary-border hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg border ${workflow.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {workflow.badge}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                    {workflow.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {workflow.description}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100">
                  <Link to={workflow.path} className="w-full block">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-medium justify-between group hover:bg-slate-50"
                    >
                      <span>{workflow.actionText}</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Finance & Accounting Workspaces</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className="group block">
                <Card className="h-full p-4 border-slate-200 transition-all hover:border-primary-border hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border ${item.color} shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Recent Ledger Activity</h2>
          <div className="flex items-center gap-3">
            <Link to="/finance/reports/monthly-audit" className="text-xs font-semibold text-primary hover:underline">
              Monthly Audit View (Auto vs Manual) →
            </Link>
            <span className="text-slate-300">|</span>
            <Link to="/finance/reports/general-ledger" className="text-xs font-semibold text-slate-600 hover:text-primary hover:underline">
              Account Statements →
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                    <td className="px-4 py-3 tabular-nums font-semibold text-primary-text">{je.entryNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(je.date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{je.description}</div>
                      {je.reference && <div className="text-xs text-slate-400 font-mono">Ref: {je.reference}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {je.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatCurrency(je.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatCurrency(je.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
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
