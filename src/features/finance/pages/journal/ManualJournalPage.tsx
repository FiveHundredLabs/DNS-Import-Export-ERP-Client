import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { financeRepository } from '../../api';
import { JournalEntry, JournalEntryStatus } from '../../api/types';
import { CurrencyInput } from '../../components/CurrencyInput';
import { DoubleEntryHoverBadge } from '../../components/DoubleEntryHoverBadge';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../utils/cn';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Card } from '../../../../components/ui/card';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import { MOCK_CUSTOMERS } from '../../../../mock/mockCustomers';
import Decimal from 'decimal.js';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from '../../../../components/ui/dialog';
import {
  Plus,
  Trash2,
  Bookmark,
  BookmarkPlus,
  Search,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Lock,
  RotateCcw,
  Zap,
  Receipt,
  Building2,
  ArrowRight,
  Info,
  Clock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ManualJournalLine {
  id: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface JournalTemplateLine {
  accountCode: string;
  accountName: string;
  description: string;
  isDebit: boolean;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface JournalTemplate {
  id: string;
  name: string;
  category?: string;
  description: string;
  memo: string;
  lines: JournalTemplateLine[];
  isCustom?: boolean;
  createdAt?: string;
}

const TEMPLATES_STORAGE_KEY = 'dns_finance_journal_templates';

function getStoredTemplates(): JournalTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredTemplates(templates: JournalTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to save templates to localStorage', err);
  }
}

const TEMPLATES: JournalTemplate[] = [
  {
    id: 'depreciation',
    name: 'Monthly Depreciation',
    category: 'Fixed Assets & Depreciation',
    description: 'Fixed asset straight-line depreciation allocation',
    memo: 'Monthly straight-line depreciation on plant and vehicles',
    lines: [
      {
        accountCode: '6010',
        accountName: 'Depreciation Expense',
        description: 'Monthly depreciation expense on capital assets',
        isDebit: true,
      },
      {
        accountCode: '1510',
        accountName: 'Accumulated Depreciation / Fixed Assets',
        description: 'Accumulated depreciation contra-asset reserve',
        isDebit: false,
      },
    ],
  },
  {
    id: 'utilities',
    name: 'Office Utilities Accrual',
    category: 'Accruals & Provisions',
    description: 'Showroom electricity, water and telecoms accrual',
    memo: 'Monthly utilities and telecoms accrual',
    lines: [
      {
        accountCode: '6030',
        accountName: 'Office Rent & Utilities',
        description: 'Office electricity & internet bill',
        isDebit: true,
      },
      {
        accountCode: '2010',
        accountName: 'Accounts Payable',
        description: 'Accrued trade payable to CEB / SLT',
        isDebit: false,
      },
    ],
  },
  {
    id: 'payroll',
    name: 'Payroll & Statutory Accrual',
    category: 'Payroll & Statutory',
    description: 'Staff salaries, EPF 12% and ETF 3% accruals',
    memo: 'Monthly staff salaries and statutory contributions accrual',
    lines: [
      {
        accountCode: '6010',
        accountName: 'Commission / Staff Expense',
        description: 'Staff monthly gross compensation',
        isDebit: true,
      },
      {
        accountCode: '2030',
        accountName: 'Commission / Payroll Payable',
        description: 'Net salaries and compensation payable',
        isDebit: false,
      },
    ],
  },
  {
    id: 'amortization',
    name: 'Prepaid Expense Amortization',
    category: 'Prepayments & Amortization',
    description: 'Annual corporate insurance policy monthly amortization',
    memo: 'Monthly amortization of prepaid insurance',
    lines: [
      {
        accountCode: '6030',
        accountName: 'Operating Expense (Insurance)',
        description: 'Insurance expense portion for current month',
        isDebit: true,
      },
      {
        accountCode: '1010',
        accountName: 'Bank Account (Prepaid Cash)',
        description: 'Reduction of prepaid insurance asset',
        isDebit: false,
      },
    ],
  },
];

const DEFAULT_LINES: ManualJournalLine[] = [
  { id: 'line-1', accountId: '', description: '', debit: 0, credit: 0 },
  { id: 'line-2', accountId: '', description: '', debit: 0, credit: 0 },
];

export function ManualJournalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const {
    accounts,
    suppliers,
    journals,
    postJournalEntry,
    approveJournalEntry,
    voidJournalEntry,
    fetchAccounts,
  } = useFinanceLedger();

  const journalIdParam = searchParams.get('id');
  const [loadedJournal, setLoadedJournal] = useState<JournalEntry | null>(null);

  // Header Inputs: Journal Date, Reference Number, Memo/Description
  const [journalDate, setJournalDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [memo, setMemo] = useState('');

  // Line items
  const [lines, setLines] = useState<ManualJournalLine[]>(DEFAULT_LINES);

  // Sidebar Templates Collapsed state
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [customTemplates, setCustomTemplates] = useState<JournalTemplate[]>(() => getStoredTemplates());
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL');

  // Create Template Dialog State
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('Accruals & Provisions');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateMemo, setNewTemplateMemo] = useState('');
  const [newTemplateLines, setNewTemplateLines] = useState<{
    id: string;
    accountId: string;
    description: string;
    isDebit: boolean;
  }[]>([
    { id: 'nl-1', accountId: '', description: '', isDebit: true },
    { id: 'nl-2', accountId: '', description: '', isDebit: false },
  ]);

  const [submitting, setSubmitting] = useState(false);

  // Role Governance: Only Finance Managers, Managers, and Directors can approve/post directly
  const isFinanceManager =
    !currentUser || ['FINANCE_MANAGER', 'MANAGER', 'DIRECTOR'].includes(currentUser.role);

  // Load existing journal if ID is passed
  useEffect(() => {
    if (journalIdParam) {
      financeRepository.getJournalEntryById(journalIdParam).then((je) => {
        if (je) {
          setLoadedJournal(je);
          setJournalDate(je.date);
          setReferenceNumber(je.reference || '');
          setMemo(je.description);
          setLines(
            je.lines.map((l) => ({
              id: l.id,
              accountId: l.accountId,
              description: l.description || '',
              debit: l.debit,
              credit: l.credit,
              customerId: l.customerId,
              customerName: l.customerName,
              supplierId: l.supplierId,
              supplierName: l.supplierName,
            }))
          );
        }
      });
    }
  }, [journalIdParam]);

  const isAuditLocked = Boolean(
    loadedJournal && (loadedJournal.status === 'POSTED' || loadedJournal.status === 'CLEARED')
  );
  const isPendingApproval = Boolean(loadedJournal && loadedJournal.status === 'PENDING_APPROVAL');
  const isAuthorizedForVoid = isFinanceManager;

  // Active accounts
  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.isActive !== false);
  }, [accounts]);

  const handleAddLine = () => {
    if (isAuditLocked) return;
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        accountId: '',
        description: '',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (isAuditLocked) return;
    if (lines.length <= 2) {
      toast.error('A journal entry must contain at least 2 lines.');
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof ManualJournalLine, val: any) => {
    if (isAuditLocked) return;
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;

        // Rule: A single row cannot have values in both Debit and Credit columns simultaneously.
        if (field === 'debit') {
          return {
            ...l,
            debit: val,
            credit: val > 0 ? 0 : l.credit,
          };
        }
        if (field === 'credit') {
          return {
            ...l,
            credit: val,
            debit: val > 0 ? 0 : l.debit,
          };
        }

        // When account changes, sync default description or clear tags if no longer 1020/2010
        if (field === 'accountId') {
          const acc = accounts.find((a) => a.id === val);
          return {
            ...l,
            accountId: val,
            customerId: acc?.code === '1020' ? l.customerId : undefined,
            customerName: acc?.code === '1020' ? l.customerName : undefined,
            supplierId: acc?.code === '2010' ? l.supplierId : undefined,
            supplierName: acc?.code === '2010' ? l.supplierName : undefined,
          };
        }

        return { ...l, [field]: val };
      })
    );
  };

  const handleResetForm = () => {
    setLoadedJournal(null);
    setJournalDate(new Date().toISOString().slice(0, 10));
    setReferenceNumber('');
    setMemo('');
    setLines(DEFAULT_LINES);
  };

  // Smart Auto-Balance Handler using Decimal.js
  const handleAutoBalance = () => {
    const diff = totalDebit - totalCredit;
    if (Math.abs(diff) < 0.001) return;

    const emptyRow = lines.find((l) => l.debit === 0 && l.credit === 0);
    if (diff > 0) {
      if (emptyRow) {
        handleUpdateLine(emptyRow.id, 'credit', diff);
      } else {
        setLines((prev) => [
          ...prev,
          {
            id: `line-${Date.now()}`,
            accountId: '',
            description: 'Balancing credit adjustment',
            debit: 0,
            credit: diff,
          },
        ]);
      }
      toast.info(`Auto-balanced with Credit of ${formatCurrency(diff)}`);
    } else {
      const absDiff = Math.abs(diff);
      if (emptyRow) {
        handleUpdateLine(emptyRow.id, 'debit', absDiff);
      } else {
        setLines((prev) => [
          ...prev,
          {
            id: `line-${Date.now()}`,
            accountId: '',
            description: 'Balancing debit adjustment',
            debit: absDiff,
            credit: 0,
          },
        ]);
      }
      toast.info(`Auto-balanced with Debit of ${formatCurrency(absDiff)}`);
    }
  };

  // One-Click Presets from the merged Finance Desk
  const applyPreset = async (type: 'SUPPLIER_PAYMENT' | 'ASSET_PURCHASE' | 'OFFICE_OVERHEAD') => {
    if (isAuditLocked) return;
    let currentAccounts = accounts;
    if (currentAccounts.length === 0) {
      currentAccounts = await fetchAccounts();
    }
    const bankAcc = currentAccounts.find((a) => a.code === '1010');
    const apAcc = currentAccounts.find((a) => a.code === '2010');
    const assetAcc =
      currentAccounts.find((a) => a.code === '1510') ||
      currentAccounts.find((a) => a.accountSubClass === 'NON_CURRENT_ASSET');
    const overheadAcc =
      currentAccounts.find((a) => a.code === '6030') ||
      currentAccounts.find((a) => a.accountSubClass === 'OPERATING_EXPENSE');

    if (!bankAcc) {
      toast.error('Bank Account (1010) not found in Chart of Accounts');
      return;
    }

    if (type === 'SUPPLIER_PAYMENT') {
      if (!apAcc) return;
      const defaultSupplier = suppliers[0];
      setMemo('Settlement of vendor trade payable invoice');
      setReferenceNumber(`PAY-SUP-${Math.floor(100 + Math.random() * 900)}`);
      setLines([
        {
          id: 'line-preset-1',
          accountId: apAcc.id,
          description: 'Reduce Accounts Payable for supplier bill',
          debit: 250000,
          credit: 0,
          supplierId: defaultSupplier ? defaultSupplier.id : undefined,
          supplierName: defaultSupplier ? defaultSupplier.name : undefined,
        },
        {
          id: 'line-preset-2',
          accountId: bankAcc.id,
          description: 'Bank payment remittance transfer',
          debit: 0,
          credit: 250000,
        },
      ]);
      toast.info('Applied preset: Pay Supplier Bill (Dr 2010 A/P / Cr 1010 Bank)');
    } else if (type === 'ASSET_PURCHASE') {
      if (!assetAcc) return;
      setMemo('Purchase of capital equipment / delivery van asset');
      setReferenceNumber(`CAPEX-${Math.floor(1000 + Math.random() * 9000)}`);
      setLines([
        {
          id: 'line-preset-1',
          accountId: assetAcc.id,
          description: 'Capitalize office equipment / vehicle asset',
          debit: 450000,
          credit: 0,
        },
        {
          id: 'line-preset-2',
          accountId: bankAcc.id,
          description: 'Bank transfer settlement for capital purchase',
          debit: 0,
          credit: 450000,
        },
      ]);
      toast.info('Applied preset: Buy Company Asset (Dr 1510 Fixed Asset / Cr 1010 Bank)');
    } else if (type === 'OFFICE_OVERHEAD') {
      if (!overheadAcc) return;
      setMemo('Monthly office lease, utilities, and general facility overhead');
      setReferenceNumber(`EXP-RENT-${new Date().toISOString().slice(0, 7)}`);
      setLines([
        {
          id: 'line-preset-1',
          accountId: overheadAcc.id,
          description: 'Monthly office rent & utility expenses',
          debit: 120000,
          credit: 0,
        },
        {
          id: 'line-preset-2',
          accountId: bankAcc.id,
          description: 'Bank transfer payment for facility overhead',
          debit: 0,
          credit: 120000,
        },
      ]);
      toast.info('Applied preset: Record Office Overhead (Dr 6030 Operating Expense / Cr 1010 Bank)');
    }
  };

  // Combine custom templates + system templates
  const allTemplates = useMemo(() => {
    return [...customTemplates, ...TEMPLATES];
  }, [customTemplates]);

  // Filter templates by search input and category chip
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((tmpl) => {
      // Category filter
      if (templateCategoryFilter !== 'ALL') {
        if (templateCategoryFilter === 'CUSTOM' && !tmpl.isCustom) return false;
        if (templateCategoryFilter !== 'CUSTOM' && tmpl.category !== templateCategoryFilter) return false;
      }

      // Search term filter
      if (!templateSearch.trim()) return true;
      const q = templateSearch.toLowerCase().trim();
      const matchName = tmpl.name.toLowerCase().includes(q);
      const matchDesc = tmpl.description.toLowerCase().includes(q);
      const matchMemo = tmpl.memo.toLowerCase().includes(q);
      const matchCat = tmpl.category?.toLowerCase().includes(q);
      const matchLines = tmpl.lines.some(
        (l) =>
          l.accountCode.toLowerCase().includes(q) ||
          l.accountName.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );

      return matchName || matchDesc || matchMemo || matchCat || matchLines;
    });
  }, [allTemplates, templateSearch, templateCategoryFilter]);

  // Apply Template to Current Journal
  const handleApplyTemplate = (tmpl: JournalTemplate) => {
    if (isAuditLocked) return;
    setMemo(tmpl.memo);
    const newLines: ManualJournalLine[] = tmpl.lines.map((tl, idx) => {
      const matched =
        accounts.find((a) => a.code === tl.accountCode) ||
        accounts.find((a) => a.name.toLowerCase().includes(tl.accountName.toLowerCase())) ||
        accounts[idx] ||
        accounts[0];

      const isAp = matched?.code === '2010' || tl.accountCode === '2010';
      const isAr = matched?.code === '1020' || tl.accountCode === '1020';

      return {
        id: `line-tmpl-${idx}-${Date.now()}`,
        accountId: matched ? matched.id : '',
        description: tl.description,
        debit: 0,
        credit: 0,
        supplierId: isAp ? (tl.supplierId || (suppliers[0] ? suppliers[0].id : undefined)) : undefined,
        supplierName: isAp ? (tl.supplierName || (suppliers[0] ? suppliers[0].name : undefined)) : undefined,
        customerId: isAr ? (tl.customerId || (MOCK_CUSTOMERS[0] ? MOCK_CUSTOMERS[0].id : undefined)) : undefined,
        customerName: isAr ? (tl.customerName || (MOCK_CUSTOMERS[0] ? MOCK_CUSTOMERS[0].name : undefined)) : undefined,
      };
    });

    setLines(newLines);
    toast.success(`Applied template: "${tmpl.name}". Enter line amounts to balance.`);
  };

  // Open Create Template Modal
  const handleOpenCreateTemplate = (fromCurrentVoucher = false) => {
    if (fromCurrentVoucher) {
      setNewTemplateName(memo ? `${memo} Template` : 'Custom Journal Template');
      setNewTemplateCategory('General Adjustments');
      setNewTemplateDescription(memo || 'Custom reusable journal entry voucher');
      setNewTemplateMemo(memo || '');

      const activeLines = lines.filter((l) => l.accountId);
      if (activeLines.length >= 2) {
        setNewTemplateLines(
          activeLines.map((l, idx) => ({
            id: `nl-${idx}-${Date.now()}`,
            accountId: l.accountId,
            description: l.description || '',
            isDebit: Number(l.debit) > 0 || (Number(l.credit) === 0 && idx === 0),
          }))
        );
      } else {
        setNewTemplateLines([
          { id: `nl-1-${Date.now()}`, accountId: lines[0]?.accountId || '', description: lines[0]?.description || '', isDebit: true },
          { id: `nl-2-${Date.now()}`, accountId: lines[1]?.accountId || '', description: lines[1]?.description || '', isDebit: false },
        ]);
      }
    } else {
      setNewTemplateName('');
      setNewTemplateCategory('Accruals & Provisions');
      setNewTemplateDescription('');
      setNewTemplateMemo('');
      setNewTemplateLines([
        { id: `nl-1-${Date.now()}`, accountId: '', description: '', isDebit: true },
        { id: `nl-2-${Date.now()}`, accountId: '', description: '', isDebit: false },
      ]);
    }
    setIsCreateTemplateOpen(true);
  };

  const handleAddTemplateLine = () => {
    setNewTemplateLines((prev) => [
      ...prev,
      {
        id: `nl-${prev.length + 1}-${Date.now()}`,
        accountId: '',
        description: '',
        isDebit: prev.length % 2 === 0,
      },
    ]);
  };

  const handleRemoveTemplateLine = (id: string) => {
    if (newTemplateLines.length <= 2) {
      toast.error('Templates must include at least two journal lines (Dr and Cr).');
      return;
    }
    setNewTemplateLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleToggleLineDebit = (id: string) => {
    setNewTemplateLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isDebit: !l.isDebit } : l))
    );
  };

  const handleLineAccountChange = (id: string, accountId: string) => {
    setNewTemplateLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, accountId } : l))
    );
  };

  const handleLineDescriptionChange = (id: string, description: string) => {
    setNewTemplateLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, description } : l))
    );
  };

  const handleSaveTemplate = () => {
    const trimmedName = newTemplateName.trim();
    if (!trimmedName) {
      toast.error('Template name is required.');
      return;
    }

    if (newTemplateLines.length < 2) {
      toast.error('Template must have at least 2 lines.');
      return;
    }

    const missingAccount = newTemplateLines.some((l) => !l.accountId);
    if (missingAccount) {
      toast.error('Please select a General Ledger account for all template lines.');
      return;
    }

    const hasDebit = newTemplateLines.some((l) => l.isDebit);
    const hasCredit = newTemplateLines.some((l) => !l.isDebit);
    if (!hasDebit || !hasCredit) {
      toast.error('Template must include at least one Debit (Dr) line and one Credit (Cr) line.');
      return;
    }

    const templateLines: JournalTemplate['lines'] = newTemplateLines.map((l) => {
      const acc = accounts.find((a) => a.id === l.accountId);
      const isAp = acc?.code === '2010';
      const isAr = acc?.code === '1020';
      return {
        accountCode: acc?.code || '0000',
        accountName: acc?.name || 'General Ledger Account',
        description: l.description || (l.isDebit ? 'Debit allocation' : 'Credit allocation'),
        isDebit: l.isDebit,
        supplierId: isAp && suppliers[0] ? suppliers[0].id : undefined,
        supplierName: isAp && suppliers[0] ? suppliers[0].name : undefined,
        customerId: isAr && MOCK_CUSTOMERS[0] ? MOCK_CUSTOMERS[0].id : undefined,
        customerName: isAr && MOCK_CUSTOMERS[0] ? MOCK_CUSTOMERS[0].name : undefined,
      };
    });

    const newTemplate: JournalTemplate = {
      id: `tmpl-custom-${Date.now()}`,
      name: trimmedName,
      category: newTemplateCategory,
      description: newTemplateDescription.trim() || trimmedName,
      memo: newTemplateMemo.trim() || trimmedName,
      lines: templateLines,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    const updated = [newTemplate, ...customTemplates];
    setCustomTemplates(updated);
    saveStoredTemplates(updated);
    setIsCreateTemplateOpen(false);
    toast.success(`Journal template "${trimmedName}" created successfully!`);
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    saveStoredTemplates(updated);
    toast.success(`Deleted template "${name}".`);
  };

  // Compute Total Debits and Total Credits using decimal.js
  const { totalDebit, totalCredit, difference, differenceAbs } = useMemo(() => {
    let deb = new Decimal(0);
    let cred = new Decimal(0);

    for (const l of lines) {
      if (l.debit) deb = deb.plus(new Decimal(l.debit));
      if (l.credit) cred = cred.plus(new Decimal(l.credit));
    }

    const diff = deb.minus(cred);
    return {
      totalDebit: deb.toNumber(),
      totalCredit: cred.toNumber(),
      difference: diff.toNumber(),
      differenceAbs: diff.abs().toNumber(),
    };
  }, [lines]);

  const isBalanced = useMemo(() => {
    if (totalDebit <= 0 && totalCredit <= 0) return false;
    return Math.abs(difference) <= 0.001;
  }, [totalDebit, totalCredit, difference]);

  // Sub-ledger Control Account Rule: Check if 1020 or 2010 lines are missing customer/supplier tags
  const missingTagLines = useMemo(() => {
    return lines.filter((l) => {
      const acc = accounts.find((a) => a.id === l.accountId);
      if (!acc) return false;
      if (acc.code === '1020' && !l.customerId && !l.customerName) return true;
      if (acc.code === '2010' && !l.supplierId && !l.supplierName) return true;
      return false;
    });
  }, [lines, accounts]);

  const hasMissingEntityTags = missingTagLines.length > 0;

  // Form validity
  const isFormValid = useMemo(() => {
    if (!journalDate || !memo.trim()) return false;
    if (lines.length < 2) return false;
    const allAccountsSelected = lines.every((l) => Boolean(l.accountId));
    if (!allAccountsSelected) return false;
    if (hasMissingEntityTags) return false;
    return isBalanced;
  }, [journalDate, memo, lines, isBalanced, hasMissingEntityTags]);

  // Maker-Checker Submission: Post directly (Manager) or Save Draft / Submit for Approval (Clerk)
  const handleSaveEntry = async (status: JournalEntryStatus = 'POSTED') => {
    if (!isFormValid && (status === 'POSTED' || status === 'PENDING_APPROVAL')) {
      toast.error('Validation Error: Debits must equal Credits and sub-ledger tags must be selected.');
      return;
    }
    if (!memo.trim()) {
      toast.error('Voucher description/memo is required.');
      return;
    }

    try {
      setSubmitting(true);
      const entry = await postJournalEntry({
        date: journalDate,
        reference: referenceNumber.trim() || undefined,
        description: memo.trim(),
        source: 'MANUAL',
        status,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(new Decimal(l.debit || 0).toFixed(2)),
          credit: Number(new Decimal(l.credit || 0).toFixed(2)),
          description: l.description.trim() || undefined,
          customerId: l.customerId,
          customerName: l.customerName,
          supplierId: l.supplierId,
          supplierName: l.supplierName,
        })),
      });

      if (status === 'POSTED') {
        toast.success(`Journal Voucher ${entry.entryNumber} successfully committed to the General Ledger!`);
      } else if (status === 'PENDING_APPROVAL') {
        toast.success(`Journal Voucher ${entry.entryNumber} submitted for Finance Manager review!`);
      } else {
        toast.success(`Draft Voucher ${entry.entryNumber} saved.`);
      }

      handleResetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save journal voucher');
    } finally {
      setSubmitting(false);
    }
  };

  // Manager Approval for Pending Entries
  const handleApprovePending = async () => {
    if (!loadedJournal) return;
    try {
      setSubmitting(true);
      await approveJournalEntry(loadedJournal.id, currentUser?.name || 'Finance Manager');
      setLoadedJournal((prev) => (prev ? { ...prev, status: 'POSTED' } : null));
      toast.success(`Journal Entry ${loadedJournal.entryNumber} approved and posted to General Ledger!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Void / Reversal
  const handleVoidJournal = async () => {
    if (!loadedJournal) return;
    try {
      setSubmitting(true);
      await voidJournalEntry(loadedJournal.id);
      handleResetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to void journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Active Debit / Credit lines for live narrative
  const activeDebitLines = lines.filter((l) => l.accountId && l.debit > 0);
  const activeCreditLines = lines.filter((l) => l.accountId && l.credit > 0);
  const hasActiveEntries = activeDebitLines.length > 0 || activeCreditLines.length > 0;

  // Reversal impact lines for voiding a posted journal
  const reversalImpactLines = useMemo(() => {
    if (!loadedJournal || loadedJournal.status !== 'POSTED') return [];
    return loadedJournal.lines.map((l) => {
      // Reversing an entry inverts Debit & Credit
      const isOriginalDebit = l.debit > 0;
      return {
        accountCode: l.accountCode || 'GL',
        accountName: l.accountName || 'Account',
        type: isOriginalDebit ? ('CREDIT' as const) : ('DEBIT' as const),
        amount: isOriginalDebit ? l.debit : l.credit,
        note: `Reverses ${isOriginalDebit ? 'debit' : 'credit'} from ${loadedJournal.entryNumber}`,
      };
    });
  }, [loadedJournal]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Manual Journal Entry
            </h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-xs">
              Universal Journal Desk
            </Badge>
            {isAuditLocked && (
              <Badge
                variant={loadedJournal?.status === 'VOIDED' ? 'destructive' : 'secondary'}
                className="text-xs font-mono"
              >
                {loadedJournal?.status === 'VOIDED' ? 'VOIDED' : 'AUDIT LOCKED (POSTED)'}
              </Badge>
            )}
            {isPendingApproval && (
              <Badge variant="outline" className="text-xs font-mono bg-amber-50 text-amber-700 border-amber-300">
                PENDING APPROVAL (MAKER-CHECKER)
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Universal double-entry voucher screen for manual adjustments, accruals, overheads, and Maker-Checker approvals.
          </p>
        </div>

        {!isAuditLocked && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateTemplate(true)}
              className="text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
              title="Save currently configured lines as a template"
            >
              <BookmarkPlus className="h-3.5 w-3.5 text-primary" />
              <span>Save as Template</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateTemplate(false)}
              className="text-xs gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>New Template</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
              className="text-xs gap-1.5 shadow-2xs"
            >
              <Bookmark className="h-3.5 w-3.5 text-primary" />
              <span>{isTemplatesOpen ? 'Hide Templates' : 'Templates Library'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Quick Journal Presets Bar (Merged from The Finance Desk) */}
      {!isAuditLocked && (
        <Card className="p-3 bg-gradient-to-r from-primary-light/60 via-white to-slate-50 border-slate-200 shadow-2xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-bold text-slate-800">Quick Journal Presets:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => applyPreset('SUPPLIER_PAYMENT')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-primary-border hover:bg-primary-light/60 hover:text-primary-text transition-colors"
                title="Dr Accounts Payable (2010) with Supplier | Cr Bank Account (1010)"
              >
                <Receipt className="h-3.5 w-3.5 text-primary" />
                <span>Pay Supplier Bill</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('ASSET_PURCHASE')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700 transition-colors"
                title="Dr Capital Asset (1510) | Cr Bank Account (1010)"
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Buy Company Asset</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('OFFICE_OVERHEAD')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-amber-300 hover:bg-amber-50/60 hover:text-amber-700 transition-colors"
                title="Dr Operating Expense (6030) | Cr Bank Account (1010)"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Record Office Overhead</span>
              </button>

              {/* Quick Template Dropdown Selector */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <Bookmark className="h-3.5 w-3.5 text-primary shrink-0" />
                <select
                  aria-label="Quick Select Template"
                  value=""
                  onChange={(e) => {
                    const tmpl = allTemplates.find((t) => t.id === e.target.value);
                    if (tmpl) handleApplyTemplate(tmpl);
                  }}
                  className="flex h-8 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:border-primary-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Apply Template ({allTemplates.length})...</option>
                  {allTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isCustom ? '(Custom)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Audit Lock Warning Banner */}
      {isAuditLocked && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">
                Audit Lock Active — Read Only ({loadedJournal?.status})
              </span>
              <span className="text-xs text-amber-700">
                Posted financial transactions are permanently locked against direct editing to safeguard the general ledger audit trail.
                {loadedJournal?.status === 'POSTED' && ' Authorized personnel may void/reverse this entry.'}
              </span>
            </div>
          </div>
          {loadedJournal?.status === 'POSTED' && isAuthorizedForVoid && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleVoidJournal}
                disabled={submitting}
                className="gap-1.5 text-xs shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Void / Reverse</span>
              </Button>
              {reversalImpactLines.length > 0 && (
                <DoubleEntryHoverBadge
                  title={`GL Reversal Impact (${loadedJournal.entryNumber})`}
                  description="Voiding this posted transaction automatically posts the following counter-entries to restore account balances:"
                  lines={reversalImpactLines}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending Approval Banner (Maker-Checker) */}
      {isPendingApproval && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-xs uppercase tracking-wider block">
                Maker-Checker: Pending Finance Manager Approval
              </span>
              <span className="text-xs text-blue-700">
                Created by junior clerk <span className="font-semibold">{loadedJournal?.createdBy}</span>. Awaiting Manager review before committing to General Ledger.
              </span>
            </div>
          </div>
          {isFinanceManager && (
            <Button
              size="sm"
              onClick={handleApprovePending}
              disabled={submitting}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Approve & Post to GL</span>
            </Button>
          )}
        </div>
      )}

      {/* Sub-Ledger Control Tag Warning */}
      {hasMissingEntityTags && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-rose-800 flex items-center gap-2.5 animate-in fade-in-50">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block uppercase tracking-wider">
              Sub-Ledger Entity Tagging Required
            </span>
            <span>
              Lines posting to <span className="font-mono font-bold">1020 Accounts Receivable</span> must be tagged with a valid Customer ID, and lines posting to <span className="font-mono font-bold">2010 Accounts Payable</span> must be tagged with a valid Supplier ID.
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Main Journal Form */}
        <div className="flex-1 w-full space-y-6">
          {/* Header Inputs: Journal Date, Reference Number, Memo/Description */}
          <Card className="p-5 border-slate-200 shadow-xs bg-white space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Journal Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  disabled={isAuditLocked}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference Number
                </label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  disabled={isAuditLocked}
                  placeholder="e.g. ADJ-2026-009 or CHQ-9912"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Memo / Description <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  disabled={isAuditLocked}
                  placeholder="e.g. Monthly utilities, showroom expenses, or adjustments..."
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
          </Card>

          {/* Out of Balance Red Warning Banner */}
          {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-800 flex items-center justify-between animate-in fade-in-50">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider block">
                    Out of Balance by {formatCurrency(differenceAbs)}
                  </span>
                  <span className="text-xs text-rose-700">
                    Total Debits ({formatCurrency(totalDebit)}) do not equal Total Credits ({formatCurrency(totalCredit)}). Journal cannot be posted.
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleAutoBalance}
                className="text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-100/50 shrink-0 gap-1 font-semibold"
              >
                <span>Auto-Balance</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Line Items Grid */}
          <Card className="p-5 border-slate-200 shadow-xs bg-white space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Ledger Line Items (Debit / Credit)
              </span>

              {!isAuditLocked && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleAddLine}
                    className="gap-1.5 text-xs text-primary hover:bg-primary-light"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Line</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Spacious Line Items Block Container */}
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const matchedAccount = accounts.find((a) => a.id === line.accountId);
                const isArLine = matchedAccount?.code === '1020';
                const isApLine = matchedAccount?.code === '2010';

                return (
                  <div
                    key={line.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-3 transition-all"
                  >
                    {/* Top Tier: Line Index, Account Selector, Debit, Credit, Remove */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 font-mono">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            GL Account <span className="text-rose-500">*</span>
                          </label>
                          <Select
                            value={line.accountId}
                            onChange={(e) =>
                              handleUpdateLine(line.id, 'accountId', e.target.value)
                            }
                            disabled={isAuditLocked}
                            className="h-9 text-xs w-full"
                          >
                            <option value="">Select GL Account...</option>
                            {activeAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name} ({a.accountClass})
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {/* Debit (Dr) Input */}
                      <div className="w-full md:w-44 shrink-0">
                        <label className="block text-[10.5px] font-semibold text-primary uppercase tracking-wider mb-1">
                          Debit (Dr LKR)
                        </label>
                        <CurrencyInput
                          value={line.debit || ''}
                          onChange={(val) => handleUpdateLine(line.id, 'debit', val)}
                          placeholder="0.00"
                          disabled={submitting || isAuditLocked}
                        />
                      </div>

                      {/* Credit (Cr) Input */}
                      <div className="w-full md:w-44 shrink-0">
                        <label className="block text-[10.5px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                          Credit (Cr LKR)
                        </label>
                        <CurrencyInput
                          value={line.credit || ''}
                          onChange={(val) => handleUpdateLine(line.id, 'credit', val)}
                          placeholder="0.00"
                          disabled={submitting || isAuditLocked}
                        />
                      </div>

                      {/* Delete Action */}
                      <div className="flex items-end justify-end md:self-end pb-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          disabled={lines.length <= 2 || isAuditLocked}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                          title="Remove line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Bottom Tier: Line Narrative & Sub-Ledger Dimensions with ample room */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100 items-center">
                      <div className={cn('space-y-1', (isArLine || isApLine) ? 'md:col-span-7' : 'md:col-span-12')}>
                        <Input
                          value={line.description}
                          onChange={(e) =>
                            handleUpdateLine(line.id, 'description', e.target.value)
                          }
                          disabled={isAuditLocked}
                          placeholder="Line explanation / narrative memo..."
                          className="h-8 text-xs bg-slate-50/50"
                        />
                      </div>

                      {/* 1020 A/R Customer Tag */}
                      {isArLine && (
                        <div className="md:col-span-5 flex items-center gap-2 p-1.5 rounded-md bg-blue-50/70 border border-blue-200">
                          <span className="text-[10px] font-bold text-blue-700 uppercase shrink-0">
                            Customer *:
                          </span>
                          <select
                            value={line.customerId || ''}
                            onChange={(e) => {
                              const cId = e.target.value;
                              const cust = MOCK_CUSTOMERS.find((c) => c.id === cId);
                              handleUpdateLine(line.id, 'customerId', cId);
                              handleUpdateLine(line.id, 'customerName', cust?.name || cId);
                            }}
                            disabled={isAuditLocked}
                            className="h-7 w-full text-[11px] rounded border border-blue-300 bg-white px-2 focus:border-blue-500 font-medium"
                          >
                            <option value="">Select Customer Sub-Ledger *</option>
                            {MOCK_CUSTOMERS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code} - {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 2010 A/P Supplier Tag */}
                      {isApLine && (
                        <div className="md:col-span-5 flex items-center gap-2 p-1.5 rounded-md bg-amber-50/70 border border-amber-200">
                          <span className="text-[10px] font-bold text-amber-700 uppercase shrink-0">
                            Supplier *:
                          </span>
                          <select
                            value={line.supplierId || ''}
                            onChange={(e) => {
                              const sId = e.target.value;
                              const sup = suppliers.find((s) => s.id === sId);
                              handleUpdateLine(line.id, 'supplierId', sId);
                              handleUpdateLine(line.id, 'supplierName', sup?.name || sId);
                            }}
                            disabled={isAuditLocked}
                            className="h-7 w-full text-[11px] rounded border border-amber-300 bg-white px-2 focus:border-amber-500 font-medium"
                          >
                            <option value="">Select Supplier Sub-Ledger *</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.code} - {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Impact Preview */}
            {hasActiveEntries && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  <span>Live Ledger Impact Preview:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
                  <div>
                    <span className="font-semibold text-primary-text">Debiting (Dr):</span>
                    {activeDebitLines.length === 0 ? (
                      <span className="text-slate-400 italic ml-1">None entered</span>
                    ) : (
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                        {activeDebitLines.map((l) => {
                          const acc = accounts.find((a) => a.id === l.accountId);
                          return (
                            <li key={l.id}>
                              <span className="font-mono font-bold text-slate-800">{acc?.code}</span> ({acc?.name}):{' '}
                              <span className="font-bold text-primary-text">{formatCurrency(l.debit)}</span>
                              {l.customerId && <span className="ml-1 text-[10px] text-blue-600">[Cust: {l.customerName}]</span>}
                              {l.supplierId && <span className="ml-1 text-[10px] text-amber-600">[Sup: {l.supplierName}]</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-700">Crediting (Cr):</span>
                    {activeCreditLines.length === 0 ? (
                      <span className="text-slate-400 italic ml-1">None entered</span>
                    ) : (
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                        {activeCreditLines.map((l) => {
                          const acc = accounts.find((a) => a.id === l.accountId);
                          return (
                            <li key={l.id}>
                              <span className="font-mono font-bold text-slate-800">{acc?.code}</span> ({acc?.name}):{' '}
                              <span className="font-bold text-emerald-700">{formatCurrency(l.credit)}</span>
                              {l.customerId && <span className="ml-1 text-[10px] text-blue-600">[Cust: {l.customerName}]</span>}
                              {l.supplierId && <span className="ml-1 text-[10px] text-amber-600">[Sup: {l.supplierName}]</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Total Debits, Total Credits, and Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Total Debits
                  </span>
                  <span className="text-base font-bold font-mono text-primary tabular-nums">
                    {formatCurrency(totalDebit)}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Total Credits
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                    {formatCurrency(totalCredit)}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold uppercase">
                    Balance Status
                  </span>
                  {isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="h-4 w-4" /> Balanced (0.00)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold font-mono tabular-nums">
                      <AlertTriangle className="h-4 w-4" /> Out by {formatCurrency(differenceAbs)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Maker-Checker Routing */}
              <div className="flex items-center gap-2">
                {isAuditLocked ? (
                  loadedJournal?.status === 'POSTED' && isAuthorizedForVoid ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        onClick={handleVoidJournal}
                        disabled={submitting}
                        className="font-semibold gap-1.5 shadow-xs"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>{submitting ? 'Voiding...' : 'Void / Reverse Journal'}</span>
                      </Button>
                      {reversalImpactLines.length > 0 && (
                        <DoubleEntryHoverBadge
                          size="sm"
                          title={`GL Reversal Impact (${loadedJournal.entryNumber})`}
                          description="Voiding this posted transaction automatically posts the following counter-entries to restore account balances:"
                          lines={reversalImpactLines}
                        />
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="px-3 py-1.5 text-xs text-slate-500 border-slate-300">
                      <Lock className="h-3.5 w-3.5 mr-1" />
                      {loadedJournal?.status === 'VOIDED' ? 'Transaction Voided' : 'Audit Locked'}
                    </Badge>
                  )
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveEntry('DRAFT')}
                      disabled={submitting || !memo.trim()}
                      className="text-xs text-slate-700"
                    >
                      Save Draft
                    </Button>

                    {!isFinanceManager ? (
                      <Button
                        size="sm"
                        onClick={() => handleSaveEntry('PENDING_APPROVAL')}
                        disabled={!isFormValid || submitting}
                        className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-semibold gap-1.5 text-xs"
                        title="Junior clerks submit vouchers for Manager approval"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Submit for Approval</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSaveEntry('POSTED')}
                        disabled={!isFormValid || submitting}
                        className="bg-primary hover:bg-primary-hover text-white shadow-xs font-semibold gap-1.5 text-xs"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{submitting ? 'Posting...' : 'Post Journal'}</span>
                      </Button>
                    )}

                    {lines.some((l) => l.accountId && (l.debit > 0 || l.credit > 0)) && (
                      <DoubleEntryHoverBadge
                        title="Voucher General Ledger Impact"
                        lines={lines
                          .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0))
                          .map((l) => {
                            const acc = accounts.find((a) => a.id === l.accountId);
                            return {
                              accountCode: acc?.code || 'GL',
                              accountName: acc?.name || 'Account',
                              type: l.debit > 0 ? ('DEBIT' as const) : ('CREDIT' as const),
                              amount: l.debit > 0 ? l.debit : l.credit,
                            };
                          })}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Collapsible Sidebar: Templates Library */}
        {isTemplatesOpen && (
          <div className="w-full lg:w-88 space-y-3 shrink-0">
            <Card className="p-4 border-slate-200 bg-slate-50/90 shadow-xs space-y-3">
              {/* Header with Title and "New Template" */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Templates Library
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white text-slate-600 border-slate-200 font-mono">
                    {allTemplates.length}
                  </Badge>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenCreateTemplate(false)}
                  className="h-7 px-2 text-[11px] font-semibold gap-1 text-primary border-primary-border bg-white hover:bg-primary-light/50"
                >
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </div>

              {/* SEARCH BAR */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search templates (e.g. Payroll, 6010, Rent)..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-8 pr-7 h-8 text-xs bg-white border-slate-200 focus:border-primary shadow-2xs"
                  data-testid="template-search-input"
                />
                {templateSearch && (
                  <button
                    type="button"
                    onClick={() => setTemplateSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear template search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category filter pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'CUSTOM', label: 'Custom' },
                  { key: 'Accruals & Provisions', label: 'Accruals' },
                  { key: 'Payroll & Statutory', label: 'Payroll' },
                  { key: 'Fixed Assets & Depreciation', label: 'Assets' },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setTemplateCategoryFilter(pill.key)}
                    className={cn(
                      'px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-colors text-[10.5px]',
                      templateCategoryFilter === pill.key
                        ? 'bg-primary text-white shadow-2xs font-semibold'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Search results summary when searching */}
              {templateSearch && (
                <div className="text-[11px] text-slate-500 flex items-center justify-between px-0.5">
                  <span>Found {filteredTemplates.length} matching template(s)</span>
                  <button
                    type="button"
                    onClick={() => setTemplateSearch('')}
                    className="text-primary hover:underline text-[11px]"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Templates List */}
              <div data-testid="sidebar-templates-list" className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
                {filteredTemplates.length === 0 ? (
                  <div className="p-4 text-center rounded-lg border border-dashed border-slate-300 bg-white space-y-2">
                    <Bookmark className="h-6 w-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No templates found</p>
                    <p className="text-[11px] text-slate-400">
                      No matching template for "{templateSearch}".
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewTemplateName(templateSearch);
                        setTemplateSearch('');
                        setIsCreateTemplateOpen(true);
                      }}
                      className="h-7 text-xs gap-1 border-primary-border text-primary bg-primary-light/40 hover:bg-primary-light"
                    >
                      <Plus className="h-3 w-3" />
                      Create "{templateSearch}"
                    </Button>
                  </div>
                ) : (
                  filteredTemplates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:border-primary-border hover:bg-primary-light/20 transition-all space-y-2 shadow-2xs group relative"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate(tmpl)}
                          className="text-left flex-1 group"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-primary transition-colors">
                              {tmpl.name}
                            </span>
                            {tmpl.isCustom ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Custom
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                System
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug mt-1">
                            {tmpl.description}
                          </p>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {tmpl.isCustom && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(tmpl.id, tmpl.name);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Delete template"
                              aria-label={`Delete ${tmpl.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate(tmpl)}
                            className="p-1 text-primary hover:text-primary-dark"
                            title="Apply template"
                            aria-label={`Apply ${tmpl.name}`}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Line items badge breakdown */}
                      <div
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="cursor-pointer pt-1.5 border-t border-slate-100 flex flex-wrap gap-1 items-center"
                      >
                        {tmpl.lines.map((l, i) => (
                          <span
                            key={i}
                            className={cn(
                              'text-[9.5px] font-mono px-1.5 py-0.5 rounded',
                              l.isDebit
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            )}
                          >
                            {l.isDebit ? 'Dr' : 'Cr'} {l.accountCode} {l.accountName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Maker-Checker & General Journal Vouchers Queue */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-slate-900">
              Journal Vouchers & Maker-Checker Queue
            </h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description & Reference</th>
                  <th className="px-4 py-3 text-right">Debit Total</th>
                  <th className="px-4 py-3 text-right">Credit Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {journals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No journals recorded.
                    </td>
                  </tr>
                ) : (
                  journals.slice(0, 8).map((je) => (
                    <tr key={je.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/finance/journal/new?id=${je.id}`);
                          }}
                          className="hover:underline flex items-center gap-1"
                        >
                          {je.status === 'POSTED' && <Lock className="h-3 w-3 text-slate-400" />}
                          {je.status === 'PENDING_APPROVAL' && <Clock className="h-3 w-3 text-amber-500" />}
                          <span>{je.entryNumber}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(je.date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{je.description}</div>
                        {je.reference && (
                          <div className="font-mono text-[11px] text-slate-400">Ref: {je.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(je.totalDebit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(je.totalCredit)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {je.status === 'POSTED' && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            <span>Posted</span>
                          </Badge>
                        )}
                        {je.status === 'PENDING_APPROVAL' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>Pending</span>
                          </Badge>
                        )}
                        {je.status === 'DRAFT' && (
                          <Badge variant="secondary" className="text-[10px]">
                            Draft
                          </Badge>
                        )}
                        {je.status === 'VOIDED' && (
                          <Badge variant="destructive" className="text-[10px]">
                            Voided
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/finance/journal/new?id=${je.id}`)}
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          View / Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Create Journal Entry Template Dialog Modal */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <BookmarkPlus className="h-5 w-5 text-primary" />
            <DialogTitle>Create Journal Entry Template</DialogTitle>
          </div>
          <DialogDescription>
            Configure recurring double-entry accounts and descriptions as a reusable template for 1-click posting in future periods.
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Monthly Warehouse Rent & WHT"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="h-9 text-xs"
                data-testid="template-name-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Category
              </label>
              <select
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="Accruals & Provisions">Accruals & Provisions</option>
                <option value="Payroll & Statutory">Payroll & Statutory</option>
                <option value="Fixed Assets & Depreciation">Fixed Assets & Depreciation</option>
                <option value="Prepayments & Amortization">Prepayments & Amortization</option>
                <option value="Intercompany & Allocations">Intercompany & Allocations</option>
                <option value="Taxes & Levies">Taxes & Levies</option>
                <option value="General Adjustments">General Adjustments</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Short Description / Purpose
            </label>
            <Input
              placeholder="e.g. Accrues monthly lease payment and withholding tax payable"
              value={newTemplateDescription}
              onChange={(e) => setNewTemplateDescription(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Default Voucher Narration / Memo
            </label>
            <Input
              placeholder="e.g. Monthly warehouse rent expense for Peliyagoda logistics unit"
              value={newTemplateMemo}
              onChange={(e) => setNewTemplateMemo(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Template Lines Builder */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Template Lines</span>
                <span className="text-[11px] text-slate-500 ml-2">
                  (Assign Dr and Cr accounts)
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTemplateLine}
                className="h-7 text-xs gap-1 border-slate-200 hover:bg-slate-50"
              >
                <Plus className="h-3 w-3 text-primary" />
                Add Line
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {newTemplateLines.map((line) => (
                <div
                  key={line.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center gap-2"
                >
                  {/* Dr / Cr toggle */}
                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleLineDebit(line.id)}
                      className={cn(
                        'px-2.5 py-1 text-xs font-bold rounded-md transition-colors w-24 text-center',
                        line.isDebit
                          ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700'
                          : 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                      )}
                    >
                      {line.isDebit ? 'DEBIT (Dr)' : 'CREDIT (Cr)'}
                    </button>
                  </div>

                  {/* Account selector */}
                  <div className="flex-1 min-w-[200px] w-full sm:w-auto">
                    <select
                      data-testid="template-line-account-select"
                      value={line.accountId}
                      onChange={(e) => handleLineAccountChange(line.id, e.target.value)}
                      className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Account...</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.accountType})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Line Description */}
                  <div className="flex-1 min-w-[150px] w-full sm:w-auto">
                    <Input
                      placeholder="Line narration / memo"
                      value={line.description}
                      onChange={(e) => handleLineDescriptionChange(line.id, e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Remove line */}
                  <button
                    type="button"
                    onClick={() => handleRemoveTemplateLine(line.id)}
                    disabled={newTemplateLines.length <= 2}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 shrink-0"
                    title="Remove line"
                    aria-label="Remove template line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Invariant status */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
              <span>
                {newTemplateLines.filter((l) => l.isDebit).length} Debit line(s) •{' '}
                {newTemplateLines.filter((l) => !l.isDebit).length} Credit line(s)
              </span>
              {(!newTemplateLines.some((l) => l.isDebit) || !newTemplateLines.some((l) => !l.isDebit)) && (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Requires at least one Dr and one Cr line
                </span>
              )}
            </div>
          </div>
        </DialogContent>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateTemplateOpen(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSaveTemplate}
            className="text-xs bg-primary text-white gap-1.5 hover:bg-primary-hover"
            data-testid="save-template-submit-button"
          >
            <Check className="h-3.5 w-3.5" />
            Save Template
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
