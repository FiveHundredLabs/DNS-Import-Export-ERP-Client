import React, { useState, useMemo } from 'react';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { Account, AccountClass, AccountSubClass } from '../api/types';
import { AccountModal } from '../components/AccountModal';
import { OpeningBalanceWizard } from '../components/OpeningBalanceWizard';
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
  Power,
  Sparkles,
  X,
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

export function ChartOfAccountsPage() {
  const {
    accounts,
    createAccount,
    updateAccount,
    deleteAccount,
    postJournalEntry,
  } = useFinanceLedger();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [targetClass, setTargetClass] = useState<AccountClass>('EXPENSE');
  const [targetSubClass, setTargetSubClass] = useState<AccountSubClass>('OPERATING_EXPENSE');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

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

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleParent = (parentId: string) => {
    setCollapsedParents((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const openCreateForGroup = (cat: ClassificationGroup) => {
    setAccountToEdit(null);
    setTargetClass(cat.accountClass);
    if (cat.accountClass === 'ASSET') setTargetSubClass('CURRENT_ASSET');
    else if (cat.accountClass === 'LIABILITY') setTargetSubClass('CURRENT_LIABILITY');
    else if (cat.accountClass === 'EQUITY') setTargetSubClass('EQUITY');
    else if (cat.accountClass === 'INCOME') setTargetSubClass('REVENUE');
    else setTargetSubClass('OPERATING_EXPENSE');
    setModalOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setAccountToEdit(account);
    setTargetClass(account.accountClass);
    setTargetSubClass(account.accountSubClass);
    setOpenActionMenuId(null);
    setModalOpen(true);
  };

  const handleToggleInactive = async (account: Account) => {
    setOpenActionMenuId(null);
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

  const totalSystemAccounts = accounts.filter((a) => a.isSystem).length;
  const totalCustomAccounts = accounts.filter((a) => !a.isSystem).length;

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

  return (
    <div className="space-y-6">
      {/* 2.2 Opening Balance Setup Banner (hidden once completed or SETUP-OB-INIT locked) */}
      {!isObInitLocked && (
        <div className="rounded-xl border border-primary-border bg-gradient-to-r from-primary-light via-white to-sky-50 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-50">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-primary text-white shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                System Setup: Enter Opening Balances
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Initialize starting balances for your Asset, Liability, and Equity ledgers. Any difference is auto-allocated to 3020 Opening Balance Equity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              onClick={() => setShowWizard(true)}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
            >
              Start Setup Wizard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                try {
                  localStorage.setItem(OPENING_BALANCE_STORAGE_KEY, 'true');
                } catch {}
                setOpeningBalancesCompleted(true);
              }}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
              title="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Chart of Accounts</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Double-Entry General Ledger
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Hierarchical account structure grouped by classification with locked system control accounts and custom sub-ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isObInitLocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWizard(true)}
              className="gap-1.5 text-xs text-slate-700"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Opening Balances</span>
            </Button>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-xs text-emerald-700 bg-emerald-50 border-emerald-200 py-1.5 px-2.5 font-medium">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Opening Balances Locked (SETUP-OB-INIT)</span>
            </Badge>
          )}

          <Button
            size="sm"
            onClick={() => {
              setAccountToEdit(null);
              setTargetClass('EXPENSE');
              setTargetSubClass('OPERATING_EXPENSE');
              setModalOpen(true);
            }}
            className="gap-2 bg-primary hover:bg-primary-hover font-medium text-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Account</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Accounts</span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">{accounts.length}</span>
            <span className="text-xs text-slate-500">Active GL Accounts</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">System Locked</span>
            <Lock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">{totalSystemAccounts}</span>
            <span className="text-xs text-amber-600 font-medium">Non-deletable Control</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custom Accounts</span>
            <Layers className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">{totalCustomAccounts}</span>
            <span className="text-xs text-emerald-600 font-medium">User Created</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Primary Bank Float</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-slate-900 tabular-nums font-mono">
              {formatCurrency(accounts.find((a) => a.code === '1010')?.currentBalance || 0)}
            </span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account code, name, or description..."
            className="pl-9 text-xs"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filteredAccounts.length}</span> accounts across 5
          classifications
        </div>
      </div>

      {/* Hierarchical Data Table Grouped by Classification (Asset, Liability, Equity, Revenue, Expense) */}
      <div className="space-y-4">
        {CLASSIFICATION_GROUPS.map((group) => {
          const groupAccounts = filteredAccounts.filter((a) => a.accountClass === group.accountClass);
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

              {/* Table Body with Required Columns:
                  Account Code, Name, Account Type, Sub-Type, Current Balance (Read-Only), Status Badge (Active/Inactive), Action Menu */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
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

                                {/* Current Balance (Read-Only, right-aligned) */}
                                <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                                  {formatCurrency(account.currentBalance || 0)}
                                </td>

                                {/* Status Badge (Active/Inactive) */}
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

                                {/* Action Menu (per row): Edit Name & Toggle Inactive (hidden for system accounts) */}
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
      />
    </div>
  );
}
