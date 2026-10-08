import {
  ProfitLossReport,
  BalanceSheetReport,
  TrialBalanceReport,
  GeneralLedgerAccountReport,
  VatReport,
} from '../api/types';

export interface CompanyInfo {
  name: string;
  legalName: string;
  companyReg: string;
  vatRegNo: string;
  svatRegNo: string;
  address: string;
  contact: string;
  email: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'DNS IMPORT & EXPORT',
  legalName: 'DNS Import & Export (Pvt) Ltd',
  companyReg: 'PV 0029384',
  vatRegNo: 'VAT-102938475',
  svatRegNo: 'SVAT-009988',
  address: '104 Nawam Mawatha, Colombo 02, Sri Lanka',
  contact: '+94 11 234 5678',
  email: 'finance@dnsgroup.lk',
};

export interface SignatoryInfo {
  preparedByName?: string;
  preparedByTitle?: string;
  reviewedByName?: string;
  reviewedByTitle?: string;
  approvedByName?: string;
  approvedByTitle?: string;
  date?: string;
}

export class ReportPdfService {
  /**
   * Formats numbers into strict accounting standard format (e.g. LKR 1,234,567.89 or (1,234.50))
   */
  public formatCurrency(val: number | undefined | null, includeCurrency = true): string {
    const num = Number(val || 0);
    const isNegative = num < 0;
    const absStr = Math.abs(num).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const prefix = includeCurrency ? 'LKR ' : '';
    if (isNegative) {
      return `(${prefix}${absStr})`;
    }
    return `${prefix}${absStr}`;
  }

  /**
   * Generates standard corporate header HTML
   */
  public generateHeaderHtml(
    reportTitle: string,
    statementSubtitle: string,
    periodLabel: string,
    company: CompanyInfo = DEFAULT_COMPANY_INFO
  ): string {
    const generatedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `
      <div class="report-header">
        <div class="company-row">
          <div class="company-identity">
            <div class="company-logo-badge">DNS</div>
            <div class="company-details">
              <h1 class="company-title">${company.legalName}</h1>
              <div class="company-reg-line">
                Company Reg: ${company.companyReg} &bull; VAT Reg: ${company.vatRegNo} &bull; SVAT: ${company.svatRegNo}
              </div>
              <div class="company-contact-line">
                ${company.address} &bull; Tel: ${company.contact} &bull; ${company.email}
              </div>
            </div>
          </div>
          <div class="compliance-badge-box">
            <div class="audit-watermark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #059669; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              <span>AUDITED STATUTORY RECORD</span>
            </div>
            <div class="audit-meta">Generated: ${generatedDate}</div>
            <div class="audit-meta"><strong>Currency: LKR (Sri Lankan Rupee)</strong></div>
          </div>
        </div>

        <div class="statement-banner">
          <div>
            <h2 class="statement-title">${reportTitle}</h2>
            <div class="statement-subtitle">${statementSubtitle}</div>
          </div>
          <div class="period-pill">${periodLabel}</div>
        </div>
      </div>
    `;
  }

