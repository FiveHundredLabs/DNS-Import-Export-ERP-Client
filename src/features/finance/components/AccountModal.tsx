import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Lock, Layers, CheckCircle2 } from 'lucide-react';
import { Account, AccountClass, AccountSubClass, CreateAccountDTO } from '../api/types';
import { categoryService, FinanceCategory } from '../services/categoryService';

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (dto: CreateAccountDTO) => Promise<Account>;
  onUpdate?: (id: string, dto: Partial<CreateAccountDTO>) => Promise<Account>;
  accountToEdit?: Account | null;
  existingAccounts?: Account[];
  defaultClass?: AccountClass;
  defaultSubClass?: AccountSubClass;
  defaultHeaderCategoryId?: string;
}

const CLASS_DISPLAY_NAMES: Record<AccountClass, string> = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
  INCOME: 'Income / Revenue',
  EXPENSE: 'Expense',
};

export function AccountModal({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  accountToEdit = null,
  existingAccounts = [],
  defaultClass = 'EXPENSE',
  defaultSubClass = 'OPERATING_EXPENSE',
  defaultHeaderCategoryId,
}: AccountModalProps) {
  const isEditing = Boolean(accountToEdit);
  const isLockedSystemAccount = Boolean(accountToEdit?.isSystem);

  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [selectedHeaderCategory, setSelectedHeaderCategory] = useState<string>('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountClass, setAccountClass] = useState<AccountClass>(defaultClass);
  const [accountSubClass, setAccountSubClass] = useState<AccountSubClass>(defaultSubClass);
  const [accountSubType, setAccountSubType] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories whenever modal opens
  useEffect(() => {
    if (open) {
      const allCats = categoryService.getCategories();
      setCategories(allCats);

      if (accountToEdit) {
        setCode(accountToEdit.code);
        setName(accountToEdit.name);
        setAccountClass(accountToEdit.accountClass);
        setAccountSubClass(accountToEdit.accountSubClass);
        setAccountSubType(accountToEdit.accountSubType || '');
        setDescription(accountToEdit.description || '');
        setParentId(accountToEdit.parentId || '');

        // Find matching category
        const matchingCat = allCats.find(
          (c) =>
            c.accountClass === accountToEdit.accountClass &&
            (c.accountSubClass === accountToEdit.accountSubClass ||
              c.name.toLowerCase() === (accountToEdit.accountSubType || '').toLowerCase())
        );
        setSelectedHeaderCategory(matchingCat ? matchingCat.id : '');
      } else {
        setCode('');
        setName('');
        setAccountClass(defaultClass);
        setAccountSubClass(defaultSubClass);
        setAccountSubType('');
        setDescription('');
        setParentId('');

        // Find default header category
        if (defaultHeaderCategoryId) {
          setSelectedHeaderCategory(defaultHeaderCategoryId);
          const found = allCats.find((c) => c.id === defaultHeaderCategoryId);
          if (found) {
            setAccountClass(found.accountClass);
            if (found.accountSubClass) setAccountSubClass(found.accountSubClass);
            setAccountSubType(found.name);
          }
        } else {
          // Default to first subcategory matching defaultClass
          const firstMatching = allCats.find((c) => c.accountClass === defaultClass && c.parentId);
          if (firstMatching) {
            setSelectedHeaderCategory(firstMatching.id);
            if (firstMatching.accountSubClass) setAccountSubClass(firstMatching.accountSubClass);
            setAccountSubType(firstMatching.name);
          } else {
            setSelectedHeaderCategory('');
          }
        }
      }
      setError(null);
    }
  }, [accountToEdit, defaultClass, defaultSubClass, defaultHeaderCategoryId, open]);

  // When Header Account category changes, auto-derive ACCOUNT TYPE and SUBCLASS
  const handleHeaderAccountChange = (catId: string) => {
    setSelectedHeaderCategory(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      setAccountClass(cat.accountClass);
      if (cat.accountSubClass) {
        setAccountSubClass(cat.accountSubClass);
      } else {
        if (cat.accountClass === 'ASSET') setAccountSubClass('CURRENT_ASSET');
        else if (cat.accountClass === 'LIABILITY') setAccountSubClass('CURRENT_LIABILITY');
        else if (cat.accountClass === 'EQUITY') setAccountSubClass('EQUITY');
        else if (cat.accountClass === 'INCOME') setAccountSubClass('REVENUE');
        else setAccountSubClass('OPERATING_EXPENSE');
      }
      setAccountSubType(cat.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account Name is required.');
      return;
    }
    if (!isEditing && !code.trim()) {
      setError('Account Code is required (e.g. 1010, 6040).');
      return;
    }
    if (!isEditing && !selectedHeaderCategory) {
      setError('Header Account / Category is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const selectedCat = categories.find((c) => c.id === selectedHeaderCategory);
      const effectiveSubType = (selectedCat ? selectedCat.name : accountSubType).trim() || undefined;

      if (isEditing && accountToEdit) {
        if (!onUpdate) {
          throw new Error('Update handler not provided');
        }
        await onUpdate(accountToEdit.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          accountSubType: effectiveSubType,
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
          accountSubType: effectiveSubType,
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

  // Group categories by Master category (parentId === null)
  const masterCategories = categories.filter((c) => !c.parentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <DialogTitle>
            {isEditing
              ? isLockedSystemAccount
                ? 'Edit System Account Name'
                : 'Edit Account'
              : 'Add Account'}
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
            : 'Select the Header Account category to automatically set the account type and add to Chart of Accounts.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">{error}</div>}

        {/* Account Code & HEADER ACCOUNT (Image 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Account Code <span className="text-rose-500">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 1010, 5010"
              disabled={isEditing}
              required
              className="font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Header Account <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Category</span>
            </div>
            <Select
              value={selectedHeaderCategory}
              onChange={(e) => handleHeaderAccountChange(e.target.value)}
              disabled={isLockedSystemAccount}
            >
              <option value="">Select Category / Header Account...</option>
              {masterCategories.map((master) => {
                const subCats = categories.filter((c) => c.parentId === master.id);
                return (
                  <optgroup key={master.id} label={`${master.code} ${master.name}`}>
                    {/* Option to attach to master group itself */}
                    <option value={master.id}>
                      {master.code} — {master.name}
                    </option>
                    {subCats.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        &nbsp;&nbsp;{sub.code} — {sub.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>
          </div>
        </div>

        {/* Account Name */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Account Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cash in Hand, Commercial Bank USD"
            required
            autoFocus={isEditing}
          />
        </div>

        {/* ACCOUNT TYPE (Auto-derived & locked from chosen header account - Image 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Account Type
              </label>
              <span className="text-[10px] text-emerald-600 font-medium inline-flex items-center gap-0.5">
                <CheckCircle2 className="h-3 w-3" /> Auto-derived
              </span>
            </div>
            <div className="flex items-center h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800">
              <span className="mr-2 rounded px-1.5 py-0.5 bg-slate-200 text-[10px] font-mono text-slate-700">
                {accountClass}
              </span>
              <span>{CLASS_DISPLAY_NAMES[accountClass] || accountClass}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Derived and locked from chosen Header Account category.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Sub-Ledger / Parent Account <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <Select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={isLockedSystemAccount}
            >
              <option value="">None (Top-Level in Category)</option>
              {existingAccounts
                .filter((a) => a.accountClass === accountClass && (!accountToEdit || a.id !== accountToEdit.id))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
            </Select>
            <p className="text-[10px] text-slate-400 mt-1">
              Nest as a child sub-account under an existing parent account if needed.
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Specify description, purpose or tax treatment..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Account'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
