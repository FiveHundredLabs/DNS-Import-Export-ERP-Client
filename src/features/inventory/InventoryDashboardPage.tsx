import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGRN } from '../../hooks/useGRN';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { StatCard } from '../../components/common/StatCard';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { unitBarcodeService } from '../../services/UnitBarcodeService';
import { serialNumberService } from '../../services/SerialNumberService';
import { orderService } from '../../services/OrderService';
import { SalesOrder } from '../../types/order';
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
  primaryStatus: 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED';
  unitCost: number;
  lineValue: number;
  serialNumbers: string[];
  unitRecords: UnitBarcodeRecord[];
  barcodesCount: number;
  barcodesConfirmed: boolean;
}

export function InventoryDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { grns, loading: grnsLoading } = useGRN();
  const [orders, setOrders] = useState<SalesOrder[]>([]);

  useEffect(() => {
    orderService.getOrders().then(setOrders).catch(console.error);
  }, []);

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

// Helper: Strict Power Tools classification filter for Stock Keeper Inventory Hub
function isPowerToolItem(item: { productId?: string; sku?: string; categoryName?: string; productName?: string }): boolean {
  if (item.productId?.startsWith('prod-pt-')) return true;
  if (item.sku?.startsWith('DNS-PT-')) return true;
  if (item.categoryName?.toLowerCase().includes('power tool')) return true;
  const name = (item.productName || '').toLowerCase();
  return (
    name.includes('bosch') ||
    name.includes('makita') ||
    name.includes('dewalt') ||
    name.includes('milwaukee') ||
    name.includes('stanley') ||
    name.includes('rotary hammer') ||
    name.includes('angle grinder') ||
    name.includes('impact wrench') ||
    name.includes('circular saw') ||
    name.includes('demolition breaker') ||
    name.includes('jigsaw') ||
    name.includes('router') ||
    name.includes('multi-tool')
  );
}

  // Compute flattened stock items directly generated and received from all GRNs
  const flatStockItems: FlatGRNStockItem[] = useMemo(() => {
    if (!grns || grns.length === 0) return [];

    const list: FlatGRNStockItem[] = [];

    grns.forEach((grn) => {
      // Ensure unit records are fully prepared with barcodes
      const itemsWithBarcodes = unitBarcodeService.generateAllForGRN(
        grn.items || [],
        grn.grnNumber || grn.id
      );

      itemsWithBarcodes.forEach((item: any, idx: number) => {
        const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
        const damagedQty = item.damagedQuantity || 0;
        const goodQty = Math.max(0, (item.receivedQuantity || 0) - damagedQty);
        const stats = productOrderStats[item.productId] || { reserved: 0, dispatched: 0, delivered: 0 };

        // Available for Sale = Net Good intake minus reserved for active orders
        const availableQty = Math.max(0, goodQty - stats.reserved);

        // Determine primary status for status-wise representation
        let primaryStatus: 'AVAILABLE' | 'RESERVED' | 'DISPATCHED' | 'DELIVERED' | 'REJECTED' = 'AVAILABLE';
        if (damagedQty > 0 && availableQty === 0) {
          primaryStatus = 'REJECTED';
        } else if (stats.reserved > 0 && availableQty === 0) {
          primaryStatus = 'RESERVED';
        } else if (availableQty > 0) {
          primaryStatus = 'AVAILABLE';
        } else if (stats.dispatched > 0) {
          primaryStatus = 'DISPATCHED';
        } else if (stats.delivered > 0) {
          primaryStatus = 'DELIVERED';
        }

        const unitCost = item.unitCostSnapshot ?? item.unitCost ?? product?.pricing?.costPrice ?? 0;
        const lineValue = availableQty * unitCost;
        const barcodesCount = item.unitRecords?.length || item.unitBarcodes?.length || goodQty;
        const pName = product?.name || item.productNameSnapshot || item.productId;
        const pSku = product?.sku || item.skuSnapshot || 'N/A';
        const pCategory = product?.categoryName || 'Industrial Power Tools';

        // Filter: Storekeeper inventory hub strictly keeps ONLY realistic power tools!
        if (!isPowerToolItem({ productId: item.productId, sku: pSku, categoryName: pCategory, productName: pName })) {
          return;
        }

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
          reservedQuantity: stats.reserved,
          dispatchedQuantity: stats.dispatched,
          deliveredQuantity: stats.delivered,
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

    return list;
  }, [grns, productOrderStats]);

  // Power tool filtered GRNs for Storekeeper inventory hub
  const powerToolGrns = useMemo(() => {
    return (grns || []).filter((g) =>
      g.items?.some((item: any) => {
        const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId);
        return isPowerToolItem({
          productId: item.productId,
          sku: prod?.sku || item.skuSnapshot,
          categoryName: prod?.categoryName,
          productName: prod?.name || item.productNameSnapshot,
        });
      })
    );
  }, [grns]);

  // Power tool filtered serials for Storekeeper inventory hub
  const powerToolSerials = useMemo(() => {
    return serials.filter((sn) =>
      isPowerToolItem({
        productId: sn.productId,
        sku: sn.sku,
        productName: sn.productName,
      })
    );
  }, [serials]);

  // Operational KPIs
  const kpis = useMemo(() => {
    let totalAvailableUnits = 0;
    let totalReservedUnits = 0;
    let totalDispatchedUnits = 0;
    let totalDeliveredUnits = 0;
    let totalDamagedUnits = 0;
    let totalStockValue = 0;
    let totalBarcodes = 0;
    let confirmedBarcodes = 0;
    let serializedUnitsCount = 0;

    flatStockItems.forEach((item) => {
      totalAvailableUnits += item.availableQuantity;
      totalReservedUnits += item.reservedQuantity;
      totalDispatchedUnits += item.dispatchedQuantity;
      totalDeliveredUnits += item.deliveredQuantity;
      totalDamagedUnits += item.damagedQuantity;
      totalStockValue += item.lineValue;
      totalBarcodes += item.barcodesCount;
      if (item.barcodesConfirmed) {
        confirmedBarcodes += item.barcodesCount;
      }
      if (item.serialNumbers && item.serialNumbers.length > 0) {
        serializedUnitsCount += item.serialNumbers.length;
      }
    });

    const pendingGRNs = (grns || []).filter(
      (g) => g.status === 'SUBMITTED' || g.status === 'DRAFT'
    ).length;
    const approvedGRNs = (grns || []).filter((g) => g.status === 'APPROVED').length;

    return {
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
  }, [flatStockItems, powerToolGrns]);

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
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Boxes className="h-7 w-7 text-primary" />
              Warehouse Inbound Inventory Hub
            </h1>
            <Badge className="bg-emerald-600 text-white font-mono text-[11px] gap-1 shadow-2xs">
              <Warehouse className="h-3.5 w-3.5" />
              Main Facility: WH-MAIN
            </Badge>
            <Badge variant="outline" className="text-slate-600 text-[11px] bg-slate-50 font-mono">
              Stock Keeper Operations
            </Badge>
            <Badge className="bg-blue-600 text-white font-mono text-[11px] gap-1 shadow-2xs">
              Industrial Power Tools Division
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Real-time physical stock registry for professional power tools (Bosch, Makita, DeWalt, Milwaukee, Stanley FatMax) generated directly from inward Goods Receipt Notes (GRN).
            Track received quantities, damaged quarantine units, landed costs, Code-128 unit barcodes, and manufacturer serial numbers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link to="/inventory/grn/new">
            <Button className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold gap-1.5 shadow-xs h-9">
              <PlusCircle className="h-4 w-4" />
              + New GRN Intake
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Top Operational KPI Metrics matching Global Card Style ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* KPI 1: Available Units */}
        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs bg-white">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Available Stock</p>
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                  {kpis.totalAvailableUnits.toLocaleString()}
                </div>
                <p className="text-[10.5px] text-emerald-600 font-semibold truncate mt-0.5">
                  Ready for sale
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((kpis.totalAvailableUnits / totalTrackedUnits) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 self-start">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Reserved Orders */}
        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs bg-white">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Reserved Orders</p>
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                  {kpis.totalReservedUnits.toLocaleString()}
                </div>
                <p className="text-[10.5px] text-blue-600 font-semibold truncate mt-0.5">
                  Allocated to SOs
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((kpis.totalReservedUnits / totalTrackedUnits) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 self-start">
                <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Dispatched Transit */}
        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs bg-white">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Dispatched</p>
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                  {kpis.totalDispatchedUnits.toLocaleString()}
                </div>
                <p className="text-[10.5px] text-indigo-600 font-semibold truncate mt-0.5">
                  In delivery transit
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((kpis.totalDispatchedUnits / totalTrackedUnits) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 self-start">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Delivered Units */}
        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs bg-white">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Delivered</p>
                <div className="text-base sm:text-xl font-bold font-mono text-slate-900 tabular-nums mt-0.5">
                  {kpis.totalDeliveredUnits.toLocaleString()}
                </div>
                <p className="text-[10.5px] text-teal-600 font-semibold truncate mt-0.5">
                  Fulfilled to clients
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((kpis.totalDeliveredUnits / totalTrackedUnits) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 self-start">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5: Damaged Stock in Quarantine */}
        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs bg-white">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider truncate">Quarantined</p>
                <div className="text-base sm:text-xl font-bold font-mono text-rose-600 tabular-nums mt-0.5">
                  {kpis.totalDamagedUnits.toLocaleString()}
                </div>
                <p className="text-[10.5px] text-rose-600 font-semibold truncate mt-0.5">
                  Bay Q-01 defects
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((kpis.totalDamagedUnits / totalTrackedUnits) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 self-start">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 6: Available Stock Valuation */}
        <Card className="border-slate-200 min-w-0 overflow-hidden shadow-2xs bg-white">
          <CardContent className="p-2.5 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Valuation</p>
                <div className="text-sm sm:text-base font-bold font-mono text-slate-900 tabular-nums mt-0.5 truncate">
                  {formatCurrency(kpis.totalStockValue)}
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                  Landed cost basis
                </p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-slate-900 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0 self-start">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tabular-nums">
              {powerToolGrns.length} Total
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              {kpis.approvedGRNs} approved · {kpis.pendingGRNs} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto">
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
            Inward GRN Shipments ({powerToolGrns.length})
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
            Serial Registry ({powerToolSerials.length})
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
              <p className="text-xs text-slate-500 mt-0.5">
                Showing physical receiving batches with supplier lineage, good vs damaged breakdown, landed costs, barcodes, and serials.
              </p>
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
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="min-w-[180px]">Product &amp; SKU</TableHead>
                        <TableHead className="min-w-[120px]">Source GRN</TableHead>
                        <TableHead className="text-center min-w-[100px]">Status</TableHead>
                        <TableHead className="text-right font-bold text-emerald-700">Available</TableHead>
                        <TableHead className="text-right font-semibold text-blue-700">Reserved (Order)</TableHead>
                        <TableHead className="text-right font-semibold text-indigo-700">Dispatched</TableHead>
                        <TableHead className="text-right font-semibold text-teal-700">Delivered</TableHead>
                        <TableHead className="text-right font-semibold text-rose-600">Rejected (Damage)</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right font-bold">Line Value</TableHead>
                        <TableHead className="text-center min-w-[110px]">Unit Barcodes</TableHead>
                        <TableHead className="text-center min-w-[100px]">Serials</TableHead>
                        <TableHead className="text-right w-16">Action</TableHead>
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
                              <TableCell className="py-2.5 px-3">
                                <p className="font-bold text-slate-900 leading-tight truncate max-w-[220px]" title={item.productName}>
                                  {item.productName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[11px] text-slate-500">{item.sku}</span>
                                  <span className="text-[10px] text-slate-400">• {item.categoryName}</span>
                                </div>
                              </TableCell>

                              {/* Source GRN */}
                              <TableCell className="py-2.5 px-3">
                                <Link
                                  to={`/inventory/grn/${item.grnId}`}
                                  className="font-mono font-bold text-primary hover:underline flex items-center gap-1 text-[11.5px]"
                                >
                                  {item.grnNumber}
                                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                </Link>
                                <p className="text-[10.5px] text-slate-500 truncate max-w-[140px]" title={item.supplierName}>
                                  {item.supplierName}
                                </p>
                              </TableCell>

                              {/* Status Badge */}
                              <TableCell className="py-2.5 px-2 text-center">
                                <InventoryStatusBadge status={item.primaryStatus} />
                              </TableCell>

                              {/* 1. Available */}
                              <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {item.availableQuantity}
                              </TableCell>

                              {/* 2. Reserved (Allocated to Order) */}
                              <TableCell className="py-2.5 px-3 text-right font-mono">
                                {item.reservedQuantity > 0 ? (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10.5px] py-0 px-1.5 font-mono">
                                    {item.reservedQuantity}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </TableCell>

                              {/* 3. Dispatched */}
                              <TableCell className="py-2.5 px-3 text-right font-mono">
                                {item.dispatchedQuantity > 0 ? (
                                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10.5px] py-0 px-1.5 font-mono">
                                    {item.dispatchedQuantity}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </TableCell>

                              {/* 4. Delivered */}
                              <TableCell className="py-2.5 px-3 text-right font-mono">
                                {item.deliveredQuantity > 0 ? (
                                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10.5px] py-0 px-1.5 font-mono">
                                    {item.deliveredQuantity}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </TableCell>

                              {/* 5. Rejected / Damaged */}
                              <TableCell className="py-2.5 px-3 text-right font-mono">
                                {item.damagedQuantity > 0 ? (
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] py-0 px-1 font-mono">
                                    {item.damagedQuantity} damaged
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-xs">0</span>
                                )}
                              </TableCell>

                              {/* Unit Cost */}
                              <TableCell className="py-2.5 px-3 text-right font-mono text-slate-600">
                                {formatCurrency(item.unitCost)}
                              </TableCell>

                              {/* Line Value */}
                              <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
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
                                <Link to={`/inventory/grn/${item.grnId}`}>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-primary">
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                </Link>
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
            {powerToolGrns.map((grn) => {
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
              <Table className="text-xs">
                <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Source GRN</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right text-rose-600 font-bold">Damaged Qty</TableHead>
                    <TableHead className="text-right">Unit Landed Cost</TableHead>
                    <TableHead className="text-right text-rose-700 font-bold">Quarantined Value</TableHead>
                    <TableHead className="text-center">Quarantine Location</TableHead>
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
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-rose-300 text-rose-800 bg-rose-50 font-mono text-[10.5px]">
                          Quarantine Bay Q-01
                        </Badge>
                      </TableCell>
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
              <p className="text-xs text-slate-500 mt-0.5">
                Every serialized industrial power tool tracked from inward GRN receiving through warehouse bays.
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Inward GRN</TableHead>
                  <TableHead>Bin Location</TableHead>
                  <TableHead className="text-center">Warehouse Status</TableHead>
                  <TableHead className="text-right">Received Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 font-mono">
                {powerToolSerials.map((sn) => (
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
                    <TableCell className="text-slate-600">{sn.binLocation || 'Warehouse Shelf'}</TableCell>
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