  /**
   * Generates 3-party statutory certification signatures HTML
   */
  public generateSignatureBlockHtml(signatories: SignatoryInfo = {}): string {
    const prepName = signatories.preparedByName || 'K. M. Jayawardena, ACMA';
    const prepTitle = signatories.preparedByTitle || 'Senior Financial Accountant';
    const revName = signatories.reviewedByName || 'H. P. Samarasekara, ACA';
    const revTitle = signatories.reviewedByTitle || 'Head of Finance / Controller';
    const appName = signatories.approvedByName || 'D. N. Senanayake';
    const appTitle = signatories.approvedByTitle || 'Managing Director / CEO';
    const signDate = signatories.date || new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `
      <div class="signatures-container">
        <div class="signature-section-title">Statutory Governance &amp; Certification Sign-Off</div>
        <div class="signature-grid">
          <div class="sig-card">
            <div class="sig-header">1. Prepared By</div>
            <div class="sig-handwritten">K. M. Jayawardena</div>
            <div class="sig-meta">
              <div class="sig-name">${prepName}</div>
              <div class="sig-title">${prepTitle}</div>
              <div class="sig-date">Date: ${signDate}</div>
            </div>
          </div>

          <div class="sig-card">
            <div class="sig-header">2. Reviewed &amp; Verified By</div>
            <div class="sig-handwritten">H. P. Samarasekara</div>
            <div class="sig-meta">
              <div class="sig-name">${revName}</div>
              <div class="sig-title">${revTitle}</div>
              <div class="sig-date">Date: ${signDate}</div>
            </div>
          </div>

          <div class="sig-card">
            <div class="sig-header-seal">
              <span class="sig-header">3. Approved By</span>
              <span class="seal-badge">Board Seal</span>
            </div>
            <div class="sig-handwritten sig-seal-space">
              <span>D. N. Senanayake</span>
              <div class="official-seal">SEAL</div>
            </div>
            <div class="sig-meta">
              <div class="sig-name">${appName}</div>
              <div class="sig-title">${appTitle}</div>
              <div class="sig-date">Date: ${signDate}</div>
            </div>
          </div>
        </div>
        <div class="compliance-footer">
          This financial statement has been prepared in compliance with Sri Lanka Accounting Standards (LKAS / SLFRS) and validated by internal statutory control governance.
        </div>
      </div>
    `;
  }

  /**
   * Generates common CSS for print and standalone PDF views
   */
  public getBasePrintStyles(): string {
    return `
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 15mm 15mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        background-color: #ffffff;
        margin: 0;
        padding: 0;
        font-size: 11px;
        line-height: 1.4;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-header {
        border-bottom: 2.5px solid #0f172a;
        padding-bottom: 12px;
        margin-bottom: 16px;
      }
      .company-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
      }
      .company-identity {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .company-logo-badge {
        width: 44px;
        height: 44px;
        background: #263183;
        color: #ffffff;
        font-weight: 800;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        letter-spacing: 0.5px;
      }
      .company-details {
        display: flex;
        flex-direction: column;
      }
      .company-title {
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 2px 0;
        text-transform: uppercase;
        letter-spacing: -0.2px;
      }
      .company-reg-line {
        font-size: 10px;
        font-weight: 600;
        color: #475569;
      }
      .company-contact-line {
        font-size: 9.5px;
        color: #64748b;
        margin-top: 2px;
      }
      .compliance-badge-box {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .audit-watermark {
        display: inline-flex;
        align-items: center;
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        color: #1e293b;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 3px 8px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }
      .audit-meta {
        font-size: 9px;
        color: #64748b;
        margin-top: 3px;
      }
      .statement-banner {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .statement-title {
        font-size: 15px;
        font-weight: 800;
        text-transform: uppercase;
        color: #0f172a;
        margin: 0;
        letter-spacing: 0.3px;
      }
      .statement-subtitle {
        font-size: 10px;
        color: #64748b;
        margin-top: 2px;
      }
      .period-pill {
        font-size: 10px;
        font-weight: 700;
        color: #1e293b;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
      }

      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
        margin-bottom: 12px;
      }
      th, td {
        padding: 6px 8px;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: middle;
      }
      th {
        background: #f8fafc;
        font-weight: 700;
        text-transform: uppercase;
        color: #475569;
        font-size: 9px;
        letter-spacing: 0.5px;
        border-bottom: 1.5px solid #cbd5e1;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .section-heading-row td {
        background: #f1f5f9;
        font-weight: 700;
        color: #1e293b;
        font-size: 10.5px;
        text-transform: uppercase;
        border-top: 1px solid #cbd5e1;
        border-bottom: 1px solid #cbd5e1;
        padding: 6px 8px;
      }
      .subtotal-row td {
        background: #f8fafc;
        font-weight: 700;
        border-top: 1px solid #cbd5e1;
        border-bottom: 1px solid #94a3b8;
        color: #0f172a;
      }
      .grandtotal-row td {
        background: #f0fdf4;
        font-weight: 800;
        font-size: 11.5px;
        border-top: 2px solid #059669;
        border-bottom: 2.5px double #059669;
        color: #064e3b;
        padding: 8px;
      }

      /* KPI Highlights Bar */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 14px;
      }
      .kpi-card {
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        border-radius: 4px;
        padding: 8px 10px;
      }
      .kpi-label {
        font-size: 8.5px;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 2px;
      }
      .kpi-val {
        font-size: 13px;
        font-weight: 700;
        font-family: ui-monospace, monospace;
        color: #0f172a;
      }

      /* Signatures */
      .signatures-container {
        margin-top: 24px;
        padding-top: 14px;
        border-top: 1.5px solid #cbd5e1;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .signature-section-title {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 10px;
        letter-spacing: 0.5px;
      }
      .signature-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .sig-card {
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        border-radius: 4px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .sig-header {
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        color: #475569;
        letter-spacing: 0.5px;
      }
      .sig-header-seal {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .seal-badge {
        font-size: 7.5px;
        font-weight: 700;
        text-transform: uppercase;
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .sig-handwritten {
        height: 38px;
        border-bottom: 1px dashed #94a3b8;
        margin: 6px 0;
        display: flex;
        align-items: flex-end;
        padding-bottom: 2px;
        font-style: italic;
        font-family: Georgia, serif;
        font-size: 13px;
        color: #334155;
      }
      .sig-seal-space {
        justify-content: space-between;
      }
      .official-seal {
        width: 32px;
        height: 32px;
        border: 1.5px dashed #059669;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 7px;
        font-weight: 800;
        color: #059669;
        transform: rotate(12deg);
      }
      .sig-meta {
        font-size: 9px;
      }
      .sig-name {
        font-weight: 700;
        color: #0f172a;
      }
      .sig-title {
        color: #64748b;
        font-size: 8.5px;
      }
      .sig-date {
        color: #94a3b8;
        font-size: 8px;
        margin-top: 2px;
      }
      .compliance-footer {
        margin-top: 10px;
        font-size: 8.5px;
        color: #94a3b8;
        text-align: center;
        font-style: italic;
      }
    `;
  }

