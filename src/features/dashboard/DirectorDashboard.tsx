import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AppearanceSettings } from './AppearanceSettings';
import { GlobalTaxSettings } from './GlobalTaxSettings';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  Store,
  CreditCard,
  Users,
  Building,
  ArrowUpRight,
  MapPin,
  Sparkles,
  LayoutDashboard,
  Settings,
  Palette,
  Percent,
  Target,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { DirectorInteractiveBarChart } from './components/DirectorInteractiveBarChart';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

// Daily settlement payment mix for Donut chart
const SETTLEMENT_MIX = [
  { name: 'Cheque (PDC)', value: 42, color: '#10B981', amount: 'LKR 734.8k' },
  { name: 'Bank Transfer', value: 31, color: 'var(--primary-color)', amount: 'LKR 542.4k' },
  { name: 'Showroom Cash', value: 18, color: '#F59E0B', amount: 'LKR 315.0k' },
  { name: 'Credit Card', value: 9, color: 'var(--primary-hover)', amount: 'LKR 157.4k' },
];

// Average Order Value 7-Month progression
const AOV_TREND_DATA = [
  { month: 'Mar', aov: 142 },
  { month: 'Apr', aov: 168 },
  { month: 'May', aov: 154 },
  { month: 'Jun', aov: 185 },
  { month: 'Jul', aov: 162 },
  { month: 'Aug', aov: 198 },
  { month: 'Sep', aov: 224 },
];

