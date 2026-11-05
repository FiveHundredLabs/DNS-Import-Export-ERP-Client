import React, { useState, useEffect } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { FolderPlus, Layers, Lock } from 'lucide-react';
import { AccountClass, AccountSubClass } from '../api/types';
import { FinanceCategory, categoryService } from '../services/categoryService';

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryToEdit?: FinanceCategory | null;
  defaultParentId?: string | null;
  onSuccess: (cat: FinanceCategory) => void;
}

export function CategoryModal({
  open,
  onOpenChange,
  categoryToEdit = null,
  defaultParentId = null,
  onSuccess,
}: CategoryModalProps) {
  const isEditing = Boolean(categoryToEdit);
  const isLockedSystem = Boolean(categoryToEdit?.isSystem);

  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [accountClass, setAccountClass] = useState<AccountClass>('ASSET');
  const [accountSubClass, setAccountSubClass] = useState<AccountSubClass>('CURRENT_ASSET');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDefaultSubClassForClass = (cls: AccountClass): AccountSubClass => {
    switch (cls) {
      case 'ASSET':
        return 'CURRENT_ASSET';
      case 'LIABILITY':
        return 'CURRENT_LIABILITY';
      case 'EQUITY':
        return 'EQUITY';
      case 'INCOME':
        return 'REVENUE';
      case 'EXPENSE':
        return 'OPERATING_EXPENSE';
      default:
        return 'CURRENT_ASSET';
    }
  };

  useEffect(() => {
    if (open) {
      const allCats = categoryService.getCategories();
      setCategories(allCats);

      if (categoryToEdit) {
        setCode(categoryToEdit.code);
        setName(categoryToEdit.name);
        setParentId(categoryToEdit.parentId || '');
        setAccountClass(categoryToEdit.accountClass);
        setAccountSubClass(categoryToEdit.accountSubClass || getDefaultSubClassForClass(categoryToEdit.accountClass));
        setDescription(categoryToEdit.description || '');
      } else {
        const initialParent = defaultParentId || '';
        setParentId(initialParent);
        if (initialParent) {
          const parentCat = allCats.find((c) => c.id === initialParent);
          if (parentCat) {
            setAccountClass(parentCat.accountClass);
            setAccountSubClass(parentCat.accountSubClass || getDefaultSubClassForClass(parentCat.accountClass));
          }
        } else {
          setAccountClass('ASSET');
          setAccountSubClass('CURRENT_ASSET');
        }
        setCode('');
        setName('');
        setDescription('');
      }
      setError(null);
    }
  }, [open, categoryToEdit, defaultParentId]);

  const handleParentChange = (newParentId: string) => {
    setParentId(newParentId);
    if (newParentId) {
      const parentCat = categories.find((c) => c.id === newParentId);
      if (parentCat) {
        setAccountClass(parentCat.accountClass);
        setAccountSubClass(parentCat.accountSubClass || getDefaultSubClassForClass(parentCat.accountClass));
      }
    }
  };

  const handleClassChange = (newClass: AccountClass) => {
    setAccountClass(newClass);
    setAccountSubClass(getDefaultSubClassForClass(newClass));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Category Code is required (e.g. 1001, 2001).');
      return;
    }
    if (!name.trim()) {
      setError('Category Name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const subClass = accountSubClass || getDefaultSubClassForClass(accountClass);

      if (isEditing && categoryToEdit) {
        const updated = categoryService.updateCategory(categoryToEdit.id, {
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          ...(!isLockedSystem ? { accountClass, accountSubClass: subClass, parentId: parentId || null } : {}),
        });
        onSuccess(updated);
      } else {
        const created = categoryService.createCategory({
          code: code.trim(),
          name: name.trim(),
          accountClass,
          accountSubClass: subClass,
          parentId: parentId || null,
          description: description.trim() || undefined,
        });
        onSuccess(created);
      }

      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  // Only master / root categories can be parents
  const masterCategories = categories.filter((c) => !c.parentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5 text-emerald-600" />
          <DialogTitle>
            {isEditing
              ? isLockedSystem
                ? 'Edit System Category'
                : 'Edit Category'
              : parentId
              ? 'Add Sub-Category'
              : 'Add Category / Master Group'}
          </DialogTitle>
          {isLockedSystem && (
            <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-xs">
              <Lock className="h-2.5 w-2.5" />
              <span>System</span>
            </Badge>
          )}
        </div>
        <DialogDescription>
          {parentId
            ? 'Create a sub-category under the chosen master account (e.g., Current Assets under Assets).'
            : 'Create a top-level classification category or sub-category in the Chart of Accounts hierarchy.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">{error}</div>}

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Parent Category <span className="text-slate-400 font-normal">(Optional for Master Groups)</span>
          </label>
          <Select
            value={parentId}
            onChange={(e) => handleParentChange(e.target.value)}
            disabled={isLockedSystem}
          >
            <option value="">None (Top-Level Master Category)</option>
            <optgroup label="Master Account Categories">
              {masterCategories
                .filter((c) => !categoryToEdit || c.id !== categoryToEdit.id)
                .map((mc) => (
                  <option key={mc.id} value={mc.id}>
                    {mc.code} — {mc.name} ({mc.accountClass})
                  </option>
                ))}
            </optgroup>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Code <span className="text-rose-500">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 1001, 1002"
              disabled={isLockedSystem}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Type / Classification <span className="text-rose-500">*</span>
            </label>
            <Select
              value={accountClass}
              onChange={(e) => handleClassChange(e.target.value as AccountClass)}
              disabled={Boolean(parentId) || isLockedSystem}
            >
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="EQUITY">Equity</option>
              <option value="INCOME">Income / Revenue</option>
              <option value="EXPENSE">Expense</option>
            </Select>
            {parentId && (
              <span className="text-[10px] text-emerald-600 font-medium">Auto-inherited from parent category</span>
            )}
          </div>
        </div>

        {/* Sub-Classification selection for Sub-Categories */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Sub-Classification
          </label>
          <Select
            value={accountSubClass}
            onChange={(e) => setAccountSubClass(e.target.value as AccountSubClass)}
            disabled={isLockedSystem}
          >
            {accountClass === 'ASSET' && (
              <>
                <option value="CURRENT_ASSET">Current Asset (Cash, Bank, Receivables, Stock)</option>
                <option value="NON_CURRENT_ASSET">Non-Current Asset (Fixed Assets, Equipment, Property)</option>
              </>
            )}
            {accountClass === 'LIABILITY' && (
              <>
                <option value="CURRENT_LIABILITY">Current Liability (Accounts Payable, Taxes, Accruals)</option>
                <option value="NON_CURRENT_LIABILITY">Non-Current Liability (Long-term Loans, Notes)</option>
              </>
            )}
            {accountClass === 'EQUITY' && (
              <option value="EQUITY">Equity (Capital, Reserves, Retained Earnings)</option>
            )}
            {accountClass === 'INCOME' && (
              <option value="REVENUE">Operating Revenue & Sales Income</option>
            )}
            {accountClass === 'EXPENSE' && (
              <>
                <option value="DIRECT_COST">Direct Costs (COGS, Landed Cost, Duty, Freight)</option>
                <option value="OPERATING_EXPENSE">Operating Expenses (Salaries, Rent, Utilities, Logistics)</option>
              </>
            )}
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Category Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Current Assets, Non-Current Assets, Direct Costs"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description & Notes
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what accounts should be categorized under this heading..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {submitting ? 'Saving...' : isEditing ? 'Update Category' : 'Save Category'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