  /**
   * Generates complete standalone professional HTML for Profit & Loss Statement
   */
  public generateProfitLossHtml(
    report: ProfitLossReport,
    priorReport?: ProfitLossReport | null
  ): string {
    const periodLabel = `Period: ${report.dateRange.start} to ${report.dateRange.end}`;
    const headerHtml = this.generateHeaderHtml(
      'Statement of Comprehensive Income (Profit & Loss)',
      'Statutory financial performance reporting gross trading income, cost of goods sold, and net operational profit.',
      periodLabel
    );

    const hasPrior = Boolean(priorReport);
    const priorMap = new Map<string, number>();
    if (priorReport) {
      [...priorReport.revenueItems, ...priorReport.cogsItems, ...priorReport.expenseItems].forEach((i) =>
        priorMap.set(i.accountId, i.amount)
      );
    }

    const renderItemRows = (
      items: { accountId: string; accountName: string; code: string; amount: number }[]
    ) => {
      if (items.length === 0) {
        return `<tr><td colspan="${hasPrior ? 4 : 3}" style="color: #94a3b8; font-style: italic; padding: 6px 8px;">No transactions recorded</td></tr>`;
      }
      return items
        .map((it) => {
          const priorAmt = priorMap.get(it.accountId) || 0;
          return `
            <tr>
              <td class="font-mono" style="width: 70px; color: #263183; font-weight: 600;">${it.code}</td>
              <td>${it.accountName}</td>
              <td class="text-right font-mono font-semibold" style="width: 130px;">${this.formatCurrency(it.amount)}</td>
              ${hasPrior ? `<td class="text-right font-mono" style="width: 120px; color: #64748b;">${this.formatCurrency(priorAmt)}</td>` : ''}
            </tr>
          `;
        })
        .join('');
    };

    const signatureHtml = this.generateSignatureBlockHtml({ date: report.dateRange.end });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Profit_Loss_${report.dateRange.start}_to_${report.dateRange.end}</title>
        <style>${this.getBasePrintStyles()}</style>
      </head>
      <body>
        ${headerHtml}

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Gross Revenue</div>
            <div class="kpi-val">${this.formatCurrency(report.totalRevenue)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Cost of Goods Sold</div>
            <div class="kpi-val" style="color: #b91c1c;">${this.formatCurrency(report.totalCogs)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gross Margin Profit</div>
            <div class="kpi-val" style="color: #059669;">${this.formatCurrency(report.grossProfit)}</div>
          </div>
          <div class="kpi-card" style="background: #f0fdf4; border-color: #a7f3d0;">
            <div class="kpi-label" style="color: #065f46;">Net Operating Profit</div>
            <div class="kpi-val" style="color: #047857;">${this.formatCurrency(report.netOperatingProfit)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Account Description</th>
              <th class="text-right">Current Period (LKR)</th>
              ${hasPrior ? '<th class="text-right">Prior Period (LKR)</th>' : ''}
            </tr>
          </thead>
          <tbody>
            <!-- REVENUE -->
            <tr class="section-heading-row">
              <td colspan="${hasPrior ? 4 : 3}">1. Operating Revenue &amp; Turnover</td>
            </tr>
            ${renderItemRows(report.revenueItems)}
            <tr class="subtotal-row">
              <td colspan="2">Total Operating Revenue</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalRevenue)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalRevenue || 0)}</td>` : ''}
            </tr>

            <!-- COGS -->
            <tr class="section-heading-row">
              <td colspan="${hasPrior ? 4 : 3}">2. Cost of Goods Sold (COGS)</td>
            </tr>
            ${renderItemRows(report.cogsItems)}
            <tr class="subtotal-row">
              <td colspan="2">Total Cost of Goods Sold</td>
              <td class="text-right font-mono" style="color: #b91c1c;">${this.formatCurrency(report.totalCogs)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalCogs || 0)}</td>` : ''}
            </tr>

