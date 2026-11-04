import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAreas } from '../../hooks/useAreas';
import { useUsers } from '../../hooks/useUsers';
import { customerService } from '../../services/CustomerService';
import { creditTermsConfigService } from '../../services/CreditTermsConfigService';
import { determineCustomerApprovalRoute, canApproveCustomerStage } from '../../rules/approvalRules';
import { Customer, CustomerType, CustomerLoyaltyLevel, CustomerApprovalStage } from '../../types/customer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PageHeader } from '../../components/common/PageHeader';
import { toast } from 'sonner';
import {
  UserPlus,
  Building2,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ArrowLeft,
  Users,
  Phone,
  Mail,
  FileText,
  Info,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  X,
  Lock,
  Search,
  SlidersHorizontal,
  Send,
  Building,
  Store,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCustomerCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CUST-${rand}`;
}

function isValidPhone(v: string): boolean {
  return /^[+\d\s\-()]{7,20}$/.test(v.trim());
}

const CREDIT_DAY_PRESETS = [14, 30, 45, 60];
const CREDIT_LIMIT_PRESETS = [250000, 500000, 1000000, 2000000];

const LOYALTY_LEVELS: { value: CustomerLoyaltyLevel; label: string }[] = [
  { value: 'NEW', label: 'New (Level 1)' },
  { value: 'PREMIUM', label: 'Premium (Level 2)' },
  { value: 'PLATINUM', label: 'Platinum (Level 3)' },
];

const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: 'DEALER', label: 'Authorized Dealer' },
  { value: 'SHOWROOM', label: 'Showroom Outlet' },
  { value: 'DIRECT', label: 'Direct Corporate Account' },
];

function getStageBadge(stage: CustomerApprovalStage) {
  switch (stage) {
    case 'PENDING_SALES_REVIEW':
      return {
        label: 'Sales Review Pending',
        classes: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dot: 'bg-amber-500',
      };
    case 'PENDING_MANAGER_APPROVAL':
      return {
        label: 'Manager Approval Pending',
        classes: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dot: 'bg-blue-500',
      };
    case 'PENDING_DIRECTOR_APPROVAL':
      return {
        label: 'Special Approval Required',
        classes: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dot: 'bg-rose-500',
      };
    case 'APPROVED':
      return {
        label: 'Active & Approved',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dot: 'bg-emerald-500',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        classes: 'bg-red-50 text-red-700 border-red-200/80',
        dot: 'bg-red-500',
      };
    default:
      return {
        label: stage,
        classes: 'bg-slate-50 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
      };
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CustomerOnboardingPage() {
  const { currentUser, role } = useAuth();
  const { areas } = useAreas();
  const { users } = useUsers();
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId?: string }>();

  const isAreaManager = role === 'AREA_MANAGER';
  const canDoStep2 = !isAreaManager; // SALES_MANAGER, MANAGER, DIRECTOR

  // ── Pending Queue State ──────────────────────────────────────────────────
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'normal' | 'special'>('normal');
  const [queueSearch, setQueueSearch] = useState('');

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const stages: CustomerApprovalStage[] = isAreaManager
        ? []
        : role === 'SALES_MANAGER'
        ? ['PENDING_SALES_REVIEW']
        : ['PENDING_SALES_REVIEW', 'PENDING_MANAGER_APPROVAL', 'PENDING_DIRECTOR_APPROVAL'];

      if (stages.length === 0) {
        setPendingCustomers([]);
        setPendingLoading(false);
        return;
      }

      const results = await Promise.all(
        stages.map((s) => customerService.listCustomers({ approvalStage: s, pageSize: 50 }))
      );
      const all = results.flatMap((r) => r.data);
      setPendingCustomers(all);
    } catch {
      setPendingCustomers([]);
    } finally {
      setPendingLoading(false);
    }
  }, [isAreaManager, role]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // Tab Filtering
  const normalPending = useMemo(() => {
    return pendingCustomers.filter(
      (c) =>
        c.approvalStage === 'PENDING_SALES_REVIEW' ||
        c.approvalStage === 'PENDING_MANAGER_APPROVAL'
    );
  }, [pendingCustomers]);

  const specialPending = useMemo(() => {
    return pendingCustomers.filter(
      (c) => c.approvalStage === 'PENDING_DIRECTOR_APPROVAL'
    );
  }, [pendingCustomers]);

  const displayedQueue = useMemo(() => {
    const list = activeTab === 'normal' ? normalPending : specialPending;
    if (!queueSearch.trim()) return list;
    const q = queueSearch.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.areaName.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q))
    );
  }, [activeTab, normalPending, specialPending, queueSearch]);

  // ── Form State ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerCode, setCustomerCode] = useState(generateCustomerCode);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Business Identity & Contact Details
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [areaId, setAreaId] = useState(() => (isAreaManager && currentUser.areaId ? currentUser.areaId : ''));

  // Step 2: Assignment & Commercial Setup
  const [areaManagerId, setAreaManagerId] = useState('');
  const [salesRepId, setSalesRepId] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('DEALER');
  const [loyaltyLevel, setLoyaltyLevel] = useState<CustomerLoyaltyLevel>('NEW');
  const [creditDays, setCreditDays] = useState(30);
  const [creditLimit, setCreditLimit] = useState(500000);
  const [defaultDiscount, setDefaultDiscount] = useState(5);
  const [maxDiscount, setMaxDiscount] = useState(10);
  const [paymentTermNotes, setPaymentTermNotes] = useState('');

  const defaultConfig = creditTermsConfigService.getCreditTermsConfig();
  const approvalRoute = determineCustomerApprovalRoute(creditDays, creditLimit);
  const isSpecialApproval = approvalRoute.isExceptional;

  // Initialize defaults
  useEffect(() => {
    setCreditDays(defaultConfig.defaultCreditDays);
    setCreditLimit(defaultConfig.defaultCreditLimit);
    setDefaultDiscount(defaultConfig.defaultDiscountPercentage);
    setMaxDiscount(defaultConfig.maxDiscountPercentage);
  }, []);

  // When area changes, auto-suggest the Area Manager
  useEffect(() => {
    if (areaId) {
      const areaObj = areas.find((a) => a.id === areaId);
      if (areaObj?.areaManagerName) {
        const mgr = users.find((u) => u.name === areaObj.areaManagerName);
        if (mgr && !areaManagerId) {
          setAreaManagerId(mgr.id);
        }
      }
    }
  }, [areaId, areas, users, areaManagerId]);

  // Load customer if URL contains customerId
  useEffect(() => {
    if (customerId) {
      customerService.getCustomer(customerId).then((c) => {
        if (c) {
          handleSelectCustomer(c);
        }
      });
    }
  }, [customerId]);

  function handleSelectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerCode(c.code);
    setDisplayName(c.name);
    setCompanyName(c.companyName || '');
    setPrimaryPhone(c.phone);
    setWhatsappNumber(c.whatsappNumber || '');
    setSecondaryPhone(c.secondaryPhone || '');
    setContactPerson(c.contactPerson || c.name);
    setEmail(c.email || '');
    setAddress(c.address || '');
    setTaxNumber(c.taxNumber || '');
    setVatNumber(c.vatNumber || '');
    setAreaId(c.areaId || '');
    setCustomerType(c.type || 'DEALER');
    setLoyaltyLevel(c.loyaltyLevel || 'NEW');

    if (c.commercialTerms) {
      setCreditDays(c.commercialTerms.creditDays);
      setCreditLimit(c.commercialTerms.creditLimit);
      setDefaultDiscount(c.commercialTerms.defaultDiscountPercentage);
      setMaxDiscount(c.commercialTerms.maxDiscountPercentage);
      setPaymentTermNotes(c.commercialTerms.paymentTermNotes || '');
    }

    if (c.assignedRepId) {
      const assigned = users.find((u) => u.id === c.assignedRepId);
      if (assigned?.role === 'SALES_REP') {
        setSalesRepId(assigned.id);
      } else if (assigned?.role === 'AREA_MANAGER') {
        setAreaManagerId(assigned.id);
      }
    }

    if (canDoStep2 && canApproveCustomerStage(role, c.approvalStage)) {
      setStep(2);
    } else {
      setStep(1);
    }
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleReset() {
    setSelectedCustomer(null);
    setCustomerCode(generateCustomerCode());
    setDisplayName('');
    setCompanyName('');
    setPrimaryPhone('');
    setWhatsappNumber('');
    setSecondaryPhone('');
    setContactPerson('');
    setEmail('');
    setAddress('');
    setTaxNumber('');
    setVatNumber('');
    setAreaId(isAreaManager && currentUser.areaId ? currentUser.areaId : '');
    setAreaManagerId('');
    setSalesRepId('');
    setCustomerType('DEALER');
    setLoyaltyLevel('NEW');
    setCreditDays(defaultConfig.defaultCreditDays);
    setCreditLimit(defaultConfig.defaultCreditLimit);
    setDefaultDiscount(defaultConfig.defaultDiscountPercentage);
    setMaxDiscount(defaultConfig.maxDiscountPercentage);
    setPaymentTermNotes('');
    setStep(1);
    setErrors({});
  }

  const areaManagers = users.filter((u) => u.role === 'AREA_MANAGER');
  const salesRepsInArea = users.filter(
    (u) => u.role === 'SALES_REP' && (!areaId || u.areaId === areaId)
  );

  // ── Validation ───────────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!displayName.trim() || displayName.trim().length < 3) {
      errs.displayName = 'Display name is required (minimum 3 characters).';
    }
    if (!primaryPhone.trim() || !isValidPhone(primaryPhone)) {
      errs.primaryPhone = 'Primary phone number is required and must be valid.';
    }
    if (whatsappNumber && !isValidPhone(whatsappNumber)) {
      errs.whatsappNumber = 'WhatsApp phone format is invalid.';
    }
    if (secondaryPhone && !isValidPhone(secondaryPhone)) {
      errs.secondaryPhone = 'Secondary phone format is invalid.';
    }
    if (!areaId) {
      errs.areaId = 'Please select an area.';
    }
    if (!address.trim()) {
      errs.address = 'Registered address is required for invoicing.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (creditDays < 1 || creditDays > 365) {
      errs.creditDays = 'Credit days must be between 1 and 365.';
    }
    if (creditLimit < 0) {
      errs.creditLimit = 'Credit limit must be a positive number.';
    }
    if (defaultDiscount < 0 || defaultDiscount > 100) {
      errs.defaultDiscount = 'Discount must be between 0 and 100%.';
    }
    if (maxDiscount < defaultDiscount) {
      errs.maxDiscount = 'Max discount must be ≥ default discount.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit Handlers ──────────────────────────────────────────────────────

  async function handleSubmitStep1() {
    if (!validateStep1()) return;

    if (isAreaManager) {
      setSubmitting(true);
      try {
        const selectedAreaObj = areas.find((a) => a.id === areaId);
        const payload: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'> = {
          code: customerCode,
          name: displayName.trim(),
          companyName: companyName.trim() || undefined,
          type: 'DEALER',
          areaId,
          areaName: selectedAreaObj?.name || '',
          assignedRepId: '',
          assignedRepName: '',
          contactPerson: contactPerson.trim() || displayName.trim(),
          phone: primaryPhone.trim(),
          whatsappNumber: whatsappNumber.trim() || undefined,
          secondaryPhone: secondaryPhone.trim() || undefined,
          email: email.trim(),
          address: address.trim(),
          taxNumber: taxNumber.trim() || undefined,
          vatNumber: vatNumber.trim() || undefined,
          commercialTerms: {
            creditLimit: defaultConfig.defaultCreditLimit,
            creditDays: defaultConfig.defaultCreditDays,
            defaultDiscountPercentage: defaultConfig.defaultDiscountPercentage,
            maxDiscountPercentage: defaultConfig.maxDiscountPercentage,
          },
          approvalStage: 'PENDING_SALES_REVIEW',
          status: 'ACTIVE',
          loyaltyLevel: 'NEW',
          warrantyNotesExpected: 0,
          warrantyNotesReceived: 0,
        };

        await customerService.createCustomer(payload);
        toast.success(`Dealer "${displayName}" submitted for Sales Manager approval!`);
        navigate('/customers');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to submit onboarding request.');
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSubmitStep2() {
    if (!validateStep2()) return;
    setSubmitting(true);
    try {
      const selectedAreaObj = areas.find((a) => a.id === areaId);
      const selectedAreaMgr = users.find((u) => u.id === areaManagerId);
      const selectedRep = users.find((u) => u.id === salesRepId);

      const commercialTerms = {
        creditLimit,
        creditDays,
        defaultDiscountPercentage: defaultDiscount,
        maxDiscountPercentage: maxDiscount,
        paymentTermNotes: paymentTermNotes.trim() || undefined,
      };

      if (selectedCustomer) {
        // Approving / updating existing pending customer
        const res = await customerService.setCommercialTerms(
          selectedCustomer.id,
          commercialTerms,
          currentUser
        );

        await customerService.updateCustomer(selectedCustomer.id, {
          name: displayName.trim(),
          companyName: companyName.trim() || undefined,
          contactPerson: contactPerson.trim() || displayName.trim(),
          type: customerType,
          areaId,
          areaName: selectedAreaObj?.name || selectedCustomer.areaName,
          assignedRepId: selectedRep?.id || selectedAreaMgr?.id || '',
          assignedRepName: selectedRep?.name || selectedAreaMgr?.name || '',
          loyaltyLevel,
        });

        if (res.isExceptional) {
          toast.success(
            `Commercial terms configured. Escalate to Director for Special Approval (${creditDays}d, LKR ${creditLimit.toLocaleString()}).`
          );
        } else {
          toast.success(`Customer "${displayName}" approved and activated successfully!`);
        }
      } else {
        // Higher roles onboarding new customer directly
        const payload: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'> = {
          code: customerCode,
          name: displayName.trim(),
          companyName: companyName.trim() || undefined,
          type: customerType,
          areaId,
          areaName: selectedAreaObj?.name || '',
          assignedRepId: selectedRep?.id || selectedAreaMgr?.id || '',
          assignedRepName: selectedRep?.name || selectedAreaMgr?.name || '',
          contactPerson: contactPerson.trim() || displayName.trim(),
          phone: primaryPhone.trim(),
          whatsappNumber: whatsappNumber.trim() || undefined,
          secondaryPhone: secondaryPhone.trim() || undefined,
          email: email.trim(),
          address: address.trim(),
          taxNumber: taxNumber.trim() || undefined,
          vatNumber: vatNumber.trim() || undefined,
          commercialTerms,
          approvalStage: isSpecialApproval ? 'PENDING_DIRECTOR_APPROVAL' : 'APPROVED',
          status: 'ACTIVE',
          loyaltyLevel,
          warrantyNotesExpected: 0,
          warrantyNotesReceived: 0,
        };

        await customerService.createCustomer(payload);
        if (isSpecialApproval) {
          toast.success(
            `Dealer registered. Routed for Director authorization due to exceptional credit terms.`
          );
        } else {
          toast.success(`Dealer "${displayName}" successfully onboarded & activated!`);
        }
      }

      await loadPending();
      handleReset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to finalize customer onboarding.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Standardized ERP Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Customers & Sales', href: '/customers' },
          { label: 'Customer Master', href: '/customers' },
          { label: 'Customer Onboarding' },
        ]}
        title="Customer Onboarding & Intake Studio"
        subtitle={
          isAreaManager
            ? 'Area Manager Field Intake: Enter store identity and contact details to submit for Sales Review.'
            : 'Review incoming dealer applications, assign field representatives, and configure credit policy terms.'
        }
        badge={
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboarding Desk</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {selectedCustomer && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                Clear Selection
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              New Intake
            </Button>

            <Link to="/customers">
              <Button size="sm" className="text-xs gap-1.5 bg-primary text-white hover:bg-primary-hover shadow-xs">
                <Eye className="w-3.5 h-3.5" />
                Customer Master
              </Button>
            </Link>
          </div>
        }
      />

      {/* Overview Stat Strip for Management Awareness */}
      {!isAreaManager && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Normal Review Queue</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{normalPending.length}</span>
              <span className="text-[11px] text-amber-600 font-medium">Standard policy</span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Special Authorization</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-600">{specialPending.length}</span>
              <span className="text-[11px] text-rose-600 font-medium">&gt; 30d or &gt; 1M LKR</span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Default Credit Period</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{defaultConfig.defaultCreditDays}d</span>
              <span className="text-[11px] text-slate-400">System default</span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Default Credit Limit</span>
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                {formatCurrency(defaultConfig.defaultCreditLimit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Dual-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT COLUMN: Approval Queue Desk (Hidden for Area Managers) ── */}
        {!isAreaManager && (
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden sticky top-4">
              
              {/* Queue Header & Filter Tabs */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Pending Approvals
                      </h2>
                      <p className="text-[11px] text-slate-500">Awaiting commercial review</p>
                    </div>
                  </div>
                  <button
                    onClick={loadPending}
                    className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 transition-colors"
                    title="Refresh Queue"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${pendingLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search queue by dealer or area..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="pl-8 text-xs h-8 bg-white border-slate-200 rounded-xl"
                  />
                  {queueSearch && (
                    <button
                      onClick={() => setQueueSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Category Switcher Tabs */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('normal')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'normal'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Normal</span>
                    {normalPending.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        {normalPending.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('special')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'special'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Special</span>
                    {specialPending.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {specialPending.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Queue List Content */}
              <div className="p-3 space-y-2.5 max-h-[calc(100vh-340px)] overflow-y-auto">
                {pendingLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-xs text-slate-400 gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading pending intake queue...</span>
                  </div>
                ) : displayedQueue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="text-xs font-semibold text-slate-700">No requests in this queue</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {activeTab === 'normal'
                        ? 'All standard onboarding requests have been reviewed.'
                        : 'No exceptional commercial limit requests pending Director authorization.'}
                    </p>
                  </div>
                ) : (
                  displayedQueue.map((c) => {
                    const isSelected = selectedCustomer?.id === c.id;
                    const stageBadge = getStageBadge(c.approvalStage);
                    const isHighTerms =
                      (c.commercialTerms?.creditDays || 0) > defaultConfig.requireDirectorApprovalAboveDays ||
                      (c.commercialTerms?.creditLimit || 0) > defaultConfig.requireDirectorApprovalAboveLimit;

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20'
                            : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-primary transition-colors">
                                {c.name}
                              </span>
                              {isHighTerms && (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                                  Policy Exceeded
                                </span>
                              )}
                            </div>
                            {c.companyName && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">{c.companyName}</div>
                            )}
                            <div className="font-mono text-[10.5px] text-slate-400 mt-1 flex items-center gap-2">
                              <span>{c.code}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3 h-3 text-slate-400" /> {c.areaName}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stageBadge.classes}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${stageBadge.dot}`} />
                              {stageBadge.label}
                            </span>
                          </div>
                        </div>

                        {/* Credit Terms Highlight Strip */}
                        {c.commercialTerms && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                            <span>
                              Terms: <strong className="font-mono">{c.commercialTerms.creditDays}d</strong>
                            </span>
                            <span>
                              Limit: <strong className="font-mono">{formatCurrency(c.commercialTerms.creditLimit)}</strong>
                            </span>
                            <span className="text-primary font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10px]">
                              Review <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── RIGHT COLUMN: Interactive Onboarding & Approval Studio ── */}
        <div className={isAreaManager ? 'lg:col-span-12' : 'lg:col-span-8'}>
          <div className="space-y-6">

            {/* Currently Reviewing Banner (If Selected) */}
            {selectedCustomer && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                        Reviewing Pending Intake
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 bg-blue-100/80 text-blue-800 rounded-md font-bold">
                        {selectedCustomer.code}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm truncate mt-0.5">
                      {selectedCustomer.name}
                      {selectedCustomer.companyName && (
                        <span className="text-slate-500 font-normal ml-2">({selectedCustomer.companyName})</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs text-blue-700 hover:bg-blue-100/60 h-8"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Exit Review
                  </Button>
                </div>
              </div>
            )}

            {/* Modern Stepper Indicator */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                
                {/* Step 1 Pill */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    step === 1
                      ? 'bg-primary/5 border-primary ring-1 ring-primary/20 shadow-2xs'
                      : 'border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      step === 1
                        ? 'bg-primary text-white shadow-xs'
                        : step > 1
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Step 1: Business Identity</span>
                      {step === 1 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Store identity, contact, area &amp; tax numbers
                    </p>
                  </div>
                </button>

                {/* Step 2 Pill */}
                <button
                  type="button"
                  onClick={() => canDoStep2 && setStep(2)}
                  disabled={!canDoStep2}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    step === 2
                      ? 'bg-primary/5 border-primary ring-1 ring-primary/20 shadow-2xs'
                      : canDoStep2
                      ? 'border-slate-200/80 hover:bg-slate-50'
                      : 'border-slate-100 bg-slate-50/60 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      step === 2
                        ? 'bg-primary text-white shadow-xs'
                        : canDoStep2
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-slate-200/80 text-slate-400'
                    }`}
                  >
                    {isAreaManager ? <Lock className="w-3.5 h-3.5" /> : '2'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Step 2: Commercial &amp; Routing</span>
                      {isAreaManager && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          Sales Mgr Desk
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isAreaManager
                        ? 'Configured automatically by Sales Manager'
                        : 'Credit limits, days, discounts & sales rep assignment'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* STEP 1: BUSINESS IDENTITY & TERRITORY DETAILS                   */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                
                {/* 1. Business Identity Card */}
                <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">1. Business Identity</CardTitle>
                        <p className="text-[11px] text-slate-500">Official business registration details</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">Required Step</span>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Customer Code */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Customer Code</span>
                          <span className="text-[10.5px] font-mono text-slate-400">Auto-Generated</span>
                        </label>
                        <div className="relative">
                          <Input
                            value={customerCode}
                            disabled
                            className="bg-slate-50 font-mono text-xs font-bold text-slate-600 pl-8 cursor-not-allowed border-slate-200"
                          />
                          <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>
                      </div>

                      {/* Area Selection */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          <span>Operating Area</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Select
                            value={areaId}
                            onChange={(e) => {
                              setAreaId(e.target.value);
                              setErrors((p) => ({ ...p, areaId: '' }));
                            }}
                            className={`text-xs pl-8 ${errors.areaId ? 'border-rose-400 ring-rose-200' : ''}`}
                          >
                            <option value="">Select Operational Area</option>
                            {areas.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.areaManagerName ? `Mgr: ${a.areaManagerName}` : 'Unassigned'})
                              </option>
                            ))}
                          </Select>
                          <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                        </div>
                        {errors.areaId && <p className="text-[11px] text-rose-500 mt-1">{errors.areaId}</p>}
                      </div>

                      {/* Display Name */}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          <span>Display Name (Store / Shop Name)</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          placeholder="e.g. Lanka Electrical & Hardware Superstore"
                          value={displayName}
                          onChange={(e) => {
                            setDisplayName(e.target.value);
                            setErrors((p) => ({ ...p, displayName: '' }));
                          }}
                          className={`text-xs ${errors.displayName ? 'border-rose-400' : ''}`}
                        />
                        {errors.displayName && <p className="text-[11px] text-rose-500 mt-1">{errors.displayName}</p>}
                      </div>

                      {/* Company Name (Optional) */}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Company Full Legal Name</span>
                          <span className="text-[10.5px] text-slate-400 font-normal">Optional</span>
                        </label>
                        <Input
                          placeholder="e.g. Lanka Electrical Holdings (Pvt) Ltd"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    {/* Tax & Statutory Credentials Box */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tax &amp; Statutory Compliance</span>
                        <span className="text-[10.5px] font-normal text-slate-400">(Optional for cash dealers)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-600 mb-1 block">TIN Number</label>
                          <Input
                            placeholder="e.g. 109847291"
                            value={taxNumber}
                            onChange={(e) => setTaxNumber(e.target.value)}
                            className="text-xs bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-600 mb-1 block">VAT Registration Number</label>
                          <Input
                            placeholder="e.g. VAT-109847291-7000"
                            value={vatNumber}
                            onChange={(e) => setVatNumber(e.target.value)}
                            className="text-xs bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Contact & Territory Details Card */}
                <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          2. Contact &amp; Physical Territory
                        </CardTitle>
                        <p className="text-[11px] text-slate-500">Field visit, invoicing &amp; dispatch routing</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Primary Phone */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          <span>Primary Phone Number</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            placeholder="e.g. +94 77 123 4567 or 0771234567"
                            value={primaryPhone}
                            onChange={(e) => {
                              setPrimaryPhone(e.target.value);
                              setErrors((p) => ({ ...p, primaryPhone: '' }));
                            }}
                            className={`text-xs pl-8 font-mono ${errors.primaryPhone ? 'border-rose-400' : ''}`}
                          />
                          <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>
                        {errors.primaryPhone && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.primaryPhone}</p>
                        )}
                      </div>

                      {/* WhatsApp Phone */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>WhatsApp Number</span>
                          <span className="text-[10.5px] text-emerald-600 font-medium">Receipts &amp; Invoices</span>
                        </label>
                        <Input
                          placeholder="e.g. +94 77 123 4567"
                          value={whatsappNumber}
                          onChange={(e) => {
                            setWhatsappNumber(e.target.value);
                            setErrors((p) => ({ ...p, whatsappNumber: '' }));
                          }}
                          className={`text-xs font-mono ${errors.whatsappNumber ? 'border-rose-400' : ''}`}
                        />
                        {errors.whatsappNumber && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.whatsappNumber}</p>
                        )}
                      </div>

                      {/* Secondary Phone / Landline */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Secondary Phone / Landline</span>
                          <span className="text-[10.5px] text-slate-400 font-normal">Optional</span>
                        </label>
                        <Input
                          placeholder="e.g. +94 11 278 1122"
                          value={secondaryPhone}
                          onChange={(e) => {
                            setSecondaryPhone(e.target.value);
                            setErrors((p) => ({ ...p, secondaryPhone: '' }));
                          }}
                          className={`text-xs font-mono ${errors.secondaryPhone ? 'border-rose-400' : ''}`}
                        />
                        {errors.secondaryPhone && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.secondaryPhone}</p>
                        )}
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Email Address</span>
                          <span className="text-[10.5px] text-slate-400 font-normal">Optional</span>
                        </label>
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="dealer@company.lk"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="text-xs pl-8"
                          />
                          <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>
                      </div>

                      {/* Contact Person Name */}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Primary Contact Person / Proprietor</span>
                          <span className="text-[10.5px] text-slate-400 font-normal">Optional</span>
                        </label>
                        <Input
                          placeholder="e.g. Mr. Sunil Weerasinghe"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          className="text-xs"
                        />
                      </div>

                      {/* Registered Physical Address */}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                          <span>Registered Physical &amp; Delivery Address</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          placeholder="e.g. 120 High Level Road, Kottawa"
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value);
                            setErrors((p) => ({ ...p, address: '' }));
                          }}
                          className={`text-xs ${errors.address ? 'border-rose-400' : ''}`}
                        />
                        {errors.address && (
                          <p className="text-[11px] text-rose-500 mt-1">{errors.address}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 1 Actions Footer */}
                <div className="flex items-center justify-between pt-2">
                  <Link to="/customers">
                    <Button variant="ghost" size="sm" className="text-xs text-slate-500">
                      Cancel &amp; Return
                    </Button>
                  </Link>

                  <Button
                    onClick={handleSubmitStep1}
                    disabled={submitting}
                    size="sm"
                    className="gap-2 text-xs font-bold px-6 bg-primary text-white hover:bg-primary-hover shadow-xs h-9"
                  >
                    {isAreaManager ? (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        {submitting ? 'Submitting...' : 'Submit for Sales Review'}
                      </>
                    ) : (
                      <>
                        <span>Continue to Assignment &amp; Commercial Setup</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* STEP 2: ASSIGNMENT & COMMERCIAL SETUP                           */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {step === 2 && canDoStep2 && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                
                {/* Real-time Policy Evaluation Card */}
                {isSpecialApproval ? (
                  <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-2xs">
                    <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase tracking-wide text-rose-900">
                          Special Director Approval Required
                        </span>
                        <Badge className="bg-rose-100 text-rose-800 text-[10px] font-bold border-rose-200">
                          Exceeds Defaults
                        </Badge>
                      </div>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        {approvalRoute.reason} Upon submission, this customer setup will be routed to the Director's
                        approval engine before commercial activation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-2xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase tracking-wide text-emerald-900">
                          Standard Policy Terms Applied
                        </span>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-emerald-200">
                          Normal Approval
                        </Badge>
                      </div>
                      <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                        Terms are within standard operational limits (≤ {defaultConfig.defaultCreditDays} days, ≤ LKR {defaultConfig.defaultCreditLimit.toLocaleString()}).
                        Manager review &amp; sign-off sufficient for immediate activation.
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Territory & Field Staff Assignment */}
                <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          1. Classification &amp; Territory Assignment
                        </CardTitle>
                        <p className="text-[11px] text-slate-500">
                          Area Manager and Sales Rep assignments are optional and can be updated anytime
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Customer Classification */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          Customer Classification
                        </label>
                        <Select
                          value={customerType}
                          onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                          className="text-xs"
                        >
                          {CUSTOMER_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Loyalty Tier */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Loyalty Tier</label>
                        <Select
                          value={loyaltyLevel}
                          onChange={(e) => setLoyaltyLevel(e.target.value as CustomerLoyaltyLevel)}
                          className="text-xs"
                        >
                          {LOYALTY_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Area Manager Assignment */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Area Manager</span>
                          <span className="text-[10.5px] text-slate-400 font-normal">Optional</span>
                        </label>
                        <Select
                          value={areaManagerId}
                          onChange={(e) => setAreaManagerId(e.target.value)}
                          className="text-xs"
                        >
                          <option value="">Auto-detected / Not Assigned</option>
                          {areaManagers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Sales Representative Assignment */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                          <span>Assigned Sales Representative</span>
                          <span className="text-[10.5px] text-slate-400 font-normal">Optional</span>
                        </label>
                        <Select
                          value={salesRepId}
                          onChange={(e) => setSalesRepId(e.target.value)}
                          className="text-xs"
                        >
                          <option value="">Select Sales Rep (or assign later)</option>
                          {salesRepsInArea.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Commercial Terms & Credit Limits */}
                <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                          2. Commercial Terms &amp; Credit Policy
                        </CardTitle>
                        <p className="text-[11px] text-slate-500">
                          Credit period, exposure limits and invoice settlement rules
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCreditDays(defaultConfig.defaultCreditDays);
                        setCreditLimit(defaultConfig.defaultCreditLimit);
                        setDefaultDiscount(defaultConfig.defaultDiscountPercentage);
                        setMaxDiscount(defaultConfig.maxDiscountPercentage);
                      }}
                      className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Reset to Policy Defaults</span>
                    </button>
                  </CardHeader>

                  <CardContent className="p-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      
                      {/* Allowed Credit Days */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>Allowed Credit Days</span>
                          <span className="text-[10.5px] text-slate-400 font-mono">
                            Policy Default: {defaultConfig.defaultCreditDays}d
                          </span>
                        </label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={creditDays}
                          onChange={(e) => {
                            setCreditDays(Number(e.target.value));
                            setErrors((p) => ({ ...p, creditDays: '' }));
                          }}
                          className={`font-mono text-xs font-bold ${
                            creditDays > defaultConfig.requireDirectorApprovalAboveDays
                              ? 'border-rose-400 text-rose-700 bg-rose-50/30'
                              : ''
                          }`}
                        />
                        {errors.creditDays && <p className="text-[11px] text-rose-500">{errors.creditDays}</p>}

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Presets:</span>
                          {CREDIT_DAY_PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCreditDays(p)}
                              className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-semibold transition-all ${
                                creditDays === p
                                  ? 'bg-primary text-white border-primary shadow-2xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {p}d
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Credit Limit (LKR) */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                          <span>Credit Exposure Limit (LKR)</span>
                          <span className="text-[10.5px] text-slate-400 font-mono">
                            Max Std: {formatCurrency(defaultConfig.defaultCreditLimit)}
                          </span>
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step={50000}
                          value={creditLimit}
                          onChange={(e) => {
                            setCreditLimit(Number(e.target.value));
                            setErrors((p) => ({ ...p, creditLimit: '' }));
                          }}
                          className={`font-mono text-xs font-bold ${
                            creditLimit > defaultConfig.requireDirectorApprovalAboveLimit
                              ? 'border-rose-400 text-rose-700 bg-rose-50/30'
                              : ''
                          }`}
                        />
                        {errors.creditLimit && <p className="text-[11px] text-rose-500">{errors.creditLimit}</p>}

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Presets:</span>
                          {CREDIT_LIMIT_PRESETS.map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCreditLimit(p)}
                              className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-semibold transition-all ${
                                creditLimit === p
                                  ? 'bg-primary text-white border-primary shadow-2xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {p >= 1000000 ? `${p / 1000000}M` : `${p / 1000}k`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Default Discount */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          Default Standard Discount (%)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={defaultDiscount}
                          onChange={(e) => {
                            setDefaultDiscount(Number(e.target.value));
                            setErrors((p) => ({ ...p, defaultDiscount: '' }));
                          }}
                          className="font-mono text-xs"
                        />
                      </div>

                      {/* Max Allowed Discount */}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          Maximum Allowed Discount (%)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={maxDiscount}
                          onChange={(e) => {
                            setMaxDiscount(Number(e.target.value));
                            setErrors((p) => ({ ...p, maxDiscount: '' }));
                          }}
                          className="font-mono text-xs"
                        />
                      </div>

                      {/* Payment Terms Notes */}
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          Payment Notes / Agreed Commercial Terms
                        </label>
                        <Input
                          placeholder="e.g. Net 30 days. Cheque realization within 7 days. Monthly statement dispatch."
                          value={paymentTermNotes}
                          onChange={(e) => setPaymentTermNotes(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2 Actions Footer */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStep(1);
                      setErrors({});
                    }}
                    className="text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 h-9"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Step 1</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    {selectedCustomer && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-xs text-slate-500 h-9"
                      >
                        Discard
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={handleSubmitStep2}
                      disabled={submitting}
                      size="sm"
                      className={`gap-2 text-xs font-bold px-6 h-9 shadow-xs text-white ${
                        isSpecialApproval
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {submitting ? (
                        'Processing...'
                      ) : selectedCustomer ? (
                        isSpecialApproval ? (
                          <>
                            <ShieldAlert className="w-4 h-4" />
                            Submit for Special Approval
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Approve &amp; Activate Customer
                          </>
                        )
                      ) : isSpecialApproval ? (
                        <>
                          <ShieldAlert className="w-4 h-4" />
                          Submit for Director Authorization
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Complete Onboarding &amp; Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
