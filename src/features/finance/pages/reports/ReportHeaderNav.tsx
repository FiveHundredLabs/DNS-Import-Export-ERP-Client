import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Scale, FileSpreadsheet, BookOpen, Receipt, Users, LayoutGrid } from 'lucide-react';
import { cn } from '../../../../utils/cn';

interface ReportTab {
  name: string;
  path: string;
  icon: any;
}

const REPORT_TABS: ReportTab[] = [
  { name: 'P&L Statement', path: '/finance/reports/pnl', icon: TrendingUp },
  { name: 'Balance Sheet', path: '/finance/reports/balance-sheet', icon: Scale },
  { name: 'Trial Balance', path: '/finance/reports/trial-balance', icon: FileSpreadsheet },
  { name: 'General Ledger', path: '/finance/reports/general-ledger', icon: BookOpen },
  { name: '18% VAT Summary', path: '/finance/reports/vat', icon: Receipt },
  { name: 'Commissions', path: '/finance/commissions', icon: Users },
];

export function ReportHeaderNav() {
  const location = useLocation();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 print:hidden">
      <Link
        to="/finance/reports"
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Reports Hub</span>
      </Link>

      {/* Quick Switch Tabs */}
      <div className="flex flex-wrap items-center gap-1 overflow-x-auto w-full sm:w-auto">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
