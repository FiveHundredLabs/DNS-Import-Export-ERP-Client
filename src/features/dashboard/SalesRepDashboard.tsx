import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Banknote,
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
  Send,
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { whatsAppService } from '../../services/WhatsAppService';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { handoverService } from '../../services/HandoverService';
import { CashHandoverModal } from '../payments/components/CashHandoverModal';
import { User } from '../../types/auth';
import { MOCK_USERS } from '../../mock/mockUsers';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const effectiveRepId = role === 'SALES_REP' && currentUser?.id ? currentUser.id : (currentUser?.id || 'usr-106');

  const [receivablesFilter, setReceivablesFilter] = useState<'all' | 'overdue' | 'current'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cashToHandOver, setCashToHandOver] = useState<number>(0);
  const [pendingHandoverCount, setPendingHandoverCount] = useState<number>(0);
  const [loadingHandover, setLoadingHandover] = useState<boolean>(true);
  const [cashHandoverModalOpen, setCashHandoverModalOpen] = useState<boolean>(false);

  const loadHandoverMetrics = useCallback(async () => {
    try {
      setLoadingHandover(true);
      const eligible = await handoverService.getEligibleCollectionsForHandover(effectiveRepId);
      const cashOnly = eligible.filter((p) => !p.paymentMethod || p.paymentMethod === 'CASH');
      const total = cashOnly.reduce((sum, p) => sum + p.amount, 0);
      setCashToHandOver(total);
      setPendingHandoverCount(cashOnly.length);
    } catch (err) {
      console.error('Failed to load cash handover metrics:', err);
    } finally {
      setLoadingHandover(false);
    }
  }, [effectiveRepId]);

  useEffect(() => {
    loadHandoverMetrics();
    const handleFocus = () => {
      loadHandoverMetrics();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('cash-handover-updated', handleFocus);
    window.addEventListener('payment-recorded', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('cash-handover-updated', handleFocus);
      window.removeEventListener('payment-recorded', handleFocus);
    };
  }, [loadHandoverMetrics]);

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

  // Personalized dynamic greeting based on current local time
  const greetingMessage = useMemo(() => {
    const hour = new Date().getHours();
    let timeOfDay = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeOfDay = 'Good afternoon';
    } else if (hour >= 17) {
      timeOfDay = 'Good evening';
    }
    const firstName = currentUser?.name?.split(' ')[0] || 'Kasun';
    return `${timeOfDay}, ${firstName}`;
  }, [currentUser?.name]);

  // Compute initials for avatar fallback
  const userInitials = useMemo(() => {
    if (currentUser?.initials) return currentUser.initials;
    if (currentUser?.name) {
      const parts = currentUser.name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'KW';
  }, [currentUser]);

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
    <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-32 md:pb-8 max-w-7xl mx-auto">
      {/* 1. Top Greeting & Territory Card (Seamless Navy Header Extension) */}
      <div className="relative -mx-3.5 -mt-3.5 md:mx-0 md:mt-0 px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-5 md:p-6 rounded-b-2xl md:rounded-2xl bg-gradient-to-b from-primary to-[#0f2452] md:from-white md:to-white text-primary-foreground md:text-slate-900 border-b border-primary/20 md:border md:border-slate-200/90 shadow-sm md:shadow-xs transition-all">
        <div className="flex items-center gap-3.5">
          {/* User Avatar Squircle (Mobile only - Links to Profile) */}
          <Link
            to="/profile"
            className="flex md:hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white/15 text-white font-bold text-xs ring-1.5 ring-white/25 shadow-xs transition-transform active:scale-95"
            title="View Profile"
          >
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name || 'User'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{userInitials}</span>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            {/* 1. Greeting & Name (First) */}
            <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white md:text-slate-900 leading-tight truncate">
              {greetingMessage}
            </h1>

            {/* 2. Territory (Second) */}
            <div className="flex items-center gap-1.5 text-xs text-white/90 md:text-slate-600 font-medium mt-1 truncate">
              <MapPin className="h-3.5 w-3.5 text-rose-300 md:text-rose-500 shrink-0" />
              <span className="truncate">Kottawa Central Territory</span>
            </div>

            {/* 3. Dealer Information (Third) */}
            <div className="flex items-center gap-2 text-[11px] text-white/80 md:text-slate-500 font-medium mt-1">
              <div className="flex items-center gap-1 shrink-0">
                <Users className="h-3 w-3 text-sky-300 md:text-sky-600 shrink-0" />
                <span>14 Assigned Dealers</span>
              </div>
              <span className="opacity-40">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 md:text-emerald-700 bg-emerald-500/20 md:bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-400/30 md:border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 md:bg-emerald-500 animate-pulse" />
                Active Route
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Field Services & Shortcuts Grid (Mobile Only) */}
      <div className="block md:hidden bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Field Services & Shortcuts
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Quick Access</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5 text-center">
          {/* 1. Order Desk */}
          <Link to="/orders" className="flex flex-col items-center group active:scale-95 transition-transform">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs group-hover:bg-primary group-hover:text-white transition-colors">
              <PlusCircle className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-full group-hover:text-primary transition-colors">
              Order Desk
            </span>
          </Link>

          {/* 2. Dealer Directory */}
          <Link to="/customers" className="flex flex-col items-center group active:scale-95 transition-transform">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-full group-hover:text-emerald-700 transition-colors">
              Dealer Hub
            </span>
          </Link>

          {/* 3. Collect Payment */}
          <Link to="/payments/collect" className="flex flex-col items-center group active:scale-95 transition-transform">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-full group-hover:text-blue-700 transition-colors">
              Collections
            </span>
          </Link>

          {/* 4. Warranty Desk */}
          <Link to="/warranty" className="flex flex-col items-center group active:scale-95 transition-transform">
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-full group-hover:text-amber-700 transition-colors">
              Warranty
            </span>
          </Link>

          {/* 5. Quotations */}
          <Link to="/quotations" className="flex flex-col items-center group active:scale-95 transition-transform">
            <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-full group-hover:text-purple-700 transition-colors">
              Quotations
            </span>
          </Link>

          {/* 6. Invoices */}
          <Link to="/invoices" className="flex flex-col items-center group active:scale-95 transition-transform">
            <div className="h-11 w-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-2xs group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-full group-hover:text-teal-700 transition-colors">
              Invoices
            </span>
          </Link>

          {/* 7. Live Tracking */}
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="flex flex-col items-center group active:scale-95 transition-transform cursor-pointer"
          >
            <div className="h-11 w-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-2xs group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-full group-hover:text-sky-700 transition-colors">
              Tracking
            </span>
          </button>

          {/* 8. Overdue Receivables */}
          <button
            type="button"
            onClick={() => {
              setReceivablesFilter('overdue');
              const el = document.getElementById('pending-receivables-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center group active:scale-95 transition-transform cursor-pointer"
          >
            <div className="h-11 w-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <AlertCircle className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-slate-700 mt-1.5 truncate max-w-full group-hover:text-rose-700 transition-colors">
              Overdue
            </span>
          </button>
        </div>
      </div>
      {/* 3. Performance Snapshot (Clean, High-Scannability KPI Grid) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Performance Snapshot
          </span>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> 85% Target Pace
          </span>
        </div>

        {/* 5-Card Grid: Hero card spans 2 cols on mobile, 4 secondary cards in 2x2 grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {/* Card 1: Monthly Sales Target (Hero Card) */}
          <div className="col-span-2 lg:col-span-1 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/[0.07] via-emerald-50/40 to-white p-3 sm:p-4 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 truncate">
                  Monthly Sales
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200/80 shrink-0">
                <TrendingUp className="h-3 w-3" />
                85.0%
              </span>
            </div>

            <div className="mt-2 min-w-0">
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-mono">
                {formatCurrency(4250000)}
              </div>
            </div>

            {/* Target Progress Bar & Pace */}
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full w-[85%]" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 font-medium">
                <span>Target: {formatCurrency(5000000)}</span>
                <span className="font-semibold text-emerald-700">85% Pace</span>
              </div>
            </div>
          </div>

          {/* Card 2: Route Collections */}
          <div className="col-span-1 rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-500/[0.07] via-sky-50/40 to-white p-3 sm:p-4 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                  Route Collections
                </span>
              </div>

              <div className="mt-2 min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-mono">
                  {formatCurrency(2650000)}
                </div>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-blue-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-blue-600" />
              <span>89% verified</span>
            </div>
          </div>

          {/* Card 3: Cash to Hand */}
          <div className="col-span-1 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-500/[0.07] via-amber-50/40 to-white p-3 sm:p-4 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Banknote className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                    Cash to Hand Over
                  </span>
                </div>
              </div>

              <div className="mt-2 min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-mono">
                  {formatCurrency(cashToHandOver)}
                </div>
                <div className="text-[10.5px] text-slate-500 font-medium mt-0.5 truncate">
                  {pendingHandoverCount > 0
                    ? `Field Cash: ${pendingHandoverCount} ${pendingHandoverCount === 1 ? 'collection' : 'collections'}`
                    : 'All handed over'}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-1 pt-1 border-t border-amber-100/60">
              {cashToHandOver > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>To Hand Over</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCashHandoverModalOpen(true)}
                    className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 py-0.5 px-1.5 rounded-md active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <Send className="h-2.5 w-2.5" /> Hand Over
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Settled
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Earned Incentive */}
          <div className="col-span-1 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-500/[0.07] via-purple-50/40 to-white p-3 sm:p-4 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Target className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                  Earned Incentive
                </span>
              </div>

              <div className="mt-2 min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-mono">
                  {formatCurrency(127500)}
                </div>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-indigo-700 font-semibold truncate">
              Tier 2 Commission (3%)
            </div>
          </div>

          {/* Card 5: Overdue Accounts */}
          <div
            onClick={() => {
              setReceivablesFilter('overdue');
              const el = document.getElementById('pending-receivables-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="col-span-1 rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-500/[0.07] via-red-50/40 to-white p-3 sm:p-4 shadow-xs hover:shadow-sm transition-all relative overflow-hidden group flex flex-col justify-between cursor-pointer active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 leading-tight truncate">
                  Overdue Accounts
                </span>
              </div>

              <div className="mt-2">
                <div className="text-base sm:text-lg font-extrabold text-rose-600 tracking-tight">
                  2 Dealers
                </div>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-rose-700 font-semibold truncate">
              Total: {formatCurrency(450000)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Pending Payments & Route Receivables */}
        <Card id="pending-receivables-section" className="lg:col-span-2 rounded-2xl border border-slate-200/80 shadow-xs bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 p-3.5 sm:p-5 border-b border-slate-100">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                Pending Payments & Route Receivables
              </CardTitle>
            </div>
            <Link to="/payments/collect">
              <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 font-semibold hover:bg-primary-light h-8 px-2">
                All Collections <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-5 space-y-3">
            {/* Filter Chips Bar & Search Field */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setReceivablesFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    receivablesFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({pendingAccounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReceivablesFilter('overdue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    receivablesFilter === 'overdue'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Overdue (1)
                </button>
                <button
                  type="button"
                  onClick={() => setReceivablesFilter('current')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    receivablesFilter === 'current'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Within Terms (2)
                </button>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dealer or code..."
                  className="w-full h-8 pl-8 pr-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Dealer Account Cards */}
            <div className="space-y-2.5">
              {filteredAccounts.map((pending) => (
                <div
                  key={pending.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    pending.isOverdue
                      ? 'border-l-4 border-l-rose-500 border-slate-200/90 bg-rose-50/20 hover:bg-rose-50/40'
                      : 'border-l-4 border-l-amber-400 border-slate-200/90 bg-white hover:bg-slate-50/80'
                  } shadow-2xs hover:shadow-xs`}
                >
                  {/* Top Line: Dealer Name, Code, and Balance Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/customers/${pending.id}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-primary transition-colors"
                        >
                          {pending.name}
                        </Link>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
                          {pending.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span>Terms: {pending.creditDays}d</span>
                        <span>•</span>
                        <span className="text-slate-600 font-medium">{pending.contactPerson}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs sm:text-sm font-extrabold text-slate-900">
                        {formatCurrency(pending.amount)}
                      </div>
                      <Badge variant={pending.statusVariant} className="text-[10px] mt-0.5 rounded-full px-2">
                        {pending.dueStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Bottom Line: Touch Actions (Call, WhatsApp, Collect Payment) */}
                  <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-slate-100/90">
                    {/* Call Dealer */}
                    <a
                      href={`tel:${pending.phone.replace(/[^0-9+]/g, '')}`}
                      aria-label={`Call ${pending.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all shrink-0 shadow-2xs cursor-pointer"
                      title="Call dealer"
                    >
                      <Phone className="h-4 w-4" />
                    </a>

                    {/* WhatsApp */}
                    <a
                      href={whatsAppService.generateShareUrl(
                        pending.phone,
                        `Hello ${pending.contactPerson}, Kasun here from DNS Distribution regarding collection balance on account ${pending.code}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp ${pending.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all shrink-0 shadow-2xs cursor-pointer"
                      title="WhatsApp chat"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </a>

                    {/* Collect Payment */}
                    <Link
                      to={`/payments/collect/${pending.id}`}
                      className="flex-1"
                    >
                      <Button
                        size="sm"
                        className="w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-2xs rounded-lg active:scale-[0.98] border-0"
                      >
                        <DollarSign className="h-3.5 w-3.5" /> Collect Payment
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              {filteredAccounts.length === 0 && (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  No matching pending accounts found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Order Status Tracking */}
        <Card className="rounded-2xl border border-slate-200/80 shadow-xs bg-white overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Recent Order Status Tracking
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Live fulfillment status for active territory dispatches.
              </p>
            </div>
            <Link to="/orders">
              <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold gap-0.5 p-1 h-7 hover:bg-primary-light">
                All <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-3.5 sm:p-5">
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate('/orders')}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-2.5 cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-primary bg-primary-light/60 border border-primary/20 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {order.customerName}
                      </span>
                    </div>
                    <Badge variant={order.statusVariant} className="text-[10px] rounded-full px-2 shrink-0">
                      {order.status}
                    </Badge>
                  </div>

                  {/* Clean Timeline Stepper without heavy nested borders */}
                  <div className="pt-1 space-y-1.5">
                    {order.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 text-xs ${
                          step.state === 'done'
                            ? 'text-emerald-700 font-medium'
                            : step.state === 'current'
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full shrink-0 text-[10px]">
                          {step.state === 'done' && (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-[9px]">
                              ✓
                            </span>
                          )}
                          {step.state === 'current' && (
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-amber-900 font-black text-[9px] animate-pulse">
                              ●
                            </span>
                          )}
                          {step.state === 'pending' && (
                            <span className="h-3 w-3 rounded-full border border-slate-300" />
                          )}
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
      </div>

      {/* Cash Handover Submission Modal */}
      <CashHandoverModal
        isOpen={cashHandoverModalOpen}
        onClose={() => setCashHandoverModalOpen(false)}
        currentUser={currentUser || MOCK_USERS.find((u) => u.role === 'SALES_REP')!}
        onHandoverSuccess={(_handover) => {
          loadHandoverMetrics();
          toast.success(`Handover ${_handover.handoverNumber} submitted to Finance!`);
        }}
      />
    </div>
  );
}
