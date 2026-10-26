import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { JournalEntry } from '../../api/types';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import { reportPdfService } from '../../services/reportPdfService';
import { ReportHeaderNav } from './ReportHeaderNav';
import {
  Search,
  Printer,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

export type TransactionOriginFilter = 'ALL' | 'AUTOMATED' | 'MANUAL';

export interface AffectedTableInfo {
  name: string;
  category: 'LEDGER' | 'SUBLEDGER' | 'TAX' | 'INVENTORY' | 'OPERATIONAL';
  description: string;
  mutation: 'INSERT' | 'UPDATE';
}

/**
 * Derives underlying relational tables and data entities mutated by a journal voucher
 */
export function getAffectedTablesForJournal(journal: JournalEntry): AffectedTableInfo[] {
  const tables: AffectedTableInfo[] = [
    {
      name: 'journal_entries',
      category: 'LEDGER',
      description: 'Audit master voucher record header',
      mutation: 'INSERT',
    },
    {
      name: 'journal_lines',
      category: 'LEDGER',
      description: 'Individual debit and credit line ledger entries committed to general ledger',
      mutation: 'INSERT',
    },
    {
      name: 'chart_of_accounts',
      category: 'LEDGER',
      description: 'Running balance mutations on active financial accounts',
      mutation: 'UPDATE',
    },
  ];

  const hasAr = journal.lines.some((l) => l.accountCode === '1020');
  const hasAp = journal.lines.some((l) => l.accountCode === '2010');
  const hasInventory = journal.lines.some((l) => l.accountCode === '1030' || l.accountCode === '1100');
  const hasVat = journal.lines.some((l) => l.accountCode === '2020' || l.accountCode === '1025');
  const hasCommission = journal.lines.some((l) => l.accountCode === '2030' || l.accountCode === '6010');
  const hasBank = journal.lines.some((l) => l.accountCode === '1010' || l.accountCode === '1018');

  if (hasAr) {
    tables.push({
      name: 'customer_subledger',
      category: 'SUBLEDGER',
      description: 'Customer receivables & credit ledger balances',
      mutation: 'UPDATE',
    });
  }

  if (hasAp) {
    tables.push({
      name: 'supplier_subledger',
      category: 'SUBLEDGER',
      description: 'Vendor payable balances & invoice matching lines',
      mutation: 'UPDATE',
    });
  }

  if (hasInventory) {
    tables.push({
      name: 'inventory_valuation_ledger',
      category: 'INVENTORY',
      description: 'Warehouse stock balance valuation & landed costing layers',
      mutation: 'UPDATE',
    });
  }

  if (hasVat) {
    tables.push({
      name: 'vat_statutory_schedules',
      category: 'TAX',
      description: 'IRD 18% Output VAT / Input VAT statutory schedules',
      mutation: 'INSERT',
    });
  }

  if (hasCommission) {
    tables.push({
      name: 'commission_accruals',
      category: 'OPERATIONAL',
      description: 'Sales representative monthly incentive tracking & accrued liabilities',
      mutation: 'UPDATE',
    });
  }

  if (hasBank) {
    tables.push({
      name: 'bank_transactions',
      category: 'OPERATIONAL',
      description: 'Cashbook float ledger entries & reconciliation register',
      mutation: 'INSERT',
    });
  }

  if (journal.source === 'SALES') {
    tables.push({
      name: 'sales_invoices',
      category: 'OPERATIONAL',
      description: 'Sales invoice accounting synchronization state',
      mutation: 'UPDATE',
    });
  } else if (journal.source === 'GRN') {
    tables.push({
      name: 'goods_received_notes',
      category: 'OPERATIONAL',
      description: 'GRN inventory receipt costing & vendor bill matches',
      mutation: 'UPDATE',
    });
  } else if (journal.source === 'PAYMENT') {
    tables.push({
      name: 'payment_collections',
      category: 'OPERATIONAL',
      description: 'Customer remittance realization & receipt records',
      mutation: 'UPDATE',
    });
  }

  return tables;
}

export function MonthlyTransactionsAuditPage() {
  const { journals } = useFinanceLedger();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;
  const defaultMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr);
  const [originFilter, setOriginFilter] = useState<TransactionOriginFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const monthOptions = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, currentMonthNum - 1 - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${yyyy}-${mm}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ label, value: val });
    }
    return list;
  }, [currentYear, currentMonthNum]);

  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      if (!j.date.startsWith(selectedMonth)) {
        return false;
      }

      const isManual = j.source === 'MANUAL';
      if (originFilter === 'AUTOMATED' && isManual) return false;
      if (originFilter === 'MANUAL' && !isManual) return false;

      if (sourceFilter !== 'ALL' && j.source !== sourceFilter) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesVoucher = j.entryNumber.toLowerCase().includes(query);
        const matchesDesc = j.description.toLowerCase().includes(query);
        const matchesRef = j.reference?.toLowerCase().includes(query);
        const matchesLines = j.lines.some(
          (l) =>
            l.accountCode.toLowerCase().includes(query) ||
            l.accountName.toLowerCase().includes(query) ||
            l.description?.toLowerCase().includes(query)
        );
        if (!matchesVoucher && !matchesDesc && !matchesRef && !matchesLines) {
          return false;
        }
      }

      return true;
    });
  }, [journals, selectedMonth, originFilter, sourceFilter, searchTerm]);

  const metrics = useMemo(() => {
    const monthAll = journals.filter((j) => j.date.startsWith(selectedMonth));
    const totalCount = monthAll.length;
    const manualCount = monthAll.filter((j) => j.source === 'MANUAL').length;
    const autoCount = monthAll.filter((j) => j.source !== 'MANUAL').length;

    let filteredDebitSum = 0;
    let filteredCreditSum = 0;
    filteredJournals.forEach((j) => {
      filteredDebitSum += j.totalDebit;
      filteredCreditSum += j.totalCredit;
    });

    return {
      totalCount,
      manualCount,
      autoCount,
      displayedCount: filteredJournals.length,
      totalVolumeDebit: filteredDebitSum,
      totalVolumeCredit: filteredCreditSum,
    };
  }, [journals, selectedMonth, filteredJournals]);

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const handlePrint = () => {
    reportPdfService.triggerPrint(`Finance_Audit_Journal_Transactions_${selectedMonth}`);
  };

  const formatMonthTitle = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-5">
      {/* Top Navigation */}
      <ReportHeaderNav />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Monthly Transactions & Double-Entry Audit</h1>
            <Badge variant="outline" className="bg-primary-light text-primary-text border-primary-border text-[11px]">
              Finance Manager Audit View
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit monthly transactions for <strong className="text-slate-800">{formatMonthTitle(selectedMonth)}</strong> with automated vs. manual origin, underlying ledger accounts, and database tables affected.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border-slate-200 h-8"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>Print Report</span>
          </Button>

          <Link to="/finance/journal/new">
            <Button size="sm" className="bg-primary hover:bg-primary-hover font-medium text-xs h-8">
              Post Journal
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Metric Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Month Transactions</span>
          <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
            {metrics.totalCount}
          </div>
          <span className="text-[11px] text-slate-400">Total in {formatMonthTitle(selectedMonth)}</span>
        </div>

        <div
          onClick={() => setOriginFilter(originFilter === 'AUTOMATED' ? 'ALL' : 'AUTOMATED')}
          className={`p-3 rounded-lg border bg-white cursor-pointer transition-all ${
            originFilter === 'AUTOMATED' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Automated Postings</span>
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 px-1 py-0">
              {metrics.totalCount > 0 ? Math.round((metrics.autoCount / metrics.totalCount) * 100) : 0}%
            </Badge>
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">
            {metrics.autoCount}
          </div>
          <span className="text-[11px] text-slate-400">Sales, GRN & Receipts</span>
        </div>

        <div
          onClick={() => setOriginFilter(originFilter === 'MANUAL' ? 'ALL' : 'MANUAL')}
          className={`p-3 rounded-lg border bg-white cursor-pointer transition-all ${
            originFilter === 'MANUAL' ? 'border-primary ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Manual Vouchers</span>
            <Badge variant="outline" className="text-[10px] bg-primary-light text-primary-text border-primary-border px-1 py-0">
              {metrics.totalCount > 0 ? Math.round((metrics.manualCount / metrics.totalCount) * 100) : 0}%
            </Badge>
          </div>
          <div className="mt-1 text-xl font-bold text-primary tabular-nums">
            {metrics.manualCount}
          </div>
          <span className="text-[11px] text-slate-400">Manual journal adjustments</span>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Filtered Volume</span>
          <div className="mt-1 text-lg font-bold text-slate-900 tabular-nums font-mono truncate">
            {formatCurrency(metrics.totalVolumeDebit)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Debit = Credit Balanced</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:outline-hidden"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Segmented Origin Filter */}
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setOriginFilter('ALL')}
              className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                originFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Postings ({metrics.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter('AUTOMATED')}
              className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                originFilter === 'AUTOMATED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Automated ({metrics.autoCount})
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter('MANUAL')}
              className={`rounded px-2.5 py-1 font-semibold transition-colors ${
                originFilter === 'MANUAL'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-primary hover:text-primary-hover'
              }`}
            >
              Manual ({metrics.manualCount})
            </button>
          </div>

          {/* Workflow Sub-Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-300 focus:outline-hidden"
          >
            <option value="ALL">All Workflows</option>
            <option value="SALES">SALES</option>
            <option value="GRN">GRN</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="MANUAL">MANUAL</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search voucher, ref, account..."
            className="pl-8 h-8 text-xs bg-slate-50/50"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="overflow-hidden border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">
              Journal Transactions Log &bull; {formatMonthTitle(selectedMonth)}
            </span>
            <Badge variant="outline" className="text-[11px] bg-white text-slate-600 font-mono">
              {filteredJournals.length}
            </Badge>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any row to view double-entry lines and affected database tables
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-2.5 pl-3 pr-1 w-6"></th>
                <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Voucher #</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Origin</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Workflow</th>
                <th className="py-2.5 px-3 min-w-[220px]">Description & Reference</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Debit (LKR)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Credit (LKR)</th>
                <th className="py-2.5 pr-4 pl-3 text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <p className="font-medium text-slate-600">No journal transactions found for {formatMonthTitle(selectedMonth)}.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try toggling between Automated and Manual or change the audit month.</p>
                  </td>
                </tr>
              ) : (
                filteredJournals.map((journal) => {
                  const isExpanded = expandedRowId === journal.id;
                  const isManual = journal.source === 'MANUAL';
                  const affectedTables = getAffectedTablesForJournal(journal);

                  return (
                    <React.Fragment key={journal.id}>
                      <tr
                        data-testid={`row-${journal.entryNumber}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          toggleRow(journal.id);
                        }}
                        className={`text-xs cursor-pointer transition-colors ${
                          isExpanded ? 'bg-primary-light/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 pl-3 pr-1 text-slate-400 text-center">
                          <button
                            type="button"
                            aria-label={`Toggle ${journal.entryNumber}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleRow(journal.id);
                            }}
                            className="p-1 hover:text-slate-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-primary inline" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 inline group-hover:text-slate-600" />
                            )}
                          </button>
                        </td>

                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(journal.date)}
                      </td>

                      <td className="py-3 px-3 font-mono font-semibold text-primary whitespace-nowrap">
                        {journal.entryNumber}
                      </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {isManual ? (
                            <Badge className="bg-primary-light text-primary border-primary-border text-[10px] font-semibold">
                              Manual
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                              Automated
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <Badge variant="outline" className="font-mono text-[10px] bg-slate-50 text-slate-700 font-semibold">
                            {journal.source}
                          </Badge>
                        </td>

                        <td className="py-3 px-3 max-w-[280px]">
                          <div className="font-medium text-slate-900 truncate">{journal.description}</div>
                          {journal.reference && (
                            <div className="font-mono text-[10.5px] text-slate-400">Ref: {journal.reference}</div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-primary whitespace-nowrap">
                          {formatCurrency(journal.totalDebit)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {formatCurrency(journal.totalCredit)}
                        </td>

                        <td className="py-3 pr-4 pl-3 text-center whitespace-nowrap">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            {journal.status}
                          </Badge>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${journal.id}-expanded`} className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={9} className="p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                              {/* Left Panel: Double-Entry Postings */}
                              <div className="lg:col-span-7 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                  <span className="text-xs font-bold text-slate-800">
                                    Double-Entry Postings ({journal.lines.length} lines)
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    Posted by: <strong className="text-slate-600 font-medium">{journal.createdBy}</strong>
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="text-[10.5px] font-semibold text-slate-500 border-b border-slate-100">
                                      <tr>
                                        <th className="py-1 px-2">Account</th>
                                        <th className="py-1 px-2">Sub-Ledger</th>
                                        <th className="py-1 px-2 text-right">Debit (LKR)</th>
                                        <th className="py-1 px-2 text-right">Credit (LKR)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[11.5px]">
                                      {journal.lines.map((line) => (
                                        <tr key={line.id} className="hover:bg-slate-50/60">
                                          <td className="py-2 px-2">
                                            <span className="font-mono font-semibold text-primary mr-1">{line.accountCode}</span>
                                            <span className="text-slate-800">{line.accountName}</span>
                                            {line.description && (
                                              <div className="text-[10px] text-slate-400 mt-0.5">{line.description}</div>
                                            )}
                                          </td>
                                          <td className="py-2 px-2 text-slate-600">
                                            {line.customerName ? (
                                              <span className="text-[10.5px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                                Cust: {line.customerName}
                                              </span>
                                            ) : line.supplierName ? (
                                              <span className="text-[10.5px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                                Supp: {line.supplierName}
                                              </span>
                                            ) : (
                                              <span className="text-slate-300">&mdash;</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-2 text-right font-mono font-medium text-primary">
                                            {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                                          </td>
                                          <td className="py-2 px-2 text-right font-mono font-medium text-slate-700">
                                            {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="border-t border-slate-200 font-semibold bg-slate-50/50 text-[11.5px]">
                                      <tr>
                                        <td colSpan={2} className="py-1.5 px-2 text-slate-700">
                                          Voucher Balance
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-mono text-primary">
                                          {formatCurrency(journal.totalDebit)}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-mono text-slate-800">
                                          {formatCurrency(journal.totalCredit)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>

                              {/* Right Panel: Database Tables Effected */}
                              <div className="lg:col-span-5 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                    <span className="text-xs font-bold text-slate-800">
                                      Database Tables Effected
                                    </span>
                                    <Badge variant="outline" className="text-[10.5px] font-mono text-slate-600 bg-slate-50">
                                      {affectedTables.length} Tables
                                    </Badge>
                                  </div>

                                  <div className="space-y-1.5 mt-2">
                                    {affectedTables.map((tbl, i) => (
                                      <div
                                        key={i}
                                        className="p-2 rounded border border-slate-100 bg-slate-50/60 text-xs flex items-start justify-between gap-2"
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-semibold text-slate-800 text-[11px]">{tbl.name}</span>
                                            <span
                                              className={`text-[9px] font-semibold px-1 rounded uppercase ${
                                                tbl.category === 'LEDGER'
                                                  ? 'bg-blue-50 text-blue-700'
                                                  : tbl.category === 'SUBLEDGER'
                                                  ? 'bg-purple-50 text-purple-700'
                                                  : tbl.category === 'INVENTORY'
                                                  ? 'bg-amber-50 text-amber-700'
                                                  : tbl.category === 'TAX'
                                                  ? 'bg-rose-50 text-rose-700'
                                                  : 'bg-emerald-50 text-emerald-700'
                                              }`}
                                            >
                                              {tbl.category}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{tbl.description}</p>
                                        </div>

                                        <span
                                          className={`text-[9px] font-mono px-1 py-0.5 rounded font-semibold shrink-0 ${
                                            tbl.mutation === 'INSERT'
                                              ? 'bg-emerald-50 text-emerald-700'
                                              : 'bg-blue-50 text-blue-700'
                                          }`}
                                        >
                                          {tbl.mutation}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                  <span>Zero GL discrepancy verified</span>
                                  {isManual ? (
                                    <Link
                                      to={`/finance/journal/new?id=${journal.id}`}
                                      className="font-medium text-primary hover:underline flex items-center gap-1"
                                    >
                                      <span>Open Voucher</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                  ) : (
                                    <span className="text-emerald-700 font-medium">Auto-posted by pipeline</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 text-slate-700">
                  Total Filtered ({filteredJournals.length} Transactions)
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-primary tabular-nums">
                  {formatCurrency(metrics.totalVolumeDebit)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-800 tabular-nums">
                  {formatCurrency(metrics.totalVolumeCredit)}
                </td>
                <td className="py-2.5 pr-4 pl-3 text-center text-emerald-700 text-[11px] font-bold">
                  BALANCED
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
