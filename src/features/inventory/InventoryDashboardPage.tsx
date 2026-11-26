import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { useStockBalances } from '../../api/inventory/inventory.hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { StatCard } from '../../components/common/StatCard';
import { PageHeader } from '../../components/common/PageHeader';
import { useProducts } from '../../hooks/useProducts';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { unitBarcodeService } from '../../services/UnitBarcodeService';
import { serialNumberService } from '../../services/SerialNumberService';
import { UnitBarcodeModal } from '../../components/inventory/UnitBarcodeModal';
import { PaginationControls } from '../../components/common/PaginationControls';
import { SerialNumberRecord, UnitBarcodeRecord } from '../../types/inventory';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import {
  Package,
  Boxes,
  Barcode,
  Hash,
  AlertTriangle,
  Clock,
  Printer,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Scan,
  Search,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  Layers,
  ArrowRight,
  Filter,
  DollarSign,
  Warehouse,
  Truck,
} from 'lucide-react';

interface FlatGRNStockItem {
  keyId: string;
  grnId: string;
  grnNumber: string;
  supplierName: string;
  warehouseId: string;
  grnStatus: string;
  grnDate: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  expectedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  goodQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  dispatchedQuantity: number;
  deliveredQuantity: number;
  primaryStatus: 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'PENDING_PRICING';
  unitCost: number;
  lineValue: number;
  serialNumbers: string[];
  unitRecords: UnitBarcodeRecord[];
  barcodesCount: number;
  barcodesConfirmed: boolean;
}

