import {
  BookOpen,
  CheckCircle2,
  Building2,
  BarChart3,
  TrendingUp,
  Scale,
  FileSpreadsheet,
  Receipt,
  Users,
  Zap,
} from 'lucide-react';
import { InnerSidebarLayout } from '../../components/layout/InnerSidebarLayout';
import { InnerNavItem } from '../../components/common/InnerSidebar';

const FINANCE_NAV_ITEMS: InnerNavItem[] = [
  {
    name: 'Journal Entry (Finance Desk)',
    path: '/finance/desk',
    icon: Zap,
    exact: false,
  },
  {
    name: 'Chart of Accounts',
    path: '/finance/accounts',
    icon: BookOpen,
  },
  {
    name: 'Cash Verification',
    path: '/finance/payment-approvals',
    icon: CheckCircle2,
  },
  {
    name: 'Supplier Management',
    path: '/finance/suppliers',
    icon: Building2,
  },
  {
    name: 'Financial Reports',
    path: '/finance/reports',
    icon: BarChart3,
    children: [
      {
        name: 'Reports Hub Overview',
        path: '/finance/reports',
        exact: true,
      },
      {
        name: 'Profit & Loss (P&L)',
        path: '/finance/reports/pnl',
        icon: TrendingUp,
      },
      {
        name: 'Balance Sheet',
        path: '/finance/reports/balance-sheet',
        icon: Scale,
      },
      {
        name: 'Trial Balance',
        path: '/finance/reports/trial-balance',
        icon: FileSpreadsheet,
      },
      {
        name: 'General Ledger Explorer',
        path: '/finance/reports/general-ledger',
        icon: BookOpen,
      },
      {
        name: 'VAT Summary (18%)',
        path: '/finance/reports/vat',
        icon: Receipt,
      },
      {
        name: 'Commissions Sub-Ledger',
        path: '/finance/commissions',
        icon: Users,
      },
    ],
  },
];

export function FinanceLayout() {
  return (
    <InnerSidebarLayout
      title="Finance & Accounting"
      backPath="/"
      backLabel="Back"
      items={FINANCE_NAV_ITEMS}
      footer={
        <div>
          <div className="font-semibold text-slate-700">Double-Entry Core</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Append-Only General Ledger</div>
        </div>
      }
    />
  );
}
