import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { usePOS } from '../../hooks/usePOS';
import { useAuth } from '../../hooks/useAuth';
import { useProducts } from '../../hooks/useProducts';
import { Product } from '../../types/product';
import { Customer } from '../../types/customer';
import { POSTransaction } from '../../types/pos';
import { isPOSDiscountValid, validatePOSDiscount, verifySupervisorDiscountKey } from '../../rules/posRules';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { mockInventoryRepositoryForPOS } from '../../services/POSService';

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

interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage: number;
  supervisorAuthKey?: string;
  authorizedBySupervisor?: boolean;
  supervisorName?: string;
}

export function ShowroomPOSTerminal() {
  const { currentUser } = useAuth();
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

  // Master Data Products
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState<string>('');
  const { products, loading: productsLoading } = useProducts({
    search: productSearch,
    categoryId: selectedCategory === 'ALL' ? undefined : selectedCategory,
    status: 'ACTIVE',
    pageSize: 100,
  });

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

  // Supervisor Discount Override Modal (BR-03)
  const [supervisorModal, setSupervisorModal] = useState<{
    productId: string;
    productName: string;
    requestedDiscount: number;
    maxDiscount: number;
  } | null>(null);
  const [supervisorKeyInput, setSupervisorKeyInput] = useState('');
  const [supervisorKeyError, setSupervisorKeyError] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Active shift cash sales calculation
  const sessionCashSales = transactions
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
      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}m`);
      } else {
        setElapsedTime(`${minutes}m`);
      }
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 30000);
    return () => clearInterval(timer);
  }, [activeSession?.openedAt]);

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

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Display temporary feedback
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    if (!activeSession) {
      showFeedback('error', 'Please open a shift before adding items to cart.');
      return;
    }

    const available = showroomStock[product.id] ?? 0;
    const existing = cart.find((i) => i.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (currentQtyInCart + 1 > available) {
      showFeedback(
        'error',
        `Insufficient showroom stock for ${product.name}. Available: ${available}`
      );
      return;
    }

    if (existing) {
      setCart((prev) =>
        prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        { product, quantity: 1, discountPercentage: 0 },
      ]);
    }

    showFeedback('success', `Added ${product.name} to cart.`);
  };

  // Handle barcode scanning or manual search enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Search by Barcode first, then SKU, then Name
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
      showFeedback('error', `Product not found for "${query}" in Product Master.`);
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
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQty } : i
      )
    );
  };

  // Discount updates (BR-03: standard limit 5%, supervisor authorization key required for > 5%)
  const handleUpdateDiscount = (productId: string, discount: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (discount < 0) return;

    const maxDiscount = item.product.pricing.maxDiscountPercentage || 15;

    // 1. Standard cashier discount (<= 5%)
    if (discount <= 5) {
      setCart((prev) =>
        prev.map((i) =>
          i.product.id === productId
            ? {
                ...i,
                discountPercentage: discount,
                supervisorAuthKey: undefined,
                authorizedBySupervisor: false,
                supervisorName: undefined,
              }
            : i
        )
      );
      return;
    }

    // 2. If discount > 5% but already authorized by supervisor for this item
    if (item.authorizedBySupervisor && item.supervisorAuthKey) {
      try {
        validatePOSDiscount(discount, maxDiscount, 5, item.supervisorAuthKey);
        setCart((prev) =>
          prev.map((i) =>
            i.product.id === productId ? { ...i, discountPercentage: discount } : i
          )
        );
        return;
      } catch {
        // If discount exceeds what was authorized or invalid, prompt modal
      }
    }

    // 3. Discount > 5% requires supervisor authorization key
    setSupervisorModal({
      productId,
      productName: item.product.name,
      requestedDiscount: discount,
      maxDiscount,
    });
    setSupervisorKeyInput('');
    setSupervisorKeyError(null);
  };

  const handleConfirmSupervisorKey = () => {
    if (!supervisorModal) return;

    try {
      const auth = verifySupervisorDiscountKey(supervisorKeyInput);
      if (!auth.valid) {
        setSupervisorKeyError(auth.error || 'Invalid supervisor authorization key.');
        return;
      }

      validatePOSDiscount(
        supervisorModal.requestedDiscount,
        supervisorModal.maxDiscount,
        5,
        supervisorKeyInput.trim()
      );

      setCart((prev) =>
        prev.map((i) =>
          i.product.id === supervisorModal.productId
            ? {
                ...i,
                discountPercentage: supervisorModal.requestedDiscount,
                supervisorAuthKey: supervisorKeyInput.trim(),
                authorizedBySupervisor: true,
                supervisorName: auth.supervisorName,
              }
            : i
        )
      );

      showFeedback(
        'success',
        `Supervisor discount approved by ${auth.supervisorName} (${supervisorModal.requestedDiscount}%)`
      );
      setSupervisorModal(null);
      setSupervisorKeyInput('');
      setSupervisorKeyError(null);
    } catch (err: any) {
      setSupervisorKeyError(err.message || 'Authorization failed.');
    }
  };

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Cart Financials
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
      items: cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        discountPercentage: i.discountPercentage,
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
    <div className="flex-1 h-full min-h-0 w-full flex flex-col bg-slate-100 overflow-hidden">
      {/* POS Top Navigation & Active Session Status Bar */}
      <header className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Showroom Point of Sale
              </h1>
              <p className="text-[11px] text-slate-500">Retail Fast-Checkout Terminal</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 ml-4 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <NavLink
              to="/pos"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 transition-colors ${
                  isActive ? 'bg-white text-primary-text shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              POS Terminal
            </NavLink>
            <NavLink
              to="/pos/transactions"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 transition-colors ${
                  isActive ? 'bg-white text-primary-text shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              Past Sales
            </NavLink>
            <NavLink
              to="/pos/sessions"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 transition-colors ${
                  isActive ? 'bg-white text-primary-text shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              Shift Management
            </NavLink>
          </div>
        </div>

        {/* Shift Status / Action Buttons */}
        <div className="flex items-center gap-3">
          {activeSession ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs">
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Cashier</span>
                  <span className="font-semibold text-slate-800">{activeSession.cashierName}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Shift #</span>
                  <span className="tabular-nums font-semibold text-primary">{activeSession.sessionNumber}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Elapsed</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {elapsedTime || '< 1m'}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Opening Float</span>
                  <span className="font-semibold tabular-nums text-slate-700">{formatCurrency(activeSession.openingBalance)}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 block uppercase font-semibold">Cash Sales</span>
                  <span className="font-semibold tabular-nums text-emerald-600">{formatCurrency(sessionCashSales)}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Total Sales</span>
                  <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(activeSession.totalSales)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCashMovementModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-slate-700 hover:bg-slate-50 font-medium"
              >
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Cash In/Out
              </Button>

              <Button
                size="sm"
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
              >
                <Lock className="h-3.5 w-3.5" />
                Close Shift
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Shift Session Closed
              </span>
              <Button
                size="sm"
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-medium shadow-xs"
              >
                <Play className="h-3.5 w-3.5" />
                Open Shift
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Temporary Feedback Notification */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between px-6 py-2 text-xs font-semibold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Terminal Split Screen */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Side: Product Search, Barcode Input, Catalog Grid */}
        <div className="flex flex-1 flex-col overflow-hidden p-4 space-y-3">
          {/* Quick Scanner Bar & Customer Selector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            {/* Barcode / SKU Scan Input & Quick Master Search */}
            <form onSubmit={handleBarcodeSubmit} className="md:col-span-7 flex items-center gap-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  ref={barcodeInputRef}
                  placeholder="Scan barcode or type SKU/Name and press Enter..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="pl-9 text-xs h-9 font-medium"
                />
              </div>
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground h-9 px-3 text-xs shrink-0 font-medium">
                Scan / Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProductSearchModalOpen(true)}
                className="h-9 px-3 text-xs shrink-0 flex items-center gap-1 border-primary-border text-primary-text hover:bg-primary-light font-medium"
              >
                <PackageSearch className="h-3.5 w-3.5" />
                Search Master
              </Button>
            </form>

            {/* Customer Master Selector Badge / Button */}
            <div className="md:col-span-5 flex items-center justify-between border-l border-slate-200 pl-3">
              <div className="overflow-hidden">
                <span className="text-xs font-medium text-slate-500 block">Customer</span>
                <span className="text-xs font-semibold text-slate-800 truncate block">
                  {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.code})` : 'Walk-in Retail Customer'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomerModalOpen(true)}
                className="h-8 text-xs shrink-0 ml-2 font-medium"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                {selectedCustomer ? 'Change' : 'Assign'}
              </Button>
            </div>
          </div>

          {/* Category Filter Tabs & Filter Search */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'ALL', label: 'All Products' },
                { id: 'cat-01', label: 'Switchgear' },
                { id: 'cat-02', label: 'Cables' },
                { id: 'cat-03', label: 'Lighting' },
                { id: 'cat-04', label: 'Solar & Inverters' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-all text-xs whitespace-nowrap ${
                    selectedCategory === c.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="w-52 relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filter catalog..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {productsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-slate-400">
                <Store className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No products found matching filters.</p>
                <p className="text-xs text-slate-400">Search another term or clear filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((p) => {
                  const stock = showroomStock[p.id] ?? 0;
                  const isOutOfStock = stock <= 0;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock || !activeSession}
                      onClick={() => handleAddToCart(p)}
                      className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all relative ${
                        isOutOfStock
                          ? 'border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-primary hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-slate-400">
                            {p.sku}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              stock > 10
                                ? 'bg-emerald-100 text-emerald-800'
                                : stock > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {stock > 0 ? `${stock} in Showroom` : 'Out of Stock'}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-2">
                        <div>
                          <span className="text-xs text-slate-400 block font-medium">Unit Price</span>
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">
                            {formatCurrency(p.pricing.currentSellingPrice)}
                          </span>
                        </div>
                        <span className="rounded-lg bg-primary-light p-1.5 text-primary group-hover:bg-primary group-hover:text-white">
                          <Plus className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart Panel */}
        <div className="w-96 flex flex-col border-l border-slate-200 bg-white shadow-xl min-h-0 h-full">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold text-slate-900">Current Order Cart</h2>
            </div>
            <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-text">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
                <ShoppingCart className="h-12 w-12 text-slate-200 mb-2" />
                <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">
                  Scan a barcode or click catalog products on the left to begin sales checkout.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal =
                  (item.product.pricing.currentSellingPrice *
                    item.quantity *
                    (100 - item.discountPercentage)) /
                  100;

                return (
                  <div key={item.product.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {item.product.sku} | {formatCurrency(item.product.pricing.currentSellingPrice)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.product.id)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 font-medium"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(item.product.id, parseInt(e.target.value) || 1)}
                          className="h-6 w-10 text-center font-semibold text-slate-900 border border-slate-300 rounded-md bg-white text-xs tabular-nums"
                        />
                        <button
                          onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 font-medium"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Cashier Line Discount (BR-03) */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Disc%:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.product.pricing.maxDiscountPercentage || 15}
                          step="1"
                          value={item.discountPercentage}
                          onChange={(e) =>
                            handleUpdateDiscount(item.product.id, parseFloat(e.target.value) || 0)
                          }
                          className={cn(
                            'h-6 w-12 text-center font-semibold border rounded-md text-xs tabular-nums',
                            item.authorizedBySupervisor
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                              : 'border-slate-300 bg-white text-slate-800'
                          )}
                        />
                        {item.authorizedBySupervisor && (
                          <span
                            className="flex items-center text-[10px] text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded font-bold"
                            title={`Authorized by supervisor: ${item.supervisorName || 'Approved'}`}
                          >
                            <ShieldCheck className="h-3 w-3 mr-0.5 text-emerald-600" />
                            Supv
                          </span>
                        )}
                      </div>

                      {/* Line Total */}
                      <div className="text-right">
                        <span className="font-semibold text-slate-900 tabular-nums block">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Financial Summary & Checkout Button */}
          <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-2 shrink-0">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold tabular-nums">
                  <span>Line Discounts:</span>
                  <span>- {formatCurrency(discountTotal)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT (18% Included):</span>
                  <span className="font-medium tabular-nums">{formatCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between text-base font-semibold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-primary text-xl font-semibold tabular-nums">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium"
              >
                Clear
              </Button>
              <Button
                size="sm"
                disabled={cart.length === 0 || !activeSession}
                onClick={() => setIsPaymentModalOpen(true)}
                className="col-span-2 bg-primary hover:bg-primary-hover text-primary-foreground font-medium flex items-center justify-center gap-1.5 shadow-sm text-xs"
              >
                <CreditCard className="h-4 w-4" />
                Checkout ({formatCurrency(grandTotal)})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <CustomerSelector
              onSelect={(c) => {
                setSelectedCustomer(c);
                setIsCustomerModalOpen(false);
                showFeedback('success', `Assigned customer: ${c.name}`);
              }}
              selectedCustomerId={selectedCustomer?.id}
              isModalMode
            />
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCustomer(null);
                setIsCustomerModalOpen(false);
              }}
            >
              Reset to Walk-in Customer
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsCustomerModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        cashierName={currentUser.name}
        onClose={() => setIsOpenShiftModalOpen(false)}
        onOpenShift={async (openingFloat, notes) => {
          await openShift(openingFloat, notes);
          showFeedback('success', 'Cashier shift opened successfully!');
        }}
      />

      {activeSession && (
        <CloseShiftModal
          isOpen={isCloseShiftModalOpen}
          session={activeSession}
          cashSalesTotal={sessionCashSales}
          onClose={() => setIsCloseShiftModalOpen(false)}
          onConfirmClose={async (actualCash, notes) => {
            const closed = await closeShift(activeSession.id, actualCash, notes);
            showFeedback('success', `Shift ${closed.sessionNumber} closed and reconciled.`);
          }}
        />
      )}

      {/* Quick Product Search from Master Data Modal */}
      <Dialog open={isProductSearchModalOpen} onOpenChange={setIsProductSearchModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-primary" />
              <DialogTitle>Search Canonical Product Master</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-2">
            <ProductSelector
              onSelect={(prod) => {
                handleAddToCart(prod);
                setIsProductSearchModalOpen(false);
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsProductSearchModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeSession && (
        <CashMovementModal
          isOpen={isCashMovementModalOpen}
          currentFloat={activeSession.openingBalance + activeSession.cashInTotal - activeSession.cashOutTotal}
          onClose={() => setIsCashMovementModalOpen(false)}
          onRecord={async (type, amount, reason) => {
            await recordCashMovement(activeSession.id, type, amount, reason);
            showFeedback('success', `Recorded ${type === 'CASH_IN' ? 'Cash In' : 'Cash Out'} of ${formatCurrency(amount)}`);
          }}
        />
      )}

      <POSPaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={grandTotal}
        customerName={selectedCustomer?.name}
        customerCode={selectedCustomer?.code}
        onClose={() => setIsPaymentModalOpen(false)}
        onConfirmPayment={handleCompleteSale}
      />

      <ThermalReceiptModal
        transaction={completedTx}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
      {/* Supervisor Discount Authorization Modal (BR-03) */}
      <Dialog open={!!supervisorModal} onOpenChange={(open) => !open && setSupervisorModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-800">
              <Key className="h-5 w-5 text-amber-600" />
              <DialogTitle>Supervisor Discount Authorization</DialogTitle>
            </div>
            <DialogDescription>
              Discounts exceeding standard cashier authority (5%) require supervisor security key verification.
            </DialogDescription>
          </DialogHeader>

          {supervisorModal && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 space-y-1 text-xs">
                <div className="font-semibold text-slate-900">{supervisorModal.productName}</div>
                <div className="flex items-center justify-between text-slate-600 pt-1">
                  <span>Standard Limit: <strong>5%</strong></span>
                  <span className="text-amber-800 font-bold">
                    Requested: <strong>{supervisorModal.requestedDiscount}%</strong>
                  </span>
                  <span>Product Ceiling: <strong>{supervisorModal.maxDiscount}%</strong></span>
                </div>
              </div>

              {supervisorKeyError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{supervisorKeyError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisor Security Authorization Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="Enter key (e.g. SUPER-2026, MGR-8899)"
                    value={supervisorKeyInput}
                    onChange={(e) => {
                      setSupervisorKeyInput(e.target.value);
                      setSupervisorKeyError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmSupervisorKey();
                      }
                    }}
                    className="pl-9 text-xs font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Key authorization will be immutably recorded in the central POS transaction audit log.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSupervisorModal(null);
                setSupervisorKeyInput('');
                setSupervisorKeyError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSupervisorKey}
              disabled={!supervisorKeyInput.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              Authorize &amp; Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
