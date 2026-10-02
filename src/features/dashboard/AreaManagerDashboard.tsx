import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
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
  Phone,
  CheckCircle2,
  TrendingUp,
  ShoppingBag,
  Package,
  Layers,
  Sparkles,
  ChevronRight,
  Boxes,
  FileSpreadsheet,
} from 'lucide-react';

export function AreaManagerDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Determine greeting based on current time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Area Manager Metrics (Western Province Territory)
  const todaySales = 185000;
  const todayTarget = 250000;
  const todayPercent = Math.round((todaySales / todayTarget) * 100);

  const mtdSales = 18500000;
  const mtdTarget = 22000000;
  const mtdPercent = (mtdSales / mtdTarget) * 100;

  // Active Sales Reps in Managed Area
  const salesReps = [
    {
      id: 'rep-01',
      name: 'Kasun Perera',
      territory: 'Colombo Central & Pettah',
      todaySales: 68500,
      target: 75000,
      achievement: 91,
      activeVisits: 6,
      phone: '+94771234567',
    },
    {
      id: 'rep-02',
      name: 'Nuwan Jayasinghe',
      territory: 'Gampaha & Negombo Road',
      todaySales: 54000,
      target: 65000,
      achievement: 83,
      activeVisits: 4,
      phone: '+94772345678',
    },
    {
      id: 'rep-03',
      name: 'Ruwan Silva',
      territory: 'Kalutara & Panadura Coast',
      todaySales: 38500,
      target: 55000,
      achievement: 70,
      activeVisits: 5,
      phone: '+94773456789',
    },
    {
      id: 'rep-04',
      name: 'Sahan Wickramasinghe',
      territory: 'Kaduwela & Malabe Suburbs',
      todaySales: 24000,
      target: 55000,
      achievement: 44,
      activeVisits: 3,
      phone: '+94774567890',
    },
  ];

  // Recent Field Orders
  const recentOrders = [
    {
      id: 'ord-01',
      orderNumber: 'SO-2025-001',
      customerName: 'Muthurajawela Engineering',
      itemsCount: 4,
      amount: 145000,
      status: 'APPROVED',
      time: '11:30 AM',
    },
    {
      id: 'ord-02',
      orderNumber: 'SO-2025-002',
      customerName: 'Lanka Industrial Tools',
      itemsCount: 2,
      amount: 82500,
      status: 'SPECIAL_APPROVAL',
      time: '10:15 AM',
    },
    {
      id: 'ord-03',
      orderNumber: 'SO-2025-003',
      customerName: 'Apex Machinery & Hardware',
      itemsCount: 6,
      amount: 210000,
      status: 'PENDING_APPROVAL',
      time: '09:40 AM',
    },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-4">
      {/* 1. Mobile Header & Territory Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-primary/20 text-primary-light border border-primary/30">
                <MapPin className="h-3 w-3 text-primary" />
                {currentUser.areaName || 'Western Province Area'}
              </span>
              <span className="text-[11px] text-slate-400">Area Manager Hub</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              {greeting}, {currentUser.name.split(' ')[0]}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              4 Active Route Sectors • 6 Field Officers Deployed
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <Link to="/orders/new" className="flex-1 sm:flex-initial">
              <Button
                size="sm"
                className="w-full gap-1.5 text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shadow-xs h-9 px-3.5 rounded-xl"
              >
                <PlusCircle className="h-4 w-4" /> New Order
              </Button>
            </Link>
            <Link to="/payments/collect" className="flex-1 sm:flex-initial">
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-100 border-slate-700 h-9 px-3.5 rounded-xl"
              >
                <CreditCard className="h-4 w-4 text-emerald-400" /> Collect
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Today's Area Sales Hero Performance Card (Mobile First) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today's Area Sales
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-0.5">
              {formatCurrency(todaySales)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Daily Target</span>
            <div className="text-sm font-bold text-slate-700 tabular-nums">
              {formatCurrency(todayTarget)}
            </div>
            <span className="inline-block mt-0.5 text-xs font-bold text-emerald-600">
              {todayPercent}% achieved
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(todayPercent, 100)}%` }}
          />
        </div>

        {/* MTD Performance Secondary Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" /> Month-to-Date:
          </span>
          <div className="font-semibold text-slate-800 tabular-nums">
            {formatCurrency(mtdSales)}{' '}
            <span className="text-slate-400 font-normal">/ {formatCurrency(mtdTarget)}</span>{' '}
            <span className="text-emerald-600 font-bold ml-1">({formatPercentage(mtdPercent)})</span>
          </div>
        </div>
      </div>

      {/* 3. Secondary Compact KPI Cards (2 Columns on Mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Outstanding Receivables */}
        <div
          onClick={() => navigate('/customers')}
          className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs cursor-pointer hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Outstanding
            </span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 tabular-nums mt-1">
            LKR 8.42M
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Dealer credit line</span>
        </div>

        {/* Pending Collections */}
        <div
          onClick={() => navigate('/payments')}
          className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs cursor-pointer hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Pending Pmt
            </span>
            <FileCheck2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 tabular-nums mt-1">
            5 Receipts
          </div>
          <span className="text-[11px] text-blue-600 font-medium block mt-0.5">LKR 650k verification</span>
        </div>

        {/* Active Sales Reps */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Field Officers
            </span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 tabular-nums mt-1">
            6 Active
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">18 Visits logged</span>
        </div>

        {/* Overdue Accounts */}
        <div
          onClick={() => navigate('/customers')}
          className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-xs cursor-pointer hover:bg-rose-50 transition-colors"
        >
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
              Overdue
            </span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-lg font-bold text-rose-700 tabular-nums mt-1">
            2 Dealers
          </div>
          <span className="text-[11px] text-rose-600 font-medium block mt-0.5">LKR 450k overdue</span>
        </div>
      </div>

      {/* 4. Horizontal Quick Actions Bar */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
          Quick Operations
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Link
            to="/customers"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shadow-xs transition-colors shrink-0"
          >
            <Users className="h-4 w-4 text-primary" />
            <span>Customer Directory</span>
          </Link>

          <Link
            to="/orders"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shadow-xs transition-colors shrink-0"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
            <span>Sales Orders</span>
          </Link>

          <Link
            to="/payments/collect"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shadow-xs transition-colors shrink-0"
          >
            <DollarSign className="h-4 w-4 text-amber-600" />
            <span>Collect Payment</span>
          </Link>

          <Link
            to="/inventory/stock"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shadow-xs transition-colors shrink-0"
          >
            <Boxes className="h-4 w-4 text-purple-600" />
            <span>Showroom Stock</span>
          </Link>

          <Link
            to="/quotations"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shadow-xs transition-colors shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4 text-cyan-600" />
            <span>Quotations</span>
          </Link>
        </div>
      </div>

      {/* 5. Important Action Alerts */}
      <div className="space-y-2">
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Warranty Follow-Up Required
                </h2>
                <Badge variant="warning" className="text-[10.5px]">22 Pending Notes</Badge>
              </div>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                Muthurajawela Engineering: 85 units sold, only 62 warranty slips returned. Instruct Sales Rep Kasun to collect remaining slips during today's visit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Today's Field Team & Leaderboard */}
      <Card className="rounded-2xl border-slate-200/90 overflow-hidden shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Field Team Performance
            </CardTitle>
            <p className="text-[11px] text-slate-400 mt-0.5">Today's target tracking by representative</p>
          </div>
          <Link to="/reports" className="text-xs font-semibold text-primary hover:underline">
            View Reports →
          </Link>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {salesReps.map((rep, idx) => (
            <div key={rep.id} className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      {rep.name}
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {rep.activeVisits} visits
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {rep.territory}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-900 tabular-nums">
                    {formatCurrency(rep.todaySales)}
                  </div>
                  <div className="text-[10.5px] font-medium text-emerald-600 tabular-nums mt-0.5">
                    {rep.achievement}% of target
                  </div>
                </div>
              </div>

              {/* Progress mini bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2.5">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${Math.min(rep.achievement, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 7. Recent Field Orders (Mobile Cards) */}
      <Card className="rounded-2xl border-slate-200/90 overflow-hidden shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900">
            Recent Sales Orders
          </CardTitle>
          <Link to="/orders" className="text-xs font-semibold text-primary hover:underline">
            All Orders →
          </Link>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="p-3.5 hover:bg-slate-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">
                    {order.orderNumber}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {order.time}
                  </span>
                  <Badge
                    variant={
                      order.status === 'APPROVED'
                        ? 'success'
                        : order.status === 'SPECIAL_APPROVAL'
                        ? 'warning'
                        : 'secondary'
                    }
                    className="text-[10px] py-0"
                  >
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-xs font-semibold text-slate-800 truncate mt-1">
                  {order.customerName}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {order.itemsCount} Items
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-slate-900 tabular-nums">
                  {formatCurrency(order.amount)}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 ml-auto mt-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
