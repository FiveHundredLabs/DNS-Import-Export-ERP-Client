import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Supplier, CreateSupplierDTO } from '../api/types';
import { AlertTriangle, Building, CreditCard } from 'lucide-react';

interface SupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dto: CreateSupplierDTO) => Promise<Supplier>;
  supplierToEdit?: Supplier | null;
  existingSuppliers?: Supplier[];
}

export function SupplierModal({
  open,
  onOpenChange,
  onSave,
  supplierToEdit,
  existingSuppliers = [],
}: SupplierModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Finished Goods');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankSwiftCode, setBankSwiftCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplierToEdit) {
      setCode(supplierToEdit.code);
      setName(supplierToEdit.name);
      setCategory(supplierToEdit.category || 'Finished Goods');
      setContactPerson(supplierToEdit.contactPerson);
      setPhone(supplierToEdit.phone);
      setEmail(supplierToEdit.email);
      setAddress(supplierToEdit.address || '');
      setTaxNumber(supplierToEdit.taxNumber || '');
      setVatNumber(supplierToEdit.vatNumber || '');
      setPaymentTerms(supplierToEdit.paymentTerms);
      setBankName(supplierToEdit.bankName || '');
      setBankBranch(supplierToEdit.bankBranch || '');
      setBankAccountNumber(supplierToEdit.bankAccountNumber || '');
      setBankSwiftCode(supplierToEdit.bankSwiftCode || '');
    } else {
      setCode(`SUP-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setCategory('Finished Goods');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setTaxNumber('');
      setVatNumber('');
      setPaymentTerms('Net 30');
      setBankName('');
      setBankBranch('');
      setBankAccountNumber('');
      setBankSwiftCode('');
    }
  }, [supplierToEdit, open]);

  // Duplicate Supplier Control: checks existing suppliers by Name, VAT number, or TIN
  const duplicateWarning = useMemo(() => {
    if (!existingSuppliers || existingSuppliers.length === 0) return null;
    const trimmedName = name.trim().toLowerCase();
    const trimmedVat = vatNumber.trim().toLowerCase();
    const trimmedTax = taxNumber.trim().toLowerCase();

    if (trimmedName.length >= 3) {
      const match = existingSuppliers.find(
        (s) => s.id !== supplierToEdit?.id && s.name.trim().toLowerCase() === trimmedName
      );
      if (match) {
        return `A supplier with the name "${match.name}" (${match.code}) already exists in the system.`;
      }
    }

    if (trimmedVat.length >= 4) {
      const match = existingSuppliers.find(
        (s) =>
          s.id !== supplierToEdit?.id &&
          ((s.vatNumber && s.vatNumber.trim().toLowerCase() === trimmedVat) ||
            (s.taxNumber && s.taxNumber.trim().toLowerCase() === trimmedVat))
      );
      if (match) {
        return `A supplier with VAT Registration #${vatNumber} already exists (${match.name} - ${match.code}).`;
      }
    }

    if (trimmedTax.length >= 4) {
      const match = existingSuppliers.find(
        (s) =>
          s.id !== supplierToEdit?.id &&
          ((s.taxNumber && s.taxNumber.trim().toLowerCase() === trimmedTax) ||
            (s.vatNumber && s.vatNumber.trim().toLowerCase() === trimmedTax))
      );
      if (match) {
        return `A supplier with Tax/TIN #${taxNumber} already exists (${match.name} - ${match.code}).`;
      }
    }

    return null;
  }, [name, vatNumber, taxNumber, existingSuppliers, supplierToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactPerson.trim() || !phone.trim()) {
      setError('Supplier Name, Contact Person, and Phone are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category,
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        vatNumber: vatNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        bankBranch: bankBranch.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankSwiftCode: bankSwiftCode.trim() || undefined,
        paymentTerms,
      });

      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{supplierToEdit ? 'Edit Supplier Record' : 'Register New Vendor / Supplier'}</DialogTitle>
        <DialogDescription>
          Maintain trade supplier credentials, category, VAT registration, payment terms, and bank settlement details.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {error && <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs font-medium">{error}</div>}

        {duplicateWarning && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Duplicate Warning: </span>
              {duplicateWarning}
            </div>
          </div>
        )}

        {/* Basic Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier Code <span className="text-rose-500">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUP-005"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier Category <span className="text-rose-500">*</span>
            </label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Finished Goods">Finished Goods</option>
              <option value="Raw Materials">Raw Materials</option>
              <option value="Logistics & Clearing">Logistics & Clearing Agent</option>
              <option value="Equipment & Spares">Equipment & Machinery</option>
              <option value="General Services">General Services & Utilities</option>
              <option value="Packaging">Packaging Materials</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Terms <span className="text-rose-500">*</span>
            </label>
            <Select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 60">Net 60 Days</option>
              <option value="Cash on Delivery">Cash on Delivery (COD)</option>
              <option value="Advance Payment">100% Advance Payment</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Company / Vendor Trade Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Global Tech Components Ltd"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Person <span className="text-rose-500">*</span>
            </label>
            <Input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Mr. Arjuna Weerasinghe"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone <span className="text-rose-500">*</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 11 234 5678"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sales@vendor.lk"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              VAT Registration #
            </label>
            <Input
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="102938475-7000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              TIN / Tax ID
            </label>
            <Input
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="TIN-908172635"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Registered Warehouse / Office Address
          </label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="104 Nawam Mawatha, Colombo 02"
          />
        </div>

        {/* Bank Settlement Details Section */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <CreditCard className="h-4 w-4 text-primary" />
            <span>Bank Settlement Details (for Electronic Transfers & Remittance)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Bank Name
              </label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Commercial Bank of Ceylon / HNB"
                className="bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Branch Name
              </label>
              <Input
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                placeholder="e.g. Kollupitiya / City Office"
                className="bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Account Number
              </label>
              <Input
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="e.g. 1000293847"
                className="bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                SWIFT / Routing Code
              </label>
              <Input
                value={bankSwiftCode}
                onChange={(e) => setBankSwiftCode(e.target.value.toUpperCase())}
                placeholder="e.g. COMBCLKE"
                className="bg-white font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Saving...' : supplierToEdit ? 'Save Changes' : 'Register Supplier'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
