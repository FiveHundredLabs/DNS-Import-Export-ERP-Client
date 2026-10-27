import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { useAuth } from '../../hooks/useAuth';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../../mock/mockProducts';
import { Product } from '../../types/product';
import { BarcodeVisual } from '../../components/common/BarcodeVisual';
import { toast } from 'sonner';
import {
  Barcode,
  Search,
  Scan,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  MapPin,
  Tag,
  Boxes,
  RotateCcw,
  Plus,
  Minus,
  Check,
} from 'lucide-react';

interface PrintQueueItem {
  product: Product;
  quantity: number;
}

interface ScannedHistoryItem {
  id: string;
  barcode: string;
  product: Product;
  timestamp: string;
  verifiedCount: number;
}

export function BarcodesPage() {
  const { currentUser, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'scanner' | 'studio'>('directory');

  // Directory state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [printQueue, setPrintQueue] = useState<Record<string, number>>({});
  const [labelSize, setLabelSize] = useState<'shelf' | 'box' | 'pallet'>('box');

  // Scanner State
  const [scannerInput, setScannerInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedHistoryItem[]>([]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => {
      if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.categoryName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, categoryFilter]);

  // Queue helpers
  const handleQueueQuantityChange = (productId: string, delta: number) => {
    setPrintQueue((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const setDirectQueueQuantity = (productId: string, qty: number) => {
    setPrintQueue((prev) => {
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: qty };
    });
  };

  const totalLabelsInQueue = useMemo(() => {
    return Object.values(printQueue).reduce((acc, q) => acc + q, 0);
  }, [printQueue]);

  // Scanner Simulator / Reader
  const handleScanSubmit = (barcodeToScan?: string) => {
    const code = (barcodeToScan || scannerInput).trim();
    if (!code) return;
    setScannerInput(code);

    const match = MOCK_PRODUCTS.find(
      (p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()
    );

    if (match) {
      setScannedProduct(match);
      setScanError(null);
      toast.success(`Scanned: ${match.name}`);

      // Add to session scan history
      setScanHistory((prev) => {
        const existingIdx = prev.findIndex((h) => h.product.id === match.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx].verifiedCount += 1;
          updated[existingIdx].timestamp = new Date().toLocaleTimeString();
          return updated;
        }
        return [
          {
            id: `scan-${Date.now()}`,
            barcode: match.barcode,
            product: match,
            timestamp: new Date().toLocaleTimeString(),
            verifiedCount: 1,
          },
          ...prev,
        ];
      });
      setScannerInput('');
    } else {
      setScannedProduct(null);
      setScanError(`Barcode "${code}" not found in catalogue.`);
      toast.error(`Unknown barcode: ${code}`);
    }
  };

  const handlePrintLabels = () => {
    if (totalLabelsInQueue === 0) {
      toast.error('Print queue is empty. Select products first.');
      return;
    }
    setActiveTab('studio');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Printable Items List
  const queueProducts: PrintQueueItem[] = useMemo(() => {
    return Object.entries(printQueue)
      .map(([productId, quantity]) => {
        const product = MOCK_PRODUCTS.find((p) => p.id === productId);
        return product ? { product, quantity } : null;
      })
      .filter(Boolean) as PrintQueueItem[];
  }, [printQueue]);

  return (
    <div className="p-6 space-y-6">
            {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Bar Codes
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
              Stock Keeper Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Product barcode directory, rapid warehouse scanner station, and printable shelf/box labels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalLabelsInQueue > 0 && (
            <Button
              onClick={handlePrintLabels}
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Printer className="h-4 w-4" />
              Print ({totalLabelsInQueue}) Labels
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Tab Navigation ── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="directory" className="text-xs font-medium gap-1.5">
            <Barcode className="h-3.5 w-3.5" />
            Barcode Directory &amp; Print Queue
          </TabsTrigger>
          <TabsTrigger value="scanner" className="text-xs font-medium gap-1.5">
            <Scan className="h-3.5 w-3.5" />
            Warehouse Scanner Station
          </TabsTrigger>
          <TabsTrigger value="studio" className="text-xs font-medium gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Printable Label Studio ({totalLabelsInQueue})
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: BARCODE DIRECTORY & PRINT QUEUE */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="directory" className="space-y-4 pt-2">
          {/* Filters Bar */}
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by barcode, product name, or SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs sm:text-sm h-9"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="w-56">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Categories</SelectItem>
                        {MOCK_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(search || categoryFilter !== 'ALL') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch('');
                        setCategoryFilter('ALL');
                      }}
                      className="h-9 text-xs text-slate-500"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barcode Products Table */}
          <Card className="border border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead className="font-semibold text-xs text-slate-700">Barcode Graphic</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">Product Name &amp; SKU</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700">Category &amp; UOM</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700 text-center">Stock on Hand</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700 text-center">Print Quantity</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-700 text-right">Quick Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => {
                      const qtyInQueue = printQueue[product.id] || 0;
                      return (
                        <TableRow key={product.id} className="hover:bg-slate-50/80 transition-colors">
                          <TableCell className="py-3">
                            <div className="bg-white border border-slate-200/80 rounded p-1.5 shadow-2xs inline-block">
                              <BarcodeVisual
                                value={product.barcode}
                                width={130}
                                height={38}
                                showText={true}
                              />
                            </div>
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="max-w-xs">
                              <p className="font-semibold text-xs text-slate-900 leading-tight">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 mt-0.5">
                                <span className="bg-slate-100 px-1 rounded border border-slate-200">
                                  {product.sku}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-xs text-slate-600">
                            <div>{product.categoryName}</div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Unit: {product.uomCode}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 text-center">
                            <span className="font-bold text-xs text-slate-900 tabular-nums">
                              {product.stockOnHand} {product.uomCode}
                            </span>
                          </TableCell>

                          <TableCell className="py-3 text-center">
                            <div className="inline-flex items-center border border-slate-200 rounded-lg p-0.5 bg-white">
                              <button
                                type="button"
                                onClick={() => handleQueueQuantityChange(product.id, -1)}
                                className="h-6 w-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                                title="Decrease print count"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-xs font-bold font-mono text-center tabular-nums">
                                {qtyInQueue}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQueueQuantityChange(product.id, 1)}
                                className="h-6 w-6 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded"
                                title="Increase print count"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDirectQueueQuantity(product.id, (printQueue[product.id] || 0) + 1);
                                  toast.success(`Added 1 label for ${product.sku} to print queue`);
                                }}
                                className="h-7 text-xs px-2"
                              >
                                + Label
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: WAREHOUSE SCANNER STATION */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="scanner" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Scanner Input Station */}
            <div className="md:col-span-1 space-y-4">
              <Card className="border border-slate-200 bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scan className="h-5 w-5 text-primary" />
                    Barcode Scanner Gun
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Connect USB or Bluetooth handheld scanner, or type barcode/SKU below to simulate an immediate scan.
                  </p>

                  <div className="space-y-2">
                    <Input
                      placeholder="Ready to scan barcode..."
                      value={scannerInput}
                      onChange={(e) => setScannerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanSubmit();
                        }
                      }}
                      className="font-mono text-sm h-11 border-primary/50 focus:border-primary shadow-xs"
                      autoFocus
                    />
                    <Button
                      onClick={() => handleScanSubmit()}
                      className="w-full text-xs font-semibold h-9"
                    >
                      Process Scan
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                      Quick Simulator Barcodes:
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {MOCK_PRODUCTS.slice(0, 4).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleScanSubmit(p.barcode)}
                          className="flex items-center justify-between text-left p-1.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors text-xs"
                        >
                          <span className="truncate max-w-[140px] font-medium text-slate-700">
                            {p.name}
                          </span>
                          <span className="font-mono text-[10px] text-primary font-bold">
                            {p.barcode}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Scan Results & Running Audit Session */}
            <div className="md:col-span-2 space-y-4">
              {/* Active Match Card */}
              {scannedProduct ? (
                <Card className="border border-emerald-300 bg-emerald-50/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Valid Product Identified
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        Barcode: {scannedProduct.barcode}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          {scannedProduct.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                          SKU: {scannedProduct.sku} • Category: {scannedProduct.categoryName}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-slate-700">
                            Total Stock: <strong>{scannedProduct.stockOnHand} {scannedProduct.uomCode}</strong>
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-700">
                            Warranty: <strong>{scannedProduct.warrantyPeriodMonths} Months</strong>
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 shrink-0">
                        <BarcodeVisual
                          value={scannedProduct.barcode}
                          width={140}
                          height={44}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDirectQueueQuantity(
                            scannedProduct.id,
                            (printQueue[scannedProduct.id] || 0) + 1
                          );
                          toast.success(`Queued 1 label for ${scannedProduct.sku}`);
                        }}
                        className="text-xs"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" />
                        Queue Label for Printing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : scanError ? (
                <Card className="border border-rose-300 bg-rose-50/40 p-6 text-center text-rose-700">
                  <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
                  <p className="font-bold text-sm">{scanError}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Check if barcode needs to be mapped to SKU in the Product Master.
                  </p>
                </Card>
              ) : (
                <Card className="border border-dashed border-slate-300 p-8 text-center text-slate-400">
                  <Scan className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-700 text-sm">Scanner Ready</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scan any product or box barcode to reveal details and verify stock counts.
                  </p>
                </Card>
              )}

              {/* Running Scan Audit Session */}
              <Card className="border border-slate-200">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    Session Scan Log &amp; Cycle Count ({scanHistory.length} items)
                  </CardTitle>
                  {scanHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScanHistory([])}
                      className="h-7 text-xs text-slate-400 hover:text-slate-700"
                    >
                      Clear Log
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {scanHistory.length === 0 ? (
                    <p className="p-6 text-center text-xs text-slate-400 italic">
                      No barcodes scanned during this session.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/60">
                          <TableHead className="text-xs">Product</TableHead>
                          <TableHead className="text-xs">Barcode</TableHead>
                          <TableHead className="text-xs text-center">Scan Count</TableHead>
                          <TableHead className="text-xs text-right">Last Scanned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanHistory.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="py-2">
                              <span className="font-medium text-xs text-slate-800">
                                {h.product.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 block">
                                {h.product.sku}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 font-mono text-xs text-slate-600">
                              {h.barcode}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <Badge className="bg-sky-600 text-white text-[11px] font-mono">
                                ×{h.verifiedCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-right text-xs text-slate-500 font-mono">
                              {h.timestamp}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: PRINTABLE LABEL STUDIO */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="studio" className="space-y-4 pt-2">
          {/* Print Controls Header */}
          <Card className="border border-slate-200">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Label Format:</span>
                <div className="flex gap-1.5">
                  <Button
                    variant={labelSize === 'shelf' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLabelSize('shelf')}
                    className="text-xs h-8"
                  >
                    Shelf Tag (38×25mm)
                  </Button>
                  <Button
                    variant={labelSize === 'box' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLabelSize('box')}
                    className="text-xs h-8"
                  >
                    Product Box (70×35mm)
                  </Button>
                  <Button
                    variant={labelSize === 'pallet' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLabelSize('pallet')}
                    className="text-xs h-8"
                  >
                    Pallet Placard (100×50mm)
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrintQueue({})}
                  className="text-xs h-8 text-rose-600 hover:text-rose-700"
                >
                  Clear Queue
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  disabled={totalLabelsInQueue === 0}
                  className="gap-1.5 text-xs font-semibold h-8 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print ({totalLabelsInQueue}) Labels
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Printable Labels Canvas */}
          {queueProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-300 rounded-xl">
              <Printer className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">No Labels in Print Queue</p>
              <p className="text-xs text-slate-500 mt-1">
                Go to the Barcode Directory tab to select items and quantities for printing.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('directory')}
                className="mt-3 text-xs"
              >
                Go to Barcode Directory
              </Button>
            </div>
          ) : (
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                <span>Print Layout Preview ({totalLabelsInQueue} sticker labels ready):</span>
                <span className="font-mono">Ready for Standard Adhesive Sticker Paper</span>
              </div>

              {/* Printable Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
                {queueProducts.flatMap(({ product, quantity }) =>
                  Array.from({ length: quantity }).map((_, idx) => (
                    <div
                      key={`${product.id}-${idx}`}
                      className={`bg-white border border-slate-300 rounded-lg p-3 text-center shadow-2xs flex flex-col justify-between ${
                        labelSize === 'shelf'
                          ? 'h-32'
                          : labelSize === 'pallet'
                          ? 'h-52'
                          : 'h-40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 pb-1">
                          <span>DNS ERP • WAREHOUSE</span>
                          <span>WH-MAIN</span>
                        </div>
                        <p className="font-bold text-xs text-slate-900 mt-1 truncate">
                          {product.name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          SKU: {product.sku}
                        </p>
                      </div>

                      <div className="my-1.5 flex justify-center">
                        <BarcodeVisual
                          value={product.barcode}
                          width={labelSize === 'pallet' ? 220 : 160}
                          height={labelSize === 'pallet' ? 56 : 38}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-100 pt-1 font-mono">
                        <span>Cat: {product.categoryName}</span>
                        <span>Unit: {product.uomCode}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
