import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { DirectorDashboard } from './DirectorDashboard';
import { SalesRepDashboard } from './SalesRepDashboard';
import { AreaManagerDashboard } from './AreaManagerDashboard';
import { SalesManagerDashboard } from './SalesManagerDashboard';
import { FinanceManagerDashboard } from './FinanceManagerDashboard';
import { PurchasingDashboard } from '../purchasing/PurchasingDashboard';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  CheckCircle2,
  DollarSign,
  AlertCircle,
  CreditCard,
  FileCheck2,
  Package,
  Clock,
  ShoppingCart,
  Receipt,
  Target,
  Users,
  Store,
  Monitor,
  Boxes,
  Truck,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function DashboardPage() {
  const { currentUser, role } = useAuth();

  if (role === 'DIRECTOR' || role === 'MANAGER') {
    return <DirectorDashboard />;
  }

  if (role === 'SALES_MANAGER') {
    return <SalesManagerDashboard />;
  }

  if (role === 'FINANCE_MANAGER') {
    return <FinanceManagerDashboard />;
  }

  if (role === 'SALES_REP') {
    return <SalesRepDashboard />;
  }

  if (role === 'AREA_MANAGER') {
    return <AreaManagerDashboard />;
  }

  if (role === 'PURCHASING_OFFICER') {
    return <PurchasingDashboard />;
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
        {role === 'FINANCE_MANAGER' && (
          <>
            <StatCard title="Collections Today" value={formatCurrency(3450000)} trend={{ value: '12.8%', isPositive: true }} variant="success" icon={DollarSign} />
            <StatCard title="Total Receivables" value={formatCurrency(12450000)} variant="warning" icon={AlertCircle} />
            <StatCard title="Petty Cash Balance" value={formatCurrency(145000)} variant="blue" icon={CreditCard} />
            <StatCard title="Payments to Verify" value="5 Receipts" variant="warning" icon={FileCheck2} />
          </>
        )}
        {role === 'STOCK_KEEPER' && (
          <>
            <StatCard title="Stock Items" value="5 SKU Lines" variant="indigo" icon={Package} />
            <StatCard title="Pending GRNs" value="2 Shipments" trend={{ value: '1 urgent', isPositive: false }} variant="warning" icon={Clock} />
            <StatCard title="Orders to Pick" value="4 Orders" variant="blue" icon={ShoppingCart} />
            <StatCard title="Damaged Stock Items" value="11 Units" variant="danger" icon={AlertCircle} />
          </>
        )}
        {role === 'SHOWROOM_MANAGER' && (
          <>
            <StatCard title="Active Terminals" value="3 Online" variant="success" icon={Monitor} />
            <StatCard title="Drawer Float Total" value={formatCurrency(125000)} variant="blue" icon={DollarSign} />
            <StatCard title="Pending Shift Closings" value="1 Review" variant="warning" icon={Clock} />
            <StatCard title="Today's Showroom Sales" value={formatCurrency(485000)} trend={{ value: '18.4%', isPositive: true }} variant="indigo" icon={Store} />
          </>
        )}
        {role === 'CASHIER' && (
          <>
            <StatCard title="Showroom Register" value="ACTIVE" variant="success" icon={CheckCircle2} />
            <StatCard title="Shift Cash In Hand" value={formatCurrency(84500)} variant="blue" icon={DollarSign} />
            <StatCard title="Transactions Today" value="18 Sales" trend={{ value: '24%', isPositive: true }} variant="indigo" icon={Receipt} />
            <StatCard title="Cash Variance" value="LKR 0.00" variant="success" icon={CheckCircle2} />
          </>
        )}
        {role === 'AREA_MANAGER' && (
          <>
            <StatCard title="Area Target" value="94.2%" trend={{ value: '4.2%', isPositive: true }} variant="success" icon={Target} />
            <StatCard title="Active Sales Reps" value="6 Officers" variant="indigo" icon={Users} />
            <StatCard title="Customer Registrations" value="3 Pending" variant="warning" icon={Users} />
            <StatCard title="Route Collections" value={formatCurrency(8400000)} variant="blue" icon={CreditCard} />
          </>
        )}
      </div>

      {/* Role-Specific Operational Quick Actions */}
      {role === 'STOCK_KEEPER' && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Operational Workspaces
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              to="/pos"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-primary hover:shadow-xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary-light text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-slate-900">Showroom POS Terminal</h3>
                  <p className="text-[11px] text-slate-500">Retail counter checkout</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/inventory"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-primary hover:shadow-xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Boxes className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-slate-900">Inventory Hub</h3>
                  <p className="text-[11px] text-slate-500">Stock balance & batches</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>

            <Link
              to="/inventory/grn"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-primary hover:shadow-xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-slate-900">Goods Received Notes</h3>
                  <p className="text-[11px] text-slate-500">PO intake & barcodes</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </Link>

            <Link
              to="/inventory/delivery-notes"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-primary hover:shadow-xs transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-slate-900">Delivery Notes</h3>
                  <p className="text-[11px] text-slate-500">Dispatch & delivery orders</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </Link>
          </div>
        </div>
      )}

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
