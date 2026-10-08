import { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Customer, CustomerType, CustomerLoyaltyLevel } from '../../types/customer';
import { useAreas } from '../../hooks/useAreas';
import { useUsers } from '../../hooks/useUsers';

interface CustomerCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'financials'>) => Promise<void>;
  onUpdate?: (id: string, customer: Partial<Customer>) => Promise<void>;
  editingCustomer?: Customer | null;
}

export function CustomerCreateModal({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  editingCustomer,
}: CustomerCreateModalProps) {
  const { areas } = useAreas();
  const { users } = useUsers();
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomerType>('DEALER');
  const [loyaltyLevel, setLoyaltyLevel] = useState<CustomerLoyaltyLevel>('NEW');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  const [areaId, setAreaId] = useState('');
  const [assignedRepId, setAssignedRepId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editingCustomer) {
        setCode(editingCustomer.code);
        setName(editingCustomer.name);
        setType(editingCustomer.type);
        setLoyaltyLevel(
          editingCustomer.loyaltyLevel ||
            (editingCustomer.loyaltyTier === 'PLATINUM'
              ? 'PLATINUM'
              : editingCustomer.loyaltyTier === 'GOLD' || editingCustomer.loyaltyTier === 'SILVER'
              ? 'PREMIUM'
              : 'NEW')
        );
        setContactPerson(editingCustomer.contactPerson);
        setPhone(editingCustomer.phone);
        setEmail(editingCustomer.email || '');
        setAddress(editingCustomer.address || '');
        setAreaId(editingCustomer.areaId || '');
        setAssignedRepId(editingCustomer.assignedRepId || '');
      } else {
        setCode('');
        setName('');
        setType('DEALER');
        setLoyaltyLevel('NEW');
        setContactPerson('');
        setPhone('');
        setEmail('');
        setAddress('');
        setAreaId('');
        setAssignedRepId('');
      }
      setError(null);
    }
  }, [open, editingCustomer]);

  const selectedArea = areas.find(a => a.id === areaId);
  const areaManagerName = selectedArea ? selectedArea.areaManagerName : '';
  
  const salesRepsInArea = users.filter(u => u.role === 'SALES_REP' && u.areaId === areaId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !contactPerson.trim()) {
      setError('Name, Contact Person, and Phone are required.');
      return;
    }
    if (!areaId) {
      setError('Please select an Area.');
      return;
    }
    if (!assignedRepId) {
      setError('Please select a Sales Rep.');
      return;
    }

    const rep = salesRepsInArea.find(r => r.id === assignedRepId);

    try {
      setSubmitting(true);
      setError(null);
      
      if (editingCustomer && onUpdate) {
        await onUpdate(editingCustomer.id, {
          code: code || editingCustomer.code,
          name,
          type,
          loyaltyLevel,
          loyaltyTier:
            loyaltyLevel === 'PLATINUM'
              ? 'PLATINUM'
              : loyaltyLevel === 'PREMIUM'
              ? 'GOLD'
              : 'BRONZE',
          areaId: selectedArea?.id,
          areaName: selectedArea?.name,
          assignedRepId: rep?.id,
          assignedRepName: rep?.name,
          contactPerson,
          phone,
          email,
          address,
        });
      } else {
        await onCreate({
          code: code || `CUST-${Date.now().toString().slice(-4)}`,
          name,
          type,
          loyaltyLevel,
          loyaltyTier:
            loyaltyLevel === 'PLATINUM'
              ? 'PLATINUM'
              : loyaltyLevel === 'PREMIUM'
              ? 'GOLD'
              : 'BRONZE',
          areaId: selectedArea?.id || 'area-01',
          areaName: selectedArea?.name || 'Western Province Central',
          assignedRepId: rep?.id || 'usr-106',
          assignedRepName: rep?.name || 'Kasun Wickramasinghe',
          contactPerson,
          phone,
          email,
          address,
          commercialTerms: {
            creditLimit: 500000,
            creditDays: 14,
            defaultDiscountPercentage: 5,
            maxDiscountPercentage: 10,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Register New Dealer / Customer'}</DialogTitle>
        <DialogDescription>
          {editingCustomer ? 'Update customer details' : 'Submits basic business details into Customer Master. Enters Sales Manager Commercial Review workflow.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Customer Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. DLR-COL-009"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Customer Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
              <option value="DEALER">Authorized Dealer</option>
              <option value="SHOWROOM">Showroom Outlet</option>
              <option value="DIRECT">Direct Contractor</option>
            </Select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Loyalty Level</label>
            <Select value={loyaltyLevel} onChange={(e) => setLoyaltyLevel(e.target.value as CustomerLoyaltyLevel)}>
              <option value="NEW">New (Level 1 Discount)</option>
              <option value="PREMIUM">Premium (Levels 1 & 2)</option>
              <option value="PLATINUM">Platinum (All Levels)</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
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
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Contact Person <span className="text-rose-500">*</span>
            </label>
            <Input
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Mr. Janaka Silva"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
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
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Email Address</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dealer@company.lk"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Registered Address</label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="120 High Level Road, Nugegoda"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Area <span className="text-rose-500">*</span></label>
            <Select 
              value={areaId} 
              onChange={(e) => {
                setAreaId(e.target.value);
                setAssignedRepId(''); 
              }}
            >
              <option value="">Select Area</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Area Manager (Locked)</label>
            <Input
              value={areaManagerName}
              disabled
              placeholder="Auto-selected"
              className="bg-slate-50 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Rep <span className="text-rose-500">*</span></label>
            <Select 
              value={assignedRepId} 
              onChange={(e) => setAssignedRepId(e.target.value)}
              disabled={!areaId}
            >
              <option value="">Select Sales Rep</option>
              {salesRepsInArea.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Submitting...' : (editingCustomer ? 'Save Changes' : 'Submit for Commercial Setup')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
