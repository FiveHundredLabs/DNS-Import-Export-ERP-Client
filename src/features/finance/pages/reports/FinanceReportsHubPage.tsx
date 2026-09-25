import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Scale,
  FileSpreadsheet,
  BookOpen,
  Receipt,
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  FileText,
  BarChart3,
} from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';

interface ReportCardItem {
  id: string;
  title: string;
  category: string;
  description: string;
  path: string;
  icon: any;
  badge: string;
  badgeColor: string;
  features: string[];
}

const REPORT_CARDS: ReportCardItem[] = [
  {
    id: 'pnl',
    title: 'Profit & Loss Statement (P&L)',
    category: 'Financial Performance',
    description: 'Calculates Gross Revenue, landed COGS, overhead expenses, and bottom-line Net Operating Profit.',
    path: '/finance/reports/pnl',
    icon: TrendingUp,
    badge: 'Income Statement',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    features: ['Gross & Net Margins (%)', 'COGS Landed Cost', 'Operational Overheads'],
  },
  {
    id: 'balance-sheet',
    title: 'Balance Sheet Statement',
    category: 'Financial Position',
    description: 'Real-time statement proving the fundamental accounting equation: Assets = Liabilities + Equity.',
    path: '/finance/reports/balance-sheet',
    icon: Scale,
    badge: 'Real-Time Reconciled',
    badgeColor: 'bg-primary-light text-primary-text border-primary-border',
    features: ['Current & Non-Current Assets', 'Payables & Debt Liabilities', "Owner's Equity & Reserves"],
  },
  {
    id: 'trial-balance',
    title: 'Trial Balance Statement',
    category: 'Ledger Verification',
    description: 'Summary of all general ledger account balances with total Debits and Credits testing zero net variance.',
    path: '/finance/reports/trial-balance',
    icon: FileSpreadsheet,
    badge: 'Zero Variance Check',
    badgeColor: 'bg-primary-light text-blue-700 border-primary-border',
    features: ['All GL Account Codes', 'Total Debits = Total Credits', 'Audit Proof'],
  },
  {
    id: 'general-ledger',
    title: 'General Ledger Explorer',
    category: 'Account Statements',
    description: 'Chronological transaction explorer per account with opening balances, journal entries, and running totals.',
    path: '/finance/reports/general-ledger',
    icon: BookOpen,
    badge: 'Transaction Audit Trail',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    features: ['Account Specific Filter', 'Opening & Closing Balances', 'Direct Reference Links'],
  },
  {
    id: 'vat',
    title: 'VAT Summary & IRD Tax Filing',
    category: 'Statutory Taxation',
    description: 'Summarizes standard-rated 18% VAT collected on supplies, taxable supplies base, and net liability to IRD.',
    path: '/finance/reports/vat',
    icon: Receipt,
    badge: '18% Standard Rate',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    features: ['Taxable Sales Base', '18% Output VAT', 'Inland Revenue Dept Filing'],
  },
  {
    id: 'commissions',
    title: 'Commissions Sub-Ledger',
    category: 'Sales Compensation',
    description: 'Tracks earned sales representative commissions and accrued liabilities under General Ledger code 2030.',
    path: '/finance/commissions',
    icon: Users,
    badge: 'GL Code 2030',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    features: ['Per-Rep Breakdown', 'Invoiced Sales Base', 'Accrued vs Paid Balances'],
  },
];

export function FinanceReportsHubPage() {
  const [search, setSearch] = useState('');

  const filteredReports = REPORT_CARDS.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Reports & Statements</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Live Audit Suite
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a financial report below to inspect real-time double-entry calculations, export statements, or print audited reports.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by title, category, or tax code..."
            className="pl-9 text-xs"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filteredReports.length}</span> Financial Statements
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.id} to={report.path} className="group block">
              <Card className="h-full p-5 border-slate-200 transition-all hover:border-primary hover:shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-primary-light text-primary border border-primary-border/40 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-semibold ${report.badgeColor}`}>
                      {report.badge}
                    </Badge>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {report.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-primary transition-colors mt-0.5">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                    {report.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary-light" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-primary group-hover:text-primary-text">
                  <span>Open Statement</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
