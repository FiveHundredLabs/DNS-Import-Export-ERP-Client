import { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
  DrawerFooter,
} from '../../components/ui/drawer';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Customer, CustomerType, CustomerLoyaltyLevel } from '../../types/customer';
import { useAreas } from '../../hooks/useAreas';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { creditTermsConfigService } from '../../services/CreditTermsConfigService';
import { formatCurrency } from '../../utils/formatters';
import {
  AlertCircle,
  CreditCard,
  Building2,
  MapPin,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';
import { ConfirmButton } from '../../components/ui/confirm-button';

interface CustomerCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>) => Promise<void>;
  onUpdate?: (id: string, customer: Partial<Customer>) => Promise<void>;
  onApprove?: (id: string, updates: Partial<Customer>) => Promise<void>;
  onReject?: (id: string, reason?: string) => Promise<void>;
  editingCustomer?: Customer | null;
  mode?: 'create' | 'edit' | 'approve';
}

function generateCustomerCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CUST-${rand}`;
}

export function CustomerCreateModal({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  onApprove,
  onReject,
  editingCustomer,
  mode = 'create',
}: CustomerCreateModalProps) {
  const { areas } = useAreas();
  const { users } = useUsers();
  const { role, currentUser } = useAuth();
  const isAreaManager = role === 'AREA_MANAGER';
  const isSalesRep = role === 'SALES_REP';

  const defaultTerms = useMemo(() => creditTermsConfigService.getCreditTermsConfig(), []);

  // Form State
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loyaltyLevel, setLoyaltyLevel] = useState<CustomerLoyaltyLevel>('NEW');

  // Contact Details
  const [contactPerson, setContactPerson] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Tax Details
  const [tinNumber, setTinNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  // Territory
  const [areaId, setAreaId] = useState('');
  const [assignedRepId, setAssignedRepId] = useState('');

  // Commercial Terms State (Allowed Credit Days & Credit Balance/Limit)
  const [creditDays, setCreditDays] = useState<number>(defaultTerms.defaultCreditDays);
  const [creditLimit, setCreditLimit] = useState<number>(defaultTerms.defaultCreditLimit);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    code?: string;
    displayName?: string;
    contactPerson?: string;
    primaryPhone?: string;
    whatsappNumber?: string;
    secondaryPhone?: string;
    email?: string;
    address?: string;
    areaId?: string;
    assignedRepId?: string;
    creditDays?: string;
    creditLimit?: string;
  }>({});

  useEffect(() => {
    if (open) {
      if (editingCustomer) {
        setCode(editingCustomer.code);
        setDisplayName(editingCustomer.name);
        setCompanyName(editingCustomer.companyName || '');
        setLoyaltyLevel(
          editingCustomer.loyaltyLevel ||
            (editingCustomer.loyaltyTier === 'PLATINUM'
              ? 'PLATINUM'
              : editingCustomer.loyaltyTier === 'GOLD' || editingCustomer.loyaltyTier === 'SILVER'
              ? 'PREMIUM'
              : 'NEW')
        );
        setContactPerson(editingCustomer.contactPerson);
        setPrimaryPhone(editingCustomer.phone);
        setWhatsappNumber(editingCustomer.whatsappNumber || '');
        setSecondaryPhone(editingCustomer.secondaryPhone || '');
        setEmail(editingCustomer.email || '');
        setAddress(editingCustomer.address || '');
        setTinNumber(editingCustomer.taxNumber || '');
        setVatNumber(editingCustomer.vatNumber || '');
        setAreaId(editingCustomer.areaId || '');
        setAssignedRepId(editingCustomer.assignedRepId || '');

        setCreditDays(editingCustomer.commercialTerms?.creditDays ?? defaultTerms.defaultCreditDays);
        setCreditLimit(editingCustomer.commercialTerms?.creditLimit ?? defaultTerms.defaultCreditLimit);
      } else {
        setCode(generateCustomerCode());
        setDisplayName('');
        setCompanyName('');
        setLoyaltyLevel('NEW');
        setContactPerson('');
        setPrimaryPhone('');
        setWhatsappNumber('');
        setSecondaryPhone('');
        setEmail('');
        setAddress('');
        setTinNumber('');
        setVatNumber('');

        // If Area Manager, default to their area; if Sales Rep, default to their area and assign themselves
        if (isAreaManager && currentUser.areaId) {
          setAreaId(currentUser.areaId);
          setAssignedRepId('');
        } else if (isSalesRep) {
          setAreaId(currentUser.areaId || '');
          setAssignedRepId(currentUser.id);
        } else {
          setAreaId('');
          setAssignedRepId('');
        }

        const currentDefaults = creditTermsConfigService.getCreditTermsConfig();
        setCreditDays(currentDefaults.defaultCreditDays);
        setCreditLimit(currentDefaults.defaultCreditLimit);
      }
      setError(null);
      setFieldErrors({});
    }
  }, [open, editingCustomer, isAreaManager, isSalesRep, currentUser, defaultTerms]);

  const selectedArea = areas.find((a) => a.id === areaId);
  const areaManagerName = selectedArea ? selectedArea.areaManagerName : '';
  const salesRepsInArea = users.filter((u) => u.role === 'SALES_REP' && (!areaId || u.areaId === areaId));

  // Determine Special Attention variance against defaults
  const isSpecialAttention = useMemo(() => {
    return (
      Number(creditLimit) > defaultTerms.defaultCreditLimit ||
      Number(creditDays) > defaultTerms.defaultCreditDays ||
      Number(creditDays) > defaultTerms.requireDirectorApprovalAboveDays ||
      Number(creditLimit) > defaultTerms.requireDirectorApprovalAboveLimit
    );
  }, [creditLimit, creditDays, defaultTerms]);

  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};

    if (!displayName.trim()) {
      errs.displayName = 'Display name is required.';
    } else if (displayName.trim().length < 3) {
      errs.displayName = 'Display name must be at least 3 characters.';
    }

    if (!contactPerson.trim()) {
      errs.contactPerson = 'Contact person name is required.';
    } else if (contactPerson.trim().length < 2) {
      errs.contactPerson = 'Contact person must be at least 2 characters.';
    }

    const checkPhone = (ph: string) => {
      const cleanDigits = ph.replace(/[^0-9+]/g, '');
      return (
        /^(?:\+94|0)?7[0-9]{8}$|^(?:\+94|0)?[1-9][0-9]{8}$/.test(cleanDigits) ||
        cleanDigits.replace(/\D/g, '').length >= 9
      );
    };

    if (!primaryPhone.trim()) {
      errs.primaryPhone = 'Primary phone number is required.';
    } else if (!checkPhone(primaryPhone)) {
      errs.primaryPhone = 'Please enter a valid phone number (e.g. +94 77 123 4567 or 0771234567).';
    }

    if (whatsappNumber.trim() && !checkPhone(whatsappNumber)) {
      errs.whatsappNumber = 'Please enter a valid WhatsApp phone number.';
    }

    if (secondaryPhone.trim() && !checkPhone(secondaryPhone)) {
      errs.secondaryPhone = 'Please enter a valid secondary/landline phone number.';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = 'Please enter a valid email address (e.g. dealer@company.lk).';
      }
    }

    if (!address.trim()) {
      errs.address = 'Registered business address is required.';
    } else if (address.trim().length < 5) {
      errs.address = 'Please provide a complete registered address (min 5 characters).';
    }

    if (!areaId) {
      errs.areaId = 'Please select an assigned operational Area.';
    }

    // Sales Rep is required unless Area Manager is registering customer for manager assignment
    if (!assignedRepId && !isAreaManager) {
      errs.assignedRepId = 'Please select an assigned Sales Representative.';
    }

    if (creditDays <= 0) {
      errs.creditDays = 'Allowed Credit Days must be greater than 0.';
    }
    if (creditLimit < 0) {
      errs.creditLimit = 'Credit Limit cannot be negative.';
    }

    setFieldErrors(errs);

    if (!displayName.trim() || !primaryPhone.trim() || !contactPerson.trim()) {
      setError('Name, Contact Person, and Phone are required.');
      return false;
    }

    if (Object.keys(errs).length > 0) {
      setError('Please review and correct the highlighted fields below.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const rep = users.find((r) => r.id === assignedRepId) || salesRepsInArea.find((r) => r.id === assignedRepId);

    try {
      setSubmitting(true);
      setError(null);

      const parsedCreditDays = Number(creditDays) || defaultTerms.defaultCreditDays;
      const parsedCreditLimit = Number(creditLimit) || defaultTerms.defaultCreditLimit;
      const defaultDiscount = defaultTerms.defaultDiscountPercentage;
      const maxDiscount = defaultTerms.maxDiscountPercentage;

      if (editingCustomer && onUpdate) {
        await onUpdate(editingCustomer.id, {
          code: code || editingCustomer.code,
          name: displayName.trim(),
          companyName: companyName.trim() || undefined,
          loyaltyLevel,
          loyaltyTier:
            loyaltyLevel === 'PLATINUM'
              ? 'PLATINUM'
              : loyaltyLevel === 'PREMIUM'
              ? 'GOLD'
              : 'BRONZE',
          areaId: selectedArea?.id || editingCustomer.areaId,
          areaName: selectedArea?.name || editingCustomer.areaName,
          assignedRepId: rep?.id || assignedRepId || editingCustomer.assignedRepId,
          assignedRepName: rep?.name || editingCustomer.assignedRepName,
          contactPerson: contactPerson.trim(),
          phone: primaryPhone.trim(),
          whatsappNumber: whatsappNumber.trim() || undefined,
          secondaryPhone: secondaryPhone.trim() || undefined,
          email: email.trim(),
          address: address.trim(),
          taxNumber: tinNumber.trim() || undefined,
          vatNumber: vatNumber.trim() || undefined,
          commercialTerms: {
            creditLimit: parsedCreditLimit,
            creditDays: parsedCreditDays,
            defaultDiscountPercentage: defaultDiscount,
            maxDiscountPercentage: maxDiscount,
          },
        });
      } else {
        await onCreate({
          code: code.trim() || generateCustomerCode(),
          name: displayName.trim(),
          companyName: companyName.trim() || undefined,
          type: 'DEALER',
          loyaltyLevel,
          loyaltyTier:
            loyaltyLevel === 'PLATINUM'
              ? 'PLATINUM'
              : loyaltyLevel === 'PREMIUM'
              ? 'GOLD'
              : 'BRONZE',
          areaId: selectedArea?.id || 'area-01',
          areaName: selectedArea?.name || 'Kelaniya',
          assignedRepId: rep?.id || assignedRepId || 'usr-106',
          assignedRepName: rep?.name || 'Kasun Wickramasinghe',
          contactPerson: contactPerson.trim(),
          phone: primaryPhone.trim(),
          whatsappNumber: whatsappNumber.trim() || undefined,
          secondaryPhone: secondaryPhone.trim() || undefined,
          email: email.trim(),
          address: address.trim(),
          taxNumber: tinNumber.trim() || undefined,
          vatNumber: vatNumber.trim() || undefined,
          commercialTerms: {
            creditLimit: parsedCreditLimit,
            creditDays: parsedCreditDays,
            defaultDiscountPercentage: defaultDiscount,
            maxDiscountPercentage: maxDiscount,
          },
          approvalStage: 'PENDING_SALES_REVIEW',
          status: 'INACTIVE',
          warrantyNotesExpected: 0,
          warrantyNotesReceived: 0,
        });
      }

      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} width="xl">
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <DrawerTitle>
              {mode === 'approve'
                ? `Review & Approve: ${editingCustomer?.name || 'Customer'}`
                : editingCustomer
                ? 'Edit Customer'
                : 'Register New Dealer / Customer'}
            </DrawerTitle>
            <DrawerDescription>
              {mode === 'approve'
                ? 'Audit credentials, adjust allowed credit days, limit, or re-assign sales representative before activating account.'
                : editingCustomer
                ? 'Update customer profile, change assigned sales representative, or adjust commercial credit lines.'
                : 'Submits basic business details and commercial credit setup into the Customer Master directory.'}
            </DrawerDescription>
          </div>
        </div>
      </DrawerHeader>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden" noValidate>
        <DrawerContent className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 shadow-2xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Mode: Review & Approve Banner */}
          {mode === 'approve' && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Approval &amp; Commercial Terms Review Mode</span>
                <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                  You can freely modify any information below — including Allowed Credit Days, Credit Limit, and Assigned Sales Representative — before confirming approval. All changes will be saved and the account activated immediately.
                </span>
              </div>
            </div>
          )}

          {/* Area Manager Quick Notice */}
          {isAreaManager && !editingCustomer && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Area Manager Quick Registration</span>
                <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                  Enter basic dealer details and location. Default commercial credit limits apply automatically. Final commercial approval and Sales Rep assignment will be finalized by the Sales Manager.
                </span>
              </div>
            </div>
          )}

          {/* Sales Rep Mode Notice */}
          {isSalesRep && !editingCustomer && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-xs text-emerald-950 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Sales Representative Account Setup</span>
                <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                  Registering a customer into your assigned territory. Standard commercial credit terms will be submitted for manager approval.
                </span>
              </div>
            </div>
          )}

          {/* SECTION 1: BUSINESS IDENTITY */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                1. Business Identity
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Basic Registration Data</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (fieldErrors.displayName) setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
                }}
                error={fieldErrors.displayName}
                placeholder="e.g. Apex Power Engineering (Pvt) Ltd"
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name <span className="text-[11px] font-normal text-slate-400">(optional)</span>
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Holdings Ltd"
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Code <span className="text-[11px] font-normal text-slate-400">(read-only)</span>
                </label>
                <Input
                  value={code}
                  readOnly
                  disabled
                  placeholder="Auto-generated"
                  className="bg-slate-100 font-mono text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loyalty Level</label>
                <Select
                  value={loyaltyLevel}
                  onChange={(e) => setLoyaltyLevel(e.target.value as CustomerLoyaltyLevel)}
                  className="bg-white"
                >
                  <option value="NEW">New (Level 1 Discount)</option>
                  <option value="PREMIUM">Premium (Levels 1 &amp; 2)</option>
                  <option value="PLATINUM">Platinum (All Levels)</option>
                </Select>
              </div>
            </div>
          </div>

          {/* SECTION 2: CONTACT & TERRITORY DETAILS */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                2. Contact &amp; Territory Details
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Physical Delivery &amp; Invoicing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={contactPerson}
                  onChange={(e) => {
                    setContactPerson(e.target.value);
                    if (fieldErrors.contactPerson)
                      setFieldErrors((prev) => ({ ...prev, contactPerson: undefined }));
                  }}
                  error={fieldErrors.contactPerson}
                  placeholder="Mr. Janaka Silva"
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Phone Number <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={primaryPhone}
                  onChange={(e) => {
                    setPrimaryPhone(e.target.value);
                    if (fieldErrors.primaryPhone)
                      setFieldErrors((prev) => ({ ...prev, primaryPhone: undefined }));
                  }}
                  error={fieldErrors.primaryPhone}
                  placeholder="+94 77 123 4567 or 0771234567"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Number <span className="text-[11px] font-normal text-slate-400">(optional)</span>
                </label>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => {
                    setWhatsappNumber(e.target.value);
                    if (fieldErrors.whatsappNumber)
                      setFieldErrors((prev) => ({ ...prev, whatsappNumber: undefined }));
                  }}
                  error={fieldErrors.whatsappNumber}
                  placeholder="+94 77 123 4567"
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Secondary Phone Number (Landline – optional)
                </label>
                <Input
                  value={secondaryPhone}
                  onChange={(e) => {
                    setSecondaryPhone(e.target.value);
                    if (fieldErrors.secondaryPhone)
                      setFieldErrors((prev) => ({ ...prev, secondaryPhone: undefined }));
                  }}
                  error={fieldErrors.secondaryPhone}
                  placeholder="011 234 5678"
                  className="bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={fieldErrors.email}
                placeholder="dealer@company.lk"
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Address <span className="text-rose-500">*</span>
              </label>
              <Input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: undefined }));
                }}
                error={fieldErrors.address}
                placeholder="120 High Level Road, Nugegoda"
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  TIN Number <span className="text-[11px] font-normal text-slate-400">(optional)</span>
                </label>
                <Input
                  value={tinNumber}
                  onChange={(e) => setTinNumber(e.target.value)}
                  placeholder="e.g. 109847291-7000"
                  className="bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  VAT Number <span className="text-[11px] font-normal text-slate-400">(optional)</span>
                </label>
                <Input
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="e.g. 109847291-7000"
                  className="bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value);
                    if (!isSalesRep) setAssignedRepId('');
                    if (fieldErrors.areaId) setFieldErrors((prev) => ({ ...prev, areaId: undefined }));
                  }}
                  error={fieldErrors.areaId}
                  className="bg-white"
                >
                  <option value="">Select Area</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Area Manager (Locked)</label>
                <Input
                  value={areaManagerName}
                  disabled
                  placeholder="Auto-selected"
                  className="bg-slate-100/80 text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Sales Rep {isAreaManager ? '(Optional)' : <span className="text-rose-500">*</span>}
                  </label>
                  {editingCustomer && (
                    <span className="text-[10px] text-primary font-bold">Editable</span>
                  )}
                </div>
                <Select
                  value={assignedRepId}
                  onChange={(e) => {
                    setAssignedRepId(e.target.value);
                    if (fieldErrors.assignedRepId)
                      setFieldErrors((prev) => ({ ...prev, assignedRepId: undefined }));
                  }}
                  error={fieldErrors.assignedRepId}
                  className="bg-white"
                >
                  <option value="">{isAreaManager ? 'Manager to assign' : 'Select Sales Rep'}</option>
                  {salesRepsInArea.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* SECTION 3: COMMERCIAL TERMS & CREDIT LIMITS */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                3. Commercial Terms &amp; Credit Limits
              </span>
              {isSpecialAttention ? (
                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10.5px] font-bold gap-1">
                  <ShieldAlert className="h-3 w-3 text-rose-600" /> Special Attention
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10.5px] font-bold gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Standard Terms
                </Badge>
              )}
            </div>

            {/* Special Attention Alert Callout */}
            {isSpecialAttention ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Special Attention Required (Director Authorization)</span>
                </div>
                <p className="text-[11px] text-rose-700 pl-6 leading-relaxed">
                  Entered terms violate standard credit policy defaults (Policy max: {defaultTerms.defaultCreditDays} days, LKR {defaultTerms.defaultCreditLimit.toLocaleString()}). This registration will be flagged for special management review and routed to the Director.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] text-emerald-800 font-medium">
                  Standard credit policy terms applied. Manager review &amp; approval sufficient.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Allowed Credit Days */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Allowed Credit Days <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Policy Default: {defaultTerms.defaultCreditDays} Days
                  </span>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={creditDays}
                  onChange={(e) => {
                    setCreditDays(Number(e.target.value));
                    if (fieldErrors.creditDays)
                      setFieldErrors((prev) => ({ ...prev, creditDays: undefined }));
                  }}
                  error={fieldErrors.creditDays}
                  className="bg-white font-mono font-bold"
                  placeholder="30"
                />
                {/* Quick preset pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Presets:</span>
                  {[14, 30, 45, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCreditDays(d)}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold border transition-colors ${
                        creditDays === d
                          ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Credit Balance / Credit Limit */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Credit Balance / Limit (LKR) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Policy Default: {formatCurrency(defaultTerms.defaultCreditLimit)}
                  </span>
                </div>
                <Input
                  type="number"
                  min={0}
                  step={50000}
                  value={creditLimit}
                  onChange={(e) => {
                    setCreditLimit(Number(e.target.value));
                    if (fieldErrors.creditLimit)
                      setFieldErrors((prev) => ({ ...prev, creditLimit: undefined }));
                  }}
                  error={fieldErrors.creditLimit}
                  className="bg-white font-mono font-bold"
                  placeholder="500000"
                />
                {/* Quick preset pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Presets:</span>
                  {[250000, 500000, 1000000, 2000000].map((lim) => (
                    <button
                      key={lim}
                      type="button"
                      onClick={() => setCreditLimit(lim)}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold border transition-colors ${
                        creditLimit === lim
                          ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lim >= 1000000 ? `${lim / 1000000}M` : `${lim / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>

        <DrawerFooter className="flex flex-row items-center justify-between gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          {mode === 'approve' && editingCustomer && onApprove ? (
            <div className="flex items-center gap-2">
              {onReject && (
                <ConfirmButton
                  type="button"
                  variant="outline"
                  size="sm"
                  dialogVariant="destructive"
                  confirmTitle="Reject Customer Registration?"
                  confirmMessage={`Are you sure you want to reject customer "${displayName}"? This registration will be sent back with rejected status.`}
                  confirmLabel="Reject Customer"
                  confirmVariant="destructive"
                  onConfirm={async () => {
                    await onReject(editingCustomer.id);
                    onOpenChange(false);
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  <span>Reject</span>
                </ConfirmButton>
              )}

              {onUpdate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="text-slate-700 border-slate-300 hover:bg-slate-50 font-semibold"
                >
                  Save Edits Only
                </Button>
              )}

              <ConfirmButton
                type="button"
                size="sm"
                dialogVariant="success"
                confirmTitle="Approve Customer & Activate Account?"
                confirmMessage={`Confirm sign-off and approval for "${displayName}" with ${creditDays} Allowed Credit Days and ${formatCurrency(creditLimit)} limit? This will activate the account for order processing.`}
                confirmLabel="Approve Customer"
                confirmVariant="success"
                onConfirm={async () => {
                  if (!validate()) return;
                  const rep = users.find((r) => r.id === assignedRepId) || salesRepsInArea.find((r) => r.id === assignedRepId);
                  const parsedCreditDays = Number(creditDays) || defaultTerms.defaultCreditDays;
                  const parsedCreditLimit = Number(creditLimit) || defaultTerms.defaultCreditLimit;

                  await onApprove(editingCustomer.id, {
                    code: code || editingCustomer.code,
                    name: displayName.trim(),
                    companyName: companyName.trim() || undefined,
                    loyaltyLevel,
                    loyaltyTier:
                      loyaltyLevel === 'PLATINUM'
                        ? 'PLATINUM'
                        : loyaltyLevel === 'PREMIUM'
                        ? 'GOLD'
                        : 'BRONZE',
                    areaId: selectedArea?.id || editingCustomer.areaId,
                    areaName: selectedArea?.name || editingCustomer.areaName,
                    assignedRepId: rep?.id || assignedRepId || editingCustomer.assignedRepId,
                    assignedRepName: rep?.name || editingCustomer.assignedRepName,
                    contactPerson: contactPerson.trim(),
                    phone: primaryPhone.trim(),
                    whatsappNumber: whatsappNumber.trim() || undefined,
                    secondaryPhone: secondaryPhone.trim() || undefined,
                    email: email.trim(),
                    address: address.trim(),
                    taxNumber: tinNumber.trim() || undefined,
                    vatNumber: vatNumber.trim() || undefined,
                    commercialTerms: {
                      creditLimit: parsedCreditLimit,
                      creditDays: parsedCreditDays,
                      defaultDiscountPercentage: defaultTerms.defaultDiscountPercentage,
                      maxDiscountPercentage: defaultTerms.maxDiscountPercentage,
                    },
                  });
                  onOpenChange(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 shadow-xs cursor-pointer gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save &amp; Approve Customer</span>
              </ConfirmButton>
            </div>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-primary hover:bg-primary-hover text-white font-bold px-5 shadow-xs cursor-pointer"
            >
              {submitting ? 'Submitting...' : editingCustomer ? 'Save Changes' : 'Submit for Commercial Setup'}
            </Button>
          )}
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
