import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { usePOS } from '../../hooks/usePOS';
import { useAuth } from '../../hooks/useAuth';
import { useProducts } from '../../hooks/useProducts';
import { Product } from '../../types/product';
import { Customer } from '../../types/customer';
import { POSTransaction, ShowroomOffer, POSRefundCondition } from '../../types/pos';
import { isPOSDiscountValid, validatePOSDiscount, verifySupervisorDiscountKey } from '../../rules/posRules';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { mockInventoryRepositoryForPOS, posService } from '../../services/POSService';

import { OpenShiftModal } from './OpenShiftModal';
import { CloseShiftModal } from './CloseShiftModal';
import { CashMovementModal } from './CashMovementModal';
import { POSPaymentModal } from './POSPaymentModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { CustomerSelector } from '../../components/selectors/CustomerSelector';
import { ProductSelector } from '../../components/selectors/ProductSelector';

import {
  Scan,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  AlertCircle,
  Clock,
  DollarSign,
  Lock,
  Play,
  RotateCcw,
  UserCheck,
  Receipt,
  History,
  Store,
  ArrowDownRight,
  ArrowUpRight,
  X,
  CreditCard,
  PackageSearch,
  Key,
  ShieldCheck,
  Maximize2,
  Minimize2,
  LogOut,
  Tag,
  Wrench,
  Ban,
  Building,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import { toast } from 'sonner';

interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage: number;
  serialNumber?: string;
  appliedOfferId?: string;
  supervisorAuthKey?: string;
  authorizedBySupervisor?: boolean;
  supervisorName?: string;
}

