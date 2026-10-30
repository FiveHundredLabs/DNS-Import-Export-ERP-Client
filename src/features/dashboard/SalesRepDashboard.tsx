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
import { invoiceService } from '../../services/InvoiceService';
import { customerService } from '../../services/CustomerService';
import { toast } from 'sonner';

export interface RepInvoiceItem {
  id: string;
  invoiceNumber: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  contactPerson: string;
  phone: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  balanceAmount: number;
  dueStatus: 'DUE_TODAY' | 'DUE_TOMORROW' | 'OVERDUE' | 'WITHIN_TERMS';
  dueStatusLabel: string;
  dueVariant: 'destructive' | 'warning' | 'outline';
  overdueDays: number;
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

  const [liveInvoices, setLiveInvoices] = useState<RepInvoiceItem[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const loadRepInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      const [custRes, invRes] = await Promise.all([
        customerService.listCustomers({ pageSize: 100 }),
        invoiceService.getInvoices({ pageSize: 200 }),
      ]);

      // Rep portfolio filtering (BR-07 / SR-04): filter customers assigned to this sales rep
      const repCustomers = custRes.data.filter(
        (c) => !c.assignedRepId || c.assignedRepId === effectiveRepId
      );
      const repCustomerMap = new Map(repCustomers.map((c) => [c.id, c]));

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const tomorrow = new Date(now.getTime() + 86400000);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const repInvoices: RepInvoiceItem[] = [];

      for (const inv of invRes.data) {
        if (inv.status === 'CANCELLED' || inv.status === 'DRAFT') continue;
        const customer = repCustomerMap.get(inv.customerId);
        if (!customer) continue; // Strictly exclude unassigned portfolio accounts

        const uncollected = Math.max(0, inv.balanceAmount ?? (inv.totalAmount - (inv.paidAmount || 0)));
        if (uncollected <= 0) continue;

        const isOverdue = inv.dueDate < todayStr;
        const isToday = inv.dueDate === todayStr;
        const isTomorrow = inv.dueDate === tomorrowStr;

        let dueStatus: 'DUE_TODAY' | 'DUE_TOMORROW' | 'OVERDUE' | 'WITHIN_TERMS' = 'WITHIN_TERMS';
        let dueStatusLabel = 'Within Terms';
        let dueVariant: 'destructive' | 'warning' | 'outline' = 'outline';
        let overdueDays = 0;

        if (isOverdue) {
          dueStatus = 'OVERDUE';
          const dueTime = new Date(inv.dueDate).getTime();
          const todayTime = new Date(todayStr).getTime();
          overdueDays = Math.max(1, Math.round((todayTime - dueTime) / 86400000));
          dueStatusLabel = `Overdue by ${overdueDays}d`;
          dueVariant = 'destructive';
        } else if (isToday) {
          dueStatus = 'DUE_TODAY';
          dueStatusLabel = 'Due Today';
          dueVariant = 'destructive';
        } else if (isTomorrow) {
          dueStatus = 'DUE_TOMORROW';
          dueStatusLabel = 'Due Tomorrow';
          dueVariant = 'warning';
        } else {
          dueStatus = 'WITHIN_TERMS';
          const dueTime = new Date(inv.dueDate).getTime();
          const todayTime = new Date(todayStr).getTime();
          const daysLeft = Math.max(1, Math.round((dueTime - todayTime) / 86400000));
          dueStatusLabel = `Due in ${daysLeft}d`;
          dueVariant = 'outline';
        }

        repInvoices.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          orderNumber: inv.orderNumber,
          customerId: customer.id,
          customerName: customer.name,
          customerCode: customer.code,
          contactPerson: customer.contactPerson || 'Purchasing Desk',
          phone: customer.phone || '+94 11 258 9632',
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          totalAmount: inv.totalAmount,
          balanceAmount: uncollected,
          dueStatus,
          dueStatusLabel,
          dueVariant,
          overdueDays,
        });
      }

      setLiveInvoices(repInvoices);
    } catch (err) {
      console.error('Failed to load sales rep invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  }, [effectiveRepId]);

  useEffect(() => {
    loadHandoverMetrics();
    loadRepInvoices();
    const handleFocus = () => {
      loadHandoverMetrics();
      loadRepInvoices();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('cash-handover-updated', handleFocus);
    window.addEventListener('payment-recorded', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('cash-handover-updated', handleFocus);
      window.removeEventListener('payment-recorded', handleFocus);
    };
  }, [loadHandoverMetrics, loadRepInvoices]);

  // Priority Next-24-Hours Collections Queue (BR-07 / SR-04)
  const dueNext24hInvoices = useMemo(() => {
    return liveInvoices
      .filter(
        (inv) =>
          inv.dueStatus === 'OVERDUE' ||
          inv.dueStatus === 'DUE_TODAY' ||
          inv.dueStatus === 'DUE_TOMORROW'
      )
      .sort((a, b) => {
        const order = { OVERDUE: 0, DUE_TODAY: 1, DUE_TOMORROW: 2, WITHIN_TERMS: 3 };
        return order[a.dueStatus] - order[b.dueStatus];
      });
  }, [liveInvoices]);

  const handleSendWhatsAppReminder = (inv: RepInvoiceItem) => {
    const msg = `Dear ${inv.customerName}, this is a gentle reminder from DNS ERP regarding Invoice ${inv.invoiceNumber} for ${formatCurrency(inv.balanceAmount)} which is ${inv.dueStatus === 'OVERDUE' ? 'overdue' : 'due on ' + inv.dueDate}. Please arrange for settlement upon delivery or representative visit. Thank you.`;
    whatsAppService.openChat(inv.phone, msg);
    toast.success(`WhatsApp reminder opened for ${inv.customerName}`);
  };

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

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-24 md:pb-6">
      {/* 1. Header Banner:
          - MOBILE (< md): Curved brand header in primary gradient, fluid waves, mobile search
          - DESKTOP (md:): Clean enterprise white card, standard layout, desktop actions
      */}
      <div className="relative -mx-3.5 -mt-3.5 md:mx-0 md:mt-0 p-5 md:p-6 pb-7 md:pb-6 rounded-b-[2.5rem] md:rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-primary-active md:from-white md:via-white md:to-white text-primary-foreground md:text-slate-900 shadow-md md:shadow-xs shadow-primary/20 md:border md:border-slate-200/90 overflow-hidden md:overflow-visible transition-all">
        {/* Fluid Decorative Ambient Waves (Mobile only) */}
        <div className="block md:hidden absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="block md:hidden absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-xl pointer-events-none" />

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
              navigate('/payments/collect?filter=OVERDUE');
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
              navigate('/payments/collect?filter=OVERDUE');
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
        {/* Priority Section: Next 24 Hours Collections Due (BR-07 / SR-04) */}
        {dueNext24hInvoices.length > 0 && (
          <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-500/[0.08] via-amber-50/30 to-white p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wide">
                      Next 24 Hours Collections Due
                    </h2>
                    <Badge variant="destructive" className="bg-rose-600 text-white text-[10.5px] px-2 py-0.5 rounded-full font-bold">
                      {dueNext24hInvoices.length} Due Priority
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    Critical dealer receivables due within 24 hours or overdue in your sales territory.
                  </p>
                </div>
              </div>
              <Link to="/payments/collect?filter=DUE_NEXT_24H">
                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold border-amber-300 text-amber-900 bg-white hover:bg-amber-100/70 rounded-xl shadow-2xs">
                  Open Route Planner <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>

            <div className="space-y-2.5">
              {dueNext24hInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs hover:shadow-xs transition-all gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold">
                      24h
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/customers/${inv.customerId}`}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-amber-800 truncate"
                        >
                          {inv.customerName}
                        </Link>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                          {inv.customerCode}
                        </span>
                        {inv.dueStatus === 'DUE_TODAY' ? (
                          <Badge variant="destructive" className="bg-rose-600 text-white text-[10px] px-2 py-0.2 rounded-full font-bold">
                            DUE TODAY
                          </Badge>
                        ) : inv.dueStatus === 'DUE_TOMORROW' ? (
                          <Badge variant="warning" className="bg-amber-500 text-white text-[10px] px-2 py-0.2 rounded-full font-bold">
                            DUE TOMORROW
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="bg-rose-700 text-white text-[10px] px-2 py-0.2 rounded-full font-bold">
                            OVERDUE ({inv.overdueDays}d)
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>Invoice: <Link to={`/invoices/${inv.id}`} className="font-mono font-semibold text-primary hover:underline">{inv.invoiceNumber}</Link></span>
                        {inv.orderNumber && <span>• Order: <span className="font-mono">{inv.orderNumber}</span></span>}
                        <span>• Contact: <span className="text-slate-700 font-medium">{inv.contactPerson}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Balance Due</span>
                      <span className="font-mono text-sm sm:text-base font-extrabold text-slate-900">
                        {formatCurrency(inv.balanceAmount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${inv.phone.replace(/[^0-9+]/g, '')}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all shadow-2xs"
                        title={`Call ${inv.contactPerson} (${inv.phone})`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppReminder(inv)}
                        className="flex h-8 items-center gap-1 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold active:scale-95 transition-all shadow-2xs cursor-pointer"
                        title="Send WhatsApp Payment Reminder"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/payments/collect/${inv.customerId}?invoiceId=${inv.id}`)}
                        className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        <span>Collect</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Order Status Tracking */}
        <Card className={cn("rounded-2xl border border-slate-200/80 shadow-xs bg-white overflow-hidden", dueNext24hInvoices.length > 0 ? "lg:col-span-1" : "lg:col-span-3")}>
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
