import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from '../../components/ui/dialog';
import {
  CustomerWarrantyTally,
  CustomerWarrantyTallyItem,
} from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { WarrantyStatusBadge } from './WarrantyStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import { MOCK_CUSTOMERS } from '../../mock/mockCustomers';
import {
  Store,
  FileCheck2,
  AlertTriangle,
  Barcode,
  PackageCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Info,
  RefreshCw,
  Clock,
  Sparkles,
  Eye,
  MessageSquare,
  Lock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';

export interface ProductWarrantyGroup {
  productId: string;
  productName: string;
  sku: string;
  totalUnits: number;
  verifiedCount: number;
  pendingCount: number;
  receivedItems: CustomerWarrantyTallyItem[];
  notReceivedItems: CustomerWarrantyTallyItem[];
}

interface SalesRepWarrantyPageProps {
  /** If embedded or preselected for a specific customer */
  preselectedCustomerId?: string;
}

export function SalesRepWarrantyPage({ preselectedCustomerId }: SalesRepWarrantyPageProps) {
  const { role, currentUser } = useAuth();
  const isSalesRep = role === 'SALES_REP';
  const isAreaManager = role === 'AREA_MANAGER';

  // Customer Selection state - scoped strictly to assigned customers
  const availableCustomers = useMemo(() => {
    if (isSalesRep) {
      return MOCK_CUSTOMERS.filter((c) => c.assignedRepId === currentUser.id);
    }
    if (isAreaManager) {
      return MOCK_CUSTOMERS.filter((c) => c.areaId === currentUser.areaId);
    }
    return MOCK_CUSTOMERS;
  }, [isSalesRep, isAreaManager, currentUser.id, currentUser.areaId]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomerId || availableCustomers[0]?.id || 'cust-001'
  );

  // Tally & Units Data
  const [tally, setTally] = useState<CustomerWarrantyTally | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'PENDING' | 'REGISTERED'>('ALL');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  // View-Only Unit Detail Modal
  const [viewingUnit, setViewingUnit] = useState<CustomerWarrantyTallyItem | null>(null);

  // Product Expansion State
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const toggleProductExpand = (key: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const loadTally = async (custId: string) => {
    if (!custId) {
      setTally(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await warrantyService.getCustomerWarrantyTally(custId, currentUser);
      setTally(data);
    } catch (err) {
      console.error('Failed to load customer warranty tally:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      loadTally(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleCopyScript = () => {
    if (!tally) return;
    const script = `Customer: ${tally.customerName} (${tally.customerCode})\n\n"You received ${tally.totalSupplied} units from us, but warranty registrations have been completed for only ${tally.registeredCount} units. Please provide the remaining ${tally.pendingCount} warranty notes."`;
    navigator.clipboard?.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleCopyBarcode = (bcode: string) => {
    navigator.clipboard?.writeText(bcode);
    setCopiedBarcode(bcode);
    setTimeout(() => setCopiedBarcode(null), 1800);
  };

  // Product-wise Grouping of Tally Items
  const allProductGroups = useMemo<ProductWarrantyGroup[]>(() => {
    if (!tally?.items) return [];

    const map = new Map<string, ProductWarrantyGroup>();

    for (const item of tally.items) {
      const key = item.productId || item.sku || item.productName;
      if (!map.has(key)) {
        map.set(key, {
          productId: item.productId || key,
          productName: item.productName,
          sku: item.sku,
          totalUnits: 0,
          verifiedCount: 0,
          pendingCount: 0,
          receivedItems: [],
          notReceivedItems: [],
        });
      }

      const group = map.get(key)!;
      const qty = item.quantity || 1;
      group.totalUnits += qty;
      if (item.isRegistered || item.hasNoteReceipt) {
        group.verifiedCount += qty;
        group.receivedItems.push(item);
      } else {
        group.pendingCount += qty;
        group.notReceivedItems.push(item);
      }
    }

    return Array.from(map.values());
  }, [tally]);

  const pendingProductsCount = useMemo(
    () => allProductGroups.filter((g) => g.pendingCount > 0).length,
    [allProductGroups]
  );

  const fullyVerifiedProductsCount = useMemo(
    () => allProductGroups.filter((g) => g.pendingCount === 0 && g.totalUnits > 0).length,
    [allProductGroups]
  );

  // Filtered Product Groups according to search & status filter
  const filteredProductGroups = useMemo(() => {
    return allProductGroups.filter((group) => {
      // 1. Status Filter
      if (unitFilter === 'PENDING' && group.pendingCount === 0) return false;
      if (unitFilter === 'REGISTERED' && group.verifiedCount === 0) return false;

      // 2. Search Query (matches product name, SKU, or any barcode within received or notReceived)
      const q = unitSearch.toLowerCase().trim();
      if (!q) return true;

      const matchesProduct =
        group.productName.toLowerCase().includes(q) ||
        group.sku.toLowerCase().includes(q);
      if (matchesProduct) return true;

      const matchesBarcode =
        group.receivedItems.some(
          (i) =>
            i.barcode.toLowerCase().includes(q) ||
            (i.serialNumber && i.serialNumber.toLowerCase().includes(q)) ||
            (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q))
        ) ||
        group.notReceivedItems.some(
          (i) =>
            i.barcode.toLowerCase().includes(q) ||
            (i.serialNumber && i.serialNumber.toLowerCase().includes(q)) ||
            (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q))
        );

      return matchesBarcode;
    });
  }, [allProductGroups, unitFilter, unitSearch]);

  const allExpanded = useMemo(() => {
    if (filteredProductGroups.length === 0) return false;
    return filteredProductGroups.every((g) => expandedProducts[g.productId]);
  }, [filteredProductGroups, expandedProducts]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedProducts({});
    } else {
      const next: Record<string, boolean> = {};
      filteredProductGroups.forEach((g) => {
        next[g.productId] = true;
      });
      setExpandedProducts(next);
    }
  };

  const selectedCustomerObj = availableCustomers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Banner / Role Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Store className="h-6 w-6 text-primary" />
              {isAreaManager
                ? 'Area Manager – Customer Warranty Follow-up'
                : isSalesRep
                ? 'Sales Representative – Warranty Follow-up'
                : 'Customer Warranty Follow-up'}
            </h1>
            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-300 font-semibold text-xs gap-1">
              <Lock className="h-3 w-3" />
              VIEW ONLY
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track customer supplied inventory, identify pending warranty notes, and follow up with shop owners during field visits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => loadTally(selectedCustomerId)}
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* STRICT SALES REP VIEW RULE ALERT */}
      <div className="bg-gradient-to-r from-amber-50/90 via-sky-50/50 to-indigo-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-slate-700 shadow-xs flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
          <Lock className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <span>{isAreaManager ? 'Area Manager View-Only Access' : 'Sales Representative View-Only Mode'}</span>
            <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[10px] uppercase font-bold">
              Company Policy
            </span>
          </h4>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            Area Managers and Sales Representatives have <strong>read-only monitoring access</strong> for assigned customers. You cannot edit warranty information, change selling dates, alter warranty periods, register warranties, or file warranty claims. Use this tally to monitor customer units and request missing warranty counterfoils.
          </p>
        </div>
      </div>

      {/* 4. CUSTOMER SELECTION AT THE TOP */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select Customer / Dealer Shop
              </label>
              <p className="text-xs text-slate-500">
                Choose a customer to see all units supplied and warranty registration status.
              </p>
            </div>

            <div className="w-full md:w-96">
              <Select
                value={selectedCustomerId}
                onValueChange={(val) => setSelectedCustomerId(val)}
              >
                <SelectTrigger className="w-full text-xs h-10 border-slate-300 bg-white font-medium">
                  <SelectValue placeholder="Select a Customer" />
                </SelectTrigger>
                <SelectContent>
                  {availableCustomers.map((cust) => (
                    <SelectItem key={cust.id} value={cust.id} className="text-xs py-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{cust.name}</span>
                        <span className="text-[10px] text-slate-500">
                          Code: {cust.code} • Area: {cust.areaName || 'Colombo'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. WARRANTY FOLLOW-UP / TALLY SUMMARY CARDS */}
      {tally && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-slate-900">
                Customer: <span className="text-primary">{tally.customerName}</span>
              </span>
              <Badge variant="outline" className="font-mono text-[10px] text-slate-600">
                {tally.customerCode}
              </Badge>
            </div>
            {selectedCustomerObj?.contactPerson && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                Contact: <strong className="text-slate-700">{selectedCustomerObj.contactPerson}</strong> ({selectedCustomerObj.phone})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Sold / Supplied */}
            <Card className="p-4 bg-white border-slate-200 shadow-xs hover:shadow-sm transition-all border-l-4 border-l-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Total Sold / Supplied
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-extrabold tabular-nums text-slate-900">
                      {tally.totalSupplied}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">Units</span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
                  <PackageCheck className="h-6 w-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Products supplied by distributor to this shop
              </p>
            </Card>

            {/* Warranty Registered */}
            <Card className="p-4 bg-white border-slate-200 shadow-xs hover:shadow-sm transition-all border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
                    Warranty Registered
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-extrabold tabular-nums text-emerald-700">
                      {tally.registeredCount}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">Units</span>
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                  <FileCheck2 className="h-6 w-6" />
                </div>
              </div>
              <p className="text-[11px] text-emerald-800 mt-2 font-medium">
                End-customer receipt verified & active
              </p>
            </Card>

            {/* Pending Registration */}
            <Card className="p-4 bg-white border-slate-200 shadow-xs hover:shadow-sm transition-all border-l-4 border-l-rose-600">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">
                    Pending Registration
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-extrabold tabular-nums text-rose-700">
                      {tally.pendingCount}
                    </span>
                    <span className="text-xs font-semibold text-rose-700">Units</span>
                  </div>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
              <p className="text-[11px] text-rose-800 mt-2 font-medium">
                Missing warranty notes needing follow-up
              </p>
            </Card>
          </div>

          {/* CUSTOMER VISIT FOLLOW-UP SCRIPT ASSISTANT */}
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-sky-50/60 to-purple-50/70 shadow-xs">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700 shrink-0 mt-0.5">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                        Customer Visit Talking Point / Script
                      </span>
                      <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.2 rounded font-semibold">
                        Field Follow-up
                      </span>
                    </div>
                    <blockquote className="text-xs text-indigo-950 font-medium italic leading-relaxed">
                      &ldquo;You received {tally.totalSupplied} units from us, but warranty registrations have been completed for only {tally.registeredCount} units. Please provide the remaining {tally.pendingCount} warranty notes.&rdquo;
                    </blockquote>
                  </div>
                </div>

                <Button
                  onClick={handleCopyScript}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5 shrink-0 shadow-xs"
                >
                  {copiedScript ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Script Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Follow-up Script
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SUPPLIED PRODUCTS & PRODUCT-WISE VERIFICATION */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Product-Wise Warranty Verification ({allProductGroups.length} Products • {tally.items.length} Units)
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                    Product-by-product verification tally for {tally.customerName}. Expand any product to inspect received and not received barcodes.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search input */}
                  <div className="relative w-full sm:w-56">
                    <Input
                      type="text"
                      placeholder="Search product, barcode..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setUnitFilter('ALL')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                        unitFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({allProductGroups.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitFilter('PENDING')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                        unitFilter === 'PENDING'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pending ({pendingProductsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitFilter('REGISTERED')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                        unitFilter === 'REGISTERED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Verified ({fullyVerifiedProductsCount})
                    </button>
                  </div>

                  {/* Expand / Collapse All */}
                  {filteredProductGroups.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleExpandAll}
                      className="h-8 px-2.5 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {allExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          <span>Collapse All</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          <span>Expand All</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                  Loading product warranty verification...
                </div>
              ) : filteredProductGroups.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <PackageCheck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No products found</p>
                  <p className="text-slate-400 mt-1">Try resetting the search or filter</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredProductGroups.map((group) => {
                    const isExpanded = !!expandedProducts[group.productId];
                    const percent =
                      group.totalUnits > 0
                        ? Math.round((group.verifiedCount / group.totalUnits) * 100)
                        : 0;
                    const isFullyVerified = group.pendingCount === 0;

                    return (
                      <div
                        key={group.productId}
                        className={`rounded-2xl border transition-all ${
                          isExpanded
                            ? 'border-primary/40 shadow-sm bg-white'
                            : isFullyVerified
                            ? 'border-emerald-200/90 bg-white hover:border-emerald-300 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        {/* ── Product Summary Row ── */}
                        <div
                          onClick={() => toggleProductExpand(group.productId)}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50 transition-colors rounded-2xl"
                        >
                          {/* Left: Product Info */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                                isFullyVerified
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Package className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900">
                                  {group.productName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] text-slate-500 bg-slate-50"
                                >
                                  {group.sku}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                                <span>
                                  Total Supplied: <strong className="text-slate-800">{group.totalUnits} Units</strong>
                                </span>
                                <span>•</span>
                                <span className="text-emerald-700 font-semibold">
                                  {group.verifiedCount} Verified
                                </span>
                                <span>•</span>
                                <span
                                  className={
                                    group.pendingCount > 0
                                      ? 'text-rose-600 font-semibold'
                                      : 'text-slate-400'
                                  }
                                >
                                  {group.pendingCount} Pending
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Progress & Toggle */}
                          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                            <div className="text-left md:text-right">
                              <div className="flex items-center gap-2 md:justify-end">
                                <span className="text-xs font-bold text-slate-900">
                                  {group.verifiedCount} / {group.totalUnits} Units Verified
                                </span>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    isFullyVerified
                                      ? 'bg-emerald-100 text-emerald-800 font-bold'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {percent}%
                                </span>
                              </div>
                              {/* Visual ratio progress bar */}
                              <div className="w-40 sm:w-48 h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5 flex">
                                <div
                                  className="bg-emerald-500 h-full transition-all duration-300"
                                  style={{ width: `${percent}%` }}
                                  title={`${group.verifiedCount} units verified`}
                                />
                                <div
                                  className="bg-rose-400 h-full transition-all duration-300"
                                  style={{ width: `${100 - percent}%` }}
                                  title={`${group.pendingCount} units pending`}
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProductExpand(group.productId);
                              }}
                              className="h-8 px-3 text-xs gap-1.5 font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 shrink-0 cursor-pointer"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 text-slate-500" />
                                  <span>Hide Barcodes</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 text-slate-500" />
                                  <span>View Barcodes ({group.totalUnits})</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* ── Expanded Product Details: Received & Not Received Barcodes ── */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 p-4 bg-slate-50/50 rounded-b-2xl space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* 1. RECEIVED / VERIFIED BARCODES */}
                              <div className="bg-white rounded-xl border border-emerald-200/80 shadow-2xs overflow-hidden flex flex-col">
                                <div className="bg-emerald-50/80 px-3.5 py-2.5 border-b border-emerald-100 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                                      Received &amp; Verified Barcodes
                                    </span>
                                  </div>
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10.5px] font-bold">
                                    {group.receivedItems.length} Verified
                                  </Badge>
                                </div>

                                <div className="p-3 divide-y divide-slate-100 flex-1 max-h-96 overflow-y-auto">
                                  {group.receivedItems.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-slate-400">
                                      <PackageCheck className="h-6 w-6 mx-auto text-slate-300 mb-1" />
                                      No warranty barcodes verified or registered yet for this product.
                                    </div>
                                  ) : (
                                    group.receivedItems.map((item) => (
                                      <div
                                        key={item.id}
                                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                                            <Barcode className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                            <span className="truncate">{item.barcode}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleCopyBarcode(item.barcode)}
                                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                              title="Copy barcode"
                                            >
                                              {copiedBarcode === item.barcode ? (
                                                <Check className="h-3 w-3 text-emerald-600" />
                                              ) : (
                                                <Copy className="h-3 w-3" />
                                              )}
                                            </button>
                                          </div>
                                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5 flex-wrap">
                                            {item.serialNumber && (
                                              <span className="font-mono">SN: {item.serialNumber}</span>
                                            )}
                                            <span>Inv: {item.invoiceNumber}</span>
                                            {item.sellingDate && (
                                              <span className="text-emerald-700 font-medium">
                                                Sold: {formatDate(item.sellingDate)}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                                            Verified
                                          </Badge>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setViewingUnit(item)}
                                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1 font-medium cursor-pointer"
                                            title="View unit lifecycle details"
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Details</span>
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>

                              {/* 2. NOT RECEIVED / PENDING BARCODES */}
                              <div className="bg-white rounded-xl border border-rose-200/80 shadow-2xs overflow-hidden flex flex-col">
                                <div className="bg-rose-50/80 px-3.5 py-2.5 border-b border-rose-100 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-rose-600" />
                                    <span className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                                      Not Received / Pending Barcodes
                                    </span>
                                  </div>
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10.5px] font-bold">
                                    {group.notReceivedItems.length} Pending
                                  </Badge>
                                </div>

                                <div className="p-3 divide-y divide-slate-100 flex-1 max-h-96 overflow-y-auto">
                                  {group.notReceivedItems.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-emerald-700 font-medium">
                                      <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
                                      All supplied units for this product have verified warranty notes!
                                    </div>
                                  ) : (
                                    group.notReceivedItems.map((item) => (
                                      <div
                                        key={item.id}
                                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                                            <Barcode className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                            <span className="truncate">{item.barcode}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleCopyBarcode(item.barcode)}
                                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                                              title="Copy barcode"
                                            >
                                              {copiedBarcode === item.barcode ? (
                                                <Check className="h-3 w-3 text-emerald-600" />
                                              ) : (
                                                <Copy className="h-3 w-3" />
                                              )}
                                            </button>
                                          </div>
                                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5 flex-wrap">
                                            {item.serialNumber && (
                                              <span className="font-mono">SN: {item.serialNumber}</span>
                                            )}
                                            <span>Inv: {item.invoiceNumber}</span>
                                            <span className="text-amber-700 italic">
                                              No warranty note counterfoil
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                                            Pending Note
                                          </Badge>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setViewingUnit(item)}
                                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1 font-medium cursor-pointer"
                                            title="View unit lifecycle details"
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Details</span>
                                          </Button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW-ONLY UNIT DETAIL MODAL (No editing, no claim creation) */}
      {viewingUnit && (
        <Dialog open={Boolean(viewingUnit)} onOpenChange={() => setViewingUnit(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-primary" />
                  Product Unit Lifecycle (Read-Only)
                </DialogTitle>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-[10px]">
                  VIEW ONLY
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-sm text-slate-900">{viewingUnit.productName}</div>
                <div className="text-slate-500 font-mono text-[11px]">SKU: {viewingUnit.sku}</div>
                <div className="flex items-center gap-2 pt-1 font-mono text-slate-700">
                  <span>Barcode: <strong>{viewingUnit.barcode}</strong></span>
                  {viewingUnit.serialNumber && <span>• SN: {viewingUnit.serialNumber}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Customer / Shop</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{tally?.customerName}</span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Distributor Invoice</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">{viewingUnit.invoiceNumber}</span>
                  <span className="text-[10px] text-slate-400">{viewingUnit.invoiceDate ? formatDate(viewingUnit.invoiceDate) : '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">End-Customer Selling Date</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {viewingUnit.sellingDate ? formatDate(viewingUnit.sellingDate) : 'Not Registered'}
                  </span>
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Warranty Status</span>
                  <div className="mt-1">
                    <WarrantyStatusBadge status={viewingUnit.warrantyStatus} />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 text-[11px] leading-relaxed">
                <strong>Follow-up Instruction:</strong> If the shop owner has sold this unit, obtain a photo of the end-customer warranty card / cash receipt and send it to the Sales Manager for formal warranty registration.
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setViewingUnit(null)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-300"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
