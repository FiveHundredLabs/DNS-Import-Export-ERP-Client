import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  Target,
  DollarSign,
  AlertCircle,
  FileCheck2,
  PlusCircle,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export function SalesRepDashboard() {
  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Mobile-first Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary-light text-primary-text border border-primary-border mb-2">
            Field Representative Hub
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Good Day, Kasun</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Colombo Central Territory • 14 Assigned Dealers • Active Cycle
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/customers">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
              <Users className="h-3.5 w-3.5 text-primary" /> Customer Hub
            </Button>
          </Link>
          <Link to="/orders">
            <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-xs">
              <PlusCircle className="h-3.5 w-3.5" /> New Order
            </Button>
          </Link>
        </div>
      </div>


      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Monthly Sales"
          value={formatCurrency(4250000)}
          subtitle="Target: LKR 5,000,000"
          icon={DollarSign}
          trend={{ value: '85.0%', isPositive: true }}
          variant="success"
        />
        <StatCard
          title="Earned Incentive"
          value={formatCurrency(127500)}
          subtitle="Tier 2 Commission (3.0%)"
          icon={Target}
          variant="default"
        />
        <StatCard
          title="Route Collections"
          value={formatCurrency(2650000)}
          subtitle="Pending Finance: LKR 450k"
          icon={FileCheck2}
          variant="default"
        />
        <StatCard
          title="Overdue Accounts"
          value="2 Dealers"
          subtitle="Total: LKR 450,000"
          icon={AlertCircle}
          variant="danger"
        />
      </div>

      {/* Warranty Note Follow-up Alert (Section 23) */}
      <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                Warranty Note Follow-Up Required
              </h3>
              <Badge variant="warning">22 Pending Notes</Badge>
            </div>
            <p className="mt-1 text-xs text-amber-800">
              Muthurajawela Engineering: 85 units sold, only 62 warranty registration slips received back from customer shop. Follow up during next dealer visit.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Payments & Route Receivables */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Pending Payments & Route Receivables
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Outstanding balances for your assigned territory accounts requiring field collection.
              </p>
            </div>
            <Link to="/payments">
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                All Payments <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  id: 'cust-001',
                  name: 'Lanka Electrical Superstore',
                  code: 'DLR-COL-001',
                  amount: 450000,
                  dueStatus: 'Overdue by 12 Days',
                  statusVariant: 'destructive' as const,
                  creditDays: 30,
                },
                {
                  id: 'cust-002',
                  name: 'Muthurajawela Engineering',
                  code: 'DLR-GAM-002',
                  amount: 280000,
                  dueStatus: 'Due in 3 Days',
                  statusVariant: 'warning' as const,
                  creditDays: 45,
                },
                {
                  id: 'cust-003',
                  name: 'Kelani Valley Lighting Mart',
                  code: 'DLR-KEL-003',
                  amount: 195000,
                  dueStatus: 'Within Terms',
                  statusVariant: 'outline' as const,
                  creditDays: 30,
                },
              ].map((pending) => (
                <div
                  key={pending.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/80 transition-colors gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <Link
                        to={`/customers/${pending.id}`}
                        className="text-xs font-bold text-slate-900 hover:text-primary hover:underline"
                      >
                        {pending.name}
                      </Link>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-slate-600">{pending.code}</span>
                        <span>•</span>
                        <span>Terms: {pending.creditDays}d</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-xs font-bold text-slate-900">
                        {formatCurrency(pending.amount)}
                      </div>
                      <Badge variant={pending.statusVariant} className="text-[10px] mt-0.5">
                        {pending.dueStatus}
                      </Badge>
                    </div>
                    <Link to={`/payments/new?customerId=${pending.id}&amount=${pending.amount}`}>
                      <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs">
                        Collect Payment
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Order Tracking (Section 20) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Order Status Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-xs text-primary">SO-1045</span>
                  <Badge variant="warning">Special Approval</Badge>
                </div>
                <div className="text-xs text-slate-600">Muthurajawela Eng.</div>
                <div className="text-[11px] text-slate-400 mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">✓ Order Submitted</div>
                  <div className="flex items-center gap-1.5 text-amber-600 font-medium">● Escalated to Director</div>
                  <div className="flex items-center gap-1.5 text-slate-400">○ Picking Pending</div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-bold text-xs text-primary">SO-1044</span>
                  <Badge variant="success">Dispatched</Badge>
                </div>
                <div className="text-xs text-slate-600">Lanka Electrical Superstore</div>
                <div className="text-[11px] text-slate-400 mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">✓ Order Approved</div>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">✓ Invoiced (INV-2041)</div>
                  <div className="flex items-center gap-1.5 text-primary font-medium">● En route for delivery</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
