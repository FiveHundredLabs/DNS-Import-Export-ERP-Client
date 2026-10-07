import { useState, useEffect, useCallback } from 'react';
import { useFinanceLedger } from '../../hooks/useFinanceLedger';
import { VatReport } from '../../api/types';
import { ReportDateFilterBar, DateFilterState } from './ReportDateFilterBar';
import { ReportHeaderNav } from './ReportHeaderNav';
import { CorporateReportHeader } from '../../components/CorporateReportHeader';
import { CorporateSignatureBlock } from '../../components/CorporateSignatureBlock';
import { ramisExportService } from '../../services/ramisExportService';
import { reportPdfService } from '../../services/reportPdfService';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import {
  Receipt,
  Percent,
  FileCheck,
  Building,
  FileSpreadsheet,
  FileCode,
  Printer,
  FileDown,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { toast } from 'sonner';

export function VatSummaryPage() {
  const { getVatSummary } = useFinanceLedger();
  const [report, setReport] = useState<VatReport | null>(null);
  const [activeTab, setActiveTab] = useState<'SCHEDULE_01' | 'SCHEDULE_02'>('SCHEDULE_01');

  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'THIS_MONTH',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });

  const loadReport = useCallback(async () => {
    const data = await getVatSummary({
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
    });
    setReport(data);
  }, [getVatSummary, dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const declarant = {
    taxPeriodStart: dateFilter.startDate,
    taxPeriodEnd: dateFilter.endDate,
  };

  const handleExportSchedule01Csv = () => {
    if (!report?.transactions) return;
    const csv = ramisExportService.generateSchedule01Csv(report.transactions, declarant);
    ramisExportService.downloadFile(
      `RAMIS_Schedule_01_Sales_${dateFilter.startDate}_${dateFilter.endDate}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    toast.success('RAMIS Schedule 01 (Sales CSV) exported successfully');
  };

  const handleExportSchedule01Xml = () => {
    if (!report?.transactions) return;
    const xml = ramisExportService.generateSchedule01Xml(report.transactions, declarant);
    ramisExportService.downloadFile(
      `RAMIS_Schedule_01_Sales_${dateFilter.startDate}_${dateFilter.endDate}.xml`,
      xml,
      'application/xml;charset=utf-8;'
    );
    toast.success('RAMIS Schedule 01 (Sales XML) exported successfully');
  };

  const handleExportSchedule02Csv = () => {
    const purchases = report?.purchaseTransactions || [];
    const csv = ramisExportService.generateSchedule02Csv(purchases, declarant);
    ramisExportService.downloadFile(
      `RAMIS_Schedule_02_Purchases_${dateFilter.startDate}_${dateFilter.endDate}.csv`,
      csv,
      'text/csv;charset=utf-8;'
    );
    toast.success('RAMIS Schedule 02 (Purchases CSV) exported successfully');
  };

  const handleExportSchedule02Xml = () => {
    const purchases = report?.purchaseTransactions || [];
    const xml = ramisExportService.generateSchedule02Xml(purchases, declarant);
    ramisExportService.downloadFile(
      `RAMIS_Schedule_02_Purchases_${dateFilter.startDate}_${dateFilter.endDate}.xml`,
      xml,
      'application/xml;charset=utf-8;'
    );
    toast.success('RAMIS Schedule 02 (Purchases XML) exported successfully');
  };

  const handlePrint = () => {
    reportPdfService.triggerPrint(`DNS_VAT_Summary_Report_${dateFilter.startDate}_to_${dateFilter.endDate}`);
  };

  const salesList = report?.transactions || [];
  const purchasesList = report?.purchaseTransactions || [];

  return (
    <div className="space-y-6">
      {/* Back and Report Navigation Bar */}
      <div className="print:hidden">
        <ReportHeaderNav />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">VAT Summary & Tax Filing Report</h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              18% Value Added Tax (RAMIS Ready)
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit statutory taxable sales, 18% VAT collected on supplies, and net liability payable to Inland Revenue Department (IRD).
          </p>
        </div>
      </div>

      {/* Corporate Report Header */}
      <CorporateReportHeader
        title="Statutory VAT Return & RAMIS Tax Filing Statement"
        subtitle="Inland Revenue Department (IRD) statutory compliance report under Value Added Tax Act No. 14 of 2002 (as amended)."
        periodLabel={`Tax Assessment Period: ${dateFilter.startDate} to ${dateFilter.endDate}`}
      />

      {/* RAMIS Export Action Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-lg shadow-2xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold">
              RAMIS Statutory Filing Suite
            </Badge>
            <span className="text-xs text-slate-500 font-medium">IRD Sri Lanka Compliant</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Export certified schedules directly into the Revenue Administration Management Information System (RAMIS).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Schedule 01 Exports */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Sch 01 (Sales):</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportSchedule01Csv}
              className="h-7 text-xs gap-1 font-semibold text-slate-700 bg-white"
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
              <span>CSV</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportSchedule01Xml}
              className="h-7 text-xs gap-1 font-semibold text-slate-700 bg-white"
            >
              <FileCode className="h-3 w-3 text-amber-600" />
              <span>XML</span>
            </Button>
          </div>

          {/* Schedule 02 Exports */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Sch 02 (Purchases):</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportSchedule02Csv}
              className="h-7 text-xs gap-1 font-semibold text-slate-700 bg-white"
            >
              <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
              <span>CSV</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportSchedule02Xml}
              className="h-7 text-xs gap-1 font-semibold text-slate-700 bg-white"
            >
              <FileCode className="h-3 w-3 text-amber-600" />
              <span>XML</span>
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1 text-xs bg-primary hover:bg-primary-hover text-white font-semibold"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>PDF Print</span>
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <ReportDateFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        onPrint={handlePrint}
        reportTitle="VAT_Summary_Report"
      />

      {/* Tax Metric KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Taxable Supplies Base
            </span>
            <Building className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(report?.taxableSales || 0)}
          </div>
          <span className="text-xs text-slate-400">18% Standard Supplies (GL 4010)</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Output VAT Collected (18%)
            </span>
            <Percent className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-700 tabular-nums">
            {formatCurrency(report?.vatCollected || 0)}
          </div>
          <span className="text-xs text-amber-600 font-medium">Output Liability under GL 2020</span>
        </Card>

        <Card className="p-4 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Input VAT Paid (Purchases)
            </span>
            <ShoppingBag className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-indigo-700 tabular-nums">
            {formatCurrency(report?.vatPaidOnPurchases || 0)}
          </div>
          <span className="text-xs text-indigo-600 font-medium">Input Credit Claimable under GL 1025</span>
        </Card>

        <Card className="p-4 border-slate-200 bg-emerald-50/50 border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
              Net Statutory VAT Payable
            </span>
            <FileCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-900 tabular-nums">
            {formatCurrency(report?.netVatPayable || 0)}
          </div>
          <span className="text-xs text-emerald-700 font-medium">Net Remittance to IRD Account</span>
        </Card>
      </div>

      {/* RAMIS Statutory Schedule Selector Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-lg px-4 pt-3 print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULE_01')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'SCHEDULE_01'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Schedule 01: Taxable Sales &amp; SVAT Output ({salesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SCHEDULE_02')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'SCHEDULE_02'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Schedule 02: Taxable Purchases &amp; Input VAT ({purchasesList.length})</span>
        </button>
      </div>

      {/* SCHEDULE 01 TABLE: SALES & SVAT */}
      {activeTab === 'SCHEDULE_01' && (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-2xs">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                RAMIS Schedule 01: Taxable Supplies &amp; Output VAT Invoices
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {salesList.length} Registered Statutory Invoices
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Tax Invoice #</th>
                  <th className="px-3 py-3">Customer / Purchaser</th>
                  <th className="px-3 py-3">Customer TIN</th>
                  <th className="px-3 py-3">Customer SVAT</th>
                  <th className="px-3 py-3 text-right">Taxable Supplies (LKR)</th>
                  <th className="px-3 py-3 text-right">18% VAT (LKR)</th>
                  <th className="px-3 py-3 text-right">SVAT Suspended</th>
                  <th className="px-3 py-3 text-right">Gross Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {salesList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No taxable sales invoices recorded in the selected tax period.
                    </td>
                  </tr>
                ) : (
                  salesList.map((tx, idx) => {
                    const gross = tx.taxableAmount + tx.vatAmount;
                    return (
                      <tr key={`${tx.invoiceNumber}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-3 text-slate-600">{formatDate(tx.date)}</td>
                        <td className="px-3 py-3 tabular-nums font-semibold text-primary">{tx.invoiceNumber}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{tx.customerName}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                          {tx.customerTin || '102938475-7000'}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                          {tx.customerSvat || 'N/A'}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-800">
                          {formatCurrency(tx.taxableAmount)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-amber-700">
                          {formatCurrency(tx.vatAmount)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-500">
                          {formatCurrency(tx.svatAmount || 0)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">
                          {formatCurrency(gross)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900">
                <tr>
                  <td colSpan={5} className="px-3 py-3.5 uppercase tracking-wider">
                    Total Output Supplies &amp; VAT
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums font-semibold text-slate-900">
                    {formatCurrency(report?.taxableSales || 0)}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-sm font-semibold text-amber-800">
                    {formatCurrency(report?.vatCollected || 0)}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-slate-600">
                    {formatCurrency(0)}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums font-bold text-slate-900">
                    {formatCurrency((report?.taxableSales || 0) + (report?.vatCollected || 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* SCHEDULE 02 TABLE: PURCHASES & INPUT VAT */}
      {activeTab === 'SCHEDULE_02' && (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-2xs">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                RAMIS Schedule 02: Taxable Purchases &amp; Input VAT Credit Bills
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {purchasesList.length} Registered Statutory Purchase Bills
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Bill / Tax Inv #</th>
                  <th className="px-3 py-3">Supplier Name</th>
                  <th className="px-3 py-3">Supplier TIN</th>
                  <th className="px-3 py-3">Supplier SVAT</th>
                  <th className="px-3 py-3 text-right">Taxable Purchases (LKR)</th>
                  <th className="px-3 py-3 text-right">Input VAT (18%)</th>
                  <th className="px-3 py-3 text-right">Suspended Input VAT</th>
                  <th className="px-3 py-3 text-right">Gross Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchasesList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No taxable purchase bills recorded in the selected period.
                    </td>
                  </tr>
                ) : (
                  purchasesList.map((tx, idx) => {
                    const gross = tx.taxableAmount + tx.vatAmount;
                    return (
                      <tr key={`${tx.billNumber}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-3 text-slate-600">{formatDate(tx.date)}</td>
                        <td className="px-3 py-3 tabular-nums font-semibold text-primary">{tx.billNumber}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{tx.supplierName}</td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                          {tx.supplierTin || 'VAT-102938475'}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                          {tx.supplierSvat || 'N/A'}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-800">
                          {formatCurrency(tx.taxableAmount)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold text-indigo-700">
                          {formatCurrency(tx.vatAmount)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-500">
                          {formatCurrency(tx.svatAmount || 0)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">
                          {formatCurrency(gross)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900">
                <tr>
                  <td colSpan={5} className="px-3 py-3.5 uppercase tracking-wider">
                    Total Input Purchases &amp; Claimable VAT
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums font-semibold text-slate-900">
                    {formatCurrency(
                      purchasesList.reduce((s, p) => s + p.taxableAmount, 0)
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-sm font-semibold text-indigo-800">
                    {formatCurrency(report?.vatPaidOnPurchases || 0)}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-slate-600">
                    {formatCurrency(
                      purchasesList.reduce((s, p) => s + (p.svatAmount || 0), 0)
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums font-bold text-slate-900">
                    {formatCurrency(
                      purchasesList.reduce((s, p) => s + p.taxableAmount + p.vatAmount, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Corporate Sign-Off Block */}
      <CorporateSignatureBlock date={dateFilter.endDate} />
    </div>
  );
}
