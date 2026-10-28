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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import {
  WarrantyRecord,
  WarrantyClaim,
  ShopWarrantyFollowUp,
  WarrantyNote,
  ProductBarcodeDossier,
} from '../../types/warranty';
import { warrantyService } from '../../services/WarrantyService';
import { WarrantyStatusBadge, ClaimStatusBadge } from './WarrantyStatusBadge';
import { NewClaimModal } from './NewClaimModal';
import { ResolveClaimModal } from './ResolveClaimModal';
import { RecordFollowUpModal } from './RecordFollowUpModal';
import { RecordWarrantyNoteModal } from './RecordWarrantyNoteModal';
import { ReviewWarrantyNoteModal } from './ReviewWarrantyNoteModal';
import { SalesRepWarrantyPage } from './SalesRepWarrantyPage';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { calculateWarrantyExpiry, calculateRemainingWarranty } from '../../rules/warrantyRules';
import { MOCK_CUSTOMERS } from '../../mock/mockCustomers';
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
  Barcode,
  UploadCloud,
  FileImage,
  RefreshCw,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
  Info,
  Check,
  Package,
} from 'lucide-react';

export function WarrantyHubPage() {
  const { role, currentUser, hasPermission } = useAuth();
  const isSalesRep = role === 'SALES_REP';

  // Active Hub Tab
  const [activeTab, setActiveTab] = useState<
    'registration' | 'claims' | 'records' | 'followups' | 'notes'
  >('records');

  // -------------------------------------------------------------
  // 1. SALES MANAGER – WARRANTY REGISTRATION FLOW STATE
  // -------------------------------------------------------------
  const [scanBarcode, setScanBarcode] = useState('8901020304011');
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossier, setDossier] = useState<ProductBarcodeDossier | null>(null);

  // Registration Form State
  const [sellingDate, setSellingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('cust-001');
  const [endCustomerName, setEndCustomerName] = useState('Perera Constructions');
  const [endCustomerPhone, setEndCustomerPhone] = useState('+94 77 123 4567');
  const [warrantyPeriodMonths, setWarrantyPeriodMonths] = useState(12);
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
  );
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<string | null>(null);
  const [registerErrorMsg, setRegisterErrorMsg] = useState<string | null>(null);

  // Live Calculated Warranty values based on selling date
  const calculatedExpiryDate = useMemo(() => {
    if (!sellingDate) return '';
    return calculateWarrantyExpiry(sellingDate, warrantyPeriodMonths);
  }, [sellingDate, warrantyPeriodMonths]);

  const liveRemainingInfo = useMemo(() => {
    if (!calculatedExpiryDate) return null;
    return calculateRemainingWarranty(calculatedExpiryDate, sellingDate);
  }, [calculatedExpiryDate, sellingDate]);

  // Lookup product barcode dossier
  const handleLookupBarcode = async (codeToLookup?: string) => {
    const code = (codeToLookup || scanBarcode).trim();
    if (!code) return;
    try {
      setDossierLoading(true);
      setRegisterSuccessMsg(null);
      setRegisterErrorMsg(null);
      const data = await warrantyService.lookupProductByBarcode(code);
      setDossier(data);
      if (data) {
        setWarrantyPeriodMonths(data.defaultWarrantyPeriodMonths || 12);
        if (data.distributorId) {
          setSelectedCustomerId(data.distributorId);
        }
        if (data.endCustomerSellingDate) {
          setSellingDate(data.endCustomerSellingDate);
        }
        if (data.endCustomerName) {
          setEndCustomerName(data.endCustomerName);
        }
        if (data.endCustomerPhone) {
          setEndCustomerPhone(data.endCustomerPhone);
        }
        if (data.receiptPhotoUrl) {
          setReceiptPhotoUrl(data.receiptPhotoUrl);
        }
      }
    } catch (err) {
      console.error('Failed to lookup barcode:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  useEffect(() => {
    handleLookupBarcode(scanBarcode);
  }, []);

  // Save end-customer warranty registration
  const handleRegisterWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanBarcode.trim()) {
      setRegisterErrorMsg('Please scan or enter a product barcode.');
      return;
    }
    if (!sellingDate) {
      setRegisterErrorMsg('End-customer selling date is required.');
      return;
    }

    try {
      setRegisterLoading(true);
      setRegisterErrorMsg(null);
      const selectedCust = MOCK_CUSTOMERS.find((c) => c.id === selectedCustomerId);
      const res = await warrantyService.registerEndCustomerWarranty(
        {
          barcode: scanBarcode.trim(),
          sellingDate,
          customerId: selectedCustomerId,
          customerName: selectedCust?.name,
          warrantyPeriodMonths,
          endCustomerName: endCustomerName.trim() || undefined,
          endCustomerPhone: endCustomerPhone.trim() || undefined,
          receiptPhotoUrl,
        },
        currentUser
      );

      setRegisterSuccessMsg(
        `Warranty successfully registered! Start: ${res.warrantyStartDate} | Expiry: ${res.warrantyExpiryDate}`
      );
      // Refresh dossier and ledger
      handleLookupBarcode(scanBarcode);
      loadRecords();
      loadNotes();
    } catch (err: any) {
      setRegisterErrorMsg(err.message || 'Failed to register warranty.');
    } finally {
      setRegisterLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. WARRANTY CLAIM WORKFLOW STATE
  // -------------------------------------------------------------
  const [claimBarcode, setClaimBarcode] = useState('8901020304011');
  const [claimDossierLoading, setClaimDossierLoading] = useState(false);
  const [claimDossier, setClaimDossier] = useState<ProductBarcodeDossier | null>(null);
  const [claimComplaintReason, setClaimComplaintReason] = useState('');
  const [claimComplaintDate, setClaimComplaintDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [claimErrorMsg, setClaimErrorMsg] = useState<string | null>(null);

  const handleLookupClaimBarcode = async (codeToLookup?: string) => {
    const code = (codeToLookup || claimBarcode).trim();
    if (!code) return;
    try {
      setClaimDossierLoading(true);
      setClaimSuccessMsg(null);
      setClaimErrorMsg(null);
      const data = await warrantyService.lookupProductByBarcode(code);
      setClaimDossier(data);
    } catch (err) {
      console.error('Failed to lookup claim barcode:', err);
    } finally {
      setClaimDossierLoading(false);
    }
  };

  const handleCreateWarrantyClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimDossier) return;

    if (claimDossier.isExpired) {
      setClaimErrorMsg('Cannot create claim: Product warranty has expired.');
      return;
    }
    if (!claimDossier.isRegistered || !claimDossier.warrantyRecordId) {
      setClaimErrorMsg('Product warranty must be registered before creating a claim.');
      return;
    }
    if (!claimComplaintReason.trim()) {
      setClaimErrorMsg('Please enter a complaint / defect description.');
      return;
    }

    try {
      setClaimSubmitting(true);
      setClaimErrorMsg(null);
      await warrantyService.createClaim(
        {
          warrantyRecordId: claimDossier.warrantyRecordId,
          complaintDate: claimComplaintDate,
          complaintReason: claimComplaintReason.trim(),
          serialNumber: claimDossier.serialNumber,
        },
        currentUser
      );
      setClaimSuccessMsg('Warranty claim successfully lodged! Awaiting technical desk inspection.');
      setClaimComplaintReason('');
      loadClaims();
    } catch (err: any) {
      setClaimErrorMsg(err.message || 'Failed to lodge warranty claim.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // RECORDS, CLAIMS, NOTES LEDGERS STATE
  // -------------------------------------------------------------
  const [records, setRecords] = useState<WarrantyRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordStatusFilter, setRecordStatusFilter] = useState<string>('ALL');

  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('ALL');

  const [notes, setNotes] = useState<WarrantyNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteStatusFilter, setNoteStatusFilter] = useState<string>('ALL');

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

  const loadFollowUps = async () => {
    try {
      setFollowUpsLoading(true);
      const data = await warrantyService.getShopWarrantyFollowUps();
      setFollowUps(data);
    } catch (err) {
      console.error('Failed to load follow-ups', err);
    } finally {
      setFollowUpsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [recordSearch, recordStatusFilter]);

  useEffect(() => {
    loadClaims();
  }, [claimSearch, claimStatusFilter]);

  useEffect(() => {
    loadNotes();
  }, [noteSearch, noteStatusFilter]);

  useEffect(() => {
    loadFollowUps();
  }, []);

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
  const pendingClaimsCount = claims.filter(
    (c) => c.status === 'SUBMITTED' || c.status === 'IN_INSPECTION'
  ).length;
  const totalPendingCards = followUps.reduce((acc, f) => acc + f.pendingNotesCount, 0);
  const pendingNotesCount = notes.filter((n) => n.status === 'PENDING_REVIEW').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Warranty & Claims Hub
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold text-xs">
              Sales Manager / Admin Console
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Register end-customer warranties, scan product barcodes, verify distributor delivery notes, and enforce claim eligibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canRecordNotes && !isSalesRep && (
            <Button
              onClick={() => {
                setPreselectedRecordForNote(null);
                setIsRecordNoteOpen(true);
              }}
              variant="outline"
              size="sm"
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold h-9 gap-1.5"
            >
              <FileCheck2 className="h-4 w-4" />
              Enter Distributor Note
            </Button>
          )}

          {!isSalesRep && hasPermission('warranty:claims') && (
            <Button
              onClick={() => {
                setActiveTab('claims');
                handleLookupClaimBarcode(scanBarcode);
              }}
              size="sm"
              className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold h-9 gap-1.5 shadow-sm"
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
              <span className="text-2xl font-bold tabular-nums text-slate-900 mt-1 block">
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
              <span className="text-2xl font-bold tabular-nums text-amber-700 mt-1 block">
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
              <span className="text-2xl font-bold tabular-nums text-primary mt-1 block">
                {notes.length}
              </span>
            </div>
            <div className="p-2.5 bg-sky-50 rounded-lg text-sky-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <span className="text-xs text-sky-700 mt-2 block font-medium">
            {pendingNotesCount > 0
              ? `${pendingNotesCount} pending review`
              : `All distributor notes reviewed`}
          </span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Missing Warranty Notes
              </span>
              <span className="text-2xl font-bold tabular-nums text-rose-700 mt-1 block">
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

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-slate-100/90 p-1 border border-slate-200/80 rounded-xl flex-wrap">
          {!isSalesRep && (
            <>
              <TabsTrigger value="registration" className="gap-1.5">
                <Barcode className="h-3.5 w-3.5" />
                1. Warranty Registration & Barcode
              </TabsTrigger>
              <TabsTrigger value="claims" className="gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                2. Warranty Claims ({pendingClaimsCount})
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="records" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Warranty Records
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1.5">
            <Store className="h-3.5 w-3.5" />
            Sales Rep Field Follow-up & Tally
          </TabsTrigger>
          {!isSalesRep && (
            <TabsTrigger value="notes" className="gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5" />
              Distributor Notes ({notes.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: SALES MANAGER WARRANTY REGISTRATION & BARCODE SCANNER */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="registration" className="space-y-6 pt-2">
          {/* CORE BUSINESS RULE BANNER */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 rounded-xl p-4 text-xs shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800 shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-emerald-950 flex items-center gap-2">
                  <span>Core Business Rule: Distributor invoice date ≠ Warranty start date</span>
                  <span className="px-2 py-0.2 bg-emerald-200 text-emerald-950 rounded text-[10px] uppercase font-extrabold">
                    Strict Policy
                  </span>
                </h4>
                <p className="text-emerald-900 leading-relaxed text-[11px]">
                  The distributor invoice date records when goods left company inventory to the dealer.
                  <strong> The end-customer warranty begins strictly on the date the shop sells the product to the end customer</strong>, verified from the received warranty receipt photo.
                </p>
              </div>
            </div>
          </div>

          {/* BARCODE SCANNER & INPUT */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-primary" />
                  Scan or Enter Product Barcode / Serial Number
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  Lookup product lifecycle details from GRN, Inventory & Invoice records
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Barcode className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Enter or scan barcode (e.g. 8901020304011)..."
                    value={scanBarcode}
                    onChange={(e) => setScanBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookupBarcode(scanBarcode);
                      }
                    }}
                    className="pl-9 text-xs h-10 font-mono text-slate-900 font-bold"
                  />
                </div>
                <Button
                  onClick={() => handleLookupBarcode(scanBarcode)}
                  className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white text-xs h-10 px-5 gap-1.5 shadow-xs font-semibold"
                >
                  <Search className="h-4 w-4" />
                  Lookup Product
                </Button>
              </div>

              {/* Quick sample barcode tester buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Quick Barcode Demos:</span>
                <button
                  type="button"
                  onClick={() => {
                    setScanBarcode('8901020304011');
                    handleLookupBarcode('8901020304011');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] border border-slate-200"
                >
                  8901020304011 (Active)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanBarcode('8901020305001');
                    handleLookupBarcode('8901020305001');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] border border-slate-200"
                >
                  8901020305001 (Active)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanBarcode('8901020305002');
                    handleLookupBarcode('8901020305002');
                  }}
                  className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-mono text-[11px] border border-rose-200"
                >
                  8901020305002 (Expired)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScanBarcode('8901020305003');
                    handleLookupBarcode('8901020305003');
                  }}
                  className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-mono text-[11px] border border-amber-200"
                >
                  8901020305003 (Unregistered)
                </button>
              </div>
            </CardContent>
          </Card>

          {/* AUTOMATIC PRODUCT INFORMATION DOSSIER (READ ONLY) */}
          {dossierLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
              Retrieving product lifecycle records...
            </div>
          ) : dossier ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Read-Only Retrieved Product Information */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="border-slate-200 shadow-xs bg-slate-50/50">
                  <CardHeader className="p-4 border-b border-slate-200/80 bg-white">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-primary" />
                        Retrieved Product Lifecycle (Read-Only)
                      </CardTitle>
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold">
                        Read-Only
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Product Name</span>
                      <span className="font-bold text-slate-900 text-sm block mt-0.5">{dossier.productName}</span>
                      <span className="text-slate-500 font-mono text-[11px] block mt-0.5">SKU: {dossier.sku} • {dossier.categoryName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Barcode</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px] block mt-0.5">{dossier.barcode}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Serial Number</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px] block mt-0.5">{dossier.serialNumber}</span>
                      </div>
                    </div>

                    {/* Distributor Invoice Info */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Distributor Invoice #</span>
                        <span className="font-mono font-semibold text-primary block mt-0.5">{dossier.distributorInvoiceNumber}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Invoice Date</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">{formatDate(dossier.distributorInvoiceDate)}</span>
                      </div>
                    </div>

                    {/* GRN Information */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">GRN Number</span>
                        <span className="font-mono font-semibold text-slate-800 block mt-0.5">{dossier.grnNumber}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">GRN Date</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">{formatDate(dossier.grnDate)}</span>
                      </div>
                    </div>

                    {/* Cost, Supplier & Sales Rep */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Product Cost:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(dossier.productCost)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Distributor / Supplier:</span>
                        <span className="font-medium text-slate-800">{dossier.supplierName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Handling Sales Rep:</span>
                        <span className="font-semibold text-primary">{dossier.salesRepName}</span>
                      </div>
                    </div>

                    {/* Audit Trail Path */}
                    <div className="p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 space-y-1">
                      <span className="font-bold block text-slate-800">Product Lifecycle Audit Trail:</span>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600 flex-wrap">
                        <span className="bg-white px-1.5 py-0.5 rounded border">{dossier.grnNumber}</span>
                        <span>→</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border">INV: {dossier.distributorInvoiceNumber}</span>
                        <span>→</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border">{dossier.distributorName}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: End-Customer Warranty Registration Form */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-slate-200 shadow-xs bg-white">
                  <CardHeader className="p-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 text-emerald-600" />
                        End-Customer Warranty Registration
                      </span>
                      {dossier.isRegistered ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                          Already Registered
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs">
                          Pending Registration
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <form onSubmit={handleRegisterWarranty} className="space-y-4 text-xs">
                      {registerSuccessMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2 font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>{registerSuccessMsg}</span>
                        </div>
                      )}

                      {registerErrorMsg && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center gap-2 font-medium">
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          <span>{registerErrorMsg}</span>
                        </div>
                      )}

                      {/* Selling Date & Customer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block font-bold text-slate-800 mb-1">
                            End-Customer Selling Date <span className="text-rose-500">*</span>
                          </label>
                          <Input
                            type="date"
                            value={sellingDate}
                            onChange={(e) => setSellingDate(e.target.value)}
                            className="text-xs h-9 font-medium"
                            required
                          />
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Warranty starts strictly from this date
                          </span>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-800 mb-1">
                            Distributor / Dealer Customer <span className="text-rose-500">*</span>
                          </label>
                          <Select
                            value={selectedCustomerId}
                            onValueChange={(val) => setSelectedCustomerId(val)}
                          >
                            <SelectTrigger className="text-xs h-9">
                              <SelectValue placeholder="Select Customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {MOCK_CUSTOMERS.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                  {c.name} ({c.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Shop that sold unit to end customer
                          </span>
                        </div>
                      </div>

                      {/* Customer Details & Warranty Period Override */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            End-Customer Name
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. Perera Constructions"
                            value={endCustomerName}
                            onChange={(e) => setEndCustomerName(e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Customer Phone
                          </label>
                          <Input
                            type="text"
                            placeholder="e.g. +94 77 123 4567"
                            value={endCustomerPhone}
                            onChange={(e) => setEndCustomerPhone(e.target.value)}
                            className="text-xs h-9 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-800 mb-1">
                            Warranty Period (Months)
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="60"
                            value={warrantyPeriodMonths}
                            onChange={(e) => setWarrantyPeriodMonths(Number(e.target.value) || 12)}
                            className="text-xs h-9 font-bold"
                          />
                          <span className="text-[10px] text-primary font-medium block mt-0.5">
                            Manager can override default {dossier.defaultWarrantyPeriodMonths}M
                          </span>
                        </div>
                      </div>

                      {/* Warranty Note / Receipt Photo */}
                      <div>
                        <label className="block font-bold text-slate-800 mb-1">
                          Warranty Note / Customer Receipt Photo
                        </label>
                        <div className="p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4">
                          <img
                            src={receiptPhotoUrl}
                            alt="Receipt note preview"
                            className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0"
                          />
                          <div className="space-y-1.5 flex-1">
                            <span className="font-semibold text-slate-800 block text-xs">
                              Verified End-Customer Warranty Counterfoil
                            </span>
                            <p className="text-[11px] text-slate-500">
                              Receipt image received from Sales Representative following field visit.
                            </p>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={receiptPhotoUrl}
                                onChange={(e) => setReceiptPhotoUrl(e.target.value)}
                                placeholder="Paste image URL..."
                                className="text-xs h-7 bg-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LIVE CALCULATED WARRANTY SUMMARY CARD */}
                      <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Automatic System Calculation
                          </span>
                          {liveRemainingInfo && (
                            <WarrantyStatusBadge status={liveRemainingInfo.status} />
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-700/80">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              Warranty Start Date
                            </span>
                            <span className="font-mono font-bold text-emerald-400 text-sm block mt-0.5">
                              {sellingDate || '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">= End Customer Selling Date</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              Warranty Expiry Date
                            </span>
                            <span className="font-mono font-bold text-sky-400 text-sm block mt-0.5">
                              {calculatedExpiryDate || '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              = Selling Date + {warrantyPeriodMonths}M
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                              Remaining Period
                            </span>
                            <span className="font-bold text-amber-300 text-sm block mt-0.5">
                              {liveRemainingInfo ? liveRemainingInfo.displayText : '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Active coverage</span>
                          </div>
                        </div>
                      </div>

                      {/* SUBMIT BUTTON */}
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={registerLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-6 gap-2 shadow-sm"
                        >
                          {registerLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Save Warranty Registration
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: WARRANTY CLAIM WORKFLOW (ACTIVE VS EXPIRED GATING) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="claims" className="space-y-6 pt-2">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/60">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Warranty Claim Intake Scanner
                </span>
                <span className="text-xs font-normal text-slate-500">
                  Scan barcode to verify active warranty coverage before creating a claim
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Barcode className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Scan product barcode for warranty claim (e.g. 8901020304011)..."
                    value={claimBarcode}
                    onChange={(e) => setClaimBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookupClaimBarcode(claimBarcode);
                      }
                    }}
                    className="pl-9 text-xs h-10 font-mono font-bold"
                  />
                </div>
                <Button
                  onClick={() => handleLookupClaimBarcode(claimBarcode)}
                  className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white text-xs h-10 px-5 gap-1.5 font-semibold"
                >
                  <Search className="h-4 w-4" />
                  Verify Warranty
                </Button>
              </div>

              {/* Sample Quick Testers for Claim */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Test Claim Barcodes:</span>
                <button
                  type="button"
                  onClick={() => {
                    setClaimBarcode('8901020304011');
                    handleLookupClaimBarcode('8901020304011');
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-mono text-[11px] border border-emerald-200"
                >
                  8901020304011 (Active - Claim Allowed)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClaimBarcode('8901020305002');
                    handleLookupClaimBarcode('8901020305002');
                  }}
                  className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 font-mono text-[11px] border border-rose-200 font-bold"
                >
                  8901020305002 (Expired - Strictly Blocked)
                </button>
              </div>

              {claimSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  {claimSuccessMsg}
                </div>
              )}

              {claimErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  {claimErrorMsg}
                </div>
              )}
            </CardContent>
          </Card>

          {claimDossierLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
              Verifying warranty status...
            </div>
          ) : claimDossier ? (
            <div className="space-y-4">
              {/* STRICT EXPIRED CHECK & BANNER */}
              {claimDossier.isExpired ? (
                <div className="p-5 bg-rose-50/90 border-2 border-rose-400 rounded-xl text-rose-950 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
                    <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
                    <span>Warranty Expired — Claim Prohibited</span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    This product's warranty expired on <strong>{claimDossier.warrantyExpiryDate}</strong>.
                    Under distributor warranty regulations, <strong>expired products cannot be registered as a warranty claim</strong>.
                    Claim filing controls are locked for this barcode.
                  </p>
                </div>
              ) : !claimDossier.isRegistered ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>
                      <strong>Warranty Not Registered:</strong> End-customer selling date has not been registered yet. Please register the warranty first.
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      setScanBarcode(claimDossier.barcode);
                      handleLookupBarcode(claimDossier.barcode);
                      setActiveTab('registration');
                    }}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                  >
                    Register Warranty Now
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Warranty Active & Verified! Valid until {claimDossier.warrantyExpiryDate} ({claimDossier.remainingPeriodText} remaining).
                </div>
              )}

              {/* CLAIM DETAILS CARD */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Product & Warranty Information */}
                <Card className="lg:col-span-5 border-slate-200 shadow-xs bg-slate-50/50">
                  <CardHeader className="p-4 border-b border-slate-200/80 bg-white">
                    <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                      <span>Product & Warranty Information</span>
                      <WarrantyStatusBadge status={claimDossier.warrantyStatus} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Product</span>
                      <span className="font-bold text-slate-900 text-sm block mt-0.5">{claimDossier.productName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">SKU: {claimDossier.sku}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Barcode</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px] block mt-0.5">{claimDossier.barcode}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Serial Number</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px] block mt-0.5">{claimDossier.serialNumber}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Distributor Customer</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">{claimDossier.distributorName}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">End-Customer Selling Date</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">{claimDossier.endCustomerSellingDate ? formatDate(claimDossier.endCustomerSellingDate) : 'Not Registered'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Warranty Start Date</span>
                        <span className="font-semibold text-emerald-700 block mt-0.5">{claimDossier.warrantyStartDate ? formatDate(claimDossier.warrantyStartDate) : '—'}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Warranty Expiry Date</span>
                        <span className={`font-semibold block mt-0.5 ${claimDossier.isExpired ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                          {claimDossier.warrantyExpiryDate ? formatDate(claimDossier.warrantyExpiryDate) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Original Invoice</span>
                        <span className="font-mono font-medium text-slate-800 block mt-0.5">{claimDossier.distributorInvoiceNumber}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(claimDossier.distributorInvoiceDate)}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">GRN & Sales Rep</span>
                        <span className="font-mono font-medium text-slate-800 block mt-0.5">{claimDossier.grnNumber}</span>
                        <span className="text-[10px] text-primary block">Rep: {claimDossier.salesRepName}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Claim Creation Form */}
                <Card className="lg:col-span-7 border-slate-200 shadow-xs bg-white">
                  <CardHeader className="p-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Lodge Customer Claim Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <form onSubmit={handleCreateWarrantyClaim} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Complaint Date <span className="text-rose-500">*</span>
                          </label>
                          <Input
                            type="date"
                            value={claimComplaintDate}
                            onChange={(e) => setClaimComplaintDate(e.target.value)}
                            disabled={claimDossier.isExpired || !claimDossier.canClaim}
                            className="text-xs h-9"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Customer Contact
                          </label>
                          <Input
                            type="text"
                            value={claimDossier.endCustomerPhone || ''}
                            readOnly
                            disabled={claimDossier.isExpired}
                            className="text-xs h-9 bg-slate-50 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Defect / Complaint Reason <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Describe the product failure, electrical fault, or reason for return..."
                          value={claimComplaintReason}
                          onChange={(e) => setClaimComplaintReason(e.target.value)}
                          disabled={claimDossier.isExpired || !claimDossier.canClaim}
                          className="w-full text-xs rounded-md border border-slate-300 p-2.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-100 disabled:text-slate-400"
                          required
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          disabled={
                            claimDossier.isExpired ||
                            !claimDossier.canClaim ||
                            claimSubmitting
                          }
                          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold h-10 px-6 gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claimSubmitting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <PlusCircle className="h-4 w-4" />
                          )}
                          {claimDossier.isExpired
                            ? 'Claim Blocked (Warranty Expired)'
                            : 'Create Warranty Claim'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: REGISTERED WARRANTIES MASTER LEDGER */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="records" className="space-y-4 pt-2">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Registered Warranties Master Ledger
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Single source of truth for all products distributed and registered with active or historical warranty coverage.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:w-60">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search barcode, product, customer..."
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
                    <SelectItem value="EXPIRING_SOON">Expiring Soon</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {recordsLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading warranty records...</div>
              ) : records.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No warranty records matching criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Product Name & SKU</th>
                        <th className="py-3 px-3">Barcode / Serial</th>
                        <th className="py-3 px-3">Distributor Customer</th>
                        <th className="py-3 px-3">End-Customer Selling Date</th>
                        <th className="py-3 px-3">Warranty Expiry</th>
                        <th className="py-3 px-3 text-center">Remaining</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {records.map((r) => {
                        const remaining = calculateRemainingWarranty(r.warrantyExpiryDate);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{r.productName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{r.sku}</div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-mono font-semibold text-slate-800">{r.barcode || '—'}</div>
                              {r.serialNumber && (
                                <div className="text-[10px] text-slate-400 font-mono">SN: {r.serialNumber}</div>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-800">{r.customerName}</div>
                              <div className="text-[10px] text-slate-400">INV: {r.invoiceNumber}</div>
                            </td>

                            <td className="py-3 px-3 font-semibold text-emerald-700">
                              {r.dealerSoldDate ? formatDate(r.dealerSoldDate) : formatDate(r.warrantyStartDate)}
                            </td>

                            <td className="py-3 px-3 font-medium text-slate-800">
                              {formatDate(r.warrantyExpiryDate)}
                            </td>

                            <td className="py-3 px-3 text-center font-medium text-slate-700">
                              {remaining.displayText}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <WarrantyStatusBadge status={remaining.status} />
                            </td>

                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <Button
                                onClick={() => {
                                  if (r.barcode) {
                                    setClaimBarcode(r.barcode);
                                    handleLookupClaimBarcode(r.barcode);
                                    setActiveTab('claims');
                                  }
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-primary hover:text-primary-hover hover:bg-primary/10 gap-1 font-medium"
                              >
                                Claim
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: SALES REP FIELD FOLLOW-UP & TALLY (EMBEDDED) */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="followups" className="space-y-4 pt-2">
          <SalesRepWarrantyPage />
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: DISTRIBUTOR WARRANTY NOTES */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="notes" className="space-y-4 pt-2">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-primary" />
                  Distributor Warranty Notes & Registration Ledger
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify received counterfoils from dealer outlets. Sales Manager review is required before warranty claims are cleared.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search note #, distributor..."
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
              </div>
            </CardHeader>

            <CardContent>
              {notesLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading distributor warranty notes...</div>
              ) : notes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No distributor warranty notes on record.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Note Number</TableHead>
                      <TableHead>Distributor</TableHead>
                      <TableHead>Product / SKU</TableHead>
                      <TableHead>Received Date</TableHead>
                      <TableHead>Entered By</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell className="font-mono text-xs font-semibold text-slate-900">
                          {note.noteNumber}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-slate-900">{note.distributorName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-800 font-medium">{note.productName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{note.sku}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {formatDate(note.receivedDate)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {note.enteredByUserName}
                        </TableCell>
                        <TableCell className="text-center">
                          {note.status === 'VERIFIED' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              Verified
                            </Badge>
                          ) : note.status === 'PENDING_REVIEW' ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                              Pending Review
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReviewingNote(note)}
                            className="h-7 text-xs text-primary hover:text-primary-hover gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODALS */}
      {isNewClaimOpen && (
        <NewClaimModal
          open={isNewClaimOpen}
          onOpenChange={setIsNewClaimOpen}
          onSuccess={() => {
            loadClaims();
            loadRecords();
          }}
        />
      )}

      {resolvingClaim && (
        <ResolveClaimModal
          open={Boolean(resolvingClaim)}
          onOpenChange={(open) => !open && setResolvingClaim(null)}
          claim={resolvingClaim}
          onSuccess={() => {
            setResolvingClaim(null);
            loadClaims();
          }}
        />
      )}

      {activeFollowUp && (
        <RecordFollowUpModal
          open={Boolean(activeFollowUp)}
          onOpenChange={(open) => !open && setActiveFollowUp(null)}
          followUp={activeFollowUp}
          onSuccess={() => {
            setActiveFollowUp(null);
            loadFollowUps();
          }}
        />
      )}

      {isRecordNoteOpen && (
        <RecordWarrantyNoteModal
          open={isRecordNoteOpen}
          onOpenChange={setIsRecordNoteOpen}
          preselectedRecord={preselectedRecordForNote}
          onSuccess={() => {
            loadNotes();
            loadRecords();
          }}
        />
      )}

      {reviewingNote && (
        <ReviewWarrantyNoteModal
          open={Boolean(reviewingNote)}
          onOpenChange={(open) => !open && setReviewingNote(null)}
          note={reviewingNote}
          onSuccess={() => {
            setReviewingNote(null);
            loadNotes();
            loadRecords();
          }}
        />
      )}
    </div>
  );
}