export function ShowroomPOSTerminal({ fullscreen: propFullscreen = false }: { fullscreen?: boolean }) {
  const navigate = useNavigate();
  const { terminalId } = useParams<{ terminalId?: string }>();
  const { currentUser, role } = useAuth();
  const {
    activeSession,
    transactions,
    loading: posLoading,
    openShift,
    closeShift,
    recordCashMovement,
    checkout,
    refresh,
  } = usePOS();

  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(propFullscreen);

  // Active terminal details
  const activeTerminalCode = terminalId || activeSession?.terminalCode || 'TERM-SR-01';

  // Master Data Products
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState<string>('');
  const { products, loading: productsLoading } = useProducts({
    search: productSearch,
    categoryId: selectedCategory === 'ALL' ? undefined : selectedCategory,
    status: 'ACTIVE',
    pageSize: 150,
  });

  // Active Approved Clearance Offers
  const [activeOffers, setActiveOffers] = useState<ShowroomOffer[]>([]);

  useEffect(() => {
    async function loadOffers() {
      try {
        const offers = await posService.getActiveOffers();
        setActiveOffers(offers);
      } catch (e) {
        console.error('Failed to load active offers:', e);
      }
    }
    loadOffers();
  }, []);

  // Selected Customer (defaults to Walk-in)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProductSearchModalOpen, setIsProductSearchModalOpen] = useState(false);

  // Showroom stock cache { [productId]: availableQuantity }
  const [showroomStock, setShowroomStock] = useState<Record<string, number>>({});

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [completedTx, setCompletedTx] = useState<POSTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Manager Authorization Token Modal (Discounts > Showroom ceiling)
  const [managerTokenModal, setManagerTokenModal] = useState<{
    productId: string;
    productName: string;
    requestedDiscount: number;
    showroomDiscount: number;
    maxDiscount: number;
  } | null>(null);
  const [managerTokenInput, setManagerTokenInput] = useState('');
  const [managerTokenError, setManagerTokenError] = useState<string | null>(null);

  // Serial Number input modal if product requires serial
  const [serialModalProduct, setSerialModalProduct] = useState<Product | null>(null);
  const [serialNumberInput, setSerialNumberInput] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Dynamic elapsed time tracking for active session
  const [elapsedTime, setElapsedTime] = useState<string>('');

  useEffect(() => {
    if (!activeSession?.openedAt) {
      setElapsedTime('');
      return;
    }
    const updateElapsed = () => {
      const start = new Date(activeSession.openedAt).getTime();
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - start) / 1000));
      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      setElapsedTime(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 30000);
    return () => clearInterval(timer);
  }, [activeSession?.openedAt]);

  // Active shift cash sales calculation
  const sessionCashSales = useMemo(() => {
    return transactions
      .filter(
        (t) =>
          t.sessionId === activeSession?.id &&
          t.status === 'COMPLETED' &&
          (t.paymentMethod === 'CASH' || t.paymentMethod === 'SPLIT')
      )
      .reduce((sum, t) => {
        if (t.paymentMethod === 'CASH') return sum + t.totalAmount;
        return sum + (t.cashTendered ? Math.min(t.totalAmount, t.cashTendered) : t.totalAmount);
      }, 0);
  }, [transactions, activeSession]);

  // Live Drawer Cash Formula: Opening + Cash Sales + Cash In - Cash Out - Cash Refunds - Cash Handover
  const liveExpectedDrawerCash = useMemo(() => {
    if (!activeSession) return 0;
    const opening = activeSession.openingBalance || 0;
    const cIn = activeSession.cashInTotal || 0;
    const cOut = activeSession.cashOutTotal || 0;
    const refunds = activeSession.cashRefundsTotal || 0;
    const handovers = activeSession.cashHandoverTotal || 0;
    return Number((opening + sessionCashSales + cIn - cOut - refunds - handovers).toFixed(2));
  }, [activeSession, sessionCashSales]);

  // Fetch showroom stock balances
  const refreshShowroomStock = async () => {
    try {
      const allBalances = await mockInventoryRepositoryForPOS.getAllBalances();
      const stockMap: Record<string, number> = {};
      for (const b of allBalances) {
        if (b.locationType === 'SHOWROOM' || b.locationId === 'SHOWROOM') {
          stockMap[b.productId] = b.availableQuantity;
        }
      }
      setShowroomStock(stockMap);
    } catch (e) {
      console.error('Error fetching showroom stock', e);
    }
  };

  useEffect(() => {
    refreshShowroomStock();
  }, [cart, completedTx, activeSession]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Add product to cart with serial check
  const handleAddToCart = (product: Product, serialNumber?: string) => {
    if (!activeSession) {
      showFeedback('error', 'Please open a shift before adding items to cart.');
      return;
    }

    if (product.requiresSerialNumber && !serialNumber) {
      setSerialModalProduct(product);
      setSerialNumberInput('');
      return;
    }

    const available = showroomStock[product.id] ?? 0;
    const existing = cart.find((i) => i.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (currentQtyInCart + 1 > available) {
      showFeedback('error', `Insufficient showroom stock for ${product.name}. Available: ${available}`);
      return;
    }

    // Check if product has an active approved offer
    const offer = activeOffers.find((o) => o.productId === product.id);
    const defaultDiscount = offer ? offer.discountPercentage : 0;

    if (existing) {
      setCart((prev) =>
        prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          product,
          quantity: 1,
          discountPercentage: defaultDiscount,
          serialNumber,
          appliedOfferId: offer ? offer.id : undefined,
        },
      ]);
    }

    showFeedback('success', `Added ${product.name} to cart.`);
  };

  // Power tools smart search & barcode scanner submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Search by Barcode, SKU, Serial Number, or Name
    const matched = products.find(
      (p) =>
        p.barcode === query ||
        p.sku.toLowerCase() === query.toLowerCase() ||
        p.name.toLowerCase().includes(query.toLowerCase())
    );

    if (matched) {
      handleAddToCart(matched);
      setBarcodeInput('');
    } else {
      showFeedback('error', `Product not found for "${query}" in Power Tools catalog.`);
    }
  };

  // Quantity updates
  const handleUpdateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    const available = showroomStock[productId] ?? 0;
    if (newQty > available) {
      showFeedback('error', `Cannot exceed showroom stock (${available} available).`);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  // Discount updates with Product-Level Showroom Discount ceiling check
  const handleUpdateDiscount = (productId: string, discount: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;
    if (isNaN(discount) || discount < 0) return;

    const showroomCeiling = item.product.pricing.showroomDiscountPercentage ?? 5;
    const maxDiscount = item.product.pricing.maxDiscountPercentage || 15;
    const clampedDiscount = Math.min(discount, maxDiscount);

    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        const isWithinShowroomLimit = clampedDiscount <= showroomCeiling;
        const isAuthorized =
          isWithinShowroomLimit ||
          (i.authorizedBySupervisor && clampedDiscount <= (i.discountPercentage || 0));
        return {
          ...i,
          discountPercentage: clampedDiscount,
          authorizedBySupervisor: isAuthorized,
        };
      })
    );
  };

  // One-click apply clearance offer to cart item
  const handleApplyOffer = (productId: string, offer: ShowroomOffer) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        return {
          ...i,
          discountPercentage: offer.discountPercentage,
          appliedOfferId: offer.id,
          authorizedBySupervisor: true,
          supervisorName: `Offer: ${offer.offerCode}`,
        };
      })
    );
    toast.success(`Applied Clearance Offer: ${offer.discountPercentage}% OFF`);
  };

  const handleInitiateCheckout = () => {
    if (cart.length === 0 || !activeSession) return;

    // Check if any cart item has discount > configured showroom limit without manager token
    const pendingAuthItem = cart.find((i) => {
      const showroomLimit = i.product.pricing.showroomDiscountPercentage ?? 5;
      return i.discountPercentage > showroomLimit && !i.authorizedBySupervisor;
    });

    if (pendingAuthItem) {
      const showroomLimit = pendingAuthItem.product.pricing.showroomDiscountPercentage ?? 5;
      setManagerTokenModal({
        productId: pendingAuthItem.product.id,
        productName: pendingAuthItem.product.name,
        requestedDiscount: pendingAuthItem.discountPercentage,
        showroomDiscount: showroomLimit,
        maxDiscount: pendingAuthItem.product.pricing.maxDiscountPercentage || 15,
      });
      setManagerTokenInput('');
      setManagerTokenError(null);
      return;
    }

    setIsPaymentModalOpen(true);
  };

  // Manager Verification Token validation
  const handleConfirmManagerToken = async () => {
    if (!managerTokenModal) return;

    try {
      const tokenVal = managerTokenInput.trim();
      const verified = verifySupervisorDiscountKey(tokenVal);
      if (!verified.valid) {
        setManagerTokenError(verified.error || 'Invalid manager authorization token.');
        return;
      }

      setCart((prev) =>
        prev.map((i) =>
          i.product.id === managerTokenModal.productId
            ? {
                ...i,
                discountPercentage: managerTokenModal.requestedDiscount,
                supervisorAuthKey: tokenVal,
                authorizedBySupervisor: true,
                supervisorName: verified.supervisorName,
              }
            : i
        )
      );

      toast.success(
        `Manager token accepted! Authorized by ${verified.supervisorName} (${managerTokenModal.requestedDiscount}%)`
      );
      setManagerTokenModal(null);
      setManagerTokenInput('');
      setManagerTokenError(null);
    } catch (err: any) {
      setManagerTokenError(err.message || 'Token verification failed.');
    }
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Financial calculations
  const subtotal = cart.reduce(
    (sum, i) => sum + i.product.pricing.currentSellingPrice * i.quantity,
    0
  );
  const discountTotal = cart.reduce((sum, i) => {
    const lineSub = i.product.pricing.currentSellingPrice * i.quantity;
    return sum + (lineSub * i.discountPercentage) / 100;
  }, 0);
  const netAmount = subtotal - discountTotal;
  const taxTotal = cart.reduce((sum, i) => {
    const lineSub = i.product.pricing.currentSellingPrice * i.quantity;
    const lineNet = lineSub - (lineSub * i.discountPercentage) / 100;
    const rate = i.product.pricing.taxRatePercentage || 0;
    return sum + (lineNet * rate) / 100;
  }, 0);
  const grandTotal = Number((netAmount + taxTotal).toFixed(2));

  // Checkout submission handler
  const handleCompleteSale = async (paymentDetails: any) => {
    if (!activeSession) return;

    const tx = await checkout({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Retail Customer',
      customerCode: selectedCustomer?.code,
      terminalId: activeSession.terminalId || 'term-01',
      terminalCode: activeTerminalCode,
      items: cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        discountPercentage: i.discountPercentage,
        serialNumber: i.serialNumber,
        appliedOfferId: i.appliedOfferId,
        supervisorAuthKey: i.supervisorAuthKey,
        authorizedBySupervisor: i.authorizedBySupervisor,
      })),
      paymentMethod: paymentDetails.paymentMethod,
      cashTendered: paymentDetails.cashTendered,
      chequeDetails: paymentDetails.chequeDetails,
    });

    setCart([]);
    setSelectedCustomer(null);
    setCompletedTx(tx);
    setIsReceiptModalOpen(true);
    await refreshShowroomStock();
    showFeedback('success', `Sale completed successfully! Receipt #${tx.receiptNumber}`);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-slate-100 overflow-hidden select-none',
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'h-full flex-1 min-h-0 w-full'
      )}
    >
      {/* ========================================================= */}
      {/* TOP HEADER: RETAIL STATUS BAR & DRAWER METRICS */}
      {/* ========================================================= */}
      <header className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-xs">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">POWER TOOLS POS</span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold border-indigo-200 text-indigo-700 bg-indigo-50">
                {activeTerminalCode}
              </Badge>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Cashier: <span className="font-semibold text-slate-800">{currentUser.name}</span>
              {activeSession && ` • Active ${elapsedTime || '0m'}`}
            </div>
          </div>
        </div>

        {/* Live Drawer Cash Widget */}
        {activeSession && (
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Live Drawer Float
              </div>
              <div className="text-sm font-extrabold text-emerald-700 font-mono">
                {formatCurrency(liveExpectedDrawerCash)}
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCashMovementModalOpen(true)}
                className="h-7 px-2 text-[11px] font-bold gap-1 text-slate-700 bg-white"
              >
                <DollarSign className="h-3 w-3 text-emerald-600" />
                <span>Cash In/Out</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="h-7 px-2 text-[11px] font-bold gap-1 text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"
              >
                <Lock className="h-3 w-3" />
                <span>Close Shift</span>
              </Button>
            </div>
          </div>
        )}

        {/* Terminal Controls & Navigation */}
        <div className="flex items-center gap-2">
          {!activeSession && (
            <Button
              size="sm"
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Open Cashier Shift</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="h-8 px-2.5 text-xs text-slate-600 gap-1 bg-white hover:bg-slate-50"
            title={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Standard Mode' : 'Full Screen'}</span>
          </Button>

          {(role === 'MANAGER' || role === 'DIRECTOR') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pos/manager')}
              className="h-8 px-2.5 text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 gap-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Manager Hub</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main POS Interface Split View */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* ========================================================= */}
        {/* LEFT / MAIN AREA: POWER TOOLS SEARCH & CATALOG */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 border-r border-slate-200 overflow-hidden">
          {/* Barcode Scanner & Search Bar */}
          <div className="p-4 bg-white border-b border-slate-200 space-y-3 shrink-0">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  ref={barcodeInputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or enter SKU / Model Number (e.g. 8901020304011, DNS-MAK-AG-18V)..."
                  className="pl-10 h-10 text-xs font-medium bg-slate-50 border-slate-300 focus:bg-white"
                />
              </div>

              <Button
                type="submit"
                className="h-10 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </Button>
            </form>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'ALL', label: 'All Catalog' },
                { id: 'cat-05', label: 'Power Tools' },
                { id: 'cat-01', label: 'Switchgear & Breakers' },
                { id: 'cat-02', label: 'Industrial Cables' },
                { id: 'cat-03', label: 'Commercial Lighting' },
                { id: 'cat-04', label: 'Solar & Inverters' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border',
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Flash Alert */}
          {feedbackMsg && (
            <div
              className={cn(
                'px-4 py-2 text-xs font-semibold transition-all shrink-0 border-b flex items-center justify-between',
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              )}
            >
              <span>{feedbackMsg.text}</span>
              <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            {productsLoading ? (
              <div className="flex items-center justify-center h-48 text-xs text-slate-400">
                Loading power tools catalog...
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                <PackageSearch className="h-8 w-8 mb-2 text-slate-300" />
                <span>No power tools found matching query.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((prod) => {
                  const stock = showroomStock[prod.id] ?? 0;
                  const isOutOfStock = stock <= 0;
                  const offer = activeOffers.find((o) => o.productId === prod.id);
                  const showroomDiscLimit = prod.pricing.showroomDiscountPercentage ?? 5;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && handleAddToCart(prod)}
                      className={cn(
                        'bg-white rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer relative shadow-2xs',
                        isOutOfStock
                          ? 'opacity-60 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-indigo-500 hover:shadow-md'
                      )}
                    >
                      {offer && (
                        <div className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                          Clearance {offer.discountPercentage}%
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="text-[10px] font-mono text-slate-400 truncate">{prod.sku}</div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {prod.name}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          {offer ? (
                            <div>
                              <div className="text-[10px] text-slate-400 line-through">
                                {formatCurrency(prod.pricing.currentSellingPrice)}
                              </div>
                              <div className="text-xs font-extrabold text-emerald-700">
                                {formatCurrency(offer.offerPrice)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-slate-900">
                              {formatCurrency(prod.pricing.currentSellingPrice)}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500">
                            Cashier limit: <span className="font-semibold text-indigo-700">{showroomDiscLimit}%</span>
                          </div>
                        </div>

                        <Badge
                          variant={stock > 10 ? 'outline' : stock > 0 ? 'secondary' : 'destructive'}
                          className="text-[9px] font-bold"
                        >
                          {stock > 0 ? `${stock} in stock` : 'Out of Stock'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT / CHECKOUT AREA: ACTIVE CART & TENDER */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[420px] flex flex-col bg-white border-l border-slate-200 shadow-sm shrink-0">
          {/* Customer Selection Banner */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-500" />
              <div>
                <div className="font-semibold text-slate-800">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in Retail Customer'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedCustomer ? `Code: ${selectedCustomer.code}` : 'Standard Retail Billing'}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomerModalOpen(true)}
              className="h-7 px-2 text-[11px] text-slate-700 bg-white"
            >
              {selectedCustomer ? 'Change' : 'Select Customer'}
            </Button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs">
                <ShoppingCart className="h-10 w-10 mb-2 text-slate-300 stroke-1" />
                <span>Cart is empty</span>
                <span className="text-[11px] text-slate-400">Scan or select power tools to begin</span>
              </div>
            ) : (
              cart.map((item) => {
                const showroomLimit = item.product.pricing.showroomDiscountPercentage ?? 5;
                const exceedsShowroomLimit = item.discountPercentage > showroomLimit;
                const offer = activeOffers.find((o) => o.productId === item.product.id);

                return (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.product.sku} &bull; {formatCurrency(item.product.pricing.currentSellingPrice)}
                        </div>
                        {item.serialNumber && (
                          <div className="text-[10px] text-indigo-700 font-mono font-semibold">
                            SN: {item.serialNumber}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {/* Qty controls */}
                      <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                          className="h-7 w-7 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                          className="h-7 w-7 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Discount input with Showroom limit enforcement */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-semibold">Disc:</span>
                        <div className="relative w-16">
                          <Input
                            type="number"
                            min="0"
                            max={item.product.pricing.maxDiscountPercentage || 15}
                            value={item.discountPercentage}
                            onChange={(e) => handleUpdateDiscount(item.product.id, Number(e.target.value))}
                            className="h-7 text-xs font-bold pr-5 text-right"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Line total */}
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-slate-900">
                          {formatCurrency(
                            (item.product.pricing.currentSellingPrice *
                              item.quantity *
                              (100 - item.discountPercentage)) /
                              100
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Showroom Discount / Token Badge */}
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                      {exceedsShowroomLimit ? (
                        item.authorizedBySupervisor ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Manager Authorized ({item.supervisorName})
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <Key className="h-3 w-3 text-amber-600" />
                            Exceeds Limit ({showroomLimit}%) &bull; Manager Token Required
                          </span>
                        )
                      ) : (
                        <span className="text-slate-500">
                          Cashier Limit: <span className="font-semibold text-slate-700">{showroomLimit}%</span>
                        </span>
                      )}

                      {offer && !item.appliedOfferId && (
                        <button
                          type="button"
                          onClick={() => handleApplyOffer(item.product.id, offer)}
                          className="text-[10px] text-indigo-700 hover:underline font-bold"
                        >
                          Apply Offer ({offer.discountPercentage}%)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Checkout Financials Summary & Complete Sale Button */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({cart.reduce((sum, i) => sum + i.quantity, 0)} items):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Total Discounts:</span>
                <span className="font-bold">-{formatCurrency(discountTotal)}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between">
                  <span>VAT / Taxes (18%):</span>
                  <span className="font-semibold">{formatCurrency(taxTotal)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">Net Payable:</span>
              <span className="text-2xl font-black text-indigo-900 font-mono tracking-tight">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            <Button
              onClick={handleInitiateCheckout}
              disabled={cart.length === 0 || !activeSession}
              className="w-full h-12 text-sm font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl gap-2"
            >
              <CreditCard className="h-5 w-5" />
              <span>Complete Sale &bull; Tender Payment</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: MANAGER AUTHORIZATION TOKEN PROMPT */}
      {/* ========================================================= */}
      <Dialog open={!!managerTokenModal} onOpenChange={(open) => !open && setManagerTokenModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-amber-800">
              <Key className="h-4 w-4 text-amber-600" />
              <span>Manager Authorization Required</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              The requested discount exceeds the product showroom limit. Enter the Showroom Manager verification token.
            </DialogDescription>
          </DialogHeader>

          {managerTokenModal && (
            <div className="space-y-3.5 py-2 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 space-y-1">
                <div className="font-bold">{managerTokenModal.productName}</div>
                <div className="flex justify-between text-[11px]">
                  <span>Showroom Standard Limit:</span>
                  <span className="font-semibold">{managerTokenModal.showroomDiscount}%</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-amber-900">
                  <span>Requested Discount:</span>
                  <span>{managerTokenModal.requestedDiscount}%</span>
                </div>
              </div>

              {managerTokenError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-semibold text-xs">
                  {managerTokenError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Manager Verification Token (AUTH-XXXX-XXXX) <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={managerTokenInput}
                  onChange={(e) => setManagerTokenInput(e.target.value.toUpperCase())}
                  placeholder="e.g. AUTH-7421-9932"
                  className="font-mono text-sm tracking-wider uppercase font-bold"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400">
                  Obtain this single-use token from the Showroom Manager on duty.
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setManagerTokenModal(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmManagerToken}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Verify & Authorize
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 2: SERIAL NUMBER CAPTURE MODAL */}
      {/* ========================================================= */}
      <Dialog open={!!serialModalProduct} onOpenChange={(open) => !open && setSerialModalProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <Scan className="h-4 w-4 text-indigo-600" />
              <span>Unit Serial Number Required</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This power tool is tracked unit-wise. Scan or enter the unique manufacturer serial number.
            </DialogDescription>
          </DialogHeader>

          {serialModalProduct && (
            <div className="space-y-3 py-2 text-xs">
              <div className="font-semibold text-slate-800">{serialModalProduct.name}</div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Serial Number (SN) <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={serialNumberInput}
                  onChange={(e) => setSerialNumberInput(e.target.value)}
                  placeholder="e.g. SN-BSH-2026-9921"
                  className="font-mono text-xs font-semibold"
                  autoFocus
                />
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setSerialModalProduct(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!serialNumberInput.trim()}
                  onClick={() => {
                    handleAddToCart(serialModalProduct, serialNumberInput.trim());
                    setSerialModalProduct(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirm Unit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onOpenShift={openShift}
      />

      <CloseShiftModal
        isOpen={isCloseShiftModalOpen}
        session={activeSession}
        onClose={() => setIsCloseShiftModalOpen(false)}
        onCloseShift={closeShift}
      />

      <CashMovementModal
        isOpen={isCashMovementModalOpen}
        session={activeSession}
        onClose={() => setIsCashMovementModalOpen(false)}
        onRecordMovement={recordCashMovement}
      />

      <POSPaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={grandTotal}
        customerName={selectedCustomer?.name}
        customerCode={selectedCustomer?.code}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirmPayment={handleCompleteSale}
      />

      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        transaction={completedTx}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      <CustomerSelector
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={(c) => {
          setSelectedCustomer(c);
          setIsCustomerModalOpen(false);
        }}
      />
    </div>
  );
}
