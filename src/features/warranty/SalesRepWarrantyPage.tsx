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
} from 'lucide-react';

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

  // Filtered unit items
  const filteredItems = useMemo(() => {
    if (!tally?.items) return [];
    return tally.items.filter((item) => {
      const q = unitSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
        (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (unitFilter === 'PENDING') return !item.isRegistered;
      if (unitFilter === 'REGISTERED') return item.isRegistered;
      return true;
    });
  }, [tally, unitSearch, unitFilter]);

  const selectedCustomerObj = availableCustomers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
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

          {/* SUPPLIED PRODUCTS & UNITS LIST */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Supplied Products & Units ({tally.items.length})
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                    All units supplied to {tally.customerName}. Identify which products are pending end-customer warranty registration.
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
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        unitFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({tally.items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitFilter('PENDING')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        unitFilter === 'PENDING'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pending ({tally.pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitFilter('REGISTERED')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        unitFilter === 'REGISTERED'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Registered ({tally.registeredCount})
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                  Loading supplied units...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <PackageCheck className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No units found</p>
                  <p className="text-slate-400 mt-1">Try resetting the search or filter</p>
                </div>
              ) : (
                <>
                  {/* Mobile Stacked Cards (Visible on mobile, hidden on md+) */}
                  <div className="block md:hidden p-3 space-y-3">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-3.5 shadow-xs space-y-2.5 transition-all ${
                          !item.isRegistered ? 'bg-rose-50/20 border-rose-200/80' : 'bg-white border-slate-200/90'
                        }`}
                      >
                        {/* Header: Product & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs text-slate-900 leading-tight">
                              {item.productName}
                            </div>
                            <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">{item.sku}</div>
                          </div>
                          <WarrantyStatusBadge status={item.warrantyStatus} />
                        </div>

                        {/* Barcode & Serial */}
                        <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl text-xs font-mono">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate">
                            <Barcode className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.barcode}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyBarcode(item.barcode)}
                            title="Copy barcode"
                            className="text-slate-400 hover:text-slate-700 p-1 rounded active:scale-95 shrink-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Invoice & Registration details */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Invoice</span>
                            <span className="font-medium text-slate-700">{item.invoiceNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Selling Date</span>
                            {item.sellingDate ? (
                              <span className="font-semibold text-emerald-700">{formatDate(item.sellingDate)}</span>
                            ) : (
                              <span className="text-amber-700 font-medium">Pending Sale</span>
                            )}
                          </div>
                        </div>

                        {/* Footer Badges & Action */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.isRegistered ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Registered
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold gap-1">
                                <Clock className="h-3 w-3" /> Pending Note
                              </Badge>
                            )}
                          </div>
                          <Button
                            onClick={() => setViewingUnit(item)}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-primary border-primary/20 hover:bg-primary-light gap-1 font-semibold rounded-lg"
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Comprehensive Table (Hidden on mobile, visible on md+) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Product Name & SKU</th>
                          <th className="py-3 px-3">Barcode / Serial</th>
                          <th className="py-3 px-3 text-center">Qty / Unit</th>
                          <th className="py-3 px-3">Distributor Invoice</th>
                          <th className="py-3 px-3">End-Customer Selling Date</th>
                          <th className="py-3 px-3 text-center">Registration Status</th>
                          <th className="py-3 px-3 text-center">Warranty Note</th>
                          <th className="py-3 px-3 text-center">Warranty Status</th>
                          <th className="py-3 px-4 text-right">View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              !item.isRegistered ? 'bg-rose-50/20' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{item.productName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold">
                                <Barcode className="h-3.5 w-3.5 text-slate-400" />
                                {item.barcode}
                                <button
                                  type="button"
                                  onClick={() => handleCopyBarcode(item.barcode)}
                                  title="Copy barcode"
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              {item.serialNumber && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  SN: {item.serialNumber}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center font-medium">
                              {item.quantity} {item.unit || 'PCS'}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-800">{item.invoiceNumber}</div>
                              <div className="text-[10px] text-slate-400">
                                {item.invoiceDate ? formatDate(item.invoiceDate) : '—'}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {item.sellingDate ? (
                                <div className="font-semibold text-emerald-700 flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-emerald-500" />
                                  {formatDate(item.sellingDate)}
                                </div>
                              ) : (
                                <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  Pending End-Customer Sale
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {item.isRegistered ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Registered
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold gap-1">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {item.hasNoteReceipt ? (
                                <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold">
                                  Receipt Attached
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No receipt note</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <WarrantyStatusBadge status={item.warrantyStatus} />
                            </td>

                            <td className="py-3 px-4 text-right">
                              <Button
                                onClick={() => setViewingUnit(item)}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-primary hover:text-primary-hover hover:bg-primary/10 gap-1 font-medium"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
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
