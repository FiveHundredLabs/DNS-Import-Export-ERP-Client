import { useAuth } from '../../hooks/useAuth';
import { DirectorDashboard } from './DirectorDashboard';
import { SalesRepDashboard } from './SalesRepDashboard';
import { StatCard } from '../../components/common/StatCard';
import { Package, Users, DollarSign, Boxes, Store, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function DashboardPage() {
  const { currentUser, role } = useAuth();

  if (role === 'DIRECTOR') {
    return <DirectorDashboard />;
  }

  if (role === 'SALES_REP') {
    return <SalesRepDashboard />;
  }

  // Generalized role-specific dashboard for Manager, Sales Manager, Finance, Area, Stock Keeper, Cashier
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {role.replace('_', ' ')} Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Logged in as <span className="font-semibold text-slate-700">{currentUser.name}</span> • Role-specific operations & metrics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'SALES_MANAGER' && (
          <>
            <StatCard title="Team Sales" value={formatCurrency(18900000)} icon={DollarSign} variant="success" />
            <StatCard title="Pending Approvals" value="3 Requests" icon={CheckCircle2} variant="warning" />
            <StatCard title="Dealers in Area" value="48 Dealers" icon={Users} variant="default" />
            <StatCard title="Warranty Claims" value="4 Active" icon={ShieldCheck} variant="default" />
          </>
        )}
        {role === 'FINANCE_MANAGER' && (
          <>
            <StatCard title="Collections Today" value={formatCurrency(3450000)} icon={DollarSign} variant="success" />
            <StatCard title="Total Receivables" value={formatCurrency(12450000)} icon={DollarSign} variant="warning" />
            <StatCard title="Petty Cash Balance" value={formatCurrency(145000)} icon={DollarSign} variant="default" />
            <StatCard title="Payments to Verify" value="5 Receipts" icon={CheckCircle2} variant="warning" />
          </>
        )}
        {role === 'STOCK_KEEPER' && (
          <>
            <StatCard title="Stock Items" value="5 SKU Lines" icon={Package} variant="default" />
            <StatCard title="Pending GRNs" value="2 Shipments" icon={Boxes} variant="warning" />
            <StatCard title="Orders to Pick" value="4 Orders" icon={Boxes} variant="default" />
            <StatCard title="Damaged Stock Items" value="11 Units" icon={Boxes} variant="danger" />
          </>
        )}
        {role === 'CASHIER' && (
          <>
            <StatCard title="Showroom Register" value="ACTIVE" icon={Store} variant="success" />
            <StatCard title="Shift Cash In Hand" value={formatCurrency(84500)} icon={DollarSign} variant="default" />
            <StatCard title="Transactions Today" value="18 Invoices" icon={Store} variant="default" />
            <StatCard title="Cash Variance" value="LKR 0.00" icon={CheckCircle2} variant="success" />
          </>
        )}
        {role === 'AREA_MANAGER' && (
          <>
            <StatCard title="Area Sales Target" value="94.2%" icon={DollarSign} variant="success" />
            <StatCard title="Active Sales Reps" value="6 Officers" icon={Users} variant="default" />
            <StatCard title="Customer Registrations" value="3 Pending" icon={Users} variant="warning" />
            <StatCard title="Route Collections" value={formatCurrency(8400000)} icon={DollarSign} variant="default" />
          </>
        )}
        {role === 'MANAGER' && (
          <>
            <StatCard title="Total Organization Sales" value={formatCurrency(48500000)} icon={DollarSign} variant="success" />
            <StatCard title="Pending GRN Approvals" value="2 Shipments" icon={Boxes} variant="warning" />
            <StatCard title="Operational Exceptions" value="1 Case" icon={ShieldCheck} variant="warning" />
            <StatCard title="Total Product Lines" value="5 Master SKUs" icon={Package} variant="default" />
          </>
        )}
      </div>
    </div>
  );
}
