import React, { useState } from 'react';
import { useSalesManagerDashboard } from '../../hooks/useSalesManagerDashboard';
import { StatCard } from '../../components/common/StatCard';
import { posService } from '../../services/POSService';
import { ShowroomOffer } from '../../types/pos';
import { useAuth } from '../../hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tag, Check, X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle } from '../../components/ui/card';
import { formatCurrency } from '../../utils/formatters';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  ChevronDown,
  ChevronRight,
  Users,
  Briefcase,
  Info,
  CheckCircle2,
  Building,
  Receipt,
  DollarSign,
  AlertCircle,
  MapPin,
} from 'lucide-react';

const AGING_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

// Mock Data for the Line Chart (Monthly Trends)
const TEAM_TRENDS_DATA = [
  { month: 'Jan', target: 120, achieved: 110 },
  { month: 'Feb', target: 130, achieved: 140 },
  { month: 'Mar', target: 140, achieved: 135 },
  { month: 'Apr', target: 150, achieved: 165 },
  { month: 'May', target: 160, achieved: 155 },
  { month: 'Jun', target: 180, achieved: 190 },
];

// Mock Data for Top 5 Unpaid Invoices
const TOP_5_INVOICES = [
  { id: 'INV-001', customer: 'Alpha Industries', days: 45, amount: 2500000, icon: Building, color: 'text-rose-600 bg-rose-50' },
  { id: 'INV-042', customer: 'Beta Corp', days: 32, amount: 1800000, icon: Briefcase, color: 'text-amber-600 bg-amber-50' },
  { id: 'INV-087', customer: 'Gamma LLC', days: 28, amount: 1200000, icon: Users, color: 'text-amber-600 bg-amber-50' },
  { id: 'INV-112', customer: 'Delta Ent', days: 15, amount: 950000, icon: Building, color: 'text-primary bg-primary-light' },
  { id: 'INV-156', customer: 'Epsilon Ltd', days: 5, amount: 450000, icon: Receipt, color: 'text-emerald-600 bg-emerald-50' },
];

const RECOVERIES_TREND_DATA = [
  { month: 'Mar', val: 42 },
  { month: 'Apr', val: 68 },
  { month: 'May', val: 54 },
  { month: 'Jun', val: 85 },
  { month: 'Jul', val: 62 },
  { month: 'Aug', val: 98 },
  { month: 'Sep', val: 124 },
];

