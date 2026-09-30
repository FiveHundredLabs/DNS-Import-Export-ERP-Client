import { useState, useMemo } from 'react';
import { useFinanceLedger } from '../hooks/useFinanceLedger';
import { Account, AccountClass, AccountSubClass } from '../api/types';
import { AccountModal } from '../components/AccountModal';
import { formatCurrency } from '../../../utils/formatters';
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
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';

interface CategoryGroup {
  id: string;
  name: string;
  accountClass: AccountClass;
  subClass?: AccountSubClass;
  description: string;
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'CURRENT_ASSET',
    name: 'Current Assets',
    accountClass: 'ASSET',
    subClass: 'CURRENT_ASSET',
    description: 'Cash, bank reserves, inventory, and short-term receivables',
  },
  {
    id: 'NON_CURRENT_ASSET',
    name: 'Non-Current Assets (Fixed Assets)',
    accountClass: 'ASSET',
    subClass: 'NON_CURRENT_ASSET',
    description: 'Vehicles, machinery, long-term investments, and office equipment',
  },
  {
    id: 'CURRENT_LIABILITY',
    name: 'Current Liabilities',
    accountClass: 'LIABILITY',
    subClass: 'CURRENT_LIABILITY',
    description: 'Accounts payable, VAT collected payable, and commissions due',
  },
  {
    id: 'NON_CURRENT_LIABILITY',
    name: 'Long-Term Liabilities',
    accountClass: 'LIABILITY',
    subClass: 'NON_CURRENT_LIABILITY',
    description: 'Bank term loans and long-term lease obligations',
  },
  {
    id: 'EQUITY',
    name: "Owner's Equity & Reserves",
    accountClass: 'EQUITY',
    subClass: 'EQUITY',
    description: 'Shareholder paid-in capital and cumulative retained earnings',
  },
  {
    id: 'REVENUE',
    name: 'Operating Revenue (Sales)',
    accountClass: 'INCOME',
    subClass: 'REVENUE',
    description: 'Gross sales income and wholesale revenues',
  },
  {
    id: 'DIRECT_COST',
    name: 'Direct Costs (COGS)',
    accountClass: 'EXPENSE',
    subClass: 'DIRECT_COST',
    description: 'Direct procurement and landed cost of goods sold',
  },
  {
    id: 'OPERATING_EXPENSE',
    name: 'Operating Expenses (Overheads)',
    accountClass: 'EXPENSE',
    subClass: 'OPERATING_EXPENSE',
    description: 'Salaries, vehicle fuel, utilities, and commercial overheads',
  },
];

export function ChartOfAccountsPage() {
  const { accounts, loading, createAccount, deleteAccount } = useFinanceLedger();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [targetClass, setTargetClass] = useState<AccountClass>('EXPENSE');
  const [targetSubClass, setTargetSubClass] = useState<AccountSubClass>('OPERATING_EXPENSE');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const openCreateForGroup = (cat: CategoryGroup) => {
    setTargetClass(cat.accountClass);
    setTargetSubClass(cat.subClass || 'OPERATING_EXPENSE');
    setModalOpen(true);
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
    for (const group of CATEGORY_GROUPS) {
      const groupAccs = accounts.filter((a) => a.accountSubClass === group.subClass);
      totals[group.id] = groupAccs.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
    }
    return totals;
  }, [accounts]);

  const totalSystemAccounts = accounts.filter((a) => a.isSystem).length;
  const totalCustomAccounts = accounts.filter((a) => !a.isSystem).length;

  return (
    <div className="space-y-6">
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
            Standard hierarchical account structure with non-deletable system control accounts and custom sub-ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setTargetClass('EXPENSE');
              setTargetSubClass('OPERATING_EXPENSE');
              setModalOpen(true);
            }}
            className="gap-2 bg-primary hover:bg-primary-hover font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Create Sub-Account</span>
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
            <span className="text-xs text-amber-600 font-medium">Non-deletable Defaults</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custom Sub-Accounts</span>
            <Layers className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-900 tabular-nums">{totalCustomAccounts}</span>
            <span className="text-xs text-emerald-600 font-medium">Finance Created</span>
          </div>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Primary Bank Float</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-slate-900 tabular-nums">
              {formatCurrency(accounts.find((a) => a.code === '1010')?.currentBalance || 0)}
            </span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
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
          Showing <span className="font-semibold text-slate-800">{filteredAccounts.length}</span> accounts across 8
          categories
        </div>
      </div>

      {/* Hierarchical Tree Sections */}
      <div className="space-y-4">
        {CATEGORY_GROUPS.map((group) => {
          const groupAccounts = filteredAccounts.filter((a) => a.accountSubClass === group.subClass);
          const isCollapsed = !!collapsedGroups[group.id];
          const totalBalance = groupTotals[group.id] || 0;

          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all"
            >
              {/* Group Header */}
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
                    <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">{group.name}</span>
                    <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {groupAccounts.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs tabular-nums font-semibold text-slate-800">
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
                    <span>Add Sub-Account</span>
                  </Button>
                </div>
              </div>

              {/* Group Account Table */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {groupAccounts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No accounts configured in this category.
                    </div>
                  ) : (
                    groupAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between px-6 py-3 text-xs hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                          <span className="tabular-nums font-semibold text-primary-text bg-primary-light px-2 py-0.5 rounded border border-primary-border/40 shrink-0">
                            {account.code}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 truncate">{account.name}</span>
                              {account.isSystem && (
                                <Badge
                                  variant="secondary"
                                  className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold"
                                  title="Non-deletable default system account"
                                >
                                  <Lock className="h-2.5 w-2.5" />
                                  <span>System Locked</span>
                                </Badge>
                              )}
                            </div>
                            {account.description && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{account.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-right">
                            <span className="tabular-nums text-xs font-semibold text-slate-900">
                              {formatCurrency(account.currentBalance)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 w-16 justify-end">
                            {account.isSystem ? (
                              <span
                                className="text-slate-400 cursor-not-allowed p-1.5"
                                title="Default system accounts cannot be edited or deleted"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => deleteAccount(account.id)}
                                className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                title="Delete custom sub-account"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Account Creation Modal */}
      <AccountModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={createAccount}
        existingAccounts={accounts}
        defaultClass={targetClass}
        defaultSubClass={targetSubClass}
      />
    </div>
  );
}
