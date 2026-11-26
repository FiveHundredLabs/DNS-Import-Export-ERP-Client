import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Scale, FileSpreadsheet, BookOpen, Receipt, Users, LayoutGrid, Layers } from 'lucide-react';
import { cn } from '../../../../utils/cn';

interface ReportTab {
  name: string;
  path: string;
  icon: any;
}

const REPORT_TABS: ReportTab[] = [
  { name: 'Monthly Audit', path: '/finance/reports/monthly-audit', icon: Layers },
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border/60 print:hidden">
      <Link
        to="/finance/reports"
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors bg-card px-3 py-1.5 rounded-lg border border-border shadow-2xs h-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Reports Hub</span>
      </Link>

      {/* Quick Switch Tabs */}
      <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border/80 overflow-x-auto max-w-full">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                isActive
                  ? 'bg-background text-foreground shadow-xs border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
