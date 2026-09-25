import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Account, AccountClass, AccountSubClass, CreateAccountDTO } from '../api/types';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (dto: CreateAccountDTO) => Promise<Account>;
  existingAccounts?: Account[];
  defaultClass?: AccountClass;
  defaultSubClass?: AccountSubClass;
}

export function AccountModal({
  open,
  onOpenChange,
  onCreate,
  existingAccounts = [],
  defaultClass = 'EXPENSE',
  defaultSubClass = 'OPERATING_EXPENSE',
}: AccountModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountClass, setAccountClass] = useState<AccountClass>(defaultClass);
  const [accountSubClass, setAccountSubClass] = useState<AccountSubClass>(defaultSubClass);
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClassChange = (newClass: AccountClass) => {
    setAccountClass(newClass);
    if (newClass === 'ASSET') setAccountSubClass('CURRENT_ASSET');
    else if (newClass === 'LIABILITY') setAccountSubClass('CURRENT_LIABILITY');
    else if (newClass === 'EQUITY') setAccountSubClass('EQUITY');
    else if (newClass === 'INCOME') setAccountSubClass('REVENUE');
    else if (newClass === 'EXPENSE') setAccountSubClass('OPERATING_EXPENSE');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Account Code and Account Name are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreate({
        code: code.trim(),
        name: name.trim(),
        accountClass,
        accountSubClass,
        description: description.trim() || undefined,
        parentId: parentId || undefined,
      });

      onOpenChange(false);
      setCode('');
      setName('');
      setDescription('');
      setParentId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Account creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Create New General Ledger Account</DialogTitle>
        <DialogDescription>
          Add a custom general ledger sub-account to the Chart of Accounts hierarchy.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-xs font-medium">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Code <span className="text-rose-500">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 6040"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Classification <span className="text-rose-500">*</span>
            </label>
            <Select
              value={accountClass}
              onChange={(e) => handleClassChange(e.target.value as AccountClass)}
            >
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
              <option value="INCOME">Income / Revenue</option>
              <option value="EXPENSE">Expense</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Account Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Delivery Van Fuel & Maintenance"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sub-Category Group
            </label>
            <Select
              value={accountSubClass}
              onChange={(e) => setAccountSubClass(e.target.value as AccountSubClass)}
            >
              {accountClass === 'ASSET' && (
                <>
                  <option value="CURRENT_ASSET">Current Asset</option>
                  <option value="NON_CURRENT_ASSET">Non-Current Asset / Fixed Asset</option>
                </>
              )}
              {accountClass === 'LIABILITY' && (
                <>
                  <option value="CURRENT_LIABILITY">Current Liability</option>
                  <option value="NON_CURRENT_LIABILITY">Long-Term Liability</option>
                </>
              )}
              {accountClass === 'EQUITY' && <option value="EQUITY">Equity & Reserves</option>}
              {accountClass === 'INCOME' && <option value="REVENUE">Sales & Operating Revenue</option>}
              {accountClass === 'EXPENSE' && (
                <>
                  <option value="DIRECT_COST">Cost of Goods Sold (Direct Cost)</option>
                  <option value="OPERATING_EXPENSE">Operating Expense (Overhead)</option>
                </>
              )}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parent Account (Optional)
            </label>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None (Top-Level in Group)</option>
              {existingAccounts
                .filter((a) => a.accountClass === accountClass)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description & Purpose
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specify intended transaction types, expenditure guidelines, or tax treatment..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
