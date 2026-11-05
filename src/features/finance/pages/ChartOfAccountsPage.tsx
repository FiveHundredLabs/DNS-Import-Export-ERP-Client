import React, { useState, useMemo, useEffect } from 'react';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { Account, AccountClass, AccountSubClass } from '../api/types';
import { AccountModal } from '../components/AccountModal';
import { CategoryModal } from '../components/CategoryModal';
import { OpeningBalanceWizard } from '../components/OpeningBalanceWizard';
import { categoryService, FinanceCategory } from '../services/categoryService';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import {
  Plus,
  Lock,
  ChevronDown,
  ChevronRight,
  Search,
  BookOpen,
  Trash2,
  Edit2,
  DollarSign,
  Layers,
  FolderOpen,
  FolderPlus,
  Power,
  Sparkles,
  X,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { toast } from 'sonner';

interface ClassificationGroup {
  id: string;
  name: string;
  accountClass: AccountClass;
  description: string;
}

const CLASSIFICATION_GROUPS: ClassificationGroup[] = [
  {
    id: 'ASSET',
    name: 'Asset',
    accountClass: 'ASSET',
    description: 'Cash, bank accounts, receivables, and capital inventory/equipment',
  },
  {
    id: 'LIABILITY',
    name: 'Liability',
    accountClass: 'LIABILITY',
    description: 'Accounts payable, VAT collected, accrued commissions, and loans',
  },
  {
    id: 'EQUITY',
    name: 'Equity',
    accountClass: 'EQUITY',
    description: "Owner's capital, opening balance equity, and retained earnings",
  },
  {
    id: 'INCOME',
    name: 'Revenue (Income)',
    accountClass: 'INCOME',
    description: 'Gross sales income, trade revenues, and miscellaneous earnings',
  },
  {
    id: 'EXPENSE',
    name: 'Expense',
    accountClass: 'EXPENSE',
    description: 'Cost of goods sold (COGS), operating expenses, and administrative overheads',
  },
];

const OPENING_BALANCE_STORAGE_KEY = 'dns_finance_opening_balances_completed';

interface ChartOfAccountsPageProps {
  defaultView?: 'ACCOUNTS' | 'CATEGORIES';
}

export function ChartOfAccountsPage({ defaultView = 'ACCOUNTS' }: ChartOfAccountsPageProps) {
  const {
    accounts,
    createAccount,
    updateAccount,
    deleteAccount,
    postJournalEntry,
  } = useFinanceLedger();

  const [activeMainView, setActiveMainView] = useState<'ACCOUNTS' | 'CATEGORIES'>(() => {
    if (defaultView === 'CATEGORIES') return 'CATEGORIES';
    if (typeof window !== 'undefined' && window.location?.pathname?.includes('/finance/categories')) return 'CATEGORIES';
    if (typeof window !== 'undefined' && window.location?.search) {
      const q = new URLSearchParams(window.location.search).get('tab');
      if (q === 'categories') return 'CATEGORIES';
      if (q === 'accounts') return 'ACCOUNTS';
    }
    return defaultView;
  });

  useEffect(() => {
    if (defaultView) {
      setActiveMainView(defaultView);
    }
  }, [defaultView]);

  const handleViewChange = (view: 'ACCOUNTS' | 'CATEGORIES') => {
    setActiveMainView(view);
    if (typeof window !== 'undefined' && window.history?.pushState && window.location?.href) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', view.toLowerCase());
        window.history.pushState({}, '', url.toString());
      } catch {
        // ignore in mock environments
      }
    }
  };

  const [categories, setCategories] = useState<FinanceCategory[]>(() => categoryService.getCategories());
  const [search, setSearch] = useState('');

  // Helper to accurately map accounts to categories without cross-bleeding
  const getAccountsForSubCategory = (sub: FinanceCategory): Account[] => {
    return accounts.filter((a) => {
      if (a.accountClass !== sub.accountClass) return false;

      // Direct match if accountSubType matches category name or category code
      if (
        (a.accountSubType && a.accountSubType.toLowerCase() === sub.name.toLowerCase()) ||
        a.accountSubType === sub.code
      ) {
        return true;
      }

      // Check if accountSubType matches any OTHER defined category
      const matchesOtherCategory = categories.some(
        (other) =>
          other.id !== sub.id &&
          other.parentId &&
          a.accountSubType &&
          other.name.toLowerCase() === a.accountSubType.toLowerCase()
      );

      // Fallback for default system accounts (e.g. 1010 Bank Account)
      // Only the primary system subcategory for this subClass claims them
      if (!matchesOtherCategory && sub.isSystem && sub.accountSubClass && a.accountSubClass === sub.accountSubClass) {
        return true;
      }

      return false;
    });
  };

  // Account modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [targetClass, setTargetClass] = useState<AccountClass>('EXPENSE');
  const [targetSubClass, setTargetSubClass] = useState<AccountSubClass>('OPERATING_EXPENSE');
  const [selectedHeaderCategoryForNewAccount, setSelectedHeaderCategoryForNewAccount] = useState<string | undefined>(undefined);

  // Category modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<FinanceCategory | null>(null);
  const [categoryParentId, setCategoryParentId] = useState<string | null>(null);

  // Collapsed states
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});
  const [collapsedCategoryNodes, setCollapsedCategoryNodes] = useState<Record<string, boolean>>({});
  const [selectedTreeCategory, setSelectedTreeCategory] = useState<string>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('ALL');

  // Opening Balance Wizard State & Permanent Lock Check
  const [showWizard, setShowWizard] = useState(false);
  const [openingBalancesCompleted, setOpeningBalancesCompleted] = useState(() => {
    try {
      return localStorage.getItem(OPENING_BALANCE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const { journals } = useFinanceLedger();
  const isObInitLocked = useMemo(() => {
    return openingBalancesCompleted || journals.some((j) => j.reference?.trim().toUpperCase() === 'SETUP-OB-INIT');
  }, [openingBalancesCompleted, journals]);

  const refreshCategories = () => {
    setCategories(categoryService.getCategories());
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleParent = (parentId: string) => {
    setCollapsedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const toggleCategoryNode = (catId: string) => {
    setCollapsedCategoryNodes((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const openCreateForGroup = (cat: ClassificationGroup) => {
    setAccountToEdit(null);
    setTargetClass(cat.accountClass);
    if (cat.accountClass === 'ASSET') setTargetSubClass('CURRENT_ASSET');
    else if (cat.accountClass === 'LIABILITY') setTargetSubClass('CURRENT_LIABILITY');
    else if (cat.accountClass === 'EQUITY') setTargetSubClass('EQUITY');
    else if (cat.accountClass === 'INCOME') setTargetSubClass('REVENUE');
    else setTargetSubClass('OPERATING_EXPENSE');

    const matchingCat = categories.find((c) => c.accountClass === cat.accountClass && c.parentId);
    setSelectedHeaderCategoryForNewAccount(matchingCat ? matchingCat.id : undefined);
    setModalOpen(true);
  };

  const openCreateForCategory = (cat: FinanceCategory) => {
    setAccountToEdit(null);
    setTargetClass(cat.accountClass);
    if (cat.accountSubClass) {
      setTargetSubClass(cat.accountSubClass);
    } else {
      if (cat.accountClass === 'ASSET') setTargetSubClass('CURRENT_ASSET');
      else if (cat.accountClass === 'LIABILITY') setTargetSubClass('CURRENT_LIABILITY');
      else if (cat.accountClass === 'EQUITY') setTargetSubClass('EQUITY');
      else if (cat.accountClass === 'INCOME') setTargetSubClass('REVENUE');
      else setTargetSubClass('OPERATING_EXPENSE');
    }
    setSelectedHeaderCategoryForNewAccount(cat.id);
    setModalOpen(true);
  };

  const openAddCategory = (parentId: string | null = null) => {
    setCategoryToEdit(null);
    setCategoryParentId(parentId);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (cat: FinanceCategory) => {
    setCategoryToEdit(cat);
    setCategoryParentId(cat.parentId || null);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = (cat: FinanceCategory) => {
    if (cat.isSystem && !cat.parentId) {
      toast.error('Default system master categories cannot be deleted.');
      return;
    }

    // Check if any accounts are using this category
    const linkedAccs = getAccountsForSubCategory(cat);

    if (linkedAccs.length > 0) {
      toast.error(`Cannot delete category "${cat.name}". ${linkedAccs.length} account(s) are attached to it.`);
      return;
    }

    try {
      categoryService.deleteCategory(cat.id);
      refreshCategories();
      toast.success(`Category "${cat.code} - ${cat.name}" deleted.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleEditAccount = (account: Account) => {
    setAccountToEdit(account);
    setTargetClass(account.accountClass);
    setTargetSubClass(account.accountSubClass);
    setModalOpen(true);
  };

  const handleToggleInactive = async (account: Account) => {
    if (account.isSystem) {
      toast.error('Locked system accounts cannot be deactivated.');
      return;
    }

    try {
      const nextState = !account.isActive;
      await updateAccount(account.id, { isActive: nextState });
      toast.success(
        `Account ${account.code} marked as ${nextState ? 'ACTIVE' : 'INACTIVE'}`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle account status');
    }
  };

  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }, [accounts, search]);

  const groupTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const group of CLASSIFICATION_GROUPS) {
      const groupAccs = accounts.filter((a) => a.accountClass === group.accountClass);
      totals[group.id] = groupAccs.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    }
    return totals;
  }, [accounts]);

  // Handle Saving Opening Balances
  const handleSaveOpeningBalances = async (
    lines: { accountId: string; debit: number; credit: number; description?: string }[]
  ) => {
    await postJournalEntry({
      date: new Date().toISOString().slice(0, 10),
      description: 'System Setup: Opening Balances Ledger Initiation',
      reference: 'SETUP-OB-INIT',
      source: 'SYSTEM',
      lines,
    });

    try {
      localStorage.setItem(OPENING_BALANCE_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setOpeningBalancesCompleted(true);
    setShowWizard(false);
  };

  if (showWizard) {
    return (
      <OpeningBalanceWizard
        accounts={accounts}
        onSave={handleSaveOpeningBalances}
        onClose={() => setShowWizard(false)}
      />
    );
  }

  // Master categories list (roots)
  const masterCategories = categories.filter((c) => !c.parentId);
  const [categoryTreeFilter, setCategoryTreeFilter] = useState<string>('ALL');
  const filteredMasterCategories = useMemo(() => {
    if (categoryTreeFilter === 'ALL') return masterCategories;
    return masterCategories.filter((m) => m.id === categoryTreeFilter || m.accountClass === categoryTreeFilter);
  }, [masterCategories, categoryTreeFilter]);

  return (
    <div className="space-y-4">
      {/* Top Header Section — Al Akleel Aesthetic */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Finance</span>
            <span>/</span>
            <span className="font-semibold text-slate-700">General Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {activeMainView === 'ACCOUNTS' ? 'Chart of Accounts' : 'Finance Registry (Categories)'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle: Accounts Table vs Categories Tree */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleViewChange('ACCOUNTS')}
              className={cn(
                'rounded-md px-3 py-1.5 transition-all',
                activeMainView === 'ACCOUNTS'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Accounts Registry
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('CATEGORIES')}
              className={cn(
                'rounded-md px-3 py-1.5 transition-all',
                activeMainView === 'CATEGORIES'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Categories Tree
            </button>
          </div>

          {/* + Add Category Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAddCategory(null)}
            className="gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs h-9 px-3"
          >
            <FolderPlus className="h-4 w-4 text-emerald-600" />
            <span>+ Add Category</span>
          </Button>

          {/* + Add Account Button */}
          <Button
            size="sm"
            onClick={() => {
              setAccountToEdit(null);
              setTargetClass('EXPENSE');
              setTargetSubClass('OPERATING_EXPENSE');
              setSelectedHeaderCategoryForNewAccount(undefined);
              setModalOpen(true);
            }}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 font-semibold text-white shadow-xs text-xs h-9 px-3.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </Button>
        </div>
      </div>

      {/* Opening Balance Banner - Required for System Setup & Invariant Tests */}
      {!isObInitLocked && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
            <div>
              <span className="font-bold text-sky-900 block sm:inline">
                System Setup: Enter Opening Balances
              </span>
              <span className="text-sky-700 text-[11px] sm:ml-2">
                Initialize General Ledger starting balances across asset, liability, and equity accounts.
              </span>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowWizard(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs h-8 px-3 shrink-0"
          >
            Start Setup Wizard
          </Button>
        </div>
      )}

      {activeMainView === 'CATEGORIES' ? (
        /* Al Akleel-Style Category Tree Explorer (/finance/categories - Image 1) */
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span>Finance Registry</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hierarchical category and sub-category tree. Select header accounts when creating accounts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => openAddCategory(null)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 font-medium"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>+ Add Category</span>
              </Button>
            </div>
          </div>

          {/* Al Akleel --All Categories-- Filter (Image 1) */}
          <div className="flex items-center gap-3 py-1">
            <select
              aria-label="Filter Categories"
              value={categoryTreeFilter}
              onChange={(e) => setCategoryTreeFilter(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 min-w-[200px] focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            >
              <option value="ALL">--All Categories--</option>
              {masterCategories.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredMasterCategories.map((master) => {
              const subCats = categories.filter((c) => c.parentId === master.id);
              const isMasterCollapsed = !!collapsedCategoryNodes[master.id];

              // Accounts directly under master or under any subcategory
              const masterAccs = accounts.filter((a) => a.accountClass === master.accountClass);
              const masterBalance = masterAccs.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

              return (
                <div key={master.id} className="rounded-lg border border-slate-200/90 bg-slate-50/70 overflow-hidden">
                  {/* Master Category Row (Image 1) */}
                  <div className="flex items-center justify-between p-3.5 bg-white border-b border-slate-200/70 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleCategoryNode(master.id)}
                        className="text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        {isMasterCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
                        <span className="font-mono text-primary font-bold">{master.code}</span>
                        <span>{master.name}</span>
                        <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 font-mono py-0">
                          {masterAccs.length} accounts
                        </Badge>
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-mono py-0">
                          {master.accountClass}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {formatCurrency(masterBalance)}
                      </span>

                      {/* Master Actions: Add Sub-Category (+), Edit, Delete */}
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddCategory(master.id)}
                          className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          title={`Add Sub-Category under ${master.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditCategory(master)}
                          className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {!master.isSystem && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(master)}
                            className="h-7 w-7 p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sub-Categories Tree (Image 1) */}
                  {!isMasterCollapsed && (
                    <div className="p-3 pl-6 sm:pl-9 space-y-2 border-t border-slate-100">
                      {subCats.length === 0 ? (
                        <div className="py-2 text-xs text-slate-400 italic">
                          No sub-categories created yet under {master.name}. Click "+" to add one.
                        </div>
                      ) : (
                        subCats.map((sub) => {
                          const subAccs = getAccountsForSubCategory(sub);
                          const subBalance = subAccs.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

                          return (
                            <div
                              key={sub.id}
                              className="rounded-lg border border-slate-200/80 bg-white p-3 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                                  <span className="text-slate-400 font-mono">↳</span>
                                  <span className="font-semibold text-slate-900">{sub.code} {sub.name}</span>
                                  <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 font-mono py-0">
                                    {subAccs.length} accounts
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono font-semibold text-slate-700">
                                    {formatCurrency(subBalance)}
                                  </span>

                                  <div className="inline-flex items-center gap-1">
                                    {/* + Add Account under this category */}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openCreateForCategory(sub)}
                                      className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 font-medium gap-1"
                                      title={`Create account under ${sub.name}`}
                                    >
                                      <Plus className="h-3 w-3" />
                                      <span>Account</span>
                                    </Button>

                                    {/* Add Child Category under this subcategory */}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openAddCategory(sub.id)}
                                      className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                      title="Add Child Sub-Category"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>

                                    {/* Edit Subcategory */}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditCategory(sub)}
                                      className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                      title="Edit Sub-Category"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>

                                    {/* Delete Subcategory (if not system) */}
                                    {!sub.isSystem && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteCategory(sub)}
                                        className="h-7 w-7 p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                        title="Delete Sub-Category"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Accounts under this subcategory */}
                              {subAccs.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 pl-4">
                                  {subAccs.map((acc) => (
                                    <div
                                      key={acc.id}
                                      onClick={() => handleEditAccount(acc)}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-700 hover:bg-slate-100 cursor-pointer"
                                      title="Click to edit account"
                                    >
                                      <span className="font-semibold text-primary">{acc.code}</span>
                                      <span className="font-sans text-slate-800">{acc.name}</span>
                                      {acc.isSystem && <Lock className="h-2.5 w-2.5 text-amber-600" />}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Main Chart of Accounts View */
        <>
          {/* Al Akleel-Style Single-Line Filter Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code or name..."
                  className="pl-9 text-xs h-9"
                />
              </div>

              <select
                aria-label="Filter by Classification"
                value={selectedTreeCategory}
                onChange={(e) => setSelectedTreeCategory(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Account Types</option>
                <option value="ASSET">Asset Accounts</option>
                <option value="LIABILITY">Liability Accounts</option>
                <option value="EQUITY">Equity Ledgers</option>
                <option value="INCOME">Income Ledgers</option>
                <option value="EXPENSE">Expense Ledgers</option>
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedTreeCategory('ALL');
                  setSelectedSubCategory('ALL');
                }}
                className="h-9 text-xs text-slate-600 gap-1.5"
              >
                <span>Refresh</span>
              </Button>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Total: <span className="font-semibold text-slate-800">{filteredAccounts.length}</span> accounts
            </div>
          </div>

          {/* Hierarchical Data Table Grouped by Classification (Asset, Liability, Equity, Revenue, Expense) */}
          <div className="space-y-4">
            {CLASSIFICATION_GROUPS.filter((g) => selectedTreeCategory === 'ALL' || g.id === selectedTreeCategory).map((group) => {
              const groupAccounts = filteredAccounts.filter(
                (a) =>
                  a.accountClass === group.accountClass &&
                  (selectedSubCategory === 'ALL' || a.accountSubClass === selectedSubCategory)
              );
              const isCollapsed = !!collapsedGroups[group.id];
              const totalBalance = groupTotals[group.id] || 0;

              return (
                <div
                  key={group.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs transition-all"
                >
                  {/* Classification Group Header */}
                  <div
                    onClick={() => toggleGroup(group.id)}
                    className="flex cursor-pointer items-center justify-between bg-slate-50/80 px-4 py-3 hover:bg-slate-100/80 transition-colors border-b border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{group.name}</span>
                        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {groupAccounts.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs tabular-nums font-mono font-bold text-slate-800">
                          {formatCurrency(totalBalance)}
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateForGroup(group);
                        }}
                        className="h-7 text-xs text-primary hover:text-primary hover:bg-primary-light font-medium"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <span>Add Account</span>
                      </Button>
                    </div>
                  </div>

                  {/* Table Body */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full min-w-[800px] text-left text-xs tabular-nums">
                        <thead className="border-b border-slate-200 bg-slate-100/90 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          <tr>
                            <th className="px-4 py-2.5 w-28">Account Code</th>
                            <th className="px-4 py-2.5">Name</th>
                            <th className="px-4 py-2.5 w-32">Account Type</th>
                            <th className="px-4 py-2.5 w-40">Sub-Type</th>
                            <th className="px-4 py-2.5 text-right w-36">Current Balance</th>
                            <th className="px-4 py-2.5 text-center w-28">Status</th>
                            <th className="px-4 py-2.5 text-right w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupAccounts.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-4 text-center text-xs text-slate-400">
                                No accounts configured in this classification.
                              </td>
                            </tr>
                          ) : (
                            (() => {
                              const topLevelAccounts = groupAccounts.filter(
                                (a) => !a.parentId || !groupAccounts.some((p) => p.id === a.parentId)
                              );
                              const getChildAccounts = (parentId: string) =>
                                groupAccounts.filter((a) => a.parentId === parentId);

                              const renderAccountRow = (account: Account, depth = 0) => {
                                const isChild = depth > 0;
                                const children = getChildAccounts(account.id);
                                const hasChildren = children.length > 0;
                                const isParentCollapsed = !!collapsedParents[account.id];

                                return (
                                  <tr
                                    key={account.id}
                                    className={cn(
                                      "hover:bg-slate-50/70 transition-colors",
                                      isChild && "bg-slate-50/40 border-l-2 border-primary/40"
                                    )}
                                  >
                                    {/* Account Code */}
                                    <td
                                      className={cn("py-3 font-mono font-bold text-primary", isChild ? "pr-4" : "px-4")}
                                      style={depth > 0 ? { paddingLeft: `${16 + depth * 16}px` } : undefined}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        {isChild && <span className="text-slate-400 text-xs select-none">↳</span>}
                                        <span className="bg-primary-light px-2 py-0.5 rounded border border-primary-border/40">
                                          {account.code}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Name */}
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        {hasChildren && (
                                          <button
                                            type="button"
                                            onClick={() => toggleParent(account.id)}
                                            className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-primary transition-colors"
                                            title={isParentCollapsed ? "Expand sub-accounts" : "Collapse sub-accounts"}
                                          >
                                            {isParentCollapsed ? (
                                              <ChevronRight className="h-3.5 w-3.5 text-primary" />
                                            ) : (
                                              <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                            )}
                                          </button>
                                        )}
                                        <span className={cn("font-semibold", isChild ? "text-slate-800" : "text-slate-900")}>
                                          {account.name}
                                        </span>
                                        {hasChildren && (
                                          <Badge variant="outline" className="text-[10px] text-slate-500 py-0">
                                            {children.length} sub-account{children.length > 1 ? 's' : ''}
                                          </Badge>
                                        )}
                                        {account.isSystem && (
                                          <Badge
                                            variant="secondary"
                                            className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold py-0"
                                            title="System control account (Classification locked)"
                                          >
                                            <Lock className="h-2.5 w-2.5" />
                                            <span>System</span>
                                          </Badge>
                                        )}
                                      </div>
                                      {account.description && (
                                        <p className={cn("text-[11px] text-slate-400 truncate mt-0.5 max-w-sm", isChild && "ml-4")}>
                                          {account.description}
                                        </p>
                                      )}
                                    </td>

                                    {/* Account Type */}
                                    <td className="px-4 py-3 text-slate-600 font-medium">
                                      {account.accountType || account.accountSubClass}
                                    </td>

                                    {/* Sub-Type */}
                                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                                      {account.accountSubType || '-'}
                                    </td>

                                    {/* Current Balance */}
                                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                                      {formatCurrency(account.currentBalance || 0)}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="px-4 py-3 text-center">
                                      {account.isActive !== false ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                          Active
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                                          Inactive
                                        </Badge>
                                      )}
                                    </td>

                                    {/* Action Menu */}
                                    <td className="px-4 py-3 text-right relative">
                                      <div className="inline-flex items-center gap-1 justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditAccount(account)}
                                          className="h-7 px-2 text-xs text-slate-600 hover:text-primary"
                                          title="Edit Name"
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </Button>

                                        {!account.isSystem && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleInactive(account)}
                                            className={`h-7 px-2 text-xs ${
                                              account.isActive !== false
                                                ? 'text-slate-400 hover:text-amber-600'
                                                : 'text-emerald-600 hover:text-emerald-700'
                                            }`}
                                            title={account.isActive !== false ? 'Mark Inactive' : 'Mark Active'}
                                          >
                                            <Power className="h-3.5 w-3.5" />
                                          </Button>
                                        )}

                                        {!account.isSystem && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteAccount(account.id)}
                                            className="h-7 px-2 text-xs text-slate-400 hover:text-rose-600"
                                            title="Delete Custom Sub-Account"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              };

                              const renderAccountNode = (account: Account, depth = 0): React.ReactNode => {
                                const children = getChildAccounts(account.id);
                                const isParentCollapsed = !!collapsedParents[account.id];

                                return (
                                  <React.Fragment key={account.id}>
                                    {renderAccountRow(account, depth)}
                                    {!isParentCollapsed &&
                                      children.map((child) => renderAccountNode(child, depth + 1))}
                                  </React.Fragment>
                                );
                              };

                              return topLevelAccounts.map((parent) => renderAccountNode(parent, 0));
                            })()
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Account Creation / Edit Modal */}
      <AccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={createAccount}
        onUpdate={updateAccount}
        accountToEdit={accountToEdit}
        existingAccounts={accounts}
        defaultClass={targetClass}
        defaultSubClass={targetSubClass}
        defaultHeaderCategoryId={selectedHeaderCategoryForNewAccount}
      />

      {/* Category Creation / Edit Modal */}
      <CategoryModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        categoryToEdit={categoryToEdit}
        defaultParentId={categoryParentId}
        onSuccess={() => {
          refreshCategories();
          toast.success('Category updated successfully');
        }}
      />
    </div>
  );
}
