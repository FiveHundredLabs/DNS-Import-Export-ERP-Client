import { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Supplier, CreateSupplierDTO } from '../api/types';

interface SupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dto: CreateSupplierDTO) => Promise<Supplier>;
  supplierToEdit?: Supplier | null;
}

export function SupplierModal({
  open,
  onOpenChange,
  onSave,
  supplierToEdit,
}: SupplierModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplierToEdit) {
      setCode(supplierToEdit.code);
      setName(supplierToEdit.name);
      setContactPerson(supplierToEdit.contactPerson);
      setPhone(supplierToEdit.phone);
      setEmail(supplierToEdit.email);
      setAddress(supplierToEdit.address || '');
      setTaxNumber(supplierToEdit.taxNumber || '');
      setPaymentTerms(supplierToEdit.paymentTerms);
    } else {
      setCode(`SUP-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setTaxNumber('');
      setPaymentTerms('Net 30');
    }
  }, [supplierToEdit, open]);

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
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
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
          Maintain trade supplier credentials, tax numbers, and payment terms for Accounts Payable.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs font-medium">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
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

        <div className="grid grid-cols-2 gap-3">
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

        <div className="grid grid-cols-2 gap-3">
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
              Tax ID / VAT Registration #
            </label>
            <Input
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="VAT-102938475"
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
