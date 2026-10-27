import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../hooks/useAuth';
import { serialNumberService } from '../../services/SerialNumberService';
import { SerialNumberRecord, SerialNumberStatus } from '../../types/inventory';
import { MOCK_PRODUCTS } from '../../mock/mockProducts';
import { MOCK_GRNS } from '../../mock/mockInventory';
import { BarcodeVisual } from '../../components/common/BarcodeVisual';
import { formatDate } from '../../utils/formatters';
import { toast } from 'sonner';
import {
  Hash,
  Search,
  PlusCircle,
  Scan,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Package,
  Boxes,
  MapPin,
  ClipboardList,
  Copy,
  ExternalLink,
  Filter,
  Download,
  Barcode,
  Truck,
  RotateCcw,
} from 'lucide-react';

export function SerialNumbersPage() {
  const { currentUser, role } = useAuth();
  const [serials, setSerials] = useState<SerialNumberRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');

  // Summary counts
  const [summary, setSummary] = useState({
    total: 0,
    inStock: 0,
    allocated: 0,
    dispatched: 0,
    damaged: 0,
  });

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isScanVerifyOpen, setIsScanVerifyOpen] = useState(false);
  const [activeSerialDetail, setActiveSerialDetail] = useState<SerialNumberRecord | null>(null);
  const [editingSerial, setEditingSerial] = useState<SerialNumberRecord | null>(null);

  // Registration Form State
  const [regProductId, setRegProductId] = useState<string>(MOCK_PRODUCTS[0]?.id || '');
  const [regLocationId, setRegLocationId] = useState<string>('WH-MAIN');
  const [regBinLocation, setRegBinLocation] = useState<string>('Bay A-02 / Shelf 1');
  const [regGrnId, setRegGrnId] = useState<string>(MOCK_GRNS[0]?.id || '');
  const [regInputMode, setRegInputMode] = useState<'bulk' | 'sequence'>('bulk');
  const [regBulkText, setRegBulkText] = useState('');
  const [seqPrefix, setSeqPrefix] = useState('SN-DNS-');
  const [seqStart, setSeqStart] = useState('1001');
  const [seqCount, setSeqCount] = useState('5');

  // Scan Verification State
  const [scanQuery, setScanQuery] = useState('');
  const [scanResult, setScanResult] = useState<SerialNumberRecord | null>(null);
  const [scanNotFound, setScanNotFound] = useState(false);

  // Status Edit State
  const [editStatus, setEditStatus] = useState<SerialNumberStatus>('IN_STOCK');
  const [editLocationId, setEditLocationId] = useState('WH-MAIN');
  const [editBin, setEditBin] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [list, sum] = await Promise.all([
        serialNumberService.getFiltered({
          query: search,
          status: statusFilter,
          locationId: locationFilter,
        }),
        serialNumberService.getSummary(),
      ]);
      setSerials(list);
      setSummary(sum);
    } catch (err) {
      console.error('Failed to load serial numbers', err);
      toast.error('Failed to load serial numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, locationFilter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied "${text}" to clipboard`);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let serialList: string[] = [];

    if (regInputMode === 'bulk') {
      serialList = regBulkText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      const startNum = parseInt(seqStart, 10);
      const count = parseInt(seqCount, 10);
      if (isNaN(startNum) || isNaN(count) || count <= 0) {
        toast.error('Please enter valid starting sequence number and count');
        return;
      }
      for (let i = 0; i < count; i++) {
        serialList.push(`${seqPrefix}${String(startNum + i).padStart(4, '0')}`);
      }
    }

    if (serialList.length === 0) {
      toast.error('Please provide at least one serial number to register');
      return;
    }

    try {
      const locationName =
        regLocationId === 'WH-MAIN' ? 'Main Warehouse' : 'Colombo Showroom';
      const grn = MOCK_GRNS.find((g) => g.id === regGrnId);

      const res = await serialNumberService.registerBatch({
        productId: regProductId,
        locationId: regLocationId,
        locationName,
        binLocation: regBinLocation,
        grnId: regGrnId,
        grnNumber: grn?.grnNumber || regGrnId,
        receivedBy: `${currentUser.name} (${role.replace('_', ' ')})`,
        serialNumbers: serialList,
      });

      if (res.duplicates.length > 0) {
        toast.warning(
          `Registered ${res.registeredCount} serials. Skipped ${res.duplicates.length} duplicate(s).`
        );
      } else {
        toast.success(`Successfully registered ${res.registeredCount} unit serial numbers.`);
      }

      setIsRegisterOpen(false);
      setRegBulkText('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const handleScanLookup = async (snToLookup?: string) => {
    const val = (snToLookup || scanQuery).trim();
    if (!val) return;
    setScanQuery(val);
    const found = await serialNumberService.getBySerialNumber(val);
    if (found) {
      setScanResult(found);
      setScanNotFound(false);
      toast.success(`Serial ${found.serialNumber} found!`);
    } else {
      setScanResult(null);
      setScanNotFound(true);
      toast.error(`Serial "${val}" not recognized in warehouse.`);
    }
  };

  const handleOpenEdit = (record: SerialNumberRecord) => {
    setEditingSerial(record);
    setEditStatus(record.status);
    setEditLocationId(record.locationId);
    setEditBin(record.binLocation || '');
    setEditNotes(record.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingSerial) return;
    try {
      const locationName =
        editLocationId === 'WH-MAIN' ? 'Main Warehouse' : 'Colombo Showroom';
      await serialNumberService.updateStatus(editingSerial.id, editStatus, {
        locationId: editLocationId,
        locationName,
        binLocation: editBin,
        notes: editNotes,
      });
      toast.success(`Updated status of ${editingSerial.serialNumber}`);
      setEditingSerial(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update serial status');
    }
  };

  const getStatusBadge = (status: SerialNumberStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">IN STOCK</Badge>;
      case 'ALLOCATED':
        return <Badge className="bg-sky-600 text-white hover:bg-sky-700">ALLOCATED</Badge>;
      case 'DISPATCHED':
        return <Badge className="bg-purple-600 text-white hover:bg-purple-700">DISPATCHED</Badge>;
      case 'DAMAGED':
        return <Badge className="bg-rose-600 text-white hover:bg-rose-700">DAMAGED (QUARANTINE)</Badge>;
      case 'RETURNED':
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">RETURNED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportCSV = () => {
    const headers = [
      'Serial Number',
      'Product Name',
      'SKU',
      'Barcode',
      'Location',
      'Bin Location',
      'Status',
      'GRN Reference',
      'Received Date',
      'Received By',
    ];
    const rows = serials.map((s) => [
      s.serialNumber,
      `"${s.productName.replace(/"/g, '""')}"`,
      s.sku,
      s.barcode,
      s.locationName,
      s.binLocation || '',
      s.status,
      s.grnNumber || '',
      formatDate(s.receivedDate),
      `"${s.receivedBy.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DNS_Warehouse_Serials_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Serial numbers CSV exported');
  };

  return (
    <div className="p-6 space-y-6">
            {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Serial Numbers
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Stock Keeper Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Warehouse unit-level serialization tracking, bin assignments, and inbound GRN verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScanVerifyOpen(true)}
            className="gap-1.5 text-xs font-medium"
          >
            <Scan className="h-3.5 w-3.5 text-primary" />
            Scan / Verify Serial
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-1.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setIsRegisterOpen(true)}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            Register Serial Numbers
          </Button>
        </div>
      </div>

      {/* ── Warehouse Isolation Notice for Stock Keeper ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-primary" />
          <span>
            <strong className="font-semibold text-slate-800">Physical Serialization Mode:</strong> Stock Keepers track individual serialized units, barcode tags, and bin bays. Valuation &amp; unit financial costing are isolated.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
          {serials.length} units listed
        </span>
      </div>

      {/* ── KPI Stat Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Registered</span>
            <Hash className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {summary.total}
          </p>
          <span className="text-[10px] text-slate-400">Tracked Units</span>
        </Card>

        <Card className="p-3.5 border border-emerald-100 bg-emerald-50/30">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>In Warehouse</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
            {summary.inStock}
          </p>
          <span className="text-[10px] text-emerald-600">Available to Pick</span>
        </Card>

        <Card className="p-3.5 border border-sky-100 bg-sky-50/30">
          <div className="flex items-center justify-between text-xs text-sky-700 font-medium">
            <span>Allocated</span>
            <Boxes className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-sky-700 mt-1 tabular-nums">
            {summary.allocated}
          </p>
          <span className="text-[10px] text-sky-600">Reserved for Orders</span>
        </Card>

        <Card className="p-3.5 border border-purple-100 bg-purple-50/30">
          <div className="flex items-center justify-between text-xs text-purple-700 font-medium">
            <span>Dispatched</span>
            <Truck className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-purple-700 mt-1 tabular-nums">
            {summary.dispatched}
          </p>
          <span className="text-[10px] text-purple-600">Delivered to Clients</span>
        </Card>

        <Card className="p-3.5 border border-rose-100 bg-rose-50/30">
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>Damaged</span>
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-700 mt-1 tabular-nums">
            {summary.damaged}
          </p>
          <span className="text-[10px] text-rose-600">Quarantine Bay</span>
        </Card>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search serial number, product, SKU, GRN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs sm:text-sm h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="IN_STOCK">In Stock</SelectItem>
                    <SelectItem value="ALLOCATED">Allocated</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-44">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Filter Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Locations</SelectItem>
                    <SelectItem value="WH-MAIN">Main Warehouse</SelectItem>
                    <SelectItem value="SR-MAIN">Colombo Showroom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(search || statusFilter !== 'ALL' || locationFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                    setLocationFilter('ALL');
                  }}
                  className="h-9 px-2 text-xs text-slate-500 hover:text-slate-900"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Serials Data Table ── */}
      <Card className="border border-slate-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : serials.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Hash className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-800 text-sm">No Serial Numbers Found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search criteria or register new serial numbers into warehouse stock.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRegisterOpen(true)}
                className="mt-4 gap-1 text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Register New Serials
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="font-semibold text-xs text-slate-700">Serial Number</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700">Product &amp; SKU</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700">Location &amp; Bay</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700">Inward GRN</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700">Received On</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serials.map((record) => (
                    <TableRow key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded tracking-wide">
                            {record.serialNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(record.serialNumber)}
                            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded"
                            title="Copy Serial Number"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <div className="min-w-0 max-w-xs">
                          <p className="font-medium text-xs text-slate-900 truncate">
                            {record.productName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-0.5">
                            <span>SKU: {record.sku}</span>
                            <span>•</span>
                            <span>Bar: {record.barcode}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <div className="text-xs">
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{record.locationName}</span>
                          </div>
                          {record.binLocation && (
                            <span className="text-[11px] text-slate-500 font-mono pl-4">
                              {record.binLocation}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5 text-center">
                        {getStatusBadge(record.status)}
                      </TableCell>

                      <TableCell className="py-2.5">
                        {record.grnId ? (
                          <Link
                            to={`/inventory/grn/${record.grnId}`}
                            className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-primary hover:underline"
                            title="View GRN Record"
                          >
                            <ClipboardList className="h-3 w-3" />
                            {record.grnNumber || record.grnId}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Direct Inward</span>
                        )}
                        {record.orderNumber && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Order: {record.orderNumber}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-slate-600">
                        <div>{formatDate(record.receivedDate)}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {record.receivedBy}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveSerialDetail(record)}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                            title="View Serial Details & Barcode"
                          >
                            <Barcode className="h-3.5 w-3.5 mr-1" />
                            Tag
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(record)}
                            className="h-7 px-2 text-xs font-medium"
                          >
                            Status
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL 1: Register Serial Numbers (Intake) ── */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-5 w-5 text-primary" />
              Register Unit Serial Numbers
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record physical unit serial numbers for warehouse intake and GRN tracking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Product *
              </label>
              <Select value={regProductId} onValueChange={setRegProductId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_PRODUCTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warehouse Location *
                </label>
                <Select value={regLocationId} onValueChange={setRegLocationId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WH-MAIN">Main Warehouse (WH-MAIN)</SelectItem>
                    <SelectItem value="SR-MAIN">Colombo Showroom (SR-MAIN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bin / Bay Location
                </label>
                <Input
                  value={regBinLocation}
                  onChange={(e) => setRegBinLocation(e.target.value)}
                  placeholder="e.g. Bay A-02 / Shelf 1"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inbound GRN Reference
              </label>
              <Select value={regGrnId} onValueChange={setRegGrnId}>
                <SelectTrigger className="h-9 text-xs font-mono">
                  <SelectValue placeholder="Select or enter GRN" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_GRNS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.id} — {g.supplierName} ({g.items.length} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800">
                  Serial Number Input Method
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setRegInputMode('bulk')}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                      regInputMode === 'bulk'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Bulk Paste / List
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegInputMode('sequence')}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                      regInputMode === 'sequence'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Auto Sequence
                  </button>
                </div>
              </div>

              {regInputMode === 'bulk' ? (
                <div>
                  <textarea
                    rows={4}
                    value={regBulkText}
                    onChange={(e) => setRegBulkText(e.target.value)}
                    placeholder="Enter serial numbers separated by line break or commas&#10;SN-RHD-2025-011&#10;SN-RHD-2025-012&#10;SN-RHD-2025-013"
                    className="w-full text-xs font-mono p-2.5 rounded border border-slate-200 bg-white focus:outline-primary"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Each non-empty line or comma-separated token will register as 1 individual unit.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Prefix</label>
                    <Input
                      value={seqPrefix}
                      onChange={(e) => setSeqPrefix(e.target.value)}
                      placeholder="SN-DNS-"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Start No.</label>
                    <Input
                      type="number"
                      value={seqStart}
                      onChange={(e) => setSeqStart(e.target.value)}
                      placeholder="1001"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Count</label>
                    <Input
                      type="number"
                      value={seqCount}
                      onChange={(e) => setSeqCount(e.target.value)}
                      placeholder="10"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRegisterOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Register Serials
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: Scan / Verify Serial Simulator ── */}
      <Dialog open={isScanVerifyOpen} onOpenChange={setIsScanVerifyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Scan className="h-5 w-5 text-primary" />
              Serial Scanner &amp; Verification
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Type or scan a serial number to instantly verify unit location, GRN intake, and warranty status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="Scan or enter serial (e.g. SN-RHD-2025-001)"
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleScanLookup();
                  }
                }}
                className="text-xs font-mono h-9"
                autoFocus
              />
              <Button size="sm" onClick={() => handleScanLookup()} className="h-9 px-3">
                Verify
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center text-[11px] text-slate-500">
              <span>Quick Test:</span>
              <button
                type="button"
                onClick={() => handleScanLookup('SN-RHD-2025-001')}
                className="font-mono text-primary hover:underline bg-slate-100 px-1.5 py-0.5 rounded"
              >
                SN-RHD-2025-001
              </button>
              <button
                type="button"
                onClick={() => handleScanLookup('SN-GW-5K-0881')}
                className="font-mono text-primary hover:underline bg-slate-100 px-1.5 py-0.5 rounded"
              >
                SN-GW-5K-0881
              </button>
              <button
                type="button"
                onClick={() => handleScanLookup('SN-RHD-2025-005')}
                className="font-mono text-primary hover:underline bg-slate-100 px-1.5 py-0.5 rounded"
              >
                SN-RHD-2025-005
              </button>
            </div>

            {scanResult && (
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Unit Verified in Warehouse
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                      {scanResult.serialNumber}
                    </span>
                    <p className="font-semibold text-xs text-slate-800 mt-1.5">
                      {scanResult.productName}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">SKU: {scanResult.sku}</p>
                  </div>
                  <div>{getStatusBadge(scanResult.status)}</div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Location</span>
                    <span className="font-medium text-slate-800">{scanResult.locationName}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      {scanResult.binLocation}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Inward GRN</span>
                    <span className="font-mono font-medium text-slate-800">
                      {scanResult.grnNumber || scanResult.grnId || 'N/A'}
                    </span>
                  </div>
                </div>

                {scanResult.notes && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                    <strong>Note:</strong> {scanResult.notes}
                  </div>
                )}
              </div>
            )}

            {scanNotFound && (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 text-center text-xs text-rose-700">
                <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-1" />
                <p className="font-semibold">Serial Not Found in Warehouse</p>
                <p className="mt-0.5 text-slate-600">
                  This serial number has not been registered in the system.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsScanVerifyOpen(false);
                setScanResult(null);
                setScanNotFound(false);
                setScanQuery('');
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: Serial Detail & Barcode Tag ── */}
      <Dialog
        open={Boolean(activeSerialDetail)}
        onOpenChange={(open) => !open && setActiveSerialDetail(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Barcode className="h-5 w-5 text-primary" />
              Serial Tag &amp; Barcode
            </DialogTitle>
          </DialogHeader>

          {activeSerialDetail && (
            <div className="space-y-4 pt-2">
              {/* Printable Tag Visual */}
              <div className="border border-slate-300 rounded-xl p-4 bg-white text-center shadow-xs">
                <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                  DNS ERP • Warehouse Unit Identification
                </p>
                <p className="font-bold text-sm text-slate-900 mt-1">
                  {activeSerialDetail.productName}
                </p>
                <p className="font-mono text-xs text-slate-500">
                  SKU: {activeSerialDetail.sku}
                </p>

                <div className="my-3 flex justify-center">
                  <BarcodeVisual
                    value={activeSerialDetail.serialNumber}
                    width={220}
                    height={52}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-100 pt-2 font-mono">
                  <span>{activeSerialDetail.locationName}</span>
                  <span>{activeSerialDetail.binLocation || 'Bay 01'}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span>{getStatusBadge(activeSerialDetail.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inward GRN:</span>
                  <span className="font-mono font-medium">
                    {activeSerialDetail.grnNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Received By:</span>
                  <span>{activeSerialDetail.receivedBy}</span>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.print();
                  }}
                >
                  Print Tag
                </Button>
                <Button
                  size="sm"
                  onClick={() => setActiveSerialDetail(null)}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: Edit Status / Change Bay ── */}
      <Dialog
        open={Boolean(editingSerial)}
        onOpenChange={(open) => !open && setEditingSerial(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Update Serial Status &amp; Bay
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              Unit: {editingSerial?.serialNumber}
            </DialogDescription>
          </DialogHeader>

          {editingSerial && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status *
                </label>
                <Select
                  value={editStatus}
                  onValueChange={(val) => setEditStatus(val as SerialNumberStatus)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_STOCK">In Stock (Warehouse Available)</SelectItem>
                    <SelectItem value="ALLOCATED">Allocated (Reserved)</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched (Outbound)</SelectItem>
                    <SelectItem value="DAMAGED">Damaged (Quarantine Bay)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warehouse Location
                </label>
                <Select value={editLocationId} onValueChange={setEditLocationId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WH-MAIN">Main Warehouse (WH-MAIN)</SelectItem>
                    <SelectItem value="SR-MAIN">Colombo Showroom (SR-MAIN)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bin / Bay Location
                </label>
                <Input
                  value={editBin}
                  onChange={(e) => setEditBin(e.target.value)}
                  placeholder="e.g. Quarantine Bay Q-01"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stock Keeper Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add inspection notes or quarantine reason..."
                  className="w-full text-xs p-2 rounded border border-slate-200"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSerial(null)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
