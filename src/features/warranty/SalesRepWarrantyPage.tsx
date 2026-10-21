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
  DistributorWarrantySummary,
  SalesRepWarrantySummary,
  UnitBarcodeWarrantyDetail,
  UnitWarrantyStatus,
  ShopWarrantyFollowUp,
} from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { RecordFollowUpModal } from './RecordFollowUpModal';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Store,
  FileCheck2,
  AlertTriangle,
  Barcode,
  PackageCheck,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Copy,
  Info,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface SalesRepWarrantyPageProps {
  /** If embedded as a tab or subcomponent, can optionally override rep ID */
  overrideRepId?: string;
}

export function SalesRepWarrantyPage({ overrideRepId }: SalesRepWarrantyPageProps) {
  const { role, currentUser } = useAuth();

  // Role checks
  const isSalesRep = role === 'SALES_REP';
  const isManagerOrDirector = ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(role);

  // Filter state for Sales Managers (can view specific rep or ALL)
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>(
    overrideRepId || (isSalesRep ? currentUser.id : 'ALL')
  );

  // Data states
  const [summary, setSummary] = useState<SalesRepWarrantySummary | null>(null);
  const [distributors, setDistributors] = useState<DistributorWarrantySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributorSearch, setDistributorSearch] = useState('');
  const [distributorStatusFilter, setDistributorStatusFilter] = useState<'ALL' | 'OUTSTANDING' | 'RECONCILED'>('ALL');

  // Drill-down Unit Barcode Verification Modal
  const [selectedDistributor, setSelectedDistributor] = useState<DistributorWarrantySummary | null>(null);
  const [unitDetails, setUnitDetails] = useState<UnitBarcodeWarrantyDetail[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [unitStatusFilter, setUnitStatusFilter] = useState<UnitWarrantyStatus | 'ALL'>('ALL');
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  // Field Follow-up Modal
  const [activeFollowUpDistributor, setActiveFollowUpDistributor] = useState<ShopWarrantyFollowUp | null>(null);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  // Load summary and distributor lists
  const loadData = async () => {
    try {
      setLoading(true);
      const repIdToQuery = isSalesRep
        ? currentUser.id
        : selectedRepFilter !== 'ALL'
        ? selectedRepFilter
        : undefined;

      // 1. Fetch distributor summaries
      const distList = await warrantyService.getDistributorWarrantySummaries(repIdToQuery, role);
      setDistributors(distList);

      // 2. Fetch rep aggregated summary
      if (repIdToQuery) {
        const repSum = await warrantyService.getSalesRepWarrantySummary(
          repIdToQuery,
          isSalesRep ? currentUser.name : undefined
        );
        setSummary(repSum);
      } else {
        // Global aggregate for Sales Manager / Director
        let totalSold = 0;
        let notesRec = 0;
        let confirmedMissing = 0;
        let inStock = 0;
        let distsWithOut = 0;

        for (const d of distList) {
          totalSold += d.totalUnitsSold;
          notesRec += d.warrantyNotesReceived;
          confirmedMissing += d.confirmedMissingCount;
          inStock += d.unaccountedInStockCount;
          if (d.hasOutstandingNotes) distsWithOut++;
        }

        const pending = Math.max(0, totalSold - notesRec);
        const progress = totalSold > 0 ? Math.round((notesRec / totalSold) * 100) : 100;

        setSummary({
          salesRepId: 'ALL',
          salesRepName: 'All Representatives (Enterprise)',
          totalUnitsSold: totalSold,
          warrantyNotesReceived: notesRec,
          pendingNotesCount: pending,
          confirmedMissingCount: confirmedMissing,
          unaccountedInStockCount: inStock,
          collectionProgress: progress,
          distributorsCount: distList.length,
          distributorsWithOutstandingNotes: distsWithOut,
        });
      }
    } catch (err) {
      console.error('Failed to load warranty collection data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedRepFilter, isSalesRep, currentUser.id, role]);

  // Load individual unit barcodes when a distributor is selected for drill-down
  const loadDistributorUnits = async (dist: DistributorWarrantySummary) => {
    setSelectedDistributor(dist);
    try {
      setUnitsLoading(true);
      const units = await warrantyService.getUnitBarcodesForDistributor(dist.distributorId, {
        search: barcodeSearch || undefined,
        status: unitStatusFilter,
      });
      setUnitDetails(units);
    } catch (err) {
      console.error('Failed to load unit barcodes for distributor:', err);
    } finally {
      setUnitsLoading(false);
    }
  };

  // Re-filter drill-down when search or unitStatusFilter changes
  useEffect(() => {
    if (selectedDistributor) {
      loadDistributorUnits(selectedDistributor);
    }
  }, [barcodeSearch, unitStatusFilter]);

  // Copy barcode helper
  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard?.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  // Filtered distributors
  const filteredDistributors = useMemo(() => {
    return distributors.filter((d) => {
      const matchesSearch =
        d.distributorName.toLowerCase().includes(distributorSearch.toLowerCase()) ||
        d.customerCode.toLowerCase().includes(distributorSearch.toLowerCase()) ||
        (d.address && d.address.toLowerCase().includes(distributorSearch.toLowerCase())) ||
        (d.assignedRepName && d.assignedRepName.toLowerCase().includes(distributorSearch.toLowerCase()));

      if (!matchesSearch) return false;

      if (distributorStatusFilter === 'OUTSTANDING') {
        return d.hasOutstandingNotes;
      }
      if (distributorStatusFilter === 'RECONCILED') {
        return !d.hasOutstandingNotes;
      }
      return true;
    });
  }, [distributors, distributorSearch, distributorStatusFilter]);

  // Format progress color
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (progress >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getProgressBarBg = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Barcode className="h-6 w-6 text-primary" />
              Warranty Collection & Verification
            </h1>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 font-semibold text-xs">
              {isSalesRep ? 'Sales Representative Portal' : 'Enterprise Verification Dashboard'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile physical product units sold to distributors against verified warranty notes received at head office.
          </p>
        </div>

        {/* Sales Manager Scope Filter & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {isManagerOrDirector && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap pl-1">
                Rep Scope:
              </span>
              <Select
                value={selectedRepFilter}
                onValueChange={(val) => setSelectedRepFilter(val)}
              >
                <SelectTrigger className="h-8 text-xs bg-white w-48 border-slate-300">
                  <SelectValue placeholder="All Sales Representatives" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Representatives (Enterprise)</SelectItem>
                  <SelectItem value="usr-106">Kasun Wickramasinghe (Western)</SelectItem>
                  <SelectItem value="usr-107">Dilshan Jayasuriya (Central)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={loadData}
            variant="outline"
            className="h-8 text-xs gap-1.5 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Crucial Workflow Context Banner */}
      <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-indigo-50/80 border border-sky-200 rounded-xl p-4 text-xs text-slate-700 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-sky-100 rounded-lg text-sky-700 shrink-0 mt-0.5">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sky-950 flex items-center gap-2">
              <span>Distributor Warranty Collection & Barcode Protocol</span>
              <span className="px-1.5 py-0.5 bg-sky-200/80 text-sky-900 rounded text-[10px] uppercase font-bold">
                Company Policy
              </span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              Our company distributes physical units strictly to <strong>authorized distributors</strong>, each tracked with a <strong>unique barcode</strong>.
              When distributors sell units to end customers, they collect warranty notes and send them to head office.
              When inspecting distributor stock, distinguish between units <em>confirmed sold to end customers (missing notes)</em> versus units <em>safely remaining in distributor inventory</em>.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Units Sold */}
        <Card className="p-4 bg-white border-slate-200 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Units Sold
              </span>
              <span className="text-2xl font-bold tabular-nums text-slate-900 mt-1 block">
                {summary ? summary.totalUnitsSold : '—'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
              <PackageCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span>Physical units with unique barcodes</span>
            <span className="font-medium text-slate-700">
              {summary ? `${summary.distributorsCount} Distributors` : ''}
            </span>
          </div>
        </Card>

        {/* Warranty Notes Received */}
        <Card className="p-4 bg-white border-slate-200 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Notes Received & Verified
              </span>
              <span className="text-2xl font-bold tabular-nums text-emerald-700 mt-1 block">
                {summary ? summary.warrantyNotesReceived : '—'}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-emerald-700 border-t border-emerald-50 pt-2">
            <span>Recorded & verified at Head Office</span>
            <span className="font-bold">
              {summary && summary.totalUnitsSold > 0
                ? `${Math.round((summary.warrantyNotesReceived / summary.totalUnitsSold) * 100)}% Verified`
                : '—'}
            </span>
          </div>
        </Card>

        {/* Pending Warranty Notes with Business Distinction */}
        <Card className="p-4 bg-white border-slate-200 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Pending Warranty Notes
              </span>
              <span className="text-2xl font-bold tabular-nums text-rose-700 mt-1 block">
                {summary ? summary.pendingNotesCount : '—'}
              </span>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-100 pt-2 gap-1 flex-wrap">
            <span className="text-rose-700 font-semibold flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              {summary ? summary.confirmedMissingCount : 0} Sold (Note Missing)
            </span>
            <span className="text-slate-500 font-medium">
              • {summary ? summary.unaccountedInStockCount : 0} In Stock
            </span>
          </div>
        </Card>

        {/* Collection Progress */}
        <Card className="p-4 bg-white border-slate-200 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Collection Progress
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {summary ? `${summary.collectionProgress}%` : '—'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {summary?.pendingNotesCount === 0 ? 'Fully Reconciled' : 'In Progress'}
                </span>
              </div>
            </div>
            <div className={`p-2.5 rounded-lg ${summary ? getProgressColor(summary.collectionProgress) : 'bg-slate-100'}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  summary ? getProgressBarBg(summary.collectionProgress) : 'bg-slate-300'
                }`}
                style={{ width: `${summary ? summary.collectionProgress : 0}%` }}
              ></div>
            </div>
            <div className="mt-1 flex justify-between items-center text-[10px] text-slate-400">
              <span>Target: 100%</span>
              <span>{summary ? `${summary.distributorsWithOutstandingNotes} dealers pending` : ''}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Distributor Tracking Section */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-200/80 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Assigned Distributors Warranty Status Ledger
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify collected warranty counterfoils per dealer outlet. Drill down into individual barcode numbers to confirm customer sales.
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search distributor, code, city..."
                  value={distributorSearch}
                  onChange={(e) => setDistributorSearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-white"
                />
              </div>

              <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDistributorStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    distributorStatusFilter === 'ALL'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({distributors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDistributorStatusFilter('OUTSTANDING')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    distributorStatusFilter === 'OUTSTANDING'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({distributors.filter((d) => d.hasOutstandingNotes).length})
                </button>
                <button
                  type="button"
                  onClick={() => setDistributorStatusFilter('RECONCILED')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    distributorStatusFilter === 'RECONCILED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  100% Verified ({distributors.filter((d) => !d.hasOutstandingNotes).length})
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredDistributors.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Store className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">No distributors found matching your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting search filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Desktop / Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Distributor Outlet</th>
                      <th className="py-3 px-3 text-center">Units Sold</th>
                      <th className="py-3 px-3 text-center">Notes Received</th>
                      <th className="py-3 px-3 text-center">Pending Notes</th>
                      <th className="py-3 px-3 text-center">Collection %</th>
                      <th className="py-3 px-3">Last Submission</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredDistributors.map((dist) => (
                      <tr key={dist.distributorId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 text-sm">
                            {dist.distributorName}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-[11px]">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                              {dist.customerCode}
                            </span>
                            {dist.address && <span className="truncate max-w-xs">{dist.address}</span>}
                            {!isSalesRep && dist.assignedRepName && (
                              <span className="text-primary font-medium">
                                • Rep: {dist.assignedRepName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center font-semibold tabular-nums text-slate-900">
                          {dist.totalUnitsSold}
                        </td>

                        <td className="py-3.5 px-3 text-center font-semibold tabular-nums text-emerald-700">
                          {dist.warrantyNotesReceived}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <div className="font-semibold tabular-nums text-rose-700">
                            {dist.pendingNotesCount}
                          </div>
                          {dist.pendingNotesCount > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                              {dist.confirmedMissingCount > 0 && (
                                <span className="text-rose-600 font-medium mr-1">
                                  {dist.confirmedMissingCount} sold
                                </span>
                              )}
                              {dist.unaccountedInStockCount > 0 && (
                                <span className="text-slate-500">
                                  {dist.unaccountedInStockCount} stock
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-bold tabular-nums text-slate-800 text-xs">
                              {dist.collectionProgress}%
                            </span>
                            <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden inline-block">
                              <div
                                className={`h-1.5 rounded-full ${getProgressBarBg(dist.collectionProgress)}`}
                                style={{ width: `${dist.collectionProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                          {dist.lastSubmissionDate ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {formatDate(dist.lastSubmissionDate)}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">None recorded</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {dist.pendingNotesCount === 0 ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              100% Reconciled
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {dist.pendingNotesCount} Notes Due
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => loadDistributorUnits(dist)}
                              size="sm"
                              className="h-7 text-xs bg-primary hover:bg-primary-hover text-white gap-1 shadow-xs font-medium"
                            >
                              <Barcode className="h-3.5 w-3.5" />
                              Verify Barcodes
                            </Button>

                            <Button
                              onClick={() => {
                                setActiveFollowUpDistributor({
                                  customerId: dist.distributorId,
                                  customerName: dist.distributorName,
                                  totalUnitsSold: dist.totalUnitsSold,
                                  warrantyNotesReceived: dist.warrantyNotesReceived,
                                  pendingNotesCount: dist.pendingNotesCount,
                                  lastFollowUpDate: dist.lastSubmissionDate,
                                  followUpNotes: [],
                                });
                                setIsFollowUpModalOpen(true);
                              }}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100 gap-1"
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                              Log Visit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredDistributors.map((dist) => (
                  <div key={dist.distributorId} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">
                          {dist.distributorName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 text-[11px]">
                            {dist.customerCode}
                          </span>
                          {dist.address && <span className="truncate max-w-[180px]">{dist.address}</span>}
                        </div>
                      </div>

                      {dist.pendingNotesCount === 0 ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] shrink-0 font-semibold">
                          Reconciled
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] shrink-0 font-semibold">
                          {dist.pendingNotesCount} Due
                        </Badge>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-center text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Sold</span>
                        <span className="font-bold text-slate-900 tabular-nums text-sm">{dist.totalUnitsSold}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Received</span>
                        <span className="font-bold text-emerald-700 tabular-nums text-sm">{dist.warrantyNotesReceived}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Pending</span>
                        <span className="font-bold text-rose-700 tabular-nums text-sm">{dist.pendingNotesCount}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-500 font-medium">Collection Progress</span>
                        <span className="font-bold text-slate-800">{dist.collectionProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${getProgressBarBg(dist.collectionProgress)}`}
                          style={{ width: `${dist.collectionProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        onClick={() => loadDistributorUnits(dist)}
                        size="sm"
                        className="flex-1 h-8 text-xs bg-primary hover:bg-primary-hover text-white gap-1.5 shadow-xs font-medium"
                      >
                        <Barcode className="h-3.5 w-3.5" />
                        Verify Barcodes
                      </Button>

                      <Button
                        onClick={() => {
                          setActiveFollowUpDistributor({
                            customerId: dist.distributorId,
                            customerName: dist.distributorName,
                            totalUnitsSold: dist.totalUnitsSold,
                            warrantyNotesReceived: dist.warrantyNotesReceived,
                            pendingNotesCount: dist.pendingNotesCount,
                            lastFollowUpDate: dist.lastSubmissionDate,
                            followUpNotes: [],
                          });
                          setIsFollowUpModalOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 gap-1 px-3"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Log Visit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-Down Unit Barcode Verification Modal */}
      <Dialog
        open={!!selectedDistributor}
        onOpenChange={(open) => !open && setSelectedDistributor(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedDistributor && (
            <>
              <DialogHeader className="p-5 border-b border-slate-200 bg-slate-50/70">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Barcode className="h-5 w-5 text-primary" />
                        Physical Unit Barcode Verification
                      </DialogTitle>
                      <Badge className="bg-slate-200/80 text-slate-800 text-xs font-mono font-medium">
                        {selectedDistributor.customerCode}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Distributor: <strong>{selectedDistributor.distributorName}</strong> ({selectedDistributor.address})
                    </p>
                  </div>

                  {/* Distributor Progress Pill */}
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reconciliation</span>
                      <span className="font-bold text-slate-900">
                        {selectedDistributor.warrantyNotesReceived} / {selectedDistributor.totalUnitsSold} Notes
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div className="font-bold text-sm text-primary">
                      {selectedDistributor.collectionProgress}%
                    </div>
                  </div>
                </div>

                {/* Specific Business Scenario Clarification Banner */}
                <div className="mt-3 bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-amber-950">
                      Unit Reconciliation Rule (Field Verification):
                    </span>
                    <span className="text-amber-800 leading-snug block mt-0.5">
                      Distinguish physical units sold to end customers from units still residing in distributor inventory.
                      If a unit is sold to a customer without a warranty note reaching head office, mark it as <strong>Missing Note (Sold to Customer)</strong>.
                      Units safely in stock are categorized as <strong>In Distributor Stock</strong>.
                    </span>
                  </div>
                </div>

                {/* Filter and Search Bar inside Modal */}
                <div className="mt-3 flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search barcode number, serial, product SKU, invoice, end-customer..."
                      value={barcodeSearch}
                      onChange={(e) => setBarcodeSearch(e.target.value)}
                      className="pl-8 text-xs h-8 bg-white w-full"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
                    <button
                      type="button"
                      onClick={() => setUnitStatusFilter('ALL')}
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        unitStatusFilter === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      All ({unitDetails.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitStatusFilter('RECEIVED_VERIFIED')}
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        unitStatusFilter === 'RECEIVED_VERIFIED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                      }`}
                    >
                      Verified ({unitDetails.filter((u) => u.warrantyStatus === 'RECEIVED_VERIFIED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitStatusFilter('MISSING_CONFIRMED')}
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        unitStatusFilter === 'MISSING_CONFIRMED'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                      }`}
                    >
                      Missing Note ({unitDetails.filter((u) => u.warrantyStatus === 'MISSING_CONFIRMED').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnitStatusFilter('IN_DISTRIBUTOR_STOCK')}
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        unitStatusFilter === 'IN_DISTRIBUTOR_STOCK'
                          ? 'bg-slate-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      In Stock ({unitDetails.filter((u) => u.warrantyStatus === 'IN_DISTRIBUTOR_STOCK').length})
                    </button>
                  </div>
                </div>
              </DialogHeader>

              {/* Units Table / List */}
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
                {unitsLoading ? (
                  <div className="p-8 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-xs">Loading unit barcodes from database...</p>
                  </div>
                ) : unitDetails.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Barcode className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No unit barcodes found</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing your search query or status filter</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {unitDetails.map((unit) => {
                      const isVerified = unit.warrantyStatus === 'RECEIVED_VERIFIED';
                      const isMissing = unit.warrantyStatus === 'MISSING_CONFIRMED';
                      const isInStock = unit.warrantyStatus === 'IN_DISTRIBUTOR_STOCK';

                      return (
                        <div
                          key={unit.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isVerified
                              ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300'
                              : isMissing
                              ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Barcode & Product Details */}
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm font-bold tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1.5">
                                  <Barcode className="h-4 w-4 text-slate-500" />
                                  {unit.barcode}
                                </span>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyBarcode(unit.barcode)}
                                  className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-slate-900"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  {copiedBarcode === unit.barcode ? 'Copied' : 'Copy'}
                                </Button>

                                {unit.serialNumber && (
                                  <span className="text-[11px] font-mono text-slate-500">
                                    SN: {unit.serialNumber}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {unit.productName}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                                <span className="font-mono text-slate-600">SKU: {unit.sku}</span>
                                <span>• Sold to Dealer: {formatDate(unit.saleDate)}</span>
                                <span>• Inv: {unit.invoiceNumber}</span>
                              </div>
                            </div>

                            {/* Status & Customer Sale Context */}
                            <div className="flex flex-col sm:items-end justify-between gap-1.5 shrink-0">
                              {isVerified && (
                                <div className="space-y-0.5 sm:text-right">
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Received & Verified
                                  </Badge>
                                  {unit.warrantyNoteNumber && (
                                    <div className="text-[11px] text-emerald-700 font-mono">
                                      Note #{unit.warrantyNoteNumber}
                                    </div>
                                  )}
                                  {unit.warrantyNoteReceivedDate && (
                                    <div className="text-[10px] text-slate-400">
                                      Verified: {formatDate(unit.warrantyNoteReceivedDate)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {isMissing && (
                                <div className="space-y-0.5 sm:text-right">
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-semibold gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Missing Note (Customer Sale)
                                  </Badge>
                                  {unit.endCustomerSaleDate && (
                                    <div className="text-[11px] text-rose-700 font-medium">
                                      Sold on {formatDate(unit.endCustomerSaleDate)}
                                    </div>
                                  )}
                                  {unit.endCustomerName && (
                                    <div className="text-[11px] text-slate-600">
                                      Customer: {unit.endCustomerName}
                                    </div>
                                  )}
                                </div>
                              )}

                              {isInStock && (
                                <div className="space-y-0.5 sm:text-right">
                                  <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-xs font-medium gap-1">
                                    <PackageCheck className="h-3 w-3 text-slate-500" />
                                    In Distributor Stock
                                  </Badge>
                                  <div className="text-[10px] text-slate-400">
                                    Unsold unit in dealer warehouse
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  Showing {unitDetails.length} physical unit barcodes
                </span>
                <Button
                  onClick={() => setSelectedDistributor(null)}
                  className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white"
                >
                  Close Verification
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Field Follow-up Visit Modal */}
      <RecordFollowUpModal
        followUp={activeFollowUpDistributor}
        open={isFollowUpModalOpen}
        onOpenChange={(open) => {
          setIsFollowUpModalOpen(open);
          if (!open) setActiveFollowUpDistributor(null);
        }}
        onSuccess={() => {
          loadData();
          if (selectedDistributor) {
            loadDistributorUnits(selectedDistributor);
          }
        }}
      />
    </div>
  );
}
