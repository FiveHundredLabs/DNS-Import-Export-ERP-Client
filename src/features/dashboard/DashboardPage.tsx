import { useAuth } from '../../hooks/useAuth';
import { DirectorDashboard } from './DirectorDashboard';
import { SalesRepDashboard } from './SalesRepDashboard';
import { AreaManagerDashboard } from './AreaManagerDashboard';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Package, Users, DollarSign, Boxes, Store, ShieldCheck, CheckCircle2, Info, ArrowUpRight, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function DashboardPage() {
  const { currentUser, role } = useAuth();

  if (role === 'DIRECTOR' || role === 'MANAGER') {
    return <DirectorDashboard />;
  }

  if (role === 'SALES_REP') {
    return <SalesRepDashboard />;
  }

  if (role === 'AREA_MANAGER') {
    return <AreaManagerDashboard />;
  }

  // Generalized role-specific dashboard for Sales Manager, Finance, Stock Keeper, Cashier
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {role.replace('_', ' ')} Performance Snap
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authenticated as <span className="font-semibold text-slate-700">{currentUser.name}</span> • Role workspace & operational analytics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'SALES_MANAGER' && (
          <>
            <StatCard title="Team Sales" value={formatCurrency(18900000)} period="This month" trend={{ value: '18.4%', isPositive: true }} variant="success" />
            <StatCard title="Pending Approvals" value="3 Requests" period="Requires action" trend={{ value: '2 urgent', isPositive: false }} variant="warning" />
            <StatCard title="Dealers in Area" value="48 Dealers" period="Active portfolio" trend={{ value: '4 new', isPositive: true }} variant="default" />
            <StatCard title="Warranty Claims" value="4 Active" period="Resolution time 2d" variant="default" />
          </>
        )}
        {role === 'FINANCE_MANAGER' && (
          <>
            <StatCard title="Collections Today" value={formatCurrency(3450000)} period="Verified" trend={{ value: '12.8%', isPositive: true }} variant="success" />
            <StatCard title="Total Receivables" value={formatCurrency(12450000)} period="Dealer credit" variant="warning" />
            <StatCard title="Petty Cash Balance" value={formatCurrency(145000)} period="Imprest balance" variant="default" />
            <StatCard title="Payments to Verify" value="5 Receipts" period="Pending queue" variant="warning" />
          </>
        )}
        {role === 'STOCK_KEEPER' && (
          <>
            <StatCard title="Stock Items" value="5 SKU Lines" period="Active catalogue" variant="default" />
            <StatCard title="Pending GRNs" value="2 Shipments" period="Intake queue" trend={{ value: '1 urgent', isPositive: false }} variant="warning" />
            <StatCard title="Orders to Pick" value="4 Orders" period="Warehouse dispatch" variant="default" />
            <StatCard title="Damaged Stock Items" value="11 Units" period="Quarantine bay" variant="danger" />
          </>
        )}
        {role === 'CASHIER' && (
          <>
            <StatCard title="Showroom Register" value="ACTIVE" period="Session opened" variant="success" />
            <StatCard title="Shift Cash In Hand" value={formatCurrency(84500)} period="Opening 10,000" variant="default" />
            <StatCard title="Transactions Today" value="18 Invoices" period="Average 4.7k" trend={{ value: '24%', isPositive: true }} variant="default" />
            <StatCard title="Cash Variance" value="LKR 0.00" period="Reconciled" variant="success" />
          </>
        )}
        {role === 'AREA_MANAGER' && (
          <>
            <StatCard title="Area Target" value="94.2%" period="Western Province" trend={{ value: '4.2%', isPositive: true }} variant="success" />
            <StatCard title="Active Sales Reps" value="6 Officers" period="Field deployments" variant="default" />
            <StatCard title="Customer Registrations" value="3 Pending" period="Commercial review" variant="warning" />
            <StatCard title="Route Collections" value={formatCurrency(8400000)} period="PDC + Cash" variant="default" />
          </>
        )}
      </div>

      {/* Role Analytics & Operations Card */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
            <span>Role Workflow Summary</span>
            <span className="text-[11.5px] font-medium text-primary-text bg-primary-light px-2.5 py-0.5 rounded-full border border-primary-border">
              Active Authorization Level
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-xl border border-slate-200/80 p-4 bg-slate-50/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Permissions Scope</span>
              <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                Operating under strict RBAC governance with full audit tracking on every mutation.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 p-4 bg-slate-50/50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security State</span>
              <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> 256-bit Encrypted Session Active
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 p-4 bg-slate-50/50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quick Navigation</span>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Use the left navigation sidebar to access authorized modules for this role.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