export function SalesManagerDashboard() {
  const { data, loading, error } = useSalesManagerDashboard();
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const { currentUser } = useAuth();
  const [offers, setOffers] = useState<ShowroomOffer[]>([]);
  const [rejectModalOffer, setRejectModalOffer] = useState<ShowroomOffer | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [offerFilterTab, setOfferFilterTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

  const loadOffers = async () => {
    try {
      const all = await posService.getAllOffers();
      setOffers(all);
    } catch (e) {
      console.error('Error loading offers', e);
    }
  };

  React.useEffect(() => {
    loadOffers();
  }, []);

  const handleApproveOffer = async (offerId: string) => {
    try {
      await posService.approveShowroomOffer(offerId, {
        id: currentUser?.id || 'usr-103',
        name: currentUser?.name || 'Kamal Perera',
      });
      toast.success('Showroom offer approved and activated for POS!');
      loadOffers();
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const handleRejectOffer = async () => {
    if (!rejectModalOffer) return;
    if (!rejectionReasonText.trim()) {
      toast.error('A rejection reason is mandatory.');
      return;
    }
    try {
      await posService.rejectShowroomOffer(rejectModalOffer.id, rejectionReasonText.trim(), {
        id: currentUser?.id || 'usr-103',
        name: currentUser?.name || 'Kamal Perera',
      });
      toast.success('Offer rejected and returned to Showroom Manager.');
      setRejectModalOffer(null);
      setRejectionReasonText('');
      loadOffers();
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    }
  };

  const filteredOffers = offers.filter((o) => {
    if (offerFilterTab === 'ALL') return true;
    if (offerFilterTab === 'PENDING') return o.status === 'PENDING_APPROVAL';
    return o.status === offerFilterTab;
  });

  if (loading) {
    return <div className="p-8 flex justify-center text-slate-500">Loading dashboard data...</div>;
  }

  if (error || !data) {
    return <div className="p-8 flex justify-center text-red-500">Error: {error}</div>;
  }

  const { kpis, areaManagerPerformances, agingBuckets } = data;

  const toggleManager = (managerId: string) => {
    setExpandedManagers((prev) => {
      const next = new Set(prev);
      if (next.has(managerId)) {
        next.delete(managerId);
      } else {
        next.add(managerId);
      }
      return next;
    });
  };

  const totalAgingAmount = agingBuckets?.reduce((sum, item) => sum + item.amount, 0) || 0;

  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white text-slate-900 px-3 py-2 rounded-xl text-xs shadow-md border border-slate-200 flex flex-col gap-1.5 animate-in fade-in zoom-in-95">
          <span className="font-bold text-slate-800">{label}</span>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}: LKR {entry.value}M</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Team Sales"
          value={formatCurrency(kpis.teamSales)}
          trend={{ value: '15.2%', isPositive: true }}
          variant="success"
          icon={DollarSign}
        />
        <StatCard
          title="Unpaid Invoices"
          value={formatCurrency(kpis.unpaidInvoices)}
          trend={{ value: '4.1%', isPositive: false }}
          variant="danger"
          icon={AlertCircle}
        />
        <StatCard
          title="Active Area Managers"
          value={kpis.activeAreaManagers.toString()}
          trend={{ value: '100%', isPositive: true }}
          variant="blue"
          icon={MapPin}
        />
        <StatCard
          title="Total Sales Reps"
          value={kpis.totalSalesReps.toString()}
          trend={{ value: '12%', isPositive: true }}
          variant="indigo"
          icon={Users}
        />
      </div>

      {/* Middle Section: Sales Trends (8 cols) + Area Manager Performance (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sales Trends */}
        <Card className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">
                  Team Sales Trends (Monthly)
                </h2>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Achieved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  Target
                </span>
              </div>
            </div>

            <div className="h-[250px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={200}>
                <LineChart data={TEAM_TRENDS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    tickFormatter={(val) => `LKR ${val}M`}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line
                    name="Target"
                    type="monotone"
                    dataKey="target"
                    stroke="#CBD5E1"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: '#CBD5E1' }}
                    activeDot={{ r: 6, fill: '#CBD5E1', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    name="Achieved"
                    type="monotone"
                    dataKey="achieved"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10B981' }}
                    activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Right: Area Manager Performance */}
        <Card className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">Manager Targets</h2>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full cursor-pointer transition-colors">
                Top Performers <ChevronDown className="h-3 w-3" />
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-5">Of the month based on targets</p>

            <div className="space-y-4">
              {areaManagerPerformances?.slice(0, 4).map((manager, idx) => {
                const pct = manager.target > 0 ? Math.min((manager.achieved / manager.target) * 100, 100) : 0;
                const colors = ['bg-emerald-500', 'bg-primary', 'bg-amber-500', 'bg-rose-500'];
                const color = colors[idx % colors.length];
                return (
                  <div key={manager.managerId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{manager.managerName}</span>
                      <span className="font-bold text-slate-900">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>Target: {formatCurrency(manager.target)}</span>
                      <span>Achieved: {formatCurrency(manager.achieved)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Team overall</span>
            <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> On Schedule
            </span>
          </div>
        </Card>
      </div>

      {/* Bottom Section (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Top 5 Unpaid Invoices */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Top Unpaid Invoices</h3>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xs text-slate-400">Total at Risk</span>
              <span className="text-2xl font-black text-slate-900">LKR 6.9M</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                Action Req
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 border-b border-slate-100 pb-1.5">
                <span>Customer</span>
                <div className="flex items-center gap-6">
                  <span>Days</span>
                  <span className="w-16 text-right">Amount</span>
                </div>
              </div>

              {TOP_5_INVOICES.map((inv) => {
                const IconComponent = inv.icon;
                return (
                  <div key={inv.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${inv.color}`}>
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold text-slate-800 truncate w-24">{inv.customer}</span>
                    </div>
                    <div className="flex items-center gap-6 font-mono">
                      <span className={`font-medium ${inv.days > 30 ? 'text-rose-500' : 'text-amber-500'}`}>{inv.days}d</span>
                      <span className="w-16 text-right font-bold text-slate-800">
                        {(inv.amount / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Card 2: Unpaid Invoices Aging */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Aging Buckets</h3>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-slate-600 mb-2">
              {agingBuckets?.map((item, idx) => (
                <span key={item.bucket} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AGING_COLORS[idx % AGING_COLORS.length] }} />
                  {item.bucket}
                </span>
              ))}
            </div>

            <div className="relative h-[180px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={agingBuckets}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {agingBuckets?.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={AGING_COLORS[index % AGING_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Total</span>
                <span className="text-sm font-black text-slate-900 tracking-tight">
                  LKR {(totalAgingAmount / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Verified by Accounts</span>
            <span className="font-semibold text-slate-700">Updated Today</span>
          </div>
        </Card>

        {/* Card 3: Cash Collection Area Chart */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Cash Collection</h3>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-black text-slate-900">LKR 124M</span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                ↗ 8%
              </span>
            </div>

            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={RECOVERIES_TREND_DATA} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="recoveriesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 9 }}
                    tickFormatter={(v) => `${v}M`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`LKR ${val}M`, 'Collected']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '11px',
                      fontWeight: 600,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="val"
                    stroke="var(--primary-color)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#recoveriesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Fiscal trend analysis</span>
            <span className="font-semibold text-primary">Highest in Sep</span>
          </div>
        </Card>
      </div>

      {/* Hierarchical Breakdown Table */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <CardTitle className="text-base font-bold text-slate-800">Team Performance Breakdown</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 border-b border-slate-200">Area Manager</th>
                <th className="px-6 py-3 border-b border-slate-200 text-right">Target</th>
                <th className="px-6 py-3 border-b border-slate-200 text-right">Achieved</th>
                <th className="px-6 py-3 border-b border-slate-200 text-right">Achievement %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(areaManagerPerformances || []).map((manager) => {
                const isExpanded = expandedManagers.has(manager.managerId);
                const managerPct = manager.target > 0 ? (manager.achieved / manager.target) * 100 : 0;
                
                return (
                  <React.Fragment key={manager.managerId}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => toggleManager(manager.managerId)}
                    >
                      <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                        <Briefcase className="h-4 w-4 text-primary" />
                        {manager.managerName}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(manager.target)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(manager.achieved)}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${managerPct >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {managerPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    {isExpanded &&
                      manager.salesReps.map((rep) => {
                        const repPct = rep.target > 0 ? (rep.achieved / rep.target) * 100 : 0;
                        return (
                          <tr key={rep.repId} className="bg-slate-50/50 hover:bg-slate-100/50">
                            <td className="px-6 py-3 pl-14 font-medium text-slate-700 flex items-center gap-2">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              {rep.repName}
                            </td>
                            <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(rep.target)}</td>
                            <td className="px-6 py-3 text-right font-semibold text-slate-800">{formatCurrency(rep.achieved)}</td>
                            <td className="px-6 py-3 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${repPct >= 100 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                {repPct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Showroom Clearance Offer Approvals Section */}
      <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-800">
                Showroom Clearance & Promotional Offer Approvals
              </CardTitle>
              <p className="text-xs text-slate-500">
                Review, approve, or reject stock clearance pricing requests submitted by Showroom Managers.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-lg text-xs font-semibold">
            {[
              { id: 'PENDING', label: 'Pending Approval', count: offers.filter(o => o.status === 'PENDING_APPROVAL').length },
              { id: 'APPROVED', label: 'Approved', count: offers.filter(o => o.status === 'APPROVED').length },
              { id: 'REJECTED', label: 'Rejected', count: offers.filter(o => o.status === 'REJECTED').length },
              { id: 'ALL', label: 'All Offers', count: offers.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOfferFilterTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  offerFilterTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-bold">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          {filteredOffers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No showroom offers found in this view.
            </div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Offer Code / Product</th>
                  <th className="px-6 py-3">Showroom & Requester</th>
                  <th className="px-6 py-3 text-right">Catalog Price</th>
                  <th className="px-6 py-3 text-right">Proposed Offer Price</th>
                  <th className="px-6 py-3 text-center">Discount %</th>
                  <th className="px-6 py-3">Duration & Reason</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Decision Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOffers.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5">
                      <div className="font-mono font-bold text-slate-900">{o.offerCode}</div>
                      <div className="font-semibold text-slate-800 text-[11px]">{o.productName}</div>
                      <div className="font-mono text-[10px] text-slate-400">SKU: {o.productSku}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-800">Colombo Showroom</div>
                      <div className="text-[11px] text-slate-500">By {o.createdByName}</div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-500 line-through">
                      {formatCurrency(o.originalPrice)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-700 text-sm">
                      {formatCurrency(o.offerPrice)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
                        {o.discountPercentage}% OFF
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-700">{o.startDate} to {o.endDate}</div>
                      <div className="text-[10px] text-indigo-600 font-semibold">{o.reason.replace('_', ' ')}</div>
                      {o.internalNotes && (
                        <div className="text-[10px] text-slate-400 italic">"{o.internalNotes}"</div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <Badge
                        variant={o.status === 'APPROVED' ? 'default' : o.status === 'PENDING_APPROVAL' ? 'outline' : 'destructive'}
                        className="text-[10px] font-bold"
                      >
                        {o.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {o.status === 'PENDING_APPROVAL' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleApproveOffer(o.id)}
                            className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                          >
                            <Check className="h-3 w-3" />
                            <span>Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectModalOffer(o);
                              setRejectionReasonText('');
                            }}
                            className="h-7 px-2.5 text-[11px] text-rose-700 border-rose-300 hover:bg-rose-50 font-semibold gap-1"
                          >
                            <X className="h-3 w-3" />
                            <span>Reject</span>
                          </Button>
                        </div>
                      ) : o.status === 'REJECTED' ? (
                        <span className="text-[10px] text-rose-600 italic" title={o.rejectionReason}>
                          Reason: {o.rejectionReason}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Approved by {o.approvedByName}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Reject Offer Modal */}
      <Dialog open={!!rejectModalOffer} onOpenChange={(open) => !open && setRejectModalOffer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <X className="h-4 w-4" />
              <span>Reject Showroom Offer</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A rejection reason is mandatory so the Showroom Manager understands why this pricing cannot be permitted.
            </DialogDescription>
          </DialogHeader>

          {rejectModalOffer && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-800">{rejectModalOffer.offerName}</div>
                <div className="text-[11px] text-slate-500">
                  {rejectModalOffer.productName} &bull; Proposed: {formatCurrency(rejectModalOffer.offerPrice)} ({rejectModalOffer.discountPercentage}% off)
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  placeholder="e.g. Clearance discount violates floor margin limit. Minimum price is Rs. 38,000."
                  className="text-xs h-9"
                  autoFocus
                />
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setRejectModalOffer(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleRejectOffer}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

