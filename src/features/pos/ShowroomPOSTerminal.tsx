import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { usePOS } from '../../hooks/usePOS';
import { useAuth } from '../../hooks/useAuth';
import { useProducts } from '../../hooks/useProducts';
import { Product } from '../../types/product';
import { Customer } from '../../types/customer';
import { POSTransaction } from '../../types/pos';
import { isPOSDiscountValid, validatePOSDiscount } from '../../rules/posRules';
import { formatCurrency } from '../../utils/formatters';
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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

interface CartItem {
  product: Product;
  quantity: number;
  discountPercentage: number;
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

  // Discount updates
  const handleUpdateDiscount = (productId: string, discount: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (discount < 0) return;

    try {
      validatePOSDiscount(discount, item.product.pricing.maxDiscountPercentage, 5);
      setCart((prev) =>
        prev.map((i) =>
          i.product.id === productId ? { ...i, discountPercentage: discount } : i
        )
      );
    } catch (err: any) {
      showFeedback('error', err.message);
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
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-100 overflow-hidden">
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
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Cashier</span>
                  <span className="font-bold text-slate-800">{activeSession.cashierName}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Shift #</span>
                  <span className="font-mono font-bold text-primary">{activeSession.sessionNumber}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Elapsed</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {elapsedTime || '< 1m'}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Opening Float</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(activeSession.openingBalance)}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Cash Sales</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(sessionCashSales)}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Sales</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(activeSession.totalSales)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCashMovementModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Cash In/Out
              </Button>

              <Button
                size="sm"
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Lock className="h-3.5 w-3.5" />
                Close Shift
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Shift Session Closed
              </span>
              <Button
                size="sm"
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-bold shadow-xs"
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
      <div className="flex flex-1 overflow-hidden">
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
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground h-9 px-3 text-xs shrink-0">
                Scan / Add
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProductSearchModalOpen(true)}
                className="h-9 px-3 text-xs shrink-0 flex items-center gap-1 border-primary-border text-primary-text hover:bg-primary-light"
              >
                <PackageSearch className="h-3.5 w-3.5" />
                Search Master
              </Button>
            </form>

            {/* Customer Master Selector Badge / Button */}
            <div className="md:col-span-5 flex items-center justify-between border-l border-slate-200 pl-3">
              <div className="overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.code})` : 'Walk-in Retail Customer'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomerModalOpen(true)}
                className="h-8 text-xs shrink-0 ml-2"
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
                  className={`rounded-lg px-3 py-1.5 font-bold transition-all text-xs whitespace-nowrap ${
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
                          <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                            {p.sku}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Unit Price</span>
                          <span className="text-sm font-extrabold text-slate-900">
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
        <div className="w-96 flex flex-col border-l border-slate-200 bg-white shadow-xl">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-slate-900">Current Order Cart</h2>
            </div>
            <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-bold text-primary-text">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} items
            </span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
                <ShoppingCart className="h-12 w-12 text-slate-200 mb-2" />
                <p className="text-sm font-bold text-slate-600">Cart is empty</p>
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
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
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
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(item.product.id, parseInt(e.target.value) || 1)}
                          className="h-6 w-10 text-center font-bold text-slate-900 border border-slate-300 rounded-md bg-white text-xs"
                        />
                        <button
                          onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Cashier Line Discount */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500">Disc%:</span>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="1"
                          value={item.discountPercentage}
                          onChange={(e) =>
                            handleUpdateDiscount(item.product.id, parseFloat(e.target.value) || 0)
                          }
                          className="h-6 w-12 text-center font-bold text-slate-800 border border-slate-300 rounded-md bg-white text-xs"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900 block">
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
          <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Line Discounts:</span>
                  <span>- {formatCurrency(discountTotal)}</span>
                </div>
              )}
              {taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT (18% Included):</span>
                  <span>{formatCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between text-base font-extrabold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-primary text-lg">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                Clear
              </Button>
              <Button
                size="sm"
                disabled={cart.length === 0 || !activeSession}
                onClick={() => setIsPaymentModalOpen(true)}
                className="col-span-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CreditCard className="h-4 w-4" />
                Checkout ({formatCurrency(grandTotal)})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Select Customer from Master</h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="my-4">
              <CustomerSelector
                onSelect={(c) => {
                  setSelectedCustomer(c);
                  setIsCustomerModalOpen(false);
                  showFeedback('success', `Assigned customer: ${c.name}`);
                }}
                selectedCustomerId={selectedCustomer?.id}
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
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
            </div>
          </div>
        </div>
      )}

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
      {isProductSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PackageSearch className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-slate-900">Search Canonical Product Master</h3>
              </div>
              <button
                onClick={() => setIsProductSearchModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="my-4">
              <ProductSelector
                onSelect={(prod) => {
                  handleAddToCart(prod);
                  setIsProductSearchModalOpen(false);
                }}
              />
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsProductSearchModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