export function InventoryDashboardPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { grns, loading: grnsLoading } = useGRN();
  const { products } = useProducts({ page: 1, pageSize: 100 });
  const stockBalancesQuery = useStockBalances({ page: 1, pageSize: 100 });
  const stockBalances = stockBalancesQuery.data?.data ?? [];

  const [activeTab, setActiveTab] = useState<'LEDGER' | 'GRN_LIST' | 'QUARANTINE' | 'SERIALS'>('LEDGER');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrnFilter, setSelectedGrnFilter] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<
    'ALL' | 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'DELIVERED' | 'DAMAGED' | 'SERIALIZED' | 'PENDING_STICKERS'
  >('ALL');
  const [scannerTestInput, setScannerTestInput] = useState('');

  // Pagination for main items ledger
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Expanded item row drawers
  const [expandedRowKeys, setExpandedRowKeys] = useState<Record<string, boolean>>({});

  // Studio modal state
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [modalGrnNumber, setModalGrnNumber] = useState('GRN');
  const [modalSupplierName, setModalSupplierName] = useState('Supplier');
  const [modalProductId, setModalProductId] = useState<string | undefined>(undefined);

  // Serial numbers state
  const [serials, setSerials] = useState<SerialNumberRecord[]>([]);

  useEffect(() => {
    serialNumberService.getAll().then((data) => setSerials(data));
  }, []);

  // Map real PostgreSQL StockBalance stages by productId
  const stockBalanceByProduct = useMemo(() => {
    const map: Record<
      string,
      {
        available: number;
        reserved: number;
        dispatched: number;
        delivered: number;
        damaged: number;
        costPrice: number;
      }
    > = {};
    for (const b of stockBalances) {
      map[b.productId] = {
        available: b.stages?.available ?? 0,
        reserved: b.stages?.reserved ?? 0,
        dispatched: b.stages?.dispatch ?? 0,
        delivered: b.stages?.delivered ?? 0,
        damaged: b.stages?.damaged ?? 0,
        costPrice: b.costPrice ?? 0,
      };
    }
    return map;
  }, [stockBalances]);

  // Compute flattened stock items directly generated and received from all GRNs,
  // plus any active StockBalance records not already covered by a GRN line
  const flatStockItems: FlatGRNStockItem[] = useMemo(() => {
    const list: FlatGRNStockItem[] = [];
    const coveredProductIds = new Set<string>();

    (grns || []).forEach((grn) => {
      // Ensure unit records are fully prepared with barcodes
      const itemsWithBarcodes = unitBarcodeService.generateAllForGRN(
        grn.items || [],
        grn.grnNumber || grn.id
      );

      itemsWithBarcodes.forEach((item: any, idx: number) => {
        coveredProductIds.add(item.productId);
        const product = item.product || products.find((p) => p.id === item.productId);
        const damagedQty = item.damagedQuantity || 0;
        const goodQty = Math.max(0, (item.receivedQuantity || 0) - damagedQty);
        const sb = stockBalanceByProduct[item.productId] || {
          available: 0,
          reserved: 0,
          dispatched: 0,
          delivered: 0,
          damaged: 0,
          costPrice: 0,
        };

        // Available for Sale = Inbound goods become commercially available strictly once GRN is PRICED
        const isCapitalized = grn.status === 'PRICED';
        const availableQty = isCapitalized ? Math.max(0, goodQty - sb.reserved) : 0;

        // Determine primary status for status-wise representation
        let primaryStatus: 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED' | 'PENDING_PRICING' = 'AVAILABLE';
        if (damagedQty > 0 && availableQty === 0) {
          primaryStatus = 'REJECTED';
        } else if (!isCapitalized) {
          primaryStatus = 'PENDING_PRICING';
        } else if (sb.reserved > 0 && availableQty === 0) {
          primaryStatus = 'RESERVED';
        } else if (availableQty > 0) {
          primaryStatus = 'AVAILABLE';
        } else if (sb.dispatched > 0) {
          primaryStatus = 'DISPATCHED';
        } else if (sb.delivered > 0) {
          primaryStatus = 'DELIVERED';
        }

        const unitCost = item.unitCostSnapshot ?? item.unitCost ?? sb.costPrice ?? product?.pricing?.costPrice ?? 0;
        const lineValue = availableQty * unitCost;
        const barcodesCount = item.unitRecords?.length || item.unitBarcodes?.length || goodQty;
        const pName = product?.name || item.productNameSnapshot || item.productId;
        const pSku = product?.sku || item.skuSnapshot || 'N/A';
        const pCategory = product?.categoryName || 'General Stock';

        list.push({
          keyId: `${grn.id}-${item.productId}-${idx}`,
          grnId: grn.id,
          grnNumber: grn.grnNumber || grn.id,
          supplierName: grn.supplierName || 'Supplier',
          warehouseId: grn.warehouseId || 'WH-MAIN',
          grnStatus: grn.status,
          grnDate: grn.receivedDate || grn.createdAt || grn.submittedAt || '',
          productId: item.productId,
          productName: pName,
          sku: pSku,
          categoryName: pCategory,
          expectedQuantity: item.expectedQuantity || item.receivedQuantity || 0,
          receivedQuantity: item.receivedQuantity || 0,
          damagedQuantity: damagedQty,
          goodQuantity: goodQty,
          availableQuantity: availableQty,
          reservedQuantity: sb.reserved,
          dispatchedQuantity: sb.dispatched,
          deliveredQuantity: sb.delivered,
          primaryStatus,
          unitCost,
          lineValue,
          serialNumbers: item.serialNumbers || [],
          unitRecords: item.unitRecords || [],
          barcodesCount,
          barcodesConfirmed: grn.barcodesConfirmed || item.barcodesConfirmed || false,
        });
      });
    });

    // Include StockBalance records whose products don't appear in the current GRN list
    for (const b of stockBalances) {
      if (coveredProductIds.has(b.productId)) continue;
      const avail = b.stages?.available ?? 0;
      const resv = b.stages?.reserved ?? 0;
      const disp = b.stages?.dispatch ?? 0;
      const deliv = b.stages?.delivered ?? 0;
      const dmg = b.stages?.damaged ?? 0;
      if (avail + resv + disp + deliv + dmg <= 0) continue;

      let primaryStatus: FlatGRNStockItem['primaryStatus'] = 'AVAILABLE';
      if (dmg > 0 && avail === 0) primaryStatus = 'REJECTED';
      else if (resv > 0 && avail === 0) primaryStatus = 'RESERVED';
      else if (avail > 0) primaryStatus = 'AVAILABLE';
      else if (disp > 0) primaryStatus = 'DISPATCHED';
      else if (deliv > 0) primaryStatus = 'DELIVERED';

      const unitCost = b.costPrice ?? 0;
      list.push({
        keyId: `sb-${b.id}`,
        grnId: '',
        grnNumber: 'STOCK-BAL',
        supplierName: b.brand || 'Opening / Direct Stock',
        warehouseId: 'WH-MAIN',
        grnStatus: 'PRICED',
        grnDate: b.updatedAt || '',
        productId: b.productId,
        productName: b.name || b.productId,
        sku: b.sku || 'N/A',
        categoryName: b.category || 'General Stock',
        expectedQuantity: avail + resv + disp + deliv + dmg,
        receivedQuantity: avail + resv + disp + deliv + dmg,
        damagedQuantity: dmg,
        goodQuantity: avail + resv + disp + deliv,
        availableQuantity: avail,
        reservedQuantity: resv,
        dispatchedQuantity: disp,
        deliveredQuantity: deliv,
        primaryStatus,
        unitCost,
        lineValue: avail * unitCost,
        serialNumbers: [],
        unitRecords: [],
        barcodesCount: 0,
        barcodesConfirmed: true,
      });
    }

    return list;
  }, [grns, products, stockBalanceByProduct, stockBalances]);

  // All GRNs for Storekeeper inventory hub
  const allGrns = useMemo(() => grns || [], [grns]);

  // All serials for Storekeeper inventory hub
  const allSerials = useMemo(() => {
    let source = serials;
    if (source.length === 0) {
      // Derive serial records directly from intake GRN items if service is unseeded
      const derived: SerialNumberRecord[] = [];
      flatStockItems.forEach((item) => {
        item.serialNumbers?.forEach((sn, idx) => {
          derived.push({
            id: `${item.keyId}-sn-${idx}`,
            serialNumber: sn,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            grnId: item.grnId,
            grnNumber: item.grnNumber,
            status: item.primaryStatus === 'REJECTED' ? 'DAMAGED' : 'IN_STOCK',
            receivedDate: item.grnDate,
            locationId: item.warehouseId,
            locationName: 'Main Warehouse',
            binLocation: 'Main Warehouse',
            barcode: item.unitRecords?.[idx]?.unitBarcode || sn,
          });
        });
      });
      source = derived;
    }

    return source;
  }, [serials, flatStockItems]);

  // Operational KPIs backed by real PostgreSQL StockBalance (authoritative source of truth)
  const kpis = useMemo(() => {
    let totalAvailableUnits = 0;
    let totalReservedUnits = 0;
    let totalDispatchedUnits = 0;
    let totalDeliveredUnits = 0;
    let totalDamagedUnits = 0;
    let totalStockValue = 0;

    if (stockBalances.length > 0) {
      for (const b of stockBalances) {
        const avail = b.stages?.available ?? 0;
        totalAvailableUnits += avail;
        totalReservedUnits += b.stages?.reserved ?? 0;
        totalDispatchedUnits += b.stages?.dispatch ?? 0;
        totalDeliveredUnits += b.stages?.delivered ?? 0;
        totalDamagedUnits += b.stages?.damaged ?? 0;
        totalStockValue += avail * (b.costPrice ?? 0);
      }
    } else {
      flatStockItems.forEach((item) => {
        totalAvailableUnits += item.availableQuantity;
        totalReservedUnits += item.reservedQuantity;
        totalDispatchedUnits += item.dispatchedQuantity;
        totalDeliveredUnits += item.deliveredQuantity;
        totalDamagedUnits += item.damagedQuantity;
        totalStockValue += item.lineValue;
      });
    }

    let totalBarcodes = 0;
    let confirmedBarcodes = 0;
    let serializedUnitsCount = 0;
    flatStockItems.forEach((item) => {
      totalBarcodes += item.barcodesCount;
      if (item.barcodesConfirmed) {
        confirmedBarcodes += item.barcodesCount;
      }
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        serializedUnitsCount += item.serialNumbers.length;
      }
    });

    const pendingGRNs = (grns || []).filter(
      (g) => g.status === 'SUBMITTED' || g.status === 'DRAFT' || g.status === 'PENDING_STOCK_MANAGER_APPROVAL'
    ).length;
    const approvedGRNs = (grns || []).filter((g) => g.status === 'APPROVED' || g.status === 'PRICED').length;

    return {
      totalAcceptedUnits: totalAvailableUnits,
      totalAvailableUnits,
      totalReservedUnits,
      totalDispatchedUnits,
      totalDeliveredUnits,
      totalDamagedUnits,
      totalStockValue,
      totalBarcodes,
      confirmedBarcodes,
      serializedUnitsCount,
      pendingGRNs,
      approvedGRNs,
    };
  }, [stockBalances, flatStockItems, grns]);

  // Filtered stock items based on search, GRN, and status-wise quick filters
  const filteredStockItems = useMemo(() => {
    return flatStockItems.filter((item) => {
      // 1. GRN dropdown filter
      if (selectedGrnFilter !== 'ALL' && item.grnNumber !== selectedGrnFilter) {
        return false;
      }

      // 2. Status-wise quick filters
      if (quickFilter === 'AVAILABLE' && item.availableQuantity <= 0) {
        return false;
      }
      if (quickFilter === 'RESERVED' && item.reservedQuantity <= 0) {
        return false;
      }
      if (quickFilter === 'DISPATCHED' && item.dispatchedQuantity <= 0) {
        return false;
      }
      if (quickFilter === 'DELIVERED' && item.deliveredQuantity <= 0) {
        return false;
      }
      if (quickFilter === 'DAMAGED' && item.damagedQuantity <= 0) {
        return false;
      }
      if (quickFilter === 'SERIALIZED' && (!item.serialNumbers || item.serialNumbers.length === 0)) {
        return false;
      }
      if (quickFilter === 'PENDING_STICKERS' && item.barcodesConfirmed) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesProduct = item.productName.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesGrn = item.grnNumber.toLowerCase().includes(q);
        const matchesSupplier = item.supplierName.toLowerCase().includes(q);
        const matchesSerial = item.serialNumbers.some((s) => s.toLowerCase().includes(q));
        const matchesBarcode = item.unitRecords.some((r) => r.unitBarcode.toLowerCase().includes(q));

        if (!matchesProduct && !matchesSku && !matchesGrn && !matchesSupplier && !matchesSerial && !matchesBarcode) {
          return false;
        }
      }

      return true;
    });
  }, [flatStockItems, selectedGrnFilter, quickFilter, searchQuery]);

  // Paginated items
  const totalItemsCount = filteredStockItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const pagedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredStockItems.slice(start, start + pageSize);
  }, [filteredStockItems, safeCurrentPage, pageSize]);

  // Toggle row expansion
  const toggleRowExpand = (keyId: string) => {
    setExpandedRowKeys((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  // Open barcode studio for an item
  const handleOpenStudioForItem = (item: FlatGRNStockItem) => {
    const parentGrn = grns?.find((g) => g.id === item.grnId || g.grnNumber === item.grnNumber);
    const grnItems = parentGrn?.items || [
      {
        productId: item.productId,
        productNameSnapshot: item.productName,
        skuSnapshot: item.sku,
        receivedQuantity: item.receivedQuantity,
        damagedQuantity: item.damagedQuantity,
        unitCostSnapshot: item.unitCost,
        unitRecords: item.unitRecords,
      },
    ];

    setModalItems(grnItems);
    setModalGrnNumber(item.grnNumber);
    setModalSupplierName(item.supplierName);
    setModalProductId(item.productId);
    setIsBarcodeModalOpen(true);
  };

  // Scanner test handler
  const handleTestScan = (val?: string) => {
    const input = (val || scannerTestInput).trim();
    if (!input) return;
    setScannerTestInput(input);

    // Search across all items for matching unit barcode or serial number
    const match = flatStockItems.find((item) => {
      const matchBarcode = item.unitRecords.some(
        (r) => r.unitBarcode.toLowerCase() === input.toLowerCase()
      );
      const matchSerial = item.serialNumbers.some(
        (s) => s.toLowerCase() === input.toLowerCase()
      );
      return matchBarcode || matchSerial;
    });

    if (match) {
      toast.success(
        `✓ Scanner Match: ${match.productName} (From ${match.grnNumber}) — Verified in Stock!`
      );
      setSearchQuery(match.grnNumber);
      setSelectedGrnFilter(match.grnNumber);
      setExpandedRowKeys({ [match.keyId]: true });
      setScannerTestInput('');
    } else {
      toast.error(`Barcode/Serial "${input}" not found in current inventory intake.`);
    }
  };

  const uniqueGrnNumbers = useMemo(() => {
    const set = new Set<string>();
    flatStockItems.forEach((i) => set.add(i.grnNumber));
    return Array.from(set);
  }, [flatStockItems]);

  const damagedItemsList = useMemo(() => {
    return flatStockItems.filter((i) => i.damagedQuantity > 0);
  }, [flatStockItems]);

  if (grnsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const totalTrackedUnits =
    (kpis.totalAvailableUnits +
      kpis.totalReservedUnits +
      kpis.totalDispatchedUnits +
      kpis.totalDeliveredUnits +
      kpis.totalDamagedUnits) || 1;

  return (
    <div className="w-full space-y-6">
      {/* ── Standardized Page Header ── */}
      <PageHeader
        title="Warehouse Inbound Inventory Hub"
        subtitle="Real-time physical stock registry for professional power tools generated directly from inward Goods Receipt Notes (GRN). Track received quantities, damaged quarantine units, landed costs, Code-128 unit barcodes, and manufacturer serial numbers."
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-emerald-600 text-white font-mono text-[11px] gap-1 shadow-2xs">
              <Warehouse className="h-3 w-3" />
              Main Facility: WH-MAIN
            </Badge>
            <Badge variant="outline" className="text-slate-600 text-[11px] bg-slate-50 font-mono">
              Stock Keeper Operations
            </Badge>
            <Badge className="bg-blue-600 text-white font-mono text-[11px] gap-1 shadow-2xs">
              Industrial Power Tools Division
            </Badge>
          </div>
        }
        actions={
          <Button
            onClick={() => navigate('/inventory/grn/new')}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs h-9"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ New GRN Intake</span>
          </Button>
        }
      />

{/* ── Top Operational KPI Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Available Stock"
          value={kpis.totalAvailableUnits.toLocaleString()}
          icon={Package}
          variant="emerald"
          progress={{
            value: kpis.totalAvailableUnits,
            max: totalTrackedUnits,
            label: 'Available',
          }}
        />

        <StatCard
          title="Reserved Orders"
          value={kpis.totalReservedUnits.toLocaleString()}
          icon={Layers}
          variant="blue"
          progress={{
            value: kpis.totalReservedUnits,
            max: totalTrackedUnits,
            label: 'Allocated',
          }}
        />

        <StatCard
          title="Dispatched"
          value={kpis.totalDispatchedUnits.toLocaleString()}
          icon={Truck}
          variant="indigo"
          progress={{
            value: kpis.totalDispatchedUnits,
            max: totalTrackedUnits,
            label: 'Transit',
          }}
        />

        <StatCard
          title="Delivered"
          value={kpis.totalDeliveredUnits.toLocaleString()}
          icon={CheckCircle2}
          variant="teal"
          progress={{
            value: kpis.totalDeliveredUnits,
            max: totalTrackedUnits,
            label: 'Fulfilled',
          }}
        />

        <StatCard
          title="Damaged Stock"
          value={`${kpis.totalDamagedUnits.toLocaleString()} Units`}
          icon={AlertTriangle}
          variant="rose"
          progress={
            kpis.totalDamagedUnits > 0
              ? {
                  value: kpis.totalDamagedUnits,
                  max: totalTrackedUnits,
                  label: 'Quarantined',
                }
              : undefined
          }
        />

        <StatCard
          title="Valuation"
          value={formatCurrency(kpis.totalStockValue)}
          icon={DollarSign}
          variant="amber"
        />
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto w-full max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={cn(
              'pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'LEDGER'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <Boxes className="h-4 w-4" />
            Inward Stock Ledger ({flatStockItems.length} Lines)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GRN_LIST')}
            className={cn(
              'pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'GRN_LIST'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <Warehouse className="h-4 w-4" />
            Inward GRN Shipments ({allGrns.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QUARANTINE')}
            className={cn(
              'pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'QUARANTINE'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            Quarantine Bay ({kpis.totalDamagedUnits} Damaged Units)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SERIALS')}
            className={cn(
              'pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'SERIALS'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <Hash className="h-4 w-4" />
            Serial Registry ({allSerials.length})
          </button>
        </div>
      </div>

      {/* ── Search, Filters & Laser Gun Test Scanner Bar ── */}
      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Text Search */}
          <div className="relative min-w-[200px] sm:min-w-[280px]">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Search product, SKU, GRN#, barcode, serial..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs bg-white font-medium"
            />
          </div>

          {/* GRN selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Source GRN:</span>
            <select
              value={selectedGrnFilter}
              onChange={(e) => {
                setSelectedGrnFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 text-xs rounded-md border border-slate-200 bg-white px-2 py-0 font-mono text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All GRNs ({uniqueGrnNumbers.length} Shipments)</option>
              {uniqueGrnNumbers.map((no) => (
                <option key={no} value={no}>
                  {no}
                </option>
              ))}
            </select>
          </div>

          {/* Global Standard Status Filter Tabs matching Invoice & Collection Hub */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs flex-wrap">
            {[
              { label: 'All Items', value: 'ALL', count: flatStockItems.length, icon: Boxes },
              { label: 'Available', value: 'AVAILABLE', count: flatStockItems.filter((i) => i.availableQuantity > 0).length, icon: CheckCircle2 },
              { label: 'Reserved', value: 'RESERVED', count: flatStockItems.filter((i) => i.reservedQuantity > 0).length, icon: Layers },
              { label: 'Dispatched', value: 'DISPATCHED', count: flatStockItems.filter((i) => i.dispatchedQuantity > 0).length, icon: Truck },
              { label: 'Delivered', value: 'DELIVERED', count: flatStockItems.filter((i) => i.deliveredQuantity > 0).length, icon: CheckCircle2 },
              { label: 'Quarantined', value: 'DAMAGED', count: kpis.totalDamagedUnits, icon: AlertTriangle },
              { label: 'Serialized', value: 'SERIALIZED', count: flatStockItems.filter((i) => i.serialNumbers?.length > 0).length, icon: Hash },
              { label: 'Pending Stickers', value: 'PENDING_STICKERS', count: flatStockItems.filter((i) => !i.barcodesConfirmed).length, icon: Clock },
            ].map((st) => {
              const Icon = st.icon;
              const isActive = quickFilter === st.value;
              return (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => {
                    setQuickFilter(st.value as any);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-xs whitespace-nowrap cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{st.label}</span>
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Handheld Laser Barcode / Serial Scanner Simulation Tool */}
        <div className="flex items-center gap-1.5 shrink-0 pl-0 md:pl-2 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0">
          <Scan className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <Input
            placeholder="Scan Code-128 or Serial..."
            value={scannerTestInput}
            onChange={(e) => setScannerTestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTestScan();
              }
            }}
            className="h-8 text-xs font-mono bg-white w-44 sm:w-52"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTestScan()}
            className="h-8 text-xs px-2.5 shadow-2xs font-semibold"
          >
            Scan &amp; Locate
          </Button>
        </div>
      </div>

      {/* ── TAB 1: Inward Stock Ledger Table ── */}
      {activeTab === 'LEDGER' && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                Inward Stock Registry (All GRN Intake Lines)
              </CardTitle>

            </div>
            <Badge variant="outline" className="font-mono text-xs bg-white text-slate-700">
              {filteredStockItems.length} Products Tracked
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {filteredStockItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                No inventory lines match the selected filters.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.4)_transparent]">
                  <Table className="text-xs min-w-[1100px] w-full">
                    <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="w-10 px-2 text-center"></TableHead>
                        <TableHead className="min-w-[220px] max-w-sm">Product &amp; SKU</TableHead>
                        <TableHead className="w-36 min-w-[130px]">Source GRN</TableHead>
                        <TableHead className="text-center w-28 min-w-[100px]">Status</TableHead>
                        <TableHead className="text-right font-bold text-emerald-700 w-20 min-w-[75px] px-2">Available</TableHead>
                        <TableHead className="text-right font-semibold text-blue-700 w-24 min-w-[85px] px-2">Reserved</TableHead>
                        <TableHead className="text-right font-semibold text-indigo-700 w-24 min-w-[85px] px-2">Dispatched</TableHead>
                        <TableHead className="text-right font-semibold text-teal-700 w-24 min-w-[85px] px-2">Delivered</TableHead>
                        <TableHead className="text-right font-semibold text-rose-600 w-28 min-w-[100px] px-2">Rejected (Damage)</TableHead>
                        <TableHead className="text-right w-28 min-w-[95px] px-2">Unit Cost</TableHead>
                        <TableHead className="text-right font-bold w-32 min-w-[105px] px-2">Line Value</TableHead>
                        <TableHead className="text-center w-32 min-w-[110px] px-2">Unit Barcodes</TableHead>
                        <TableHead className="text-center w-24 min-w-[80px] px-2">Serials</TableHead>
                        <TableHead className="text-right w-14 px-2">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {pagedItems.map((item) => {
                        const isExpanded = !!expandedRowKeys[item.keyId];
                        const hasSerials = item.serialNumbers && item.serialNumbers.length > 0;

                        return (
                          <TableRowGroup key={item.keyId}>
                            <TableRow className={cn('hover:bg-slate-50/70 transition-colors', isExpanded && 'bg-slate-50/70')}>
                              {/* Expand chevron */}
                              <TableCell className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpand(item.keyId)}
                                  className="p-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors"
                                  title={isExpanded ? 'Collapse item details' : 'Expand barcodes & serials'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </TableCell>

                              {/* Product info */}
                              <TableCell className="py-2.5 px-3 min-w-[260px]">
                                <p className="font-bold text-slate-900 leading-snug line-clamp-2" title={item.productName}>
                                  {item.productName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[11px] text-slate-500">{item.sku}</span>
                                  <span className="text-[10px] text-slate-400">• {item.categoryName}</span>
                                </div>
                              </TableCell>

                              {/* Source GRN */}
                              <TableCell className="py-2.5 px-3 min-w-[140px]">
                                {item.grnId ? (
                                  <Link
                                    to={`/inventory/grn/${item.grnId}`}
                                    className="font-mono font-bold text-primary hover:underline flex items-center gap-1 text-[11.5px]"
                                  >
                                    {item.grnNumber}
                                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                  </Link>
                                ) : (
                                  <span className="font-mono font-bold text-slate-700 text-[11.5px]">
                                    {item.grnNumber}
                                  </span>
                                )}
                                <p className="text-[10.5px] text-slate-500 line-clamp-1" title={item.supplierName}>
                                  {item.supplierName}
                                </p>
                              </TableCell>

                              {/* Status Badge */}
                              <TableCell className="py-2.5 px-2 text-center">
                                <InventoryStatusBadge status={item.primaryStatus} />
                              </TableCell>

                              {/* 1. Available */}
                              <TableCell className="py-2 px-2 text-right font-mono font-bold text-emerald-700">
                                {item.availableQuantity}
                              </TableCell>

                              {/* 2. Reserved (Allocated to Order) */}
                              <TableCell className="py-2 px-2 text-right font-mono">
                                {item.reservedQuantity > 0 ? (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10.5px] py-0 px-1.5 font-mono">
                                    {item.reservedQuantity}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </TableCell>

                              {/* 3. Dispatched */}
                              <TableCell className="py-2 px-2 text-right font-mono">
                                {item.dispatchedQuantity > 0 ? (
                                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10.5px] py-0 px-1.5 font-mono">
                                    {item.dispatchedQuantity}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </TableCell>

                              {/* 4. Delivered */}
                              <TableCell className="py-2 px-2 text-right font-mono">
                                {item.deliveredQuantity > 0 ? (
                                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10.5px] py-0 px-1.5 font-mono">
                                    {item.deliveredQuantity}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </TableCell>

                              {/* 5. Rejected / Damaged */}
                              <TableCell className="py-2 px-2 text-right font-mono">
                                {item.damagedQuantity > 0 ? (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] py-0 px-1 font-mono">
                                    {item.damagedQuantity} damaged
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </TableCell>

                              {/* Unit Cost */}
                              <TableCell className="py-2 px-2 text-right font-mono text-slate-600">
                                {formatCurrency(item.unitCost)}
                              </TableCell>

                              {/* Line Value */}
                              <TableCell className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(item.lineValue)}
                              </TableCell>

                              {/* Unit Barcodes */}
                              <TableCell className="py-2.5 px-3 text-center">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenStudioForItem(item)}
                                  className="h-7 text-[11px] gap-1 font-mono text-primary hover:bg-primary/5 shadow-2xs"
                                >
                                  <Barcode className="h-3 w-3" />
                                  {item.barcodesCount} Barcodes
                                </Button>
                              </TableCell>

                              {/* Serial Numbers */}
                              <TableCell className="py-2.5 px-3 text-center">
                                {hasSerials ? (
                                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10.5px] font-mono gap-1">
                                    <Hash className="h-3 w-3" />
                                    {item.serialNumbers.length} Serials
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Non-Serialized</span>
                                )}
                              </TableCell>

                              {/* Action */}
                              <TableCell className="py-2.5 px-2 text-right">
                                {item.grnId ? (
                                  <Link to={`/inventory/grn/${item.grnId}`}>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-primary">
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </Link>
                                ) : (
                                  <Link to={`/products/${item.productId}`}>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-primary">
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </Link>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* ── Expanded Detail Drawer for This Inward Item ── */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-t-0">
                                <TableCell colSpan={14} className="p-3 sm:p-5">
                                  <ItemDetailsDrawer
                                    item={item}
                                    onOpenStudio={() => handleOpenStudioForItem(item)}
                                  />
                                </TableCell>
                              </TableRow>
                            )}
                          </TableRowGroup>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Table Pagination Controls */}
                <div className="p-4 border-t border-slate-200 bg-white">
                  <PaginationControls
                    currentPage={safeCurrentPage}
                    totalItems={totalItemsCount}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    label="inventory line items"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 2: Inward GRN Shipments ── */}
      {activeTab === 'GRN_LIST' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allGrns.map((grn) => {
              const itemsCount = grn.items?.length || 0;
              const totalUnits =
                grn.items?.reduce(
                  (acc: number, item: any) =>
                    acc + ((item.receivedQuantity || 0) - (item.damagedQuantity || 0)),
                  0
                ) || 0;
              const damagedCount =
                grn.items?.reduce(
                  (acc: number, item: any) => acc + (item.damagedQuantity || 0),
                  0
                ) || 0;
              const totalVal =
                grn.items?.reduce(
                  (acc: number, item: any) =>
                    acc + (item.unitCostSnapshot || item.unitCost || 0) * (item.receivedQuantity - (item.damagedQuantity || 0)),
                  0
                ) || grn.totalValue || 0;

              return (
                <Card key={grn.id} className="border-slate-200 shadow-2xs hover:shadow-sm transition-all bg-white flex flex-col justify-between">
                  <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900 block">
                        {grn.grnNumber || grn.id}
                      </span>
                      <p className="text-xs text-slate-500 truncate max-w-[180px]">{grn.supplierName}</p>
                    </div>
                    <InventoryStatusBadge status={grn.status} />
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 flex-1 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Accepted Units</span>
                        <span className="font-mono font-bold text-sm text-slate-900">{totalUnits} units</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Intake Value</span>
                        <span className="font-mono font-bold text-sm text-slate-900">{formatCurrency(totalVal)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Product Lines</span>
                        <span className="font-mono text-slate-700">{itemsCount} SKU lines</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Quarantine</span>
                        {damagedCount > 0 ? (
                          <span className="font-mono text-rose-600 font-bold">{damagedCount} damaged</span>
                        ) : (
                          <span className="font-mono text-emerald-600">0 damaged</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono">
                        Date: {formatDate(grn.receivedDate || grn.createdAt)}
                      </span>
                      {grn.barcodesConfirmed ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Barcodes Affixed
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Stickers Pending
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                    <Link to={`/inventory/grn/${grn.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs h-7 font-semibold">
                        View Intake Details
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setModalItems(grn.items || []);
                        setModalGrnNumber(grn.grnNumber || grn.id);
                        setModalSupplierName(grn.supplierName || 'Supplier');
                        setModalProductId('ALL');
                        setIsBarcodeModalOpen(true);
                      }}
                      className="text-xs h-7 gap-1 font-mono text-primary"
                    >
                      <Barcode className="h-3 w-3" />
                      Barcodes
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: Quarantine Bay (Damaged Stock from GRN) ── */}
      {activeTab === 'QUARANTINE' && (
        <Card className="border-rose-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-4 sm:p-5 border-b border-rose-100 bg-rose-50/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-rose-950 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Physical Quarantine Bay Q-01 — Damaged Goods Log
              </CardTitle>
              <p className="text-xs text-rose-700 mt-0.5">
                Damaged items flagged during GRN physical count. Segregated from main distribution stock awaiting supplier replacement or credit note.
              </p>
            </div>
            <Badge className="bg-rose-600 text-white font-mono text-xs">
              {kpis.totalDamagedUnits} Quarantined Units
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {damagedItemsList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                No damaged stock recorded. All received shipments are in good, saleable condition.
              </div>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:thin]">
                <Table className="text-xs min-w-[1000px]">
                  <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Source GRN</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right text-rose-600 font-bold">Damaged Qty</TableHead>
                    <TableHead className="text-right">Unit Landed Cost</TableHead>
                    <TableHead className="text-right text-rose-700 font-bold">Quarantined Value</TableHead>
                    {role !== 'STOCK_KEEPER' && role !== 'STOCK_MANAGER' && (
                      <TableHead className="text-center">Quarantine Location</TableHead>
                    )}
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {damagedItemsList.map((item) => (
                    <TableRow key={item.keyId} className="hover:bg-rose-50/30">
                      <TableCell className="font-bold text-slate-900">{item.productName}</TableCell>
                      <TableCell className="font-mono text-slate-600">{item.sku}</TableCell>
                      <TableCell className="font-mono font-bold text-primary">
                        <Link to={`/inventory/grn/${item.grnId}`} className="hover:underline">
                          {item.grnNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-700">{item.supplierName}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-rose-600">
                        {item.damagedQuantity} units
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-600">
                        {formatCurrency(item.unitCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-rose-700">
                        {formatCurrency(item.damagedQuantity * item.unitCost)}
                      </TableCell>
                      {role !== 'STOCK_KEEPER' && role !== 'STOCK_MANAGER' && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-rose-300 text-rose-800 bg-rose-50 font-mono text-[10.5px]">
                            Quarantine Bay Q-01
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Link to={`/inventory/grn/${item.grnId}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs border-rose-300 text-rose-800 hover:bg-rose-100">
                            View GRN
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 4: Serial Numbers Registry ── */}
      {activeTab === 'SERIALS' && (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Hash className="h-4 w-4 text-indigo-600" />
                Physical Unit Serial Numbers Registry
              </CardTitle>

            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto [scrollbar-width:thin]">
              <Table className="text-xs min-w-[950px]">
                <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="min-w-[140px]">Serial Number</TableHead>
                    <TableHead className="min-w-[200px]">Product Name</TableHead>
                    <TableHead className="min-w-[120px]">SKU</TableHead>
                    <TableHead className="min-w-[130px]">Inward GRN</TableHead>
                    {role !== 'STOCK_KEEPER' && role !== 'STOCK_MANAGER' && (
                      <TableHead className="min-w-[120px]">Bin Location</TableHead>
                    )}
                    <TableHead className="text-center min-w-[120px]">{role === 'STOCK_KEEPER' || role === 'STOCK_MANAGER' ? 'Status' : 'Warehouse Status'}</TableHead>
                    <TableHead className="text-right min-w-[110px]">Received Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 font-mono">
                  {allSerials.map((sn) => (
                    <TableRow key={sn.id} className="hover:bg-slate-50">
                      <TableCell className="font-bold text-indigo-800">{sn.serialNumber}</TableCell>
                      <TableCell className="font-sans font-medium text-slate-900">{sn.productName}</TableCell>
                      <TableCell className="text-slate-500">{sn.sku}</TableCell>
                      <TableCell className="font-bold text-primary">
                        {sn.grnNumber ? (
                          <Link to={`/inventory/grn/${sn.grnId || sn.grnNumber}`} className="hover:underline">
                            {sn.grnNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      {role !== 'STOCK_KEEPER' && role !== 'STOCK_MANAGER' && (
                        <TableCell className="text-slate-600">{sn.binLocation || 'Warehouse Shelf'}</TableCell>
                      )}
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            'text-[10px] font-sans',
                            sn.status === 'IN_STOCK' && 'bg-emerald-100 text-emerald-800 border-0',
                            sn.status === 'ALLOCATED' && 'bg-blue-100 text-blue-800 border-0',
                            sn.status === 'DISPATCHED' && 'bg-slate-100 text-slate-700 border-0',
                            sn.status === 'DAMAGED' && 'bg-rose-100 text-rose-800 border-0'
                          )}
                        >
                          {sn.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-500 font-sans">
                        {formatDate(sn.receivedDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Studio Modal for Barcode Stickers ── */}
      {isBarcodeModalOpen && (
        <UnitBarcodeModal
          isOpen={isBarcodeModalOpen}
          onClose={() => setIsBarcodeModalOpen(false)}
          items={modalItems}
          grnNumber={modalGrnNumber}
          supplierName={modalSupplierName}
          warehouseId="WH-MAIN"
          initialProductId={modalProductId}
          onConfirmLabeled={() => {
            setIsBarcodeModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ── Subcomponent: Expanded Item Details Drawer (Barcodes & Serials) ──
function ItemDetailsDrawer({
  item,
  onOpenStudio,
}: {
  item: FlatGRNStockItem;
  onOpenStudio: () => void;
}) {
  const [barcodePage, setBarcodePage] = useState(1);
  const [barcodePageSize, setBarcodePageSize] = useState(10);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const records = item.unitRecords || [];
  const totalBarcodes = records.length;
  const totalBarcodePages = Math.max(1, Math.ceil(totalBarcodes / barcodePageSize));
  const safePage = Math.min(Math.max(1, barcodePage), totalBarcodePages);
  const pagedRecords = records.slice((safePage - 1) * barcodePageSize, safePage * barcodePageSize);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied barcode: ${code}`);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
      {/* Drawer Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-xs text-slate-900">
              {item.productName} — Detailed Intake &amp; Physical Tagging
            </h4>
            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
              Source: {item.grnNumber}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Received from <span className="font-semibold text-slate-700">{item.supplierName}</span> • Landed Cost: {formatCurrency(item.unitCost)} • Line Value: {formatCurrency(item.lineValue)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenStudio}
            className="h-7 text-xs font-semibold gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Stickers ({item.barcodesCount})
          </Button>
          <Link to={`/inventory/grn/${item.grnId}`}>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-slate-600">
              GRN Record
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Paginated Unit Barcodes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Barcode className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">
                Unit Barcode Stickers ({totalBarcodes} Generated)
              </span>
            </div>
            {item.barcodesConfirmed ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] py-0 px-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> All Affixed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 px-1.5">
                Stickers Pending
              </Badge>
            )}
          </div>

          {totalBarcodes === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-lg">
              No barcodes generated for this line item.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-600">
                    <tr>
                      <th className="py-1.5 px-2.5 text-left w-20">Unit #</th>
                      <th className="py-1.5 px-2.5 text-left">Code-128 Barcode</th>
                      <th className="py-1.5 px-2.5 text-center w-24">Status</th>
                      <th className="py-1.5 px-2 text-right w-12">Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedRecords.map((r) => (
                      <tr key={r.unitBarcode} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 px-2.5 text-slate-500 font-medium">
                          Unit {r.unitIndex}/{totalBarcodes}
                        </td>
                        <td className="py-1.5 px-2.5 font-bold text-slate-900 tracking-wider">
                          {r.unitBarcode}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          {r.status === 'LABELED' ? (
                            <span className="text-[10px] text-emerald-700 font-semibold font-sans">
                              ✓ Affixed
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-sans">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopy(r.unitBarcode)}
                            className="p-1 text-slate-400 hover:text-slate-800"
                            title="Copy barcode string"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalBarcodePages > 1 && (
                <PaginationControls
                  currentPage={safePage}
                  totalItems={totalBarcodes}
                  pageSize={barcodePageSize}
                  onPageChange={setBarcodePage}
                  onPageSizeChange={(newSize) => {
                    setBarcodePageSize(newSize);
                    setBarcodePage(1);
                  }}
                  pageSizeOptions={[10, 25, 50]}
                  label="stickers"
                  compact
                />
              )}
            </div>
          )}
        </div>

        {/* Right Column: Serial Numbers if Present */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-indigo-600" />
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">
              Manufacturer Serial Numbers ({item.serialNumbers?.length || 0} Registered)
            </span>
          </div>

          {!item.serialNumbers || item.serialNumbers.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs border border-dashed rounded-lg bg-slate-50/50">
              <p className="font-semibold text-slate-600">Standard Bulk Item</p>
              <p className="text-[11px] mt-0.5">
                This SKU is tracked via unit barcodes and quantities without individual OEM serial numbers.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs font-mono">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-600">
                  <tr>
                    <th className="py-1.5 px-2.5 text-left w-16">#</th>
                    <th className="py-1.5 px-2.5 text-left">Serial Number</th>
                    <th className="py-1.5 px-2.5 text-center">Status</th>
                    <th className="py-1.5 px-2 text-right w-12">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {item.serialNumbers.map((sn, idx) => (
                    <tr key={sn} className="hover:bg-slate-50 transition-colors">
                      <td className="py-1.5 px-2.5 text-slate-400">{idx + 1}</td>
                      <td className="py-1.5 px-2.5 font-bold text-indigo-800">{sn}</td>
                      <td className="py-1.5 px-2.5 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[9.5px] py-0 px-1.5 font-sans">
                          IN STOCK
                        </Badge>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopy(sn)}
                          className="p-1 text-slate-400 hover:text-slate-800"
                          title="Copy serial number"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// React fragment wrapper helper for table rows
function TableRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
