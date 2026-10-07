import { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Lock } from 'lucide-react';
import { Account, AccountClass, AccountSubClass, CreateAccountDTO } from '../api/types';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (dto: CreateAccountDTO) => Promise<Account>;
  onUpdate?: (id: string, dto: Partial<CreateAccountDTO>) => Promise<Account>;
  accountToEdit?: Account | null;
  existingAccounts?: Account[];
  defaultClass?: AccountClass;
  defaultSubClass?: AccountSubClass;
}

export function AccountModal({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  accountToEdit = null,
  existingAccounts = [],
  defaultClass = 'EXPENSE',
  defaultSubClass = 'OPERATING_EXPENSE',
}: AccountModalProps) {
  const isEditing = Boolean(accountToEdit);
  const isLockedSystemAccount = Boolean(accountToEdit?.isSystem);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountClass, setAccountClass] = useState<AccountClass>(defaultClass);
  const [accountSubClass, setAccountSubClass] = useState<AccountSubClass>(defaultSubClass);
  const [accountSubType, setAccountSubType] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accountToEdit) {
      setCode(accountToEdit.code);
      setName(accountToEdit.name);
      setAccountClass(accountToEdit.accountClass);
      setAccountSubClass(accountToEdit.accountSubClass);
      setAccountSubType(accountToEdit.accountSubType || '');
      setDescription(accountToEdit.description || '');
      setParentId(accountToEdit.parentId || '');
    } else {
      setCode('');
      setName('');
      setAccountClass(defaultClass);
      setAccountSubClass(defaultSubClass);
      setAccountSubType('');
      setDescription('');
      setParentId('');
    }
    setError(null);
  }, [accountToEdit, defaultClass, defaultSubClass, open]);

  const handleClassChange = (newClass: AccountClass) => {
    if (isLockedSystemAccount) return;
    setAccountClass(newClass);
    setParentId('');
    if (newClass === 'ASSET') setAccountSubClass('CURRENT_ASSET');
    else if (newClass === 'LIABILITY') setAccountSubClass('CURRENT_LIABILITY');
    else if (newClass === 'EQUITY') setAccountSubClass('EQUITY');
    else if (newClass === 'INCOME') setAccountSubClass('REVENUE');
    else if (newClass === 'EXPENSE') setAccountSubClass('OPERATING_EXPENSE');
  };

  const groupOptionsByClass: Record<AccountClass, { value: AccountSubClass; label: string }[]> = {
    ASSET: [
      { value: 'CURRENT_ASSET', label: 'Current Assets (Cash, Receivables, Stock)' },
      { value: 'NON_CURRENT_ASSET', label: 'Non-Current Assets (Fixed Assets, Equipment)' },
    ],
    LIABILITY: [
      { value: 'CURRENT_LIABILITY', label: 'Current Liabilities (Payables, Accruals)' },
      { value: 'NON_CURRENT_LIABILITY', label: 'Long-Term Liabilities (Loans, Notes)' },
    ],
    EQUITY: [
      { value: 'EQUITY', label: 'Equity & Retained Earnings' },
    ],
    INCOME: [
      { value: 'REVENUE', label: 'Sales & Operating Revenue' },
    ],
    EXPENSE: [
      { value: 'DIRECT_COST', label: 'Cost of Goods Sold (Direct Costs)' },
      { value: 'OPERATING_EXPENSE', label: 'Operating Expenses (Overheads)' },
    ],
  };

  const handleParentSelectChange = (val: string) => {
    if (val.startsWith('acc:')) {
      const parentAccId = val.replace('acc:', '');
      const parentAcc = existingAccounts.find((a) => a.id === parentAccId);
      setParentId(parentAccId);
      if (parentAcc) {
        setAccountSubClass(parentAcc.accountSubClass);
      }
    } else if (val.startsWith('group:')) {
      const subClass = val.replace('group:', '') as AccountSubClass;
      setParentId('');
      setAccountSubClass(subClass);
    }
  };

  const currentParentSelectionValue = parentId
    ? `acc:${parentId}`
    : `group:${accountSubClass}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account Name is required.');
      return;
    }
    if (!isEditing && !code.trim()) {
      setError('Account Code is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (isEditing && accountToEdit) {
        if (!onUpdate) {
          throw new Error('Update handler not provided');
        }
        await onUpdate(accountToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          accountSubType: accountSubType.trim() || undefined,
          ...(!isLockedSystemAccount ? { accountClass, accountSubClass, parentId: parentId || undefined } : {}),
        });
      } else {
        await onCreate({
          code: code.trim(),
          name: name.trim(),
          classification: accountClass,
          accountClass,
          accountType: accountSubClass,
          accountSubClass,
          accountSubType: accountSubType.trim() || undefined,
          description: description.trim() || undefined,
          parentId: parentId || undefined,
        });
      }

      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Account operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <DialogTitle>
            {isEditing ? (isLockedSystemAccount ? 'Edit System Account Name' : 'Edit Account') : 'Create New General Ledger Account'}
          </DialogTitle>
          {isLockedSystemAccount && (
            <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
              <Lock className="h-2.5 w-2.5" />
              <span>System Locked</span>
            </Badge>
          )}
        </div>
        <DialogDescription>
          {isEditing
            ? isLockedSystemAccount
              ? 'Default system accounts have locked classifications and codes. You can modify the descriptive display name.'
              : 'Modify the account name and configuration settings.'
            : 'Add a custom general ledger sub-account to the Chart of Accounts hierarchy.'}
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
              disabled={isEditing}
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
              disabled={isLockedSystemAccount}
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
            autoFocus={isEditing}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Parent Group / Account <span className="text-rose-500">*</span>
            </label>
            <Select
              value={currentParentSelectionValue}
              onChange={(e) => handleParentSelectChange(e.target.value)}
              disabled={isLockedSystemAccount}
            >
              <optgroup label="Account Category Groups (Top-Level)">
                {(groupOptionsByClass[accountClass] || []).map((grp) => (
                  <option key={`group:${grp.value}`} value={`group:${grp.value}`}>
                    {grp.label}
                  </option>
                ))}
              </optgroup>
              {existingAccounts
                .filter((a) => a.accountClass === accountClass && (!accountToEdit || a.id !== accountToEdit.id))
                .length > 0 && (
                <optgroup label="Or Nest Under Existing Parent Account">
                  {existingAccounts
                    .filter((a) => a.accountClass === accountClass && (!accountToEdit || a.id !== accountToEdit.id))
                    .map((a) => (
                      <option key={`acc:${a.id}`} value={`acc:${a.id}`}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </Select>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Select category tier or parent ledger account.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Sub-Type (Tier 3 Tag)
            </label>
            <Input
              value={accountSubType}
              onChange={(e) => setAccountSubType(e.target.value)}
              placeholder="e.g. Cash & Cash Equivalents, Trade Payables..."
              disabled={isLockedSystemAccount}
            />
            <p className="text-[10.5px] text-slate-400 mt-1">
              Granular tag for financial statements and audits.
            </p>
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
          <Button type="submit" size="sm" disabled={submitting} className="bg-primary hover:bg-primary-hover text-white">
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Account'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
