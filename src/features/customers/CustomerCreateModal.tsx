import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Customer, CustomerType } from '../../types/customer';
import { useAuth } from '../../hooks/useAuth';

interface CustomerCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>) => Promise<void>;
}

export function CustomerCreateModal({
  open,
  onOpenChange,
  onCreate,
}: CustomerCreateModalProps) {
  const { currentUser } = useAuth();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomerType>('DEALER');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !contactPerson.trim()) {
      setError('Name, Contact Person, and Phone are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreate({
        code: code || `CUST-${Date.now().toString().slice(-4)}`,
        name,
        type,
        areaId: currentUser.areaId || 'area-01',
        areaName: currentUser.areaName || 'Western Province Central',
        assignedRepId: 'usr-106',
        assignedRepName: 'Kasun Wickramasinghe',
        contactPerson,
        phone,
        email,
        address,
        commercialTerms: {
          creditLimit: 500000, // Initial provisional limit
          creditDays: 14,
          defaultDiscountPercentage: 5,
          maxDiscountPercentage: 10,
        },
        approvalStage: 'PENDING_SALES_REVIEW',
        status: 'INACTIVE',
        warrantyNotesExpected: 0,
        warrantyNotesReceived: 0,
      });

      onOpenChange(false);
      setName('');
      setPhone('');
      setContactPerson('');
      setAddress('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Register New Dealer / Customer</DialogTitle>
        <DialogDescription>
          Submits basic business details into Customer Master. Enters Sales Manager Commercial Review workflow.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DLR-COL-009"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
              <option value="DEALER">Authorized Dealer</option>
              <option value="SHOWROOM">Showroom Outlet</option>
              <option value="DIRECT">Direct Contractor</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Shop / Business Full Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Apex Power Engineering (Pvt) Ltd"
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
              placeholder="Mr. Janaka Silva"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone <span className="text-rose-500">*</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dealer@company.lk"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address</label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="120 High Level Road, Nugegoda"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit for Commercial Setup'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
