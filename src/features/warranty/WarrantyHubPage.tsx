import { useState, useEffect } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import {
  WarrantyRecord,
  WarrantyClaim,
  ShopWarrantyFollowUp,
  WarrantyNote,
} from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { WarrantyStatusBadge, ClaimStatusBadge } from './WarrantyStatusBadge';
import { NewClaimModal } from './NewClaimModal';
import { ResolveClaimModal } from './ResolveClaimModal';
import { RecordFollowUpModal } from './RecordFollowUpModal';
import { RecordWarrantyNoteModal } from './RecordWarrantyNoteModal';
import { ReviewWarrantyNoteModal } from './ReviewWarrantyNoteModal';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  PlusCircle,
  Eye,
  Store,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  FileCheck2,
  Clock,
  XCircle,
  Sparkles,
} from 'lucide-react';

export function WarrantyHubPage() {
  const { role, currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'notes' | 'records' | 'claims' | 'followups'>('notes');

  // Distributor Warranty Notes state
  const [notes, setNotes] = useState<WarrantyNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteStatusFilter, setNoteStatusFilter] = useState<string>('ALL');

  // Warranty Records state
  const [records, setRecords] = useState<WarrantyRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordStatusFilter, setRecordStatusFilter] = useState<string>('ALL');

  // Claims state
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('ALL');

  // Follow-ups state
  const [followUps, setFollowUps] = useState<ShopWarrantyFollowUp[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(true);

  // Modals state
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [resolvingClaim, setResolvingClaim] = useState<WarrantyClaim | null>(null);
  const [activeFollowUp, setActiveFollowUp] = useState<ShopWarrantyFollowUp | null>(null);
  const [isRecordNoteOpen, setIsRecordNoteOpen] = useState(false);
  const [reviewingNote, setReviewingNote] = useState<WarrantyNote | null>(null);
  const [preselectedRecordForNote, setPreselectedRecordForNote] = useState<WarrantyRecord | null>(null);

  const canRecordNotes =
    hasPermission('warranty:record_notes') ||
    ['SALES_MANAGER', 'MANAGER', 'DIRECTOR'].includes(role);

  const loadNotes = async () => {
    try {
      setNotesLoading(true);
      const res = await warrantyService.getWarrantyNotes({
        search: noteSearch || undefined,
        status: noteStatusFilter !== 'ALL' ? (noteStatusFilter as any) : undefined,
        pageSize: 100,
      });
      setNotes(res.data);
    } catch (err) {
      console.error('Failed to load distributor warranty notes', err);
    } finally {
      setNotesLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      setRecordsLoading(true);
      const res = await warrantyService.getWarrantyRecords({
        search: recordSearch || undefined,
        status: recordStatusFilter !== 'ALL' ? (recordStatusFilter as any) : undefined,
        pageSize: 100,
      });
      setRecords(res.data);
    } catch (err) {
      console.error('Failed to load warranty records', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  const loadClaims = async () => {
    try {
      setClaimsLoading(true);
      const res = await warrantyService.getClaims({
        search: claimSearch || undefined,
        status: claimStatusFilter !== 'ALL' ? (claimStatusFilter as any) : undefined,
        pageSize: 100,
      });
      setClaims(res.data);
    } catch (err) {
      console.error('Failed to load warranty claims', err);
    } finally {
      setClaimsLoading(false);
    }
  };

  const loadFollowUps = async () => {
    try {
      setFollowUpsLoading(true);
      // Scoped if sales rep
      const repId = role === 'SALES_REP' ? currentUser.id : undefined;
      const data = await warrantyService.getShopWarrantyFollowUps(repId);
      setFollowUps(data);
    } catch (err) {
      console.error('Failed to load follow-ups', err);
    } finally {
      setFollowUpsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [noteSearch, noteStatusFilter]);

  useEffect(() => {
    loadRecords();
  }, [recordSearch, recordStatusFilter]);

  useEffect(() => {
    loadClaims();
  }, [claimSearch, claimStatusFilter]);

  useEffect(() => {
    loadFollowUps();
  }, [role, currentUser.id]);

  const handleInspectClaim = async (claimId: string) => {
    try {
      await warrantyService.inspectClaim(claimId, currentUser, 'Inspection underway by technical desk.');
      loadClaims();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    try {
      await warrantyService.approveClaim(claimId, currentUser, 'Claim verified and approved for technical resolution.');
      loadClaims();
    } catch (err) {
      console.error(err);
    }
  };

  // Quick stats
  const activeWarrantiesCount = records.filter((r) => r.status === 'ACTIVE').length;
  const pendingClaimsCount = claims.filter((c) => c.status === 'SUBMITTED' || c.status === 'IN_INSPECTION').length;
  const totalPendingCards = followUps.reduce((acc, f) => acc + f.pendingNotesCount, 0);
  const pendingNotesCount = notes.filter((n) => n.status === 'PENDING_REVIEW').length;
  const verifiedNotesCount = notes.filter((n) => n.status === 'VERIFIED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Warranty & Claims Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile distributor warranty notes, review customer warranty registration, and manage claim lifecycles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canRecordNotes && (
            <Button
              onClick={() => {
                setPreselectedRecordForNote(null);
                setIsRecordNoteOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 gap-1.5 shadow-sm"
            >
              <FileCheck2 className="h-4 w-4" />
              Record Warranty Note
            </Button>
          )}
          {role !== 'SALES_REP' && hasPermission('warranty:claims') && (
            <Button
              onClick={() => setIsNewClaimOpen(true)}
              className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium h-9 gap-1.5 shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              Lodge Warranty Claim
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active Warranties
              </span>
              <span className="text-2xl font-semibold tabular-nums text-slate-900 mt-1 block">
                {activeWarrantiesCount}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <span className="text-xs text-emerald-700 mt-2 block font-medium">
            Protected customer equipment
          </span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Active Claims In Pipeline
              </span>
              <span className="text-2xl font-semibold tabular-nums text-amber-700 mt-1 block">
                {pendingClaimsCount}
              </span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <span className="text-xs text-amber-800 mt-2 block font-medium">
            Pending technical inspection & resolution
          </span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Distributor Notes
              </span>
              <span className="text-2xl font-semibold tabular-nums text-primary mt-1 block">
                {notes.length}
              </span>
            </div>
            <div className="p-2.5 bg-sky-50 rounded-lg text-sky-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <span className="text-xs text-sky-700 mt-2 block font-medium">
            {pendingNotesCount > 0
              ? `${pendingNotesCount} pending Sales Manager review`
              : `${verifiedNotesCount} verified by Sales Manager`}
          </span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Missing Warranty Notes
              </span>
              <span className="text-2xl font-semibold tabular-nums text-rose-700 mt-1 block">
                {totalPendingCards}
              </span>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
              <Store className="h-5 w-5" />
            </div>
          </div>
          <span className="text-xs text-rose-700 mt-2 block font-medium">
            Across {followUps.length} distributor locations
          </span>
        </Card>
      </div>

      {/* Main Tabs Hub */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-slate-100/90 p-1 border border-slate-200/80 rounded-xl">
          <TabsTrigger value="notes" className="gap-1.5">
            <FileCheck2 className="h-3.5 w-3.5" />
            Distributor Warranty Notes ({notes.length})
            {pendingNotesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-200 text-amber-900 rounded-full font-bold">
                {pendingNotesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="records">
            Warranty Records
          </TabsTrigger>
          <TabsTrigger value="claims">
            Warranty Claims ({pendingClaimsCount})
          </TabsTrigger>
          <TabsTrigger value="followups">
            Field Follow-up ({totalPendingCards} Pending)
          </TabsTrigger>
        </TabsList>

        {/* TAB: Distributor Warranty Notes */}
        <TabsContent value="notes" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  Distributor Warranty Notes & Registration Ledger
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Our company sells products to distributors. When a warranty note is received, the Sales Manager reviews and validates it before warranty claims can be processed.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search note #, distributor, customer..."
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <Select
                  value={noteStatusFilter}
                  onValueChange={(val) => setNoteStatusFilter(val)}
                >
                  <SelectTrigger className="rounded-md border border-slate-300 text-xs h-8 px-2 bg-white text-slate-700 min-w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                    <SelectItem value="VERIFIED">Verified</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                {canRecordNotes && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setPreselectedRecordForNote(null);
                      setIsRecordNoteOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Enter Note
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading distributor warranty notes...</div>
              ) : notes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No distributor warranty notes on record. Click &quot;Record Warranty Note&quot; to enter a received note.
                </div>
              ) : (
                <>
                  {/* Mobile Cards for Warranty Notes */}
                  <div className="block md:hidden space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-bold text-primary block">{note.noteNumber}</span>
                            <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">{note.productName}</h4>
                            <span className="font-mono text-[11px] text-slate-400 block">
                              SKU: {note.sku} {note.serialNumber && `| SN: ${note.serialNumber}`}
                            </span>
                          </div>
                          <Badge
                            variant={
                              note.status === 'VERIFIED'
                                ? 'success'
                                : note.status === 'PENDING_REVIEW'
                                ? 'warning'
                                : 'destructive'
                            }
                            className="text-[10px]"
                          >
                            {note.status === 'VERIFIED'
                              ? 'Verified'
                              : note.status === 'PENDING_REVIEW'
                              ? 'Pending Review'
                              : 'Rejected'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Distributor</span>
                            <span className="font-medium text-slate-800 truncate block">{note.distributorName}</span>
                            <span className="font-mono text-[11px] text-slate-500">{note.invoiceNumber}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">End-Customer</span>
                            <span className="font-semibold text-slate-800 truncate block">{note.endCustomerName || 'N/A'}</span>
                            <span className="text-[10px] text-slate-500">{note.endCustomerPhone || 'No phone'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Distributor Sold</span>
                            <span className="font-medium text-slate-700">{formatDate(note.distributorSaleDate)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Received Date</span>
                            <span className="font-medium text-slate-700">{formatDate(note.receivedDate)}</span>
                          </div>
                        </div>

                        {note.reviewNotes && (
                          <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100 italic">
                            Review note: {note.reviewNotes}
                          </div>
                        )}

                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {note.reviewedByUserName ? `Reviewed by: ${note.reviewedByUserName}` : 'Awaiting review'}
                          </span>
                          {note.status === 'PENDING_REVIEW' && canRecordNotes && (
                            <Button
                              size="sm"
                              onClick={() => setReviewingNote(note)}
                              className="text-xs h-7 px-3 bg-primary hover:bg-primary-hover text-white font-semibold"
                            >
                              Review & Validate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table for Warranty Notes */}
                  <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Note / Card #</TableHead>
                          <TableHead>Distributor</TableHead>
                          <TableHead>Product / Serial</TableHead>
                          <TableHead>Sale Date</TableHead>
                          <TableHead>Received Date</TableHead>
                          <TableHead>End Customer</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead>Review Audit</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notes.map((note) => (
                          <TableRow key={note.id}>
                            <TableCell className="font-mono text-xs font-semibold text-primary">
                              {note.noteNumber}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-slate-900">{note.distributorName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{note.invoiceNumber}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-slate-900">{note.productName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {note.sku} {note.serialNumber && `| SN: ${note.serialNumber}`}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {formatDate(note.distributorSaleDate)}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {formatDate(note.receivedDate)}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-slate-900">
                                {note.endCustomerName || 'Not specified'}
                              </div>
                              {note.endCustomerPhone && (
                                <div className="text-[11px] text-slate-400">{note.endCustomerPhone}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  note.status === 'VERIFIED'
                                    ? 'success'
                                    : note.status === 'PENDING_REVIEW'
                                    ? 'warning'
                                    : 'destructive'
                                }
                                className="text-[10px]"
                              >
                                {note.status === 'VERIFIED'
                                  ? 'Verified'
                                  : note.status === 'PENDING_REVIEW'
                                  ? 'Pending Review'
                                  : 'Rejected'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[160px] truncate" title={note.reviewNotes}>
                              {note.reviewedByUserName ? (
                                <div>
                                  <span className="font-medium text-slate-800">{note.reviewedByUserName}</span>
                                  {note.reviewedAt && (
                                    <span className="text-[10px] text-slate-400 block">{formatDate(note.reviewedAt)}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Pending Sales Manager</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {note.status === 'PENDING_REVIEW' && canRecordNotes ? (
                                <Button
                                  size="sm"
                                  onClick={() => setReviewingNote(note)}
                                  className="text-[11px] h-7 px-2.5 bg-primary hover:bg-primary-hover text-white font-medium"
                                >
                                  Review
                                </Button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">Logged</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 1: Warranty Records */}
        <TabsContent value="records" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Registered Warranties Master Ledger
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search SKU, customer, serial..."
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <Select
                  value={recordStatusFilter}
                  onValueChange={(val) => setRecordStatusFilter(val)}
                >
                  <SelectTrigger className="rounded-md border border-slate-300 text-xs h-8 px-2 bg-white text-slate-700 min-w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="CLAIMED">Claimed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading warranty records...</div>
              ) : records.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No warranty records found.</div>
              ) : (
                <>
                  {/* Mobile Cards for Warranty Records */}
                  <div className="block md:hidden space-y-3">
                    {records.map((rec) => (
                      <div key={rec.id} className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{rec.productName}</h4>
                            <span className="font-mono text-[11px] text-slate-400 block">
                              SKU: {rec.sku} {rec.serialNumber && `| SN: ${rec.serialNumber}`}
                            </span>
                          </div>
                          <WarrantyStatusBadge status={rec.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Customer</span>
                            <span className="font-medium text-slate-800 truncate block">{rec.customerName}</span>
                            <span className="font-mono text-[11px] text-primary">{rec.invoiceNumber}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Expiry Date</span>
                            <span className="font-semibold text-slate-800">{formatDate(rec.warrantyExpiryDate)}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{rec.saleType}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table for Warranty Records */}
                  <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product / SKU</TableHead>
                          <TableHead>Customer / Dealer</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Sale Type</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Warranty Expiry</TableHead>
                          <TableHead>Distributor Note</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((rec) => (
                          <TableRow key={rec.id}>
                            <TableCell>
                              <div className="font-semibold text-slate-900 text-xs">{rec.productName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                SKU: {rec.sku} {rec.serialNumber && `| SN: ${rec.serialNumber}`}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700 font-medium">
                              {rec.customerName}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-primary">
                              {rec.invoiceNumber}
                            </TableCell>
                            <TableCell>
                              <Badge variant={rec.saleType === 'SHOWROOM' ? 'info' : 'secondary'} className="text-[10px]">
                                {rec.saleType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {formatDate(rec.warrantyStartDate)}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-800">
                              {formatDate(rec.warrantyExpiryDate)}
                            </TableCell>
                            <TableCell>
                              {rec.saleType === 'DEALER' ? (
                                rec.warrantyNoteStatus === 'VERIFIED' ? (
                                  <Badge variant="success" className="text-[10px] gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {rec.warrantyNoteNumber || 'Verified'}
                                  </Badge>
                                ) : rec.warrantyNoteStatus === 'PENDING_REVIEW' ? (
                                  <Badge variant="warning" className="text-[10px] gap-1">
                                    <Clock className="h-3 w-3" />
                                    Pending Review
                                  </Badge>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="destructive" className="text-[10px]">
                                      Missing Note
                                    </Badge>
                                    {canRecordNotes && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setPreselectedRecordForNote(rec);
                                          setIsRecordNoteOpen(true);
                                        }}
                                        className="text-[10px] h-6 px-1.5 text-primary border-primary/30 hover:bg-primary/5"
                                      >
                                        + Enter
                                      </Button>
                                    )}
                                  </div>
                                )
                              ) : (
                                <span className="text-[11px] text-slate-400">Direct Showroom</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <WarrantyStatusBadge status={rec.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Warranty Claims */}
        <TabsContent value="claims" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Warranty Claims & Defect Intake Pipeline
              </CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search claim #, complaint..."
                    value={claimSearch}
                    onChange={(e) => setClaimSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
                <Select
                  value={claimStatusFilter}
                  onValueChange={(val) => setClaimStatusFilter(val)}
                >
                  <SelectTrigger className="w-auto min-w-[130px] text-xs h-8">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="IN_INSPECTION">In Inspection</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REPLACED">Replaced</SelectItem>
                    <SelectItem value="REPAIRED">Repaired</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {claimsLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading claims...</div>
              ) : claims.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No warranty claims on record.</div>
              ) : (
                <>
                  {/* Mobile Cards for Warranty Claims */}
                  <div className="block md:hidden space-y-3">
                    {claims.map((claim) => (
                      <div key={claim.id} className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-primary">
                              {claim.claimNumber}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 mt-0.5">{claim.productName}</h4>
                            <span className="font-mono text-[11px] text-slate-400">
                              {claim.sku} {claim.serialNumber && `| ${claim.serialNumber}`}
                            </span>
                          </div>
                          <ClaimStatusBadge status={claim.status} />
                        </div>

                        <div className="rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Customer:</span>
                            <span className="font-medium text-slate-800">{claim.customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Complaint Date:</span>
                            <span className="text-slate-700">{formatDate(claim.complaintDate)}</span>
                          </div>
                          <div className="pt-1 border-t border-slate-200/60">
                            <span className="text-slate-400 block text-[10.5px]">Defect Details:</span>
                            <p className="text-slate-700 italic text-[11px] mt-0.5">{claim.complaintReason}</p>
                          </div>
                        </div>

                        {/* Action buttons (Touch targets min 38px) */}
                        <div className="pt-1 flex items-center justify-end gap-2 flex-wrap">
                          {claim.status === 'SUBMITTED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInspectClaim(claim.id)}
                              className="text-xs h-8 px-3 rounded-xl"
                            >
                              Inspect
                            </Button>
                          )}
                          {claim.status === 'IN_INSPECTION' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveClaim(claim.id)}
                              className="text-xs h-8 px-3 rounded-xl text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                            >
                              Approve
                            </Button>
                          )}
                          {(claim.status === 'SUBMITTED' || claim.status === 'IN_INSPECTION' || claim.status === 'APPROVED') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setResolvingClaim(claim)}
                              className="text-xs h-8 px-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                            >
                              Resolve Claim
                            </Button>
                          )}
                          {claim.resolutionType && (
                            <span className="text-xs text-slate-500 font-semibold px-2 py-1 rounded bg-slate-100">
                              {claim.resolutionType}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table for Claims */}
                  <div className="hidden md:block rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Claim #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Product / Serial</TableHead>
                          <TableHead>Complaint Date</TableHead>
                          <TableHead>Defect Details</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {claims.map((claim) => (
                          <TableRow key={claim.id}>
                            <TableCell className="tabular-nums text-xs font-semibold text-slate-900">
                              {claim.claimNumber}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">{claim.customerName}</TableCell>
                            <TableCell>
                              <div className="text-xs font-medium text-slate-900">{claim.productName}</div>
                              <div className="text-xs text-slate-400 font-mono">
                                {claim.sku} {claim.serialNumber && `| ${claim.serialNumber}`}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {formatDate(claim.complaintDate)}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[200px] truncate" title={claim.complaintReason}>
                              {claim.complaintReason}
                            </TableCell>
                            <TableCell className="text-center">
                              <ClaimStatusBadge status={claim.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {claim.status === 'SUBMITTED' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleInspectClaim(claim.id)}
                                    className="text-[11px] h-7 px-2"
                                  >
                                    Inspect
                                  </Button>
                                )}
                                {claim.status === 'IN_INSPECTION' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApproveClaim(claim.id)}
                                    className="text-[11px] h-7 px-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                  >
                                    Approve
                                  </Button>
                                )}
                                {(claim.status === 'SUBMITTED' || claim.status === 'IN_INSPECTION' || claim.status === 'APPROVED') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setResolvingClaim(claim)}
                                    className="text-[11px] h-7 px-2 text-primary hover:text-primary-text font-semibold"
                                  >
                                    Resolve
                                  </Button>
                                )}
                                {claim.resolutionType && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {claim.resolutionType}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Field Warranty Follow-up (Sales Rep view) */}
        <TabsContent value="followups" className="space-y-4 pt-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Dealer Warranty Card Collection & Follow-up
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track retail cards collected vs sold units for assigned dealer portfolio.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {followUpsLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading dealer follow-ups...</div>
              ) : followUps.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">No dealer accounts requiring follow-up.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {followUps.map((fu) => (
                    <div
                      key={fu.customerId}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900 text-xs">{fu.customerName}</h4>
                          <span className="text-xs text-slate-400">Dealer Account</span>
                        </div>
                        {fu.pendingNotesCount > 0 ? (
                          <Badge variant="warning" className="text-xs font-semibold">
                            {fu.pendingNotesCount} Missing Cards
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-xs font-semibold">
                            Fully Reconciled
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-xs py-2 bg-slate-50 rounded-lg">
                        <div>
                          <span className="text-xs text-slate-400 uppercase block">Units Sold</span>
                          <span className="text-sm font-semibold tabular-nums text-slate-900">{fu.totalUnitsSold}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 uppercase block">Cards Received</span>
                          <span className="text-sm font-semibold tabular-nums text-emerald-700">{fu.warrantyNotesReceived}</span>
                        </div>
                      </div>

                      {fu.followUpNotes && fu.followUpNotes.length > 0 && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                          <span className="font-semibold text-slate-700 block mb-0.5">Last Log:</span>
                          <p className="line-clamp-2 italic">{fu.followUpNotes[fu.followUpNotes.length - 1]}</p>
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">
                          {fu.lastFollowUpDate ? `Visited: ${formatDate(fu.lastFollowUpDate)}` : 'No visits recorded'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveFollowUp(fu)}
                          className="text-xs h-7 gap-1"
                        >
                          Record Visit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NewClaimModal
        open={isNewClaimOpen}
        onOpenChange={setIsNewClaimOpen}
        onSuccess={() => {
          loadClaims();
          loadRecords();
        }}
      />

      <ResolveClaimModal
        claim={resolvingClaim}
        open={!!resolvingClaim}
        onOpenChange={(open) => !open && setResolvingClaim(null)}
        onSuccess={() => {
          loadClaims();
          loadRecords();
        }}
      />

      <RecordFollowUpModal
        followUp={activeFollowUp}
        open={!!activeFollowUp}
        onOpenChange={(open) => !open && setActiveFollowUp(null)}
        onSuccess={() => {
          loadFollowUps();
        }}
      />

      <RecordWarrantyNoteModal
        open={isRecordNoteOpen}
        onOpenChange={setIsRecordNoteOpen}
        preselectedRecord={preselectedRecordForNote}
        onSuccess={() => {
          loadNotes();
          loadRecords();
          loadFollowUps();
        }}
      />

      <ReviewWarrantyNoteModal
        note={reviewingNote}
        open={!!reviewingNote}
        onOpenChange={(open) => !open && setReviewingNote(null)}
        onSuccess={() => {
          loadNotes();
          loadRecords();
        }}
      />
    </div>
  );
}

