import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../components/common/StatCard';
import { AmountDisplay } from '../../components/common/AmountDisplay';
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
  Phone,
  MessageSquare,
  Search,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Sparkles,
  X,
  Filter,
  FileSpreadsheet,
  LayoutGrid,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { whatsAppService } from '../../services/WhatsAppService';
import { cn } from '../../utils/cn';

interface PendingAccount {
  id: string;
  name: string;
  code: string;
  amount: number;
  dueStatus: string;
  statusVariant: 'destructive' | 'warning' | 'outline';
  creditDays: number;
  phone: string;
  contactPerson: string;
  isOverdue: boolean;
}

interface OrderTrackingItem {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  statusVariant: 'warning' | 'success' | 'default';
  steps: {
    label: string;
    state: 'done' | 'current' | 'pending';
  }[];
}

export function SalesRepDashboard() {
  // Mobile app view states
  const [mobileTab, setMobileTab] = useState<'all' | 'receivables' | 'orders'>('all');
  const [receivablesFilter, setReceivablesFilter] = useState<'all' | 'overdue' | 'current'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Existing Pending Accounts Data (enhanced with phone for mobile app 1-tap call/whatsapp)
  const pendingAccounts: PendingAccount[] = [
    {
      id: 'cust-001',
      name: 'Lanka Electrical Superstore',
      code: 'DLR-COL-001',
      amount: 450000,
      dueStatus: 'Overdue by 12 Days',
      statusVariant: 'destructive',
      creditDays: 30,
      phone: '+94 11 258 9632',
      contactPerson: 'Mr. Sunil Weerasinghe',
      isOverdue: true,
    },
    {
      id: 'cust-002',
      name: 'Muthurajawela Engineering',
      code: 'DLR-GAM-002',
      amount: 280000,
      dueStatus: 'Due in 3 Days',
      statusVariant: 'warning',
      creditDays: 45,
      phone: '+94 31 223 4567',
      contactPerson: 'Mr. Jude Rodrigo',
      isOverdue: false,
    },
    {
      id: 'cust-003',
      name: 'Kelani Valley Lighting Mart',
      code: 'DLR-KEL-003',
      amount: 195000,
      dueStatus: 'Within Terms',
      statusVariant: 'outline',
      creditDays: 30,
      phone: '+94 33 228 1122',
      contactPerson: 'Mr. Rohan Gunasekara',
      isOverdue: false,
    },
  ];

  // Existing Live Orders Data
  const recentOrders: OrderTrackingItem[] = [
    {
      id: 'ord-1045',
      orderNumber: 'SO-1045',
      customerName: 'Muthurajawela Eng.',
      status: 'Special Approval',
      statusVariant: 'warning',
      steps: [
        { label: 'Order Submitted', state: 'done' },
        { label: 'Escalated to Director', state: 'current' },
        { label: 'Picking Pending', state: 'pending' },
      ],
    },
    {
      id: 'ord-1044',
      orderNumber: 'SO-1044',
      customerName: 'Lanka Electrical Superstore',
      status: 'Dispatched',
      statusVariant: 'success',
      steps: [
        { label: 'Order Approved', state: 'done' },
        { label: 'Invoiced (INV-2041)', state: 'done' },
        { label: 'En route for delivery', state: 'current' },
      ],
    },
  ];

  // Filtered accounts for mobile search & filter pills
  const filteredAccounts = useMemo(() => {
    let list = pendingAccounts;
    if (receivablesFilter === 'overdue') {
      list = list.filter((a) => a.isOverdue);
    } else if (receivablesFilter === 'current') {
      list = list.filter((a) => !a.isOverdue);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.phone.includes(q)
      );
    }
    return list;
  }, [pendingAccounts, receivablesFilter, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      {/* 1. Header Banner:
          - MOBILE (< md): Curved brand header in primary gradient, fluid waves, mobile search
          - DESKTOP (md:): Clean enterprise white card, standard layout, desktop actions
      */}
      <div className="relative -mx-3.5 -mt-3.5 md:mx-0 md:mt-0 p-5 md:p-6 pb-7 md:pb-6 rounded-b-[2.5rem] md:rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-primary-active md:from-white md:via-white md:to-white text-primary-foreground md:text-slate-900 shadow-md md:shadow-xs shadow-primary/20 md:border md:border-slate-200/90 overflow-hidden md:overflow-visible transition-all">
        {/* Fluid Decorative Ambient Waves (Mobile only) */}
        <div className="block md:hidden absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="block md:hidden absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
          {/* Left: Avatar (mobile) + Greeting & Territory */}
          <div className="flex items-start md:items-center gap-3">
            {/* User Avatar Squircle (Mobile only) */}
            <div className="flex md:hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white font-extrabold text-sm ring-2 ring-white/30">
              KW
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-white/20 text-white md:bg-primary-light md:text-primary-text md:border md:border-primary-border backdrop-blur-sm">
                  Field Representative Hub
                </span>
                <span className="inline-flex md:hidden items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Active Route
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white md:text-slate-900 mt-1">
                Good Day, Kasun
              </h1>
              <p className="text-xs text-white/80 md:text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <MapPin className="h-3 w-3 text-white md:text-rose-500 shrink-0 hidden sm:inline" />
                <span>Colombo Central Territory</span>
                <span>•</span>
                <span>14 Assigned Dealers</span>
                <span>•</span>
                <span className="text-emerald-300 md:text-emerald-600 font-medium">Active Cycle</span>
              </p>
            </div>
          </div>

          {/* Right: Quick Action Buttons (Customer Hub & New Order) */}
          <div className="flex items-center gap-2 pt-1 md:pt-0 shrink-0">
            <Link to="/customers" className="flex-1 md:flex-none">
              <Button
                size="sm"
                variant="outline"
                className="w-full md:w-auto h-10 md:h-9 gap-1.5 text-xs bg-white/10 md:bg-white text-white md:text-slate-700 border-white/30 md:border-slate-200 hover:bg-white/20 md:hover:bg-slate-50 font-semibold rounded-xl shadow-2xs active:scale-[0.98]"
              >
                <Users className="h-4 w-4 md:h-3.5 md:w-3.5 text-white md:text-primary" /> Customer Hub
              </Button>
            </Link>
            <Link to="/orders" className="flex-1 md:flex-none">
              <Button
                size="sm"
                className="w-full md:w-auto h-10 md:h-9 gap-1.5 text-xs bg-white md:bg-primary text-primary md:text-primary-foreground hover:bg-white/90 md:hover:bg-primary-hover font-bold md:font-semibold rounded-xl shadow-xs active:scale-[0.98] border-0"
              >
                <PlusCircle className="h-4 w-4 md:h-3.5 md:w-3.5" /> New Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar tucked inside banner (Mobile only) */}
        <div className="block md:hidden relative pt-3 border-t border-white/15">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dealer, phone, or code..."
            className="w-full h-11 pl-10 pr-9 rounded-2xl bg-white text-slate-900 placeholder-slate-400 text-xs font-medium shadow-md shadow-black/10 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Mobile Dashboard Tab Navigation (Sticky Top View Switcher for Field Reps) */}
      <div className="block md:hidden sticky top-0 z-20 -mx-3.5 px-3 sm:-mx-5 sm:px-5 py-2 bg-canvas/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-200/75 border border-slate-200/90 shadow-inner">
          <button
            type="button"
            onClick={() => setMobileTab('all')}
            aria-label="All Overview"
            className={cn(
              'group w-full min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-center text-xs font-bold rounded-xl transition-all duration-150 select-none min-h-[38px]',
              mobileTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40 active:bg-white/60 active:scale-[0.98]'
            )}
          >
            <LayoutGrid className={cn('h-3.5 w-3.5 shrink-0 transition-colors', mobileTab === 'all' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600')} />
            <span className="truncate">
              <span className="hidden min-[380px]:inline">All </span>Overview
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('receivables')}
            aria-label={`Receivables (${pendingAccounts.length})`}
            className={cn(
              'group w-full min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-center text-xs font-bold rounded-xl transition-all duration-150 select-none min-h-[38px]',
              mobileTab === 'receivables'
                ? 'bg-white text-emerald-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40 active:bg-white/60 active:scale-[0.98]'
            )}
          >
            <CreditCard className={cn('h-3.5 w-3.5 shrink-0 transition-colors', mobileTab === 'receivables' ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600')} />
            <span className="truncate">Receivables</span>
            <span className={cn(
              'shrink-0 text-[10.5px] font-bold transition-opacity',
              mobileTab === 'receivables' ? 'text-emerald-700' : 'text-slate-500'
            )}>
              ({pendingAccounts.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('orders')}
            aria-label={`Live Orders (${recentOrders.length})`}
            className={cn(
              'group w-full min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-center text-xs font-bold rounded-xl transition-all duration-150 select-none min-h-[38px]',
              mobileTab === 'orders'
                ? 'bg-white text-primary shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40 active:bg-white/60 active:scale-[0.98]'
            )}
          >
            <Clock className={cn('h-3.5 w-3.5 shrink-0 transition-colors', mobileTab === 'orders' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600')} />
            <span className="truncate">
              <span className="hidden min-[380px]:inline">Live </span>Orders
            </span>
            <span className={cn(
              'shrink-0 text-[10.5px] font-bold transition-opacity',
              mobileTab === 'orders' ? 'text-primary' : 'text-slate-500'
            )}>
              ({recentOrders.length})
            </span>
          </button>
        </div>
      </div>

      {/* 3. Quick Actions & Services Grid (Mobile Only - shown on All Overview) */}
      {mobileTab === 'all' && (
        <div className="block md:hidden bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Field Services & Shortcuts
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Quick Access</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            {/* 1. Quick Order */}
            <Link to="/orders" className="flex flex-col items-center group active:scale-95 transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center shadow-2xs group-hover:bg-primary group-hover:text-white transition-colors">
                <PlusCircle className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-primary transition-colors">
                Order Desk
              </span>
            </Link>

            {/* 2. Dealer Directory */}
            <Link to="/customers" className="flex flex-col items-center group active:scale-95 transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Users className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-emerald-700 transition-colors">
                Dealer Hub
              </span>
            </Link>

            {/* 3. Collect Payment */}
            <Link to="/payments" className="flex flex-col items-center group active:scale-95 transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <CreditCard className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-blue-700 transition-colors">
                Collections
              </span>
            </Link>

            {/* 4. Warranty Desk */}
            <Link to="/warranty" className="flex flex-col items-center group active:scale-95 transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-amber-700 transition-colors">
                Warranty
              </span>
            </Link>

            {/* 5. Quotations */}
            <Link to="/quotations" className="flex flex-col items-center group active:scale-95 transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-purple-700 transition-colors">
                Quotations
              </span>
            </Link>

            {/* 6. Invoices */}
            <Link to="/invoices" className="flex flex-col items-center group active:scale-95 transition-transform">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-indigo-700 transition-colors">
                Invoices
              </span>
            </Link>

            {/* 7. Live Tracking */}
            <button
              type="button"
              onClick={() => setMobileTab('orders')}
              className="flex flex-col items-center group active:scale-95 transition-transform"
            >
              <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-2xs group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Clock className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-sky-700 transition-colors">
                Tracking
              </span>
            </button>

            {/* 8. Overdue Receivables */}
            <button
              type="button"
              onClick={() => {
                setMobileTab('receivables');
                setReceivablesFilter('overdue');
              }}
              className="flex flex-col items-center group active:scale-95 transition-transform"
            >
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <AlertCircle className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 mt-1.5 group-hover:text-rose-700 transition-colors">
                Overdue
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Mobile KPI Cards (Content-Aware Layout: Hero cards prevent currency clipping, distinct coordinated palettes) */}
      {(mobileTab === 'all' || mobileTab === 'receivables') && (
        <div className="space-y-1.5 sm:space-y-0">
          <div className="flex sm:hidden items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Performance Snap • Territory KPIs
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">85% Target Pace</span>
          </div>

          {/* Content-Aware Grid: Full-width Hero cards on mobile for long currency amounts, 4-col on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Card 1: Monthly Sales Target (Hero Full-width on mobile to guarantee LKR 4,250,000.00 never clips) */}
            <div className="col-span-2 lg:col-span-1 rounded-2xl sm:rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-50/40 to-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                      Monthly Sales
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium sm:hidden">Territory Target</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                  <TrendingUp className="h-3 w-3" />
                  85.0%
                </span>
              </div>

              <div className="mt-3 min-w-0">
                <AmountDisplay amount={4250000} className="text-slate-900 font-extrabold" />
              </div>

              {/* Progress bar on mobile & desktop */}
              <div className="mt-2.5 space-y-1">
                <div className="h-1.5 w-full bg-emerald-100/90 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full w-[85%]" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <span className="text-[11px] text-slate-500">Target: LKR 5,000,000.00</span>
                  <span className="font-semibold text-emerald-700 text-[10.5px]">85% Pace</span>
                </div>
              </div>
            </div>

            {/* Card 2: Route Collections (Hero Full-width on mobile to guarantee LKR 2,650,000.00 never clips) */}
            <div className="col-span-2 lg:col-span-1 rounded-2xl sm:rounded-3xl border border-blue-200/90 bg-gradient-to-br from-blue-500/[0.08] via-sky-50/40 to-white p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <FileCheck2 className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-950">
                      Route Collections
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium sm:hidden">Collected to Date</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200/70">
                  Field Active
                </span>
              </div>

              <div className="mt-3 min-w-0">
                <AmountDisplay amount={2650000} className="text-slate-900 font-extrabold" />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-blue-100/80">
                <span className="text-[11px] text-slate-500">Pending Finance: LKR 450,000.00</span>
                <span className="text-[10.5px] font-semibold text-blue-600">89% verified</span>
              </div>
            </div>

            {/* Card 3: Earned Incentive (Half-width on mobile) */}
            <div className="col-span-1 rounded-2xl sm:rounded-3xl border border-indigo-200/90 bg-gradient-to-br from-indigo-500/[0.08] via-purple-50/40 to-white p-3.5 sm:p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-indigo-950 truncate">
                    Earned Incentive
                  </span>
                </div>
              </div>

              <div className="mt-2.5 min-w-0">
                <AmountDisplay amount={127500} className="text-slate-900 font-extrabold" />
              </div>

              <div className="mt-1.5 sm:mt-2 text-[10.5px] sm:text-xs text-slate-500 truncate">
                Tier 2 Commission (3.0%)
              </div>
            </div>

            {/* Card 4: Overdue Accounts (Half-width on mobile fits 2 Dealers cleanly) */}
            <div className="col-span-1 rounded-2xl sm:rounded-3xl border border-rose-200/90 bg-gradient-to-br from-rose-500/[0.08] via-red-50/40 to-white p-3.5 sm:p-5 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-950 truncate">
                    Overdue Accounts
                  </span>
                </div>
              </div>

              <div className="mt-2.5">
                <div className="text-base sm:text-[22px] font-extrabold tracking-tight tabular-nums text-rose-600 leading-tight">
                  2 Dealers
                </div>
              </div>

              <div className="mt-1.5 sm:mt-2 text-[10.5px] sm:text-xs text-slate-500 truncate">
                Total: LKR 450,000
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Warranty Note Follow-up Alert (Section 23 - Arranged nicely for mobile app view) */}
      {(mobileTab === 'all' || mobileTab === 'orders') && (
        <div className="rounded-2xl sm:rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-white p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 shadow-2xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Warranty Note Follow-Up Required
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  22 Pending Notes
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
                <strong>Muthurajawela Engineering:</strong> 85 units sold, only 62 warranty registration slips received back from customer shop. Follow up during next dealer visit.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Link to="/warranty">
                  <Button size="sm" variant="outline" className="h-8 text-xs font-semibold border-amber-300 text-amber-900 bg-white hover:bg-amber-100/70 rounded-xl active:scale-95 shadow-2xs">
                    Open Warranty Desk
                  </Button>
                </Link>
                <a
                  href="tel:+94312234567"
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-200 active:scale-95 transition-all shadow-2xs"
                >
                  <Phone className="h-3.5 w-3.5" /> Call Dealer
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Pending Payments & Route Receivables (Formatted as native Mobile App Cards on phone screens) */}
        {(mobileTab === 'all' || mobileTab === 'receivables') && (
          <Card className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 p-4 sm:p-6 border-b border-slate-100">
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
                <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 font-semibold hover:bg-primary-light">
                  All Payments <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-6 space-y-3">
              {/* Mobile Filter Chips Bar (Quick touch toggles for field reps) */}
              <div className="flex items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setReceivablesFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      receivablesFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({pendingAccounts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceivablesFilter('overdue')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      receivablesFilter === 'overdue'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    Overdue (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceivablesFilter('current')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      receivablesFilter === 'current'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    Within Terms (2)
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  3 Dealers Listed
                </span>
              </div>

              {/* Account Rows / Mobile App Cards */}
              <div className="space-y-3">
                {filteredAccounts.map((pending) => (
                  <div
                    key={pending.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/60 transition-all gap-3.5 shadow-2xs hover:shadow-xs"
                  >
                    {/* Left: Dealer Avatar, Name, Code, Terms */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/customers/${pending.id}`}
                            className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors truncate"
                          >
                            {pending.name}
                          </Link>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                            {pending.code}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>Terms: {pending.creditDays}d</span>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">{pending.contactPerson}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount, Status Badge, and Mobile Touch Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-0 border-slate-100">
                      {/* Amount & Due Status */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                        <div className="font-mono text-sm sm:text-xs font-extrabold text-slate-900">
                          {formatCurrency(pending.amount)}
                        </div>
                        <Badge variant={pending.statusVariant} className="text-[10px] mt-0.5 rounded-full px-2">
                          {pending.dueStatus}
                        </Badge>
                      </div>

                      {/* Mobile Action Buttons: 1-Tap Call, WhatsApp, Collect */}
                      <div className="flex items-center gap-2">
                        {/* 1-Tap Call Dealer (Mobile Specific) */}
                        <a
                          href={`tel:${pending.phone.replace(/[^0-9+]/g, '')}`}
                          aria-label={`Call ${pending.name}`}
                          className="sm:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all shrink-0 shadow-2xs"
                          title="Call dealer"
                        >
                          <Phone className="h-4 w-4" />
                        </a>

                        {/* 1-Tap WhatsApp (Mobile Specific) */}
                        <a
                          href={whatsAppService.generateShareUrl(
                            pending.phone,
                            `Hello ${pending.contactPerson}, Kasun here from DNS Distribution regarding collection balance on account ${pending.code}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp ${pending.name}`}
                          className="sm:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all shrink-0 shadow-2xs"
                          title="WhatsApp chat"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>

                        {/* Collect Payment Button */}
                        <Link
                          to={`/payments/new?customerId=${pending.id}&amount=${pending.amount}`}
                          className="flex-1 sm:flex-none"
                        >
                          <Button
                            size="sm"
                            className="w-full sm:w-auto h-10 sm:h-9 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold gap-1.5 shadow-xs rounded-xl active:scale-[0.98] border-0"
                          >
                            <DollarSign className="h-3.5 w-3.5 hidden sm:inline" /> Collect Payment
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredAccounts.length === 0 && (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    No matching pending accounts found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Order Tracking (Section 20 - Arranged as Mobile App Delivery Tracking Cards) */}
        {(mobileTab === 'all' || mobileTab === 'orders') && (
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Recent Order Status Tracking
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live fulfillment status for active territory dispatches.
                </p>
              </div>
              <Link to="/orders">
                <Button variant="ghost" size="sm" className="text-xs text-emerald-700 font-semibold gap-0.5 p-1 h-7 hover:bg-emerald-50">
                  All <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/50 transition-all shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                          {order.orderNumber}
                        </span>
                      </div>
                      <Badge variant={order.statusVariant} className="text-[10px] rounded-full px-2">
                        {order.status}
                      </Badge>
                    </div>

                    <div className="text-xs font-semibold text-slate-800">
                      {order.customerName}
                    </div>

                    {/* Native App Stepper Indicator */}
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5 text-[11px]">
                      {order.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-2 ${
                            step.state === 'done'
                              ? 'text-emerald-700 font-medium'
                              : step.state === 'current'
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          <span className="shrink-0 text-xs">
                            {step.state === 'done' && '✓'}
                            {step.state === 'current' && '●'}
                            {step.state === 'pending' && '○'}
                          </span>
                          <span className="truncate">{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
