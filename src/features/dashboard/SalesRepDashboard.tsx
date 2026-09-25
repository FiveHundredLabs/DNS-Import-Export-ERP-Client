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
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export function SalesRepDashboard() {
  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Mobile-first Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/20 text-white border border-primary/30 mb-2">
            Field Representative Hub
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Good Day, Kasun</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Colombo Central Territory • 14 Assigned Dealers • Active Cycle
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/customers">
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700">
              <Users className="h-3.5 w-3.5 text-primary" /> Customer Hub
            </Button>
          </Link>
          <Link to="/orders">
            <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-bold shadow-md">
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
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
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
        {/* Today's Route Visits */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Today's Dealer Visit Schedule</CardTitle>
            <span className="text-xs text-slate-500 font-medium">3 of 5 completed</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Lanka Electrical Superstore', status: 'Completed', time: '09:30 AM', order: 'LKR 650,000' },
                { name: 'Muthurajawela Engineering', status: 'Follow-up Due', time: '02:00 PM', order: 'Pending Note Check' },
                { name: 'Kelani Valley Lighting Mart', status: 'Scheduled', time: '04:15 PM', order: 'Terms Verification' },
              ].map((visit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-white border border-slate-200 text-slate-600">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{visit.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {visit.time} • Note: {visit.order}
                      </div>
                    </div>
                  </div>
                  <Badge variant={visit.status === 'Completed' ? 'success' : 'warning'}>
                    {visit.status}
                  </Badge>
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