            <!-- GROSS PROFIT -->
            <tr class="grandtotal-row" style="background: #eff6ff; border-color: #3b82f6; color: #1e3a8a;">
              <td colspan="2">Gross Trading Profit</td>
              <td class="text-right font-mono">${this.formatCurrency(report.grossProfit)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.grossProfit || 0)}</td>` : ''}
            </tr>

            <!-- OPERATING EXPENSES -->
            <tr class="section-heading-row">
              <td colspan="${hasPrior ? 4 : 3}">3. Operational &amp; Administrative Expenses</td>
            </tr>
            ${renderItemRows(report.expenseItems)}
            <tr class="subtotal-row">
              <td colspan="2">Total Operating Expenses</td>
              <td class="text-right font-mono" style="color: #b91c1c;">${this.formatCurrency(report.totalOperatingExpenses)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalOperatingExpenses || 0)}</td>` : ''}
            </tr>

            <!-- NET OPERATING PROFIT -->
            <tr class="grandtotal-row">
              <td colspan="2">Net Operating Profit (Bottom Line)</td>
              <td class="text-right font-mono">${this.formatCurrency(report.netOperatingProfit)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.netOperatingProfit || 0)}</td>` : ''}
            </tr>
          </tbody>
        </table>

        ${signatureHtml}
      </body>
      </html>
    `;
  }

  /**
   * Generates complete standalone professional HTML for Balance Sheet Statement
   */
  public generateBalanceSheetHtml(
    report: BalanceSheetReport,
    priorReport?: BalanceSheetReport | null
  ): string {
    const periodLabel = `As of: ${report.asOfDate}`;
    const headerHtml = this.generateHeaderHtml(
      'Statement of Financial Position (Balance Sheet)',
      'Statutory statement of assets, liabilities, and owners equity demonstrating solvency and net worth.',
      periodLabel
    );

    const hasPrior = Boolean(priorReport);
    const priorMap = new Map<string, number>();
    if (priorReport) {
      [
        ...priorReport.currentAssets,
        ...priorReport.nonCurrentAssets,
        ...priorReport.currentLiabilities,
        ...priorReport.longTermLiabilities,
        ...priorReport.equityItems,
      ].forEach((i) => priorMap.set(i.accountId, i.amount));
    }

    const renderItemRows = (
      items: { accountId: string; accountName: string; code: string; amount: number }[]
    ) => {
      if (items.length === 0) {
        return `<tr><td colspan="${hasPrior ? 4 : 3}" style="color: #94a3b8; font-style: italic; padding: 6px 8px;">No balances recorded</td></tr>`;
      }
      return items
        .map((it) => {
          const priorAmt = priorMap.get(it.accountId) || 0;
          return `
            <tr>
              <td class="font-mono" style="width: 70px; color: #263183; font-weight: 600;">${it.code}</td>
              <td>${it.accountName}</td>
              <td class="text-right font-mono font-semibold" style="width: 130px;">${this.formatCurrency(it.amount)}</td>
              ${hasPrior ? `<td class="text-right font-mono" style="width: 120px; color: #64748b;">${this.formatCurrency(priorAmt)}</td>` : ''}
            </tr>
          `;
        })
        .join('');
    };

    const signatureHtml = this.generateSignatureBlockHtml({ date: report.asOfDate });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Balance_Sheet_${report.asOfDate}</title>
        <style>${this.getBasePrintStyles()}</style>
      </head>
      <body>
        ${headerHtml}

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Total Assets</div>
            <div class="kpi-val" style="color: #2563eb;">${this.formatCurrency(report.totalAssets)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Liabilities</div>
            <div class="kpi-val" style="color: #b91c1c;">${this.formatCurrency(report.totalLiabilities)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Equity</div>
            <div class="kpi-val" style="color: #059669;">${this.formatCurrency(report.totalEquity)}</div>
          </div>
          <div class="kpi-card" style="background: ${report.isBalanced ? '#f0fdf4' : '#fff1f2'}; border-color: ${report.isBalanced ? '#a7f3d0' : '#fecdd3'};">
            <div class="kpi-label" style="color: ${report.isBalanced ? '#065f46' : '#9f1239'};">Ledger Balance Status</div>
            <div class="kpi-val" style="color: ${report.isBalanced ? '#047857' : '#be123c'}; font-size: 11px;">
              ${report.isBalanced ? 'Balanced (Δ 0.00)' : `Imbalance: ${this.formatCurrency(report.discrepancy)}`}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Account Description</th>
              <th class="text-right">Current As Of (LKR)</th>
              ${hasPrior ? '<th class="text-right">Prior As Of (LKR)</th>' : ''}
            </tr>
          </thead>
          <tbody>
            <!-- CURRENT ASSETS -->
            <tr class="section-heading-row">
              <td colspan="${hasPrior ? 4 : 3}">1. Current Assets</td>
            </tr>
            ${renderItemRows(report.currentAssets)}
            <tr class="subtotal-row">
              <td colspan="2">Total Current Assets</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalCurrentAssets)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalCurrentAssets || 0)}</td>` : ''}
            </tr>

            <!-- NON-CURRENT ASSETS -->
            <tr class="section-heading-row">
              <td colspan="${hasPrior ? 4 : 3}">2. Non-Current Assets</td>
            </tr>
            ${renderItemRows(report.nonCurrentAssets)}
            <tr class="subtotal-row">
              <td colspan="2">Total Non-Current Assets</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalNonCurrentAssets)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalNonCurrentAssets || 0)}</td>` : ''}
            </tr>

            <!-- TOTAL ASSETS -->
            <tr class="grandtotal-row" style="background: #eff6ff; border-color: #2563eb; color: #1e3a8a;">
              <td colspan="2">Total Assets (A)</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalAssets)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalAssets || 0)}</td>` : ''}
            </tr>

            <!-- CURRENT LIABILITIES -->
            <tr class="section-heading-row">
              <td colspan="${hasPrior ? 4 : 3}">3. Current Liabilities</td>
            </tr>
            ${renderItemRows(report.currentLiabilities)}
            <tr class="subtotal-row">
              <td colspan="2">Total Current Liabilities</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalCurrentLiabilities)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalCurrentLiabilities || 0)}</td>` : ''}
            </tr>

            <!-- NON-CURRENT LIABILITIES -->
            <tr class="section-heading-row">
              <td colspan="${hasPrior ? 4 : 3}">4. Long-Term Liabilities</td>
            </tr>
            ${renderItemRows(report.longTermLiabilities)}
            <tr class="subtotal-row">
              <td colspan="2">Total Long-Term Liabilities</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalLongTermLiabilities)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalLongTermLiabilities || 0)}</td>` : ''}
            </tr>

            <tr class="subtotal-row" style="background: #fdf2f8;">
              <td colspan="2">Total Liabilities</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalLiabilities)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalLiabilities || 0)}</td>` : ''}
            </tr>

            <!-- EQUITY -->
            <tr class="section-heading-row">
              <td colspan="${hasPrior ? 4 : 3}">5. Shareholders &amp; Owners Equity</td>
            </tr>
            ${renderItemRows(report.equityItems)}
            <tr>
              <td class="font-mono" style="color: #263183; font-weight: 600;">3030</td>
              <td>Retained Earnings (Accumulated Reserves)</td>
              <td class="text-right font-mono font-semibold">${this.formatCurrency(report.retainedEarnings)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.retainedEarnings || 0)}</td>` : ''}
            </tr>
            <tr class="subtotal-row">
              <td colspan="2">Total Shareholders Equity</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalEquity)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalEquity || 0)}</td>` : ''}
            </tr>

            <!-- TOTAL LIABILITIES & EQUITY -->
            <tr class="grandtotal-row">
              <td colspan="2">Total Liabilities &amp; Equity (L + E)</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalLiabilitiesAndEquity)}</td>
              ${hasPrior ? `<td class="text-right font-mono">${this.formatCurrency(priorReport?.totalLiabilitiesAndEquity || 0)}</td>` : ''}
            </tr>
          </tbody>
        </table>

        ${signatureHtml}
      </body>
      </html>
    `;
  }

  /**
   * Generates complete standalone professional HTML for Trial Balance
   */
  public generateTrialBalanceHtml(report: TrialBalanceReport): string {
    const periodLabel = `As of: ${report.asOfDate}`;
    const headerHtml = this.generateHeaderHtml(
      'Trial Balance Statement',
      'Statutory double-entry verification proving equality of total debits and credits across all general ledger accounts.',
      periodLabel
    );

    const rowsHtml = report.items
      .map(
        (it) => `
        <tr>
          <td class="font-mono" style="width: 75px; color: #263183; font-weight: 600;">${it.code}</td>
          <td>${it.name}</td>
          <td style="color: #64748b; font-size: 9px;">${it.accountSubClass.replace(/_/g, ' ')}</td>
          <td class="text-right font-mono font-semibold" style="width: 130px;">${it.debit > 0 ? this.formatCurrency(it.debit) : '&mdash;'}</td>
          <td class="text-right font-mono font-semibold" style="width: 130px;">${it.credit > 0 ? this.formatCurrency(it.credit) : '&mdash;'}</td>
        </tr>
      `
      )
      .join('');

    const signatureHtml = this.generateSignatureBlockHtml({ date: report.asOfDate });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Trial_Balance_${report.asOfDate}</title>
        <style>${this.getBasePrintStyles()}</style>
      </head>
      <body>
        ${headerHtml}

        <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
          <div class="kpi-card">
            <div class="kpi-label">Total Ledger Debits</div>
            <div class="kpi-val" style="color: #2563eb;">${this.formatCurrency(report.totalDebit)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Ledger Credits</div>
            <div class="kpi-val" style="color: #0f172a;">${this.formatCurrency(report.totalCredit)}</div>
          </div>
          <div class="kpi-card" style="background: ${report.isBalanced ? '#f0fdf4' : '#fff1f2'}; border-color: ${report.isBalanced ? '#a7f3d0' : '#fecdd3'};">
            <div class="kpi-label" style="color: ${report.isBalanced ? '#065f46' : '#9f1239'};">Equilibrium Verification</div>
            <div class="kpi-val" style="color: ${report.isBalanced ? '#047857' : '#be123c'}; font-size: 11px;">
              ${report.isBalanced ? 'Balanced (Net Diff 0.00)' : `Imbalance: ${this.formatCurrency(report.discrepancy)}`}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Account Title</th>
              <th>Classification</th>
              <th class="text-right">Debit Balance (LKR)</th>
              <th class="text-right">Credit Balance (LKR)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="grandtotal-row">
              <td colspan="3">Total Trial Balance</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalDebit)}</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalCredit)}</td>
            </tr>
          </tbody>
        </table>

        ${signatureHtml}
      </body>
      </html>
    `;
  }

  /**
   * Generates complete standalone professional HTML for General Ledger Account Statement
   */
  public generateGeneralLedgerHtml(report: GeneralLedgerAccountReport): string {
    const periodLabel = `Period: ${report.dateRange.start} to ${report.dateRange.end}`;
    const headerHtml = this.generateHeaderHtml(
      `General Ledger Statement: ${report.account.code} - ${report.account.name}`,
      `Audited account statement with opening balances, chronological transaction postings, and continuous running balances.`,
      periodLabel
    );

    const rowsHtml = report.transactions
      .map(
        (t) => `
        <tr>
          <td style="width: 80px;">${t.date}</td>
          <td class="font-mono" style="width: 95px; color: #263183; font-weight: 600;">${t.entryNumber}</td>
          <td style="width: 75px;"><span style="background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 8.5px;">${t.source}</span></td>
          <td>
            <div style="font-weight: 600; color: #0f172a;">${t.description}</div>
            ${t.reference ? `<div style="font-size: 8.5px; color: #64748b; font-family: monospace;">Ref: ${t.reference}</div>` : ''}
          </td>
          <td class="text-right font-mono font-semibold" style="width: 100px;">${t.debit > 0 ? this.formatCurrency(t.debit) : '&mdash;'}</td>
          <td class="text-right font-mono font-semibold" style="width: 100px;">${t.credit > 0 ? this.formatCurrency(t.credit) : '&mdash;'}</td>
          <td class="text-right font-mono font-bold" style="width: 110px;">${this.formatCurrency(t.runningBalance)}</td>
        </tr>
      `
      )
      .join('');

    const signatureHtml = this.generateSignatureBlockHtml({ date: report.dateRange.end });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>General_Ledger_${report.account.code}_${report.dateRange.start}_to_${report.dateRange.end}</title>
        <style>${this.getBasePrintStyles()}</style>
      </head>
      <body>
        ${headerHtml}

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Opening Balance</div>
            <div class="kpi-val">${this.formatCurrency(report.openingBalance)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Period Debits</div>
            <div class="kpi-val" style="color: #2563eb;">${this.formatCurrency(report.totalDebits)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Period Credits</div>
            <div class="kpi-val" style="color: #0f172a;">${this.formatCurrency(report.totalCredits)}</div>
          </div>
          <div class="kpi-card" style="background: #eff6ff; border-color: #bfdbfe;">
            <div class="kpi-label" style="color: #1e3a8a;">Closing Balance</div>
            <div class="kpi-val" style="color: #1e40af;">${this.formatCurrency(report.closingBalance)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher #</th>
              <th>Source</th>
              <th>Description &amp; Reference</th>
              <th class="text-right">Debit (LKR)</th>
              <th class="text-right">Credit (LKR)</th>
              <th class="text-right">Running Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #f8fafc; font-style: italic; color: #64748b;">
              <td>${report.dateRange.start}</td>
              <td>&mdash;</td>
              <td><span style="background: #e2e8f0; padding: 1px 4px; border-radius: 3px; font-size: 8px;">OPENING</span></td>
              <td>Opening balance brought forward</td>
              <td class="text-right">&mdash;</td>
              <td class="text-right">&mdash;</td>
              <td class="text-right font-mono font-bold">${this.formatCurrency(report.openingBalance)}</td>
            </tr>
            ${rowsHtml}
            <tr class="grandtotal-row">
              <td colspan="4">Closing Balance as of ${report.dateRange.end}</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalDebits)}</td>
              <td class="text-right font-mono">${this.formatCurrency(report.totalCredits)}</td>
              <td class="text-right font-mono">${this.formatCurrency(report.closingBalance)}</td>
            </tr>
          </tbody>
        </table>

        ${signatureHtml}
      </body>
      </html>
    `;
  }

  /**
   * Generates complete standalone professional HTML for Statutory VAT Report
   */
  public generateVatReportHtml(report: VatReport): string {
    const periodLabel = `Period: ${report.dateRange.start} to ${report.dateRange.end}`;
    const headerHtml = this.generateHeaderHtml(
      'Statutory VAT Return & RAMIS Tax Filing Statement',
      'Inland Revenue Department (IRD) statutory compliance report under Value Added Tax Act No. 14 of 2002.',
      periodLabel
    );

    const salesRows = report.transactions
      .map(
        (t) => `
        <tr>
          <td style="width: 80px;">${t.date}</td>
          <td class="font-mono" style="width: 100px; color: #263183; font-weight: 600;">${t.invoiceNumber}</td>
          <td>${t.customerName}</td>
          <td style="width: 100px; font-family: monospace;">${t.customerTin || '&mdash;'}</td>
          <td class="text-right font-mono" style="width: 120px;">${this.formatCurrency(t.taxableAmount)}</td>
          <td class="text-right font-mono font-semibold" style="width: 110px;">${this.formatCurrency(t.vatAmount)}</td>
        </tr>
      `
      )
      .join('');

    const signatureHtml = this.generateSignatureBlockHtml({ date: report.dateRange.end });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>VAT_Return_${report.dateRange.start}_to_${report.dateRange.end}</title>
        <style>${this.getBasePrintStyles()}</style>
      </head>
      <body>
        ${headerHtml}

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Taxable Supplies Base</div>
            <div class="kpi-val">${this.formatCurrency(report.taxableSales)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Output VAT Collected (18%)</div>
            <div class="kpi-val" style="color: #b45309;">${this.formatCurrency(report.vatCollected)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Input VAT Deductible (18%)</div>
            <div class="kpi-val" style="color: #2563eb;">${this.formatCurrency(report.vatPaidOnPurchases)}</div>
          </div>
          <div class="kpi-card" style="background: #eff6ff; border-color: #bfdbfe;">
            <div class="kpi-label" style="color: #1e3a8a;">Net IRD Tax Payable</div>
            <div class="kpi-val" style="color: #1e40af;">${this.formatCurrency(report.netVatPayable)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice / Ref #</th>
              <th>Customer / Purchaser</th>
              <th>TIN / VAT #</th>
              <th class="text-right">Taxable Supplies (LKR)</th>
              <th class="text-right">Output VAT 18% (LKR)</th>
            </tr>
          </thead>
          <tbody>
            ${salesRows}
            <tr class="grandtotal-row">
              <td colspan="4">Total Statutory Sales Supplies &amp; Output VAT</td>
              <td class="text-right font-mono">${this.formatCurrency(report.taxableSales)}</td>
              <td class="text-right font-mono">${this.formatCurrency(report.vatCollected)}</td>
            </tr>
          </tbody>
        </table>

        ${signatureHtml}
      </body>
      </html>
    `;
  }

  /**
   * Opens clean print window with professional HTML document and initiates system print dialog
   */
  public printReportHtml(htmlContent: string, documentTitle: string): void {
    if (typeof window === 'undefined') return;

    // Use an isolated hidden iframe or popup window for clean professional printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      // Fallback in case onload is instantaneous
      setTimeout(() => {
        if (printWindow) {
          printWindow.focus();
          printWindow.print();
        }
      }, 250);
    } else {
      // Fallback: download as printable HTML file if popup is blocked
      this.downloadPrintableHtml(documentTitle, htmlContent, `${documentTitle}.html`);
    }
  }

  /**
   * Triggers native print dialog with pre-configured document title (backward compatibility)
   */
  public triggerPrint(documentTitle: string): void {
    if (typeof window === 'undefined') return;
    const originalTitle = document.title;
    document.title = documentTitle;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }

  /**
   * Generates a downloadable standalone HTML file that can be opened in any browser
   * or converted to PDF natively with clean print styles.
   */
  public downloadPrintableHtml(
    reportTitle: string,
    htmlContent: string,
    filename: string
  ): void {
    if (typeof window === 'undefined' || !window.document) return;

    const fullHtml = htmlContent.includes('<!DOCTYPE html>')
      ? htmlContent
      : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>${this.getBasePrintStyles()}</style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const reportPdfService = new ReportPdfService();
