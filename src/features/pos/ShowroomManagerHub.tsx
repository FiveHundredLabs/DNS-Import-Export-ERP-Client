import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePOS } from '../../hooks/usePOS';
import { useProducts } from '../../hooks/useProducts';
import { posService } from '../../services/POSService';
import {
  POSTerminal,
  POSManagerToken,
  POSManagerTokenType,
  ShowroomOffer,
  POSRefundCondition,
  POSTransaction,
  DayEndClosingSummary,
  POSReportType,
} from '../../types/pos';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

import {
  Monitor,
  Key,
  Tag,
  DollarSign,
  RotateCcw,
  Ban,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Printer,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Percent,
  Warehouse,
  ArrowDownRight,
  ArrowUpRight,
  SlidersHorizontal,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import { toast } from 'sonner';

type ManagerTab = 'TERMINALS' | 'TOKENS' | 'OFFERS' | 'RECONCILIATION' | 'REFUNDS_VOIDS' | 'REPORTS';

export function ShowroomManagerHub() {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const {
    terminals,
    sessions,
    transactions,
    tokens,
    offers,
    loading,
    refresh,
    generateManagerToken,
    approveReconciliation,
    refundWithCondition,
    voidTransaction,
    getDayEndReport,
  } = usePOS();

  const { products } = useProducts({ pageSize: 100, status: 'ACTIVE' });

  const [activeTab, setActiveTab] = useState<ManagerTab>('TERMINALS');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Token Generation State
  // -------------------------------------------------------------
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenOpType, setTokenOpType] = useState<POSManagerTokenType>('DISCOUNT');
  const [tokenTargetRef, setTokenTargetRef] = useState('');
  const [tokenDiscountPct, setTokenDiscountPct] = useState<number>(10);
  const [tokenReason, setTokenReason] = useState('');
  const [tokenValidityMins, setTokenValidityMins] = useState<number>(15);
  const [generatedTokenResult, setGeneratedTokenResult] = useState<POSManagerToken | null>(null);

  // -------------------------------------------------------------
  // Offer Creation State
  // -------------------------------------------------------------
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerName, setOfferName] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerProductId, setOfferProductId] = useState('');
  const [offerPrice, setOfferPrice] = useState<number>(0);
  const [offerStartDate, setOfferStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [offerEndDate, setOfferEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [offerMaxQty, setOfferMaxQty] = useState<number>(10);
  const [offerReason, setOfferReason] = useState<'STOCK_CLEARANCE' | 'PROMOTIONAL' | 'SEASONAL' | 'DAMAGED_BOX'>('STOCK_CLEARANCE');
  const [offerNotes, setOfferNotes] = useState('');

  // -------------------------------------------------------------
  // Refund / Void State
  // -------------------------------------------------------------
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [selectedTxForAction, setSelectedTxForAction] = useState<POSTransaction | null>(null);
  const [refundItemsCondition, setRefundItemsCondition] = useState<
    Record<string, { qty: number; condition: POSRefundCondition }>
  >({});
  const [refundReasonInput, setRefundReasonInput] = useState('');
  const [voidReasonInput, setVoidReasonInput] = useState('');

  // -------------------------------------------------------------
  // Reconciliation Action State
  // -------------------------------------------------------------
  const [selectedSessionForReview, setSelectedSessionForReview] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // -------------------------------------------------------------
  // Reports State
  // -------------------------------------------------------------
  const [selectedReportType, setSelectedReportType] = useState<POSReportType>('DAY_END_CLOSING');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dayEndSummary, setDayEndSummary] = useState<DayEndClosingSummary | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Selected product details for offer modal
  const selectedOfferProduct = useMemo(
    () => products.find((p) => p.id === offerProductId),
    [products, offerProductId]
  );

  const calculatedOfferDiscountPct = useMemo(() => {
    if (!selectedOfferProduct || offerPrice <= 0) return 0;
    const orig = selectedOfferProduct.pricing.currentSellingPrice;
    if (offerPrice >= orig) return 0;
    return Number((((orig - offerPrice) / orig) * 100).toFixed(1));
  }, [selectedOfferProduct, offerPrice]);

  // Load Day-End Summary when report tab or date changes
  useEffect(() => {
    let isMounted = true;
    async function loadDayEnd() {
      setLoadingReport(true);
      try {
        const summary = await getDayEndReport(reportDate);
        if (isMounted) setDayEndSummary(summary);
      } catch (err) {
        console.error('Failed to load day-end summary:', err);
      } finally {
        if (isMounted) setLoadingReport(false);
      }
    }
    loadDayEnd();
    return () => {
      isMounted = false;
    };
  }, [reportDate, transactions]);

  // Calculate high-level Showroom KPIs
  const totalSalesToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return transactions
      .filter((t) => t.createdAt.startsWith(today) && t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [transactions]);

  const activeTerminalsCount = useMemo(
    () => terminals.filter((t) => t.status === 'ACTIVE').length,
    [terminals]
  );

  const activeTokensCount = useMemo(() => {
    const now = new Date();
    return tokens.filter((t) => !t.isUsed && !t.isRevoked && new Date(t.expiresAt) > now).length;
  }, [tokens]);

  const pendingOffersCount = useMemo(
    () => offers.filter((o) => o.status === 'PENDING_APPROVAL').length,
    [offers]
  );

  const handleCopyToken = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    toast.success(`Copied authorization token: ${text}`);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleGenerateToken = async () => {
    if (!tokenReason.trim()) {
      toast.error('A reason is mandatory for token generation.');
      return;
    }
    try {
      const result = await generateManagerToken({
        operationType: tokenOpType,
        targetReference: tokenTargetRef.trim() || undefined,
        approvedDiscountPercentage: tokenOpType === 'DISCOUNT' ? tokenDiscountPct : undefined,
        reason: tokenReason.trim(),
        validityMinutes: tokenValidityMins,
      });
      setGeneratedTokenResult(result);
      toast.success(`Manager Token generated: ${result.token}`);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate token');
    }
  };

  const handleCreateOffer = async () => {
    if (!selectedOfferProduct) {
      toast.error('Please select a product.');
      return;
    }
    if (offerPrice <= 0 || offerPrice >= selectedOfferProduct.pricing.currentSellingPrice) {
      toast.error('Offer price must be greater than 0 and less than current selling price.');
      return;
    }
    try {
      await posService.createShowroomOffer(
        {
          offerName: offerName.trim() || `${selectedOfferProduct.name} Clearance`,
          description: offerDesc.trim(),
          productId: selectedOfferProduct.id,
          productSku: selectedOfferProduct.sku,
          productName: selectedOfferProduct.name,
          originalPrice: selectedOfferProduct.pricing.currentSellingPrice,
          offerPrice,
          startDate: offerStartDate,
          endDate: offerEndDate,
          maxQuantity: offerMaxQty > 0 ? offerMaxQty : undefined,
          reason: offerReason,
          internalNotes: offerNotes.trim(),
        },
        { id: currentUser.id, name: currentUser.name }
      );
      toast.success('Showroom offer submitted for Sales Manager approval!');
      setIsOfferModalOpen(false);
      // Reset form
      setOfferName('');
      setOfferDesc('');
      setOfferProductId('');
      setOfferPrice(0);
      setOfferNotes('');
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create showroom offer');
    }
  };

  const handleOpenRefundModal = (tx: POSTransaction) => {
    setSelectedTxForAction(tx);
    const initialConditions: Record<string, { qty: number; condition: POSRefundCondition }> = {};
    tx.items.forEach((it) => {
      initialConditions[it.productId] = { qty: it.quantity, condition: 'RESTOCKABLE' };
    });
    setRefundItemsCondition(initialConditions);
    setRefundReasonInput('');
    setIsRefundModalOpen(true);
  };

  const handleExecuteRefund = async () => {
    if (!selectedTxForAction) return;
    if (!refundReasonInput.trim()) {
      toast.error('Refund reason is required.');
      return;
    }
    const refundItemsList = Object.entries(refundItemsCondition)
      .filter(([_, val]) => val.qty > 0)
      .map(([productId, val]) => ({
        productId,
        quantity: val.qty,
        condition: val.condition,
      }));

    if (refundItemsList.length === 0) {
      toast.error('Please select at least one item quantity to refund.');
      return;
    }

    try {
      await refundWithCondition(
        selectedTxForAction.id,
        refundItemsList,
        refundReasonInput.trim()
      );
      toast.success(`Refund processed for ${selectedTxForAction.receiptNumber}`);
      setIsRefundModalOpen(false);
      setSelectedTxForAction(null);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Refund processing failed');
    }
  };

  const handleOpenVoidModal = (tx: POSTransaction) => {
    setSelectedTxForAction(tx);
    setVoidReasonInput('');
    setIsVoidModalOpen(true);
  };

  const handleExecuteVoid = async () => {
    if (!selectedTxForAction) return;
    if (!voidReasonInput.trim()) {
      toast.error('Void reason is required.');
      return;
    }
    try {
      await voidTransaction(selectedTxForAction.id, voidReasonInput.trim());
      toast.success(`Transaction ${selectedTxForAction.receiptNumber} voided successfully`);
      setIsVoidModalOpen(false);
      setSelectedTxForAction(null);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Void transaction failed');
    }
  };

  const handleReviewReconciliation = async (sessionId: string, approved: boolean) => {
    try {
      await approveReconciliation(sessionId, approved, reviewNotes.trim() || undefined);
      toast.success(approved ? 'Cash reconciliation approved.' : 'Recount requested from cashier.');
      setSelectedSessionForReview(null);
      setReviewNotes('');
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update reconciliation');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Top Banner / Showroom Manager Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Power Tools Showroom POS Command Center
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Colombo Central Showroom &bull; Terminal Monitoring, Manager Tokens, Clearance Offers & Cash Reconciliation
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              className="gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setGeneratedTokenResult(null);
                setIsTokenModalOpen(true);
              }}
              className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-semibold"
            >
              <Key className="h-3.5 w-3.5" />
              <span>Generate Auth Token</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsOfferModalOpen(true)}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-semibold"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Create Clearance Offer</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/pos/terminal')}
              className="gap-1.5 text-xs bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Launch Full-Screen Terminal</span>
            </Button>
          </div>
        </div>

        {/* High-Level Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/60">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Today's Net Sales
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalSalesToday)}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3" /> Central Showroom Floor
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/60">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Active Terminals
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {activeTerminalsCount} / {terminals.length} Online
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              {terminals.filter((t) => t.currentSessionId).length} Active Shifts Running
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/60">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Active Auth Tokens
            </div>
            <div className="text-lg font-bold text-amber-600 mt-0.5">
              {activeTokensCount} Valid Tokens
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
              Single-use manager overrides
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200/60">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Showroom Offers
            </div>
            <div className="text-lg font-bold text-indigo-600 mt-0.5">
              {offers.filter((o) => o.status === 'APPROVED').length} Active Approved
            </div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
              {pendingOffersCount} Pending Sales Mgr Review
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-4 border-b border-slate-200 -mb-4 overflow-x-auto">
          {[
            { id: 'TERMINALS', label: 'POS Terminals', icon: Monitor, badge: terminals.length },
            { id: 'TOKENS', label: 'Manager Tokens Desk', icon: Key, badge: activeTokensCount },
            { id: 'OFFERS', label: 'Clearance Offers', icon: Tag, badge: offers.length },
            { id: 'RECONCILIATION', label: 'Shifts & Cash Reconciliation', icon: DollarSign },
            { id: 'REFUNDS_VOIDS', label: 'Refunds & Voids Desk', icon: RotateCcw },
            { id: 'REPORTS', label: 'Day-End & POS Reports', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ManagerTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-indigo-600' : 'text-slate-400')} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                      isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-6 flex-1">
        {/* ========================================================= */}
        {/* TAB 1: POS TERMINALS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'TERMINALS' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Showroom POS Terminals</h2>
                <p className="text-xs text-slate-500">
                  Real-time status, active cashiers, drawer floats and full-screen terminal launching.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {terminals.map((term) => {
                const isShiftOpen = !!term.currentSessionId;
                return (
                  <Card key={term.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs',
                              term.status === 'ACTIVE'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-200 text-slate-600'
                            )}
                          >
                            <Monitor className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{term.terminalCode}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[170px]">
                              {term.name}
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={
                            term.status === 'ACTIVE'
                              ? isShiftOpen
                                ? 'default'
                                : 'outline'
                              : 'destructive'
                          }
                          className="text-[10px] font-semibold"
                        >
                          {term.status === 'ACTIVE'
                            ? isShiftOpen
                              ? 'Shift Open'
                              : 'Shift Closed'
                            : term.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Assigned Cashier:</span>
                        <span className="font-semibold text-slate-800">
                          {term.currentCashierName || 'None (Idle)'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Drawer Cash:</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(term.cashDrawerBalance)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Today's Sales:</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(term.totalSalesToday)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 text-[11px] text-slate-400">
                        <span>IP / Node:</span>
                        <span>{term.ipAddress || '127.0.0.1'}</span>
                      </div>

                      <div className="pt-2">
                        <Button
                          className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                          onClick={() => navigate(`/pos/terminal/${term.terminalCode}`)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Launch Terminal ({term.terminalCode})</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MANAGER AUTHORIZATION DESK */}
        {/* ========================================================= */}
        {activeTab === 'TOKENS' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Manager Authorization Desk</h2>
                <p className="text-xs text-slate-500">
                  Generate secure, temporary, single-use verification tokens for exceptional POS operations.
                </p>
              </div>

              <Button
                onClick={() => {
                  setGeneratedTokenResult(null);
                  setIsTokenModalOpen(true);
                }}
                className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Generate Authorization Token</span>
              </Button>
            </div>

            {/* Active Tokens Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tokens.slice(0, 6).map((tok) => {
                const isExpired = new Date(tok.expiresAt) < new Date();
                const isUsable = !tok.isUsed && !tok.isRevoked && !isExpired;
                return (
                  <Card
                    key={tok.id}
                    className={cn(
                      'border shadow-xs transition-all',
                      isUsable ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 bg-white opacity-80'
                    )}
                  >
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold uppercase',
                            tok.operationType === 'DISCOUNT' && 'border-amber-400 text-amber-800 bg-amber-50',
                            tok.operationType === 'REFUND' && 'border-blue-400 text-blue-800 bg-blue-50',
                            tok.operationType === 'VOID' && 'border-rose-400 text-rose-800 bg-rose-50'
                          )}
                        >
                          {tok.operationType} AUTH
                        </Badge>

                        <Badge
                          variant={isUsable ? 'default' : 'outline'}
                          className={cn(
                            'text-[10px]',
                            isUsable
                              ? 'bg-emerald-600 text-white'
                              : tok.isUsed
                              ? 'text-slate-500 border-slate-300'
                              : 'text-rose-600 border-rose-300'
                          )}
                        >
                          {tok.isUsed ? 'USED' : tok.isRevoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 text-amber-400 px-3 py-2 rounded-lg font-mono font-bold text-sm tracking-wider">
                        <span>{tok.token}</span>
                        <button
                          onClick={() => handleCopyToken(tok.token)}
                          className="hover:text-white transition-colors"
                          title="Copy Token"
                        >
                          {copiedToken === tok.token ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div className="text-xs space-y-1 text-slate-600">
                        {tok.approvedDiscountPercentage !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Approved Discount:</span>
                            <span className="font-bold text-slate-900">{tok.approvedDiscountPercentage}%</span>
                          </div>
                        )}
                        {tok.targetReference && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Target Ref:</span>
                            <span className="font-medium text-slate-800">{tok.targetReference}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 italic">"{tok.reason}"</div>
                      </div>

                      <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>Expires: {new Date(tok.expiresAt).toLocaleTimeString()}</span>
                        <span>By {tok.managerName}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Token Audit Table */}
            <Card className="border-slate-200">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Manager Authorization Token Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Token Code</th>
                      <th className="px-4 py-2.5">Operation</th>
                      <th className="px-4 py-2.5">Target / Parameter</th>
                      <th className="px-4 py-2.5">Reason</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Used By Cashier</th>
                      <th className="px-4 py-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tokens.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">{t.token}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">{t.operationType}</td>
                        <td className="px-4 py-2.5">
                          {t.approvedDiscountPercentage ? `${t.approvedDiscountPercentage}% max` : t.targetReference || '—'}
                        </td>
                        <td className="px-4 py-2.5 max-w-[200px] truncate" title={t.reason}>
                          {t.reason}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold',
                              t.isUsed
                                ? 'bg-slate-100 text-slate-700'
                                : t.isRevoked
                                ? 'bg-rose-100 text-rose-700'
                                : new Date(t.expiresAt) < new Date()
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            )}
                          >
                            {t.isUsed ? 'USED' : t.isRevoked ? 'REVOKED' : new Date(t.expiresAt) < new Date() ? 'EXPIRED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">{t.usedByCashierName || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-400">{formatDateTime(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SHOWROOM OFFERS MANAGEMENT */}
        {/* ========================================================= */}
        {activeTab === 'OFFERS' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Showroom Clearance Offers</h2>
                <p className="text-xs text-slate-500">
                  Product-specific stock clearance offers. Submitted to Sales Manager for authorization.
                </p>
              </div>

              <Button
                onClick={() => setIsOfferModalOpen(true)}
                className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Stock Clearance Offer</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => {
                return (
                  <Card key={offer.id} className="border-slate-200 shadow-xs flex flex-col justify-between">
                    <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                          {offer.offerCode}
                        </span>
                        <Badge
                          variant={
                            offer.status === 'APPROVED'
                              ? 'default'
                              : offer.status === 'PENDING_APPROVAL'
                              ? 'outline'
                              : 'destructive'
                          }
                          className={cn(
                            'text-[10px] font-bold',
                            offer.status === 'APPROVED' && 'bg-emerald-600 text-white',
                            offer.status === 'PENDING_APPROVAL' && 'bg-amber-50 text-amber-700 border-amber-300'
                          )}
                        >
                          {offer.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardTitle className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                        {offer.offerName}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-4 space-y-2.5 text-xs flex-1">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-800 line-clamp-1">
                          {offer.productName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">SKU: {offer.productSku}</div>
                      </div>

                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div>
                          <div className="text-[10px] text-slate-400 line-through">
                            {formatCurrency(offer.originalPrice)}
                          </div>
                          <div className="text-sm font-bold text-emerald-700">
                            {formatCurrency(offer.offerPrice)}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold">
                          {offer.discountPercentage}% OFF
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Duration:</span>
                        <span className="font-medium text-slate-700">
                          {offer.startDate} to {offer.endDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Sold / Cap:</span>
                        <span className="font-semibold text-slate-800">
                          {offer.soldQuantity} {offer.maxQuantity ? `/ ${offer.maxQuantity}` : 'units (unlimited)'}
                        </span>
                      </div>

                      {offer.rejectionReason && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-md text-[11px] text-rose-700">
                          <span className="font-bold">Sales Mgr Rejection Reason:</span> {offer.rejectionReason}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SHIFT MANAGEMENT & CASH RECONCILIATION */}
        {/* ========================================================= */}
        {activeTab === 'RECONCILIATION' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Shift & Cash Reconciliation</h2>
                <p className="text-xs text-slate-500">
                  Enforces mathematical formula: Opening Cash + Cash Sales + Cash In - Cash Out - Cash Refunds - Cash Handover
                </p>
              </div>
            </div>

            {/* Formula Explanation Card */}
            <Card className="border-indigo-200 bg-indigo-50/40">
              <CardContent className="p-4 text-xs space-y-1">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>Authoritative Expected Cash Equation</span>
                </div>
                <div className="font-mono text-[11px] text-indigo-900 bg-white/80 p-2 rounded border border-indigo-200">
                  Expected Closing Cash = Opening Float + Total Cash Sales + Cash In - Cash Out - Cash Refunds - Cash Handover
                </div>
                <div className="text-[11px] text-slate-500">
                  Card payments, cheques, and bank transfers are segregated and excluded from physical drawer balance calculations.
                </div>
              </CardContent>
            </Card>

            {/* Sessions Table */}
            <Card className="border-slate-200">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Showroom Cashier Shifts & Reconciliation Audits
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Session / Terminal</th>
                      <th className="px-4 py-2.5">Cashier</th>
                      <th className="px-4 py-2.5 text-right">Opening</th>
                      <th className="px-4 py-2.5 text-right">Cash In / Out</th>
                      <th className="px-4 py-2.5 text-right">Cash Sales</th>
                      <th className="px-4 py-2.5 text-right">Expected</th>
                      <th className="px-4 py-2.5 text-right">Counted Actual</th>
                      <th className="px-4 py-2.5 text-right">Discrepancy</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right">Manager Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.map((sess) => {
                      const diff = sess.cashDifference ?? 0;
                      return (
                        <tr key={sess.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <div className="font-mono font-semibold text-slate-900">{sess.sessionNumber}</div>
                            <div className="text-[10px] text-slate-400">{sess.terminalCode || 'TERM-SR-01'}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{sess.cashierName}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(sess.openingBalance)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-emerald-700">+{formatCurrency(sess.cashInTotal)}</span> /{' '}
                            <span className="text-rose-700">-{formatCurrency(sess.cashOutTotal)}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {formatCurrency(sess.totalSales)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-900">
                            {sess.expectedCash !== undefined ? formatCurrency(sess.expectedCash) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                            {sess.actualCash !== undefined ? formatCurrency(sess.actualCash) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {diff === 0 ? (
                              <span className="text-emerald-600">Balanced (0.00)</span>
                            ) : diff > 0 ? (
                              <span className="text-blue-600">+{formatCurrency(diff)} (Over)</span>
                            ) : (
                              <span className="text-rose-600">{formatCurrency(diff)} (Short)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant={sess.status === 'OPEN' ? 'default' : 'outline'}
                              className={cn(
                                'text-[10px]',
                                sess.status === 'OPEN' && 'bg-emerald-600 text-white',
                                sess.reconciliationStatus === 'APPROVED' && 'border-emerald-500 text-emerald-800 bg-emerald-50'
                              )}
                            >
                              {sess.reconciliationStatus || sess.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {sess.status === 'CLOSED' && sess.reconciliationStatus !== 'APPROVED' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleReviewReconciliation(sess.id, true)}
                                  className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewReconciliation(sess.id, false)}
                                  className="h-7 px-2 text-[11px] text-rose-700 border-rose-300 hover:bg-rose-50"
                                >
                                  Recount
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400">
                                {sess.reconciliationApprovedByName ? `Approved by ${sess.reconciliationApprovedByName}` : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: REFUNDS & VOIDS DESK */}
        {/* ========================================================= */}
        {activeTab === 'REFUNDS_VOIDS' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Showroom Refunds & Voids Management</h2>
                <p className="text-xs text-slate-500">
                  Audited return condition routing (Restockable / Damaged / Inspection) and unfinalized transaction voiding.
                </p>
              </div>
            </div>

            <Card className="border-slate-200">
              <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recent Sales Transactions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Receipt #</th>
                      <th className="px-4 py-2.5">Date & Time</th>
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5">Payment</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.slice(0, 15).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{tx.receiptNumber}</td>
                        <td className="px-4 py-3 text-slate-400">{formatDateTime(tx.createdAt)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{tx.customerName}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {tx.paymentMethod}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatCurrency(tx.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              tx.status === 'COMPLETED'
                                ? 'default'
                                : tx.status === 'REFUNDED'
                                ? 'outline'
                                : 'destructive'
                            }
                            className={cn(
                              'text-[10px]',
                              tx.status === 'COMPLETED' && 'bg-emerald-600 text-white',
                              tx.status === 'REFUNDED' && 'border-amber-400 text-amber-800 bg-amber-50'
                            )}
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tx.status === 'COMPLETED' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRefundModal(tx)}
                                className="h-7 px-2 text-[11px] text-blue-700 border-blue-300 hover:bg-blue-50"
                              >
                                Refund
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenVoidModal(tx)}
                                className="h-7 px-2 text-[11px] text-rose-700 border-rose-300 hover:bg-rose-50"
                              >
                                Void
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              {tx.status === 'REFUNDED'
                                ? `Refunded (${tx.refundReason || 'No reason'})`
                                : `Voided (${tx.voidReason || 'No reason'})`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: DAY-END & COMPREHENSIVE POS REPORTS */}
        {/* ========================================================= */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Showroom POS Executive Reports</h2>
                <p className="text-xs text-slate-500">
                  Comprehensive sales, tender methods, cashier productivity, reconciliation, and day-end audits.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-40 text-xs h-8"
                />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs text-slate-700 bg-white"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Report</span>
                </Button>
              </div>
            </div>

            {dayEndSummary && (
              <div className="space-y-5">
                {/* 13-Metric Master Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Gross Sales</span>
                    <div className="text-base font-bold text-slate-900">{formatCurrency(dayEndSummary.grossSales)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Discounts</span>
                    <div className="text-base font-bold text-amber-700">{formatCurrency(dayEndSummary.totalDiscounts)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Net Sales</span>
                    <div className="text-base font-bold text-indigo-700">{formatCurrency(dayEndSummary.netSales)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Cash Tendered</span>
                    <div className="text-base font-bold text-emerald-700">{formatCurrency(dayEndSummary.cashSales)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Card Tendered</span>
                    <div className="text-base font-bold text-blue-700">{formatCurrency(dayEndSummary.cardSales)}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Refunds / Voids</span>
                    <div className="text-base font-bold text-rose-700">
                      {formatCurrency(dayEndSummary.refundTotals + dayEndSummary.voidTotals)}
                    </div>
                  </div>
                </div>

                {/* Terminal Breakdown */}
                <Card className="border-slate-200">
                  <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Terminal-Wise Daily Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs text-left text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Terminal Code</th>
                          <th className="px-4 py-2.5">Terminal Name</th>
                          <th className="px-4 py-2.5 text-center">Transactions</th>
                          <th className="px-4 py-2.5 text-right">Total Sales</th>
                          <th className="px-4 py-2.5 text-right">Cash Sales</th>
                          <th className="px-4 py-2.5 text-right">Expected Drawer Cash</th>
                          <th className="px-4 py-2.5 text-right">Actual Counted</th>
                          <th className="px-4 py-2.5 text-right">Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dayEndSummary.terminalSummaries.map((t) => (
                          <tr key={t.terminalId} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{t.terminalCode}</td>
                            <td className="px-4 py-2.5">{t.terminalName}</td>
                            <td className="px-4 py-2.5 text-center font-semibold">{t.transactionCount}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                              {formatCurrency(t.totalSales)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-emerald-700 font-medium">
                              {formatCurrency(t.cashSales)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(t.expectedCash)}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(t.actualCash)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">
                              {t.difference === 0 ? (
                                <span className="text-emerald-600">0.00</span>
                              ) : t.difference > 0 ? (
                                <span className="text-blue-600">+{formatCurrency(t.difference)}</span>
                              ) : (
                                <span className="text-rose-600">{formatCurrency(t.difference)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Cashier Productivity */}
                <Card className="border-slate-200">
                  <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Cashier Productivity & Float Integrity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs text-left text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Cashier Name</th>
                          <th className="px-4 py-2.5 text-center">Shifts Completed</th>
                          <th className="px-4 py-2.5 text-center">Sales Transactions</th>
                          <th className="px-4 py-2.5 text-right">Total Net Sales</th>
                          <th className="px-4 py-2.5 text-right">Cash Difference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dayEndSummary.cashierSummaries.map((c) => (
                          <tr key={c.cashierId} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-semibold text-slate-900">{c.cashierName}</td>
                            <td className="px-4 py-2.5 text-center">{c.shiftsCount}</td>
                            <td className="px-4 py-2.5 text-center">{c.transactionsCount}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                              {formatCurrency(c.totalSales)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold">
                              {c.cashDifference === 0 ? (
                                <span className="text-emerald-600">0.00</span>
                              ) : (
                                <span className="text-rose-600">{formatCurrency(c.cashDifference)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: TOKEN GENERATION DIALOG */}
      {/* ========================================================= */}
      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Key className="h-4 w-4 text-amber-600" />
              <span>Issue Manager Authorization Token</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Generate a temporary, single-use verification token to authorize an exceptional cashier action.
            </DialogDescription>
          </DialogHeader>

          {generatedTokenResult ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <div className="text-xs font-semibold text-emerald-900">Authorization Token Ready</div>
                <div className="bg-slate-900 text-amber-400 p-3 rounded-lg font-mono font-extrabold text-xl tracking-widest flex items-center justify-center gap-3">
                  <span>{generatedTokenResult.token}</span>
                  <button
                    onClick={() => handleCopyToken(generatedTokenResult.token)}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <div className="text-[11px] text-emerald-700">
                  Single-use only &bull; Expires at{' '}
                  {new Date(generatedTokenResult.expiresAt).toLocaleTimeString()}
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setIsTokenModalOpen(false)}
                  className="w-full text-xs bg-slate-800 hover:bg-slate-900 text-white"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3.5 py-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operation Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['DISCOUNT', 'REFUND', 'VOID'] as POSManagerTokenType[]).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setTokenOpType(op)}
                      className={cn(
                        'px-2 py-2 text-xs font-bold rounded-lg border transition-colors',
                        tokenOpType === op
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              {tokenOpType === 'DISCOUNT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Approved Discount Ceiling (%)
                  </label>
                  <Input
                    type="number"
                    value={tokenDiscountPct}
                    onChange={(e) => setTokenDiscountPct(Number(e.target.value))}
                    min={1}
                    max={30}
                    className="text-xs h-9"
                  />
                  <span className="text-[10px] text-slate-400">
                    Cashier cannot apply more than this approved percentage.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Product SKU / Receipt # (Optional)
                </label>
                <Input
                  value={tokenTargetRef}
                  onChange={(e) => setTokenTargetRef(e.target.value)}
                  placeholder="e.g. DNS-MAK-AG-18V or POS-REC-..."
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorization Reason <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={tokenReason}
                  onChange={(e) => setTokenReason(e.target.value)}
                  placeholder="e.g. Customer purchasing 10 units contractor package"
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Token Validity Duration
                </label>
                <select
                  value={tokenValidityMins}
                  onChange={(e) => setTokenValidityMins(Number(e.target.value))}
                  className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3"
                >
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes (Standard)</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                </select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTokenModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerateToken}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Generate Token
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: CREATE SHOWROOM CLEARANCE OFFER */}
      {/* ========================================================= */}
      <Dialog open={isOfferModalOpen} onOpenChange={setIsOfferModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Tag className="h-4 w-4 text-indigo-600" />
              <span>Create Product Stock Clearance Offer</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Propose special clearance pricing. This request will be routed to the Sales Manager for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Power Tool / Product <span className="text-rose-500">*</span>
              </label>
              <select
                value={offerProductId}
                onChange={(e) => {
                  setOfferProductId(e.target.value);
                  const prod = products.find((p) => p.id === e.target.value);
                  if (prod) {
                    setOfferPrice(Math.round(prod.pricing.currentSellingPrice * 0.85));
                  }
                }}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="">-- Choose from Product Master --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) - Current: LKR {p.pricing.currentSellingPrice.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedOfferProduct && (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block">Catalog Price</span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency(selectedOfferProduct.pricing.currentSellingPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Min Floor Limit</span>
                  <span className="font-semibold text-slate-600">
                    {formatCurrency(selectedOfferProduct.pricing.minimumSellingPrice)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proposed Clearance Price (LKR) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  value={offerPrice || ''}
                  onChange={(e) => setOfferPrice(Number(e.target.value))}
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Computed Discount (%)
                </label>
                <div className="h-9 px-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center font-bold text-emerald-800">
                  {calculatedOfferDiscountPct}% OFF
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Offer Display Name</label>
              <Input
                value={offerName}
                onChange={(e) => setOfferName(e.target.value)}
                placeholder="e.g. 2026 Q1 Floor Clearance Sale"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                <Input
                  type="date"
                  value={offerStartDate}
                  onChange={(e) => setOfferStartDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={offerEndDate}
                  onChange={(e) => setOfferEndDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Max Units Cap (Optional)
                </label>
                <Input
                  type="number"
                  value={offerMaxQty}
                  onChange={(e) => setOfferMaxQty(Number(e.target.value))}
                  placeholder="e.g. 10"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clearance Reason</label>
                <select
                  value={offerReason}
                  onChange={(e) => setOfferReason(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="STOCK_CLEARANCE">Stock Clearance (Slow Moving)</option>
                  <option value="PROMOTIONAL">Showroom Floor Promo</option>
                  <option value="DAMAGED_BOX">Damaged Box / Display Unit</option>
                  <option value="SEASONAL">Seasonal Campaign</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Internal Notes for Sales Manager
              </label>
              <Input
                value={offerNotes}
                onChange={(e) => setOfferNotes(e.target.value)}
                placeholder="e.g. Freeing shelf space for incoming shipment"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateOffer}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 3: AUDITED REFUND WITH RETURN CONDITIONS */}
      {/* ========================================================= */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <RotateCcw className="h-4 w-4 text-blue-600" />
              <span>Process POS Transaction Refund</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select return condition for each item. Available stock is updated according to condition.
            </DialogDescription>
          </DialogHeader>

          {selectedTxForAction && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Receipt: {selectedTxForAction.receiptNumber}</span>
                  <span>Total: {formatCurrency(selectedTxForAction.totalAmount)}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Customer: {selectedTxForAction.customerName} &bull; Payment: {selectedTxForAction.paymentMethod}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Items & Return Condition</label>
                {selectedTxForAction.items.map((it) => (
                  <div key={it.productId} className="p-2.5 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{it.productNameSnapshot}</span>
                      <span>{it.quantity} purchased</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Qty to Refund</span>
                        <Input
                          type="number"
                          min={0}
                          max={it.quantity}
                          value={refundItemsCondition[it.productId]?.qty ?? it.quantity}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRefundItemsCondition((prev) => ({
                              ...prev,
                              [it.productId]: {
                                qty: val,
                                condition: prev[it.productId]?.condition || 'RESTOCKABLE',
                              },
                            }));
                          }}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Inventory Condition</span>
                        <select
                          value={refundItemsCondition[it.productId]?.condition || 'RESTOCKABLE'}
                          onChange={(e) => {
                            const cond = e.target.value as POSRefundCondition;
                            setRefundItemsCondition((prev) => ({
                              ...prev,
                              [it.productId]: {
                                qty: prev[it.productId]?.qty ?? it.quantity,
                                condition: cond,
                              },
                            }));
                          }}
                          className="w-full h-8 rounded border border-slate-300 text-xs px-2 bg-white"
                        >
                          <option value="RESTOCKABLE">Restockable (Back to Available)</option>
                          <option value="DAMAGED">Damaged (To Damaged Stock)</option>
                          <option value="REQUIRES_INSPECTION">Inspection Holding</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Refund Reason <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={refundReasonInput}
                  onChange={(e) => setRefundReasonInput(e.target.value)}
                  placeholder="e.g. Customer returned sealed unit with original receipt"
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsRefundModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteRefund}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Confirm Refund
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 4: AUDITED TRANSACTION VOID */}
      {/* ========================================================= */}
      <Dialog open={isVoidModalOpen} onOpenChange={setIsVoidModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-rose-600">
              <Ban className="h-4 w-4" />
              <span>Void POS Transaction</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Voids an unsettled transaction. Completely cancels payment and reverses Showroom stock reservations.
            </DialogDescription>
          </DialogHeader>

          {selectedTxForAction && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                <div className="font-bold">Receipt: {selectedTxForAction.receiptNumber}</div>
                <div>Amount: {formatCurrency(selectedTxForAction.totalAmount)}</div>
                <div className="text-[11px] text-rose-700 mt-1">
                  Warning: Voids cancel unfinalized transactions. For finalized sales, use Refund.
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Void Reason <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={voidReasonInput}
                  onChange={(e) => setVoidReasonInput(e.target.value)}
                  placeholder="e.g. Cashier scanned duplicate item right before checkout"
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsVoidModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteVoid}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Confirm Void
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

