import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { DollarSign, TrendingUp, Users, AlertTriangle, Boxes, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export function DirectorDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Executive Director Overview</h1>
          <p className="text-xs text-slate-500">Global organization performance, credit exposure, and executive decisions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={formatCurrency(48500000)}
          subtitle="Current fiscal quarter"
          icon={DollarSign}
          trend={{ value: '14.2%', isPositive: true }}
          variant="success"
        />
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(12450000)}
          subtitle="Across all dealer networks"
          icon={TrendingUp}
          variant="warning"
        />
        <StatCard
          title="Overdue Receivables"
          value={formatCurrency(2850000)}
          subtitle="Requires collection intervention"
          icon={AlertTriangle}
          variant="danger"
        />
        <StatCard
          title="Total Inventory Value"
          value={formatCurrency(36800000)}
          subtitle="Main warehouse & showroom"
          icon={Boxes}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Regional Area Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { area: 'Western Province Central', sales: 24800000, target: 25000000, pct: 99.2 },
                { area: 'Central Province Kandy', sales: 14200000, target: 15000000, pct: 94.6 },
                { area: 'Southern Province Galle', sales: 9500000, target: 10000000, pct: 95.0 },
              ].map((reg) => (
                <div key={reg.area} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{reg.area}</span>
                    <span className="text-slate-600">{formatCurrency(reg.sales)} / {formatCurrency(reg.target)} ({reg.pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, reg.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Executive Approval In-Tray</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs">
                <div className="font-semibold text-amber-900">SO-1045 Special Discount Breach</div>
                <p className="text-amber-700 text-[11px] mt-0.5">Muthurajawela Engineering (16% requested, limit 15%). Escalated by Sales Manager.</p>
              </div>
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs">
                <div className="font-semibold text-amber-900">Dealer DLR-NEG-002 High Credit Days</div>
                <p className="text-amber-700 text-[11px] mt-0.5">45 days credit extension requested.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