export function DirectorDashboard() {
  const [selectedRegion, setSelectedRegion] = useState('All Cities');
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const isDirector = role === 'DIRECTOR';

  const activeTab = searchParams.get('tab') === 'settings' && isDirector ? 'settings' : 'overview';
  const activeSection = searchParams.get('section') || 'tax';

  const handleTabChange = (tab: 'overview' | 'settings', section?: 'tax' | 'appearance') => {
    if (tab === 'settings' && isDirector) {
      setSearchParams({ tab: 'settings', section: section || activeSection });
    } else {
      setSearchParams({});
    }
  };

  if (activeTab === 'settings' && isDirector) {
    return (
      <div className="space-y-6">
        {/* Top Header & Tab Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => handleTabChange('overview')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => handleTabChange('settings', 'tax')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeSection === 'tax'
                  ? 'font-bold bg-white text-primary shadow-xs'
                  : 'font-semibold text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent className={`h-3.5 w-3.5 ${activeSection === 'tax' ? 'text-primary' : 'text-slate-500'}`} />
              <span>Settings &gt; Global Tax</span>
            </button>

            <button
              onClick={() => handleTabChange('settings', 'appearance')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeSection === 'appearance'
                  ? 'font-bold bg-white text-primary shadow-xs'
                  : 'font-semibold text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className={`h-3.5 w-3.5 ${activeSection === 'appearance' ? 'text-primary' : 'text-slate-500'}`} />
              <span>Settings &gt; Appearance</span>
            </button>
          </div>
        </div>

        {activeSection === 'appearance' ? <AppearanceSettings /> : <GlobalTaxSettings />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls for Director */}
      {isDirector && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => handleTabChange('overview')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 shadow-xs transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => handleTabChange('settings', 'tax')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Percent className="h-3.5 w-3.5 text-slate-500" />
              <span>Settings &gt; Global Tax</span>
            </button>

            <button
              onClick={() => handleTabChange('settings', 'appearance')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Palette className="h-3.5 w-3.5 text-slate-500" />
              <span>Settings &gt; Appearance</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 4 KPI Cards (Directly matching reference screenshot style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sales"
          value={formatCurrency(48500000)}
          trend={{ value: '20.7%', isPositive: true }}
          variant="success"
          icon={DollarSign}
        />
        <StatCard
          title="New Orders"
          value="209"
          trend={{ value: '12%', isPositive: true }}
          variant="blue"
          icon={ShoppingBag}
        />
        <StatCard
          title="Conversion Rate"
          value="9.5%"
          trend={{ value: '2.12%', isPositive: true }}
          variant="indigo"
          icon={Target}
        />
        <StatCard
          title="Cancelled Orders"
          value="2.5%"
          trend={{ value: '3.8%', isPositive: false }}
          variant="danger"
          icon={AlertCircle}
        />
      </div>

      {/* Middle Section: Sales Trends by Products (8 cols) + Regional Performance (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Bar Chart (8 cols) — Shadcn Component in Light Mode */}
        <DirectorInteractiveBarChart />
        

        {/* Right: Regional Performance / Growth (4 cols) (Reference screenshot "User Growth") */}
        <Card className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">Regional Growth</h2>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="appearance-none inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 pl-2.5 pr-6 py-1 rounded-full cursor-pointer transition-colors border-0 focus:ring-1 focus:ring-primary focus:outline-hidden"
                >
                  <option value="All Cities">Cities (All)</option>
                  <option value="Kelaniya">Kelaniya</option>
                  <option value="Maharagama">Maharagama</option>
                  <option value="Malabe">Malabe</option>
                  <option value="Kottawa">Kottawa</option>
                </select>
                <ChevronDown className="h-3 w-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-5">Of the month based on territories</p>

            {/* Regional Territory Breakdown with Progress Bars */}
            <div className="space-y-3.5">
              {[
                { name: 'Kelaniya', share: 36, color: 'bg-rose-500', barBg: '#F43F5E', target: 'LKR 17.5M' },
                { name: 'Maharagama', share: 28, color: 'bg-amber-500', barBg: '#F59E0B', target: 'LKR 13.6M' },
                { name: 'Malabe', share: 21, color: 'bg-emerald-500', barBg: '#10B981', target: 'LKR 10.2M' },
                { name: 'Kottawa', share: 15, color: 'bg-slate-900', barBg: '#0F172A', target: 'LKR 7.2M' },
              ]
                .filter((city) => selectedRegion === 'All Cities' || city.name === selectedRegion)
                .map((prov) => (
                <div key={prov.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{prov.name}</span>
                    <span className="font-bold text-slate-900">{prov.share}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${prov.color} transition-all duration-500`}
                      style={{ width: `${prov.share}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Revenue Target achieved</span>
                    <span>{prov.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Regional coverage</span>
            <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> 98.4% On Schedule
            </span>
          </div>
        </Card>
      </div>

      {/* Bottom Section (3 Cards: Orders by channels, Daily Sales donut, Average Order Value) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Orders by channels (Reference screenshot) */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 tracking-normal">Orders by channels</h3>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xs text-slate-400">Total</span>
              <span className="text-2xl font-semibold tabular-nums text-slate-900">2,641</span>
              <span className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 tabular-nums">
                ↗ 21%
              </span>
            </div>

            {/* Channels Table / List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-slate-100 pb-1.5">
                <span>Source</span>
                <div className="flex items-center gap-6">
                  <span>Percent %</span>
                  <span className="w-10 text-right">Total</span>
                </div>
              </div>

              {[
                { name: 'Showroom Direct', pct: '35.2%', total: '930', icon: Store, color: 'text-emerald-600 bg-emerald-50' },
                { name: 'Field Sales Reps', pct: '64.8%', total: '1,711', icon: Users, color: 'text-primary bg-primary-light' },


              ].map((ch) => {
                const IconComponent = ch.icon;
                return (
                  <div key={ch.name} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${ch.color}`}>
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium text-slate-800">{ch.name}</span>
                    </div>
                    <div className="flex items-center gap-6 font-mono tabular-nums">
                      <span className="text-slate-500 font-normal">{ch.pct}</span>
                      <span className="w-10 text-right font-medium text-slate-900">{ch.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Card 2: Daily Sales Mix (Donut Chart matching reference screenshot) */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 tracking-normal">Daily Sales</h3>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>
            </div>

            {/* Donut Legend */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-600 mb-2">
              {SETTLEMENT_MIX.map((item) => (
                <span key={item.name} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
              ))}
            </div>

            {/* Donut PieChart with Center Total */}
            <div className="relative h-[180px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SETTLEMENT_MIX}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {SETTLEMENT_MIX.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Text (Total £1,749.69 in reference screenshot) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total</span>
                <span className="text-sm font-semibold text-slate-900 tracking-tight tabular-nums">LKR 1,749,690</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Verified by Finance Desk</span>
            <span className="font-semibold text-slate-700">100% Reconciled</span>
          </div>
        </Card>

        {/* Card 3: Average Order Value (Area chart matching reference screenshot) */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 tracking-normal">Average Order Value</h3>
                <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-400 cursor-pointer" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-semibold tabular-nums text-slate-900">LKR 224k</span>
              <span className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 tabular-nums">
                ↗ 12%
              </span>
            </div>

            {/* Smooth Area Chart */}
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={AOV_TREND_DATA} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aovGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    dy={5}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    tickFormatter={(v) => `${v}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`LKR ${val}k`, 'Average Value']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '12px',
                      fontWeight: 500,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aov"
                    stroke="var(--primary-color)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#aovGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Fiscal trend analysis</span>
            <span className="font-semibold text-primary">Highest in Q3</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
