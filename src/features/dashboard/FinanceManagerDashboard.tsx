import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFinanceLedger } from '../finance/hooks/useFinanceLedger';
import { apService, VendorBill } from '../finance/services/apService';
import { arService, ARReceiptItem } from '../finance/services/arService';
import { periodLockService } from '../finance/services/periodLockService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Scale,
  Zap,
  BookOpen,
  FileText,
  CreditCard,
  CheckCircle2,
  SlidersHorizontal,
  Landmark,
  Building2,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  PieChart,
  PlusCircle,
  FileSpreadsheet,
  AlertCircle,
  TrendingDown,
  Boxes,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

export function FinanceManagerDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { accounts, journals, getProfitLoss, getBalanceSheet } = useFinanceLedger();

  // Financial KPI Metrics
  const [netProfit, setNetProfit] = useState<number>(0);
  const [grossMargin, setGrossMargin] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [totalLiabilities, setTotalLiabilities] = useState<number>(0);
  const [totalEquity, setTotalEquity] = useState<number>(0);

  // Operational Queues
  const [pendingReceipts, setPendingReceipts] = useState<ARReceiptItem[]>([]);
  const [openBills, setOpenBills] = useState<VendorBill[]>([]);
  const [costableGrnsCount, setCostableGrnsCount] = useState<number>(0);

  // Period Lock State
  const periodLock = periodLockService.getConfig();

  useEffect(() => {
    async function loadData() {
      try {
        const [pnl, bs] = await Promise.all([getProfitLoss(), getBalanceSheet()]);
        setNetProfit(pnl?.netOperatingProfit ?? 0);
        const margin = pnl && pnl.totalRevenue > 0 ? (pnl.grossProfit / pnl.totalRevenue) * 100 : 0;
        setGrossMargin(margin);
        setTotalRevenue(pnl?.totalRevenue ?? 0);
        setTotalAssets(bs?.totalAssets ?? 0);
        setTotalLiabilities(bs?.totalLiabilities ?? 0);
        setTotalEquity(bs?.totalEquity ?? 0);

        const receipts = arService.getPendingReceipts();
        setPendingReceipts(receipts);

        const bills = apService.getOpenBills();
        setOpenBills(bills);

        const costable = apService.getApprovedCostableGrns();
        setCostableGrnsCount(costable.length);
      } catch (err) {
        console.error('Failed to load Finance Manager dashboard data', err);
      }
    }
    loadData();
  }, [getProfitLoss, getBalanceSheet]);

  const bankAccount = accounts.find((a) => a.code === '1010');
  const pettyCashAccount = accounts.find((a) => a.code === '1015');
  const arAccount = accounts.find((a) => a.code === '1020');
  const apAccount = accounts.find((a) => a.code === '2010');
  const vatPayable = accounts.find((a) => a.code === '2020');

  const pendingReceiptsTotal = pendingReceipts.reduce((sum, r) => sum + r.amount, 0);
  const openBillsTotal = openBills.reduce((sum, b) => sum + b.balanceDue, 0);

  // Cash Flow & Collections Trend Data (last 6 months in thousands)
  const CASH_FLOW_TREND = [
    { month: 'May', inflows: 3200, outflows: 2400 },
    { month: 'Jun', inflows: 3800, outflows: 2900 },
    { month: 'Jul', inflows: 4100, outflows: 3100 },
    { month: 'Aug', inflows: 4600, outflows: 3400 },
    { month: 'Sep', inflows: 5200, outflows: 3900 },
    { month: 'Oct', inflows: 5800, outflows: 4200 },
  ];

  // Capital Distribution Mix
  const CAPITAL_DISTRIBUTION = [
    { name: 'Bank & Cash Float', value: Math.max(0, (bankAccount?.currentBalance || 0) + (pettyCashAccount?.currentBalance || 0)), color: '#10B981' },
    { name: 'Trade Receivables (AR)', value: Math.max(0, arAccount?.currentBalance || 0), color: '#3B82F6' },
    { name: 'Trade Liabilities (AP)', value: Math.max(0, apAccount?.currentBalance || 0), color: '#F59E0B' },
    { name: 'Statutory VAT Due', value: Math.max(0, vatPayable?.currentBalance || 0), color: '#8B5CF6' },
  ];

  // Day-to-Day Operations & Quick Actions Hub
  const operationalActions = [
    {
      title: 'Universal Journal (Finance Desk)',
      desc: 'Debit/credit posting for general expenses, asset capex & adjustments',
      path: '/finance/desk',
      badge: 'Daily Core',
      icon: Zap,
      color: 'bg-primary-light text-primary-text border-primary-border',
    },
    {
      title: 'Manual Journal Voucher',
      desc: 'Create journal vouchers with pre-configured monthly templates',
      path: '/finance/journal/new',
      badge: 'Vouchers',
      icon: FileText,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: 'Vendor Bill Costing (AP)',
      desc: `${costableGrnsCount} warehouse GRNs awaiting costing & 18% VAT input`,
      path: '/finance/ap/bills/new',
      badge: costableGrnsCount > 0 ? `${costableGrnsCount} Pending` : 'Up to date',
      badgeVariant: costableGrnsCount > 0 ? 'warning' : 'outline',
      icon: Receipt,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: 'Batch Supplier Payments',
      desc: 'Select multiple supplier bills and post batch cheque/bank payouts',
      path: '/finance/ap/payments/new',
      badge: `${openBills.length} Open Bills`,
      badgeVariant: 'outline',
      icon: CreditCard,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      title: 'Receipt Approval Queue (AR)',
      desc: 'Verify sales rep deposit slips and clear customer payments into GL',
      path: '/finance/ar/approvals',
      badge: pendingReceipts.length > 0 ? `${pendingReceipts.length} to Approve` : 'Clear',
      badgeVariant: pendingReceipts.length > 0 ? 'destructive' : 'success',
      icon: CheckCircle2,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      title: 'AR Collection Allocation',
      desc: 'Distribute customer lump-sums across invoices via Auto-FIFO or Manual',
      path: '/finance/ar/allocate',
      badge: 'FIFO / Split',
      icon: SlidersHorizontal,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      title: 'Bank Reconciliation Workspace',
      desc: 'Match uncleared checks & deposits against monthly bank statements',
      path: '/finance/reconciliation',
      badge: 'Monthly Audit',
      icon: Landmark,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
    {
      title: 'Period Closing Lock',
      desc: periodLock.enabled ? `Locked as of ${formatDate(periodLock.lockDate || '')}` : 'Open Period (Lock Disabled)',
      path: '/finance/settings/closing',
      badge: periodLock.enabled ? 'Locked' : 'Open',
      badgeVariant: periodLock.enabled ? 'outline' : 'warning',
      icon: periodLock.enabled ? Lock : Unlock,
      color: periodLock.enabled ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      title: 'Chart of Accounts (COA)',
      desc: 'Hierarchical general ledger classifications and opening balance wizard',
      path: '/finance/accounts',
      badge: `${accounts.length} Accounts`,
      icon: BookOpen,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Authentication Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Finance Controller Workspace
            </span>
            {periodLock.enabled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Lock className="h-3 w-3" /> Period Locked: {formatDate(periodLock.lockDate || '')}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Finance Command Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-700">{currentUser.name}</span> • Commercial Banking, Double-Entry GL & Receivables/Payables Clearing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link to="/finance/journal/new">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
              <PlusCircle className="h-3.5 w-3.5 text-primary" /> New Journal Voucher
            </Button>
          </Link>
          <Link to="/finance/ar/approvals">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold shadow-2xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Verify Receipts ({pendingReceipts.length})
            </Button>
          </Link>
          <Link to="/finance/desk">
            <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-xs">
              <Zap className="h-3.5 w-3.5" /> Finance Desk
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Financial Position Key Metrics (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bank Operating Liquidity"
          value={formatCurrency(bankAccount?.currentBalance || 0)}
          subtitle={`Petty Cash: ${formatCurrency(pettyCashAccount?.currentBalance || 0)}`}
          icon={DollarSign}
          trend={{ value: '1010 Bank Account', isPositive: true }}
          variant="success"
        />
        <StatCard
          title="Accounts Receivable (1020)"
          value={formatCurrency(arAccount?.currentBalance || 0)}
          subtitle={`${pendingReceipts.length} Unapproved Deposits: ${formatCurrency(pendingReceiptsTotal)}`}
          icon={TrendingUp}
          variant="warning"
        />
        <StatCard
          title="Accounts Payable (2010)"
          value={formatCurrency(apAccount?.currentBalance || 0)}
          subtitle={`${openBills.length} Open Supplier Bills: ${formatCurrency(openBillsTotal)}`}
          icon={Receipt}
          variant="danger"
        />
        <StatCard
          title="Net Operating Profit"
          value={formatCurrency(netProfit || 0)}
          subtitle={`Gross Margin: ${(grossMargin || 0).toFixed(1)}% | Revenue: ${formatCurrency(totalRevenue || 0)}`}
          icon={PieChart}
          trend={{ value: 'Balanced Ledger', isPositive: true }}
          variant="success"
        />
      </div>

      {/* Critical Operational Attention Banners */}
      {(pendingReceipts.length > 0 || costableGrnsCount > 0 || !periodLock.enabled) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pendingReceipts.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">
                    {pendingReceipts.length} Payment Collections Awaiting Clearance
                  </h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Totaling {formatCurrency(pendingReceiptsTotal)}. Balances remain locked until bank deposit verified.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/finance/ar/approvals')}
                className="h-7 text-[11px] bg-rose-600 hover:bg-rose-700 text-white shrink-0 font-medium"
              >
                Clear Now
              </Button>
            </div>
          )}

          {costableGrnsCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <Boxes className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    {costableGrnsCount} Approved GRNs Ready for Vendor Bill Costing
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Physical stock is in warehouse. Finalize landing costs and 18% VAT to post to AP.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/finance/ap/bills/new')}
                className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white shrink-0 font-medium"
              >
                Cost Bills
              </Button>
            </div>
          )}

          {!periodLock.enabled && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex items-start justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <Unlock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900">Period Closing Lock Is Inactive</h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Enable lock date to prevent retrospective voucher modifications and maintain audit compliance.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => navigate('/finance/settings/closing')}
                className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white shrink-0 font-medium"
              >
                Set Lock
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main Operational Hub: Day-to-Day Modules & Workflows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily Financial Operations & Workspaces</h2>
            <p className="text-xs text-slate-500">
              One-click access to all specialized sub-ledgers, batch allocation tools, and voucher creation screens
            </p>
          </div>
          <Link to="/finance/reports" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Open Financial Reports Hub →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationalActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path} className="group block focus:outline-none">
                <Card className="h-full p-4 border-slate-200/90 hover:border-primary-border hover:shadow-md transition-all bg-white flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`p-2 rounded-lg border ${action.color} shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge
                        variant={(action.badgeVariant as any) || 'outline'}
                        className="text-[11px] font-semibold py-0.5"
                      >
                        {action.badge}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-1">
                        {action.title}
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{action.desc}</p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Direct Action Launch</span>
                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      Open <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Visual Analytics & Ledger Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Inflow vs Outflow Trends Chart */}
        <Card className="lg:col-span-2 p-5 border-slate-200/90 shadow-sm bg-white">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Operating Cash Flow & Liquidity Trends
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly verified customer cash collections vs vendor & operational disbursements (LKR in Thousands)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Inflows
              </span>
              <span className="flex items-center gap-1 text-rose-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Outflows
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CASH_FLOW_TREND} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInflows" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorOutflows" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`LKR ${Number(val).toLocaleString()}k`, '']}
                  />
                  <Area type="monotone" dataKey="inflows" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInflows)" />
                  <Area type="monotone" dataKey="outflows" stroke="#EF4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOutflows)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Working Capital Breakdown */}
        <Card className="p-5 border-slate-200/90 shadow-sm bg-white flex flex-col justify-between">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900">Working Capital Distribution</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Real-time asset & liability composition in GL</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={CAPITAL_DISTRIBUTION}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {CAPITAL_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
              {CAPITAL_DISTRIBUTION.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 font-mono">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Posted General Ledger Vouchers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent General Ledger Activity</h2>
            <p className="text-xs text-slate-500">Live journal vouchers posted across operational sub-ledgers</p>
          </div>
          <Link to="/finance/reports/general-ledger" className="text-xs font-semibold text-primary hover:underline">
            View All Ledger Statements →
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Source Module</th>
                  <th className="px-4 py-3 text-right">Debit Total</th>
                  <th className="px-4 py-3 text-right">Credit Total</th>
                  <th className="px-4 py-3 text-center">Audit Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {journals.slice(0, 5).map((je) => (
                  <tr key={je.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {je.entryNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(je.date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{je.description}</div>
                      {je.reference && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">Ref: {je.reference}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-600">
                        {je.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono font-semibold text-slate-900">
                      {formatCurrency(je.totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono font-semibold text-slate-900">
                      {formatCurrency(je.totalCredit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold py-0.5">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        <span>POSTED</span>
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/finance/journal/new?id=${je.id}`}
                        className="text-primary hover:underline font-semibold text-xs inline-flex items-center gap-1"
                      >
                        Inspect Voucher <ArrowRight className="h-3 w-3" />
                      </Link>
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
