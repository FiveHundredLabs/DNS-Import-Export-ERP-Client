import { VatSalesTransaction, VatPurchaseTransaction } from '../api/types';

export interface RamisDeclarantInfo {
  companyName: string;
  tin: string;
  vatNumber: string;
  svatNumber?: string;
  taxPeriodStart: string;
  taxPeriodEnd: string;
}

export const DEFAULT_DECLARANT: RamisDeclarantInfo = {
  companyName: 'DNS Import & Export (Pvt) Ltd',
  tin: '102938475',
  vatNumber: 'VAT-102938475',
  svatNumber: 'SVAT-009988',
  taxPeriodStart: '2026-09-01',
  taxPeriodEnd: '2026-09-30',
};

export class RamisExportService {
  /**
   * Generates RAMIS Schedule 01 (Sales & Output Supplies) CSV export.
   * Format conforms to Inland Revenue Department (IRD) Sri Lanka RAMIS specification.
   */
  generateSchedule01Csv(
    sales: VatSalesTransaction[],
    declarant: Partial<RamisDeclarantInfo> = {}
  ): string {
    const info = { ...DEFAULT_DECLARANT, ...declarant };
    const rows: string[] = [];

    // Header Metadata rows
    rows.push('# RAMIS STATUTORY VAT SCHEDULE 01 - SALES & OUTPUT SUPPLIES');
    rows.push(`# DECLARANT: ${info.companyName}`);
    rows.push(`# DECLARANT TIN: ${info.tin} | VAT REG: ${info.vatNumber} | SVAT: ${info.svatNumber || 'N/A'}`);
    rows.push(`# TAX PERIOD: ${info.taxPeriodStart} to ${info.taxPeriodEnd}`);
    rows.push('');

    // Table Column Headers
    rows.push(
      [
        'SeqNo',
        'InvoiceDate',
        'InvoiceNumber',
        'CustomerName',
        'CustomerTIN',
        'CustomerSVAT',
        'IsSVAT',
        'TaxableAmountLKR',
        'VATRate',
        'VATAmountLKR',
        'SVATAmountLKR',
        'TotalInvoiceAmountLKR',
      ].join(',')
    );

    let seq = 1;
    let totalTaxable = 0;
    let totalVat = 0;
    let totalSvat = 0;
    let totalGross = 0;

    for (const item of sales) {
      const isSvat = item.isSvat || false;
      const svatVal = item.svatAmount || (isSvat ? item.vatAmount : 0);
      const gross = item.taxableAmount + item.vatAmount;

      totalTaxable += item.taxableAmount;
      totalVat += item.vatAmount;
      totalSvat += svatVal;
      totalGross += gross;

      const escapedCustName = `"${String(item.customerName || '').replace(/"/g, '""')}"`;
      const custTin = item.customerTin || '102938475-7000';
      const custSvat = item.customerSvat || (isSvat ? 'SVAT-00123' : 'N/A');

      rows.push(
        [
          seq++,
          item.date,
          item.invoiceNumber,
          escapedCustName,
          custTin,
          custSvat,
          isSvat ? 'YES' : 'NO',
          item.taxableAmount.toFixed(2),
          '18.00%',
          item.vatAmount.toFixed(2),
          svatVal.toFixed(2),
          gross.toFixed(2),
        ].join(',')
      );
    }

    // Summary line
    rows.push('');
    rows.push(
      [
        'TOTALS',
        '',
        '',
        `"Count: ${sales.length}"`,
        '',
        '',
        '',
        totalTaxable.toFixed(2),
        '',
        totalVat.toFixed(2),
        totalSvat.toFixed(2),
        totalGross.toFixed(2),
      ].join(',')
    );

    return rows.join('\r\n');
  }

  /**
   * Generates RAMIS Schedule 01 (Sales & Output Supplies) XML export.
   */
  generateSchedule01Xml(
    sales: VatSalesTransaction[],
    declarant: Partial<RamisDeclarantInfo> = {}
  ): string {
    const info = { ...DEFAULT_DECLARANT, ...declarant };
    let totalTaxable = 0;
    let totalVat = 0;
    let totalSvat = 0;

    const itemsXml = sales
      .map((item, idx) => {
        const isSvat = item.isSvat || false;
        const svatVal = item.svatAmount || (isSvat ? item.vatAmount : 0);
        totalTaxable += item.taxableAmount;
        totalVat += item.vatAmount;
        totalSvat += svatVal;
        const total = item.taxableAmount + item.vatAmount;

        const custTin = item.customerTin || '102938475-7000';
        const custSvat = item.customerSvat || (isSvat ? 'SVAT-00123' : 'N/A');

        return `    <Item>
      <SeqNo>${idx + 1}</SeqNo>
      <InvoiceDate>${item.date}</InvoiceDate>
      <InvoiceNumber>${escapeXml(item.invoiceNumber)}</InvoiceNumber>
      <CustomerName>${escapeXml(item.customerName)}</CustomerName>
      <CustomerTIN>${escapeXml(custTin)}</CustomerTIN>
      <CustomerSVAT>${escapeXml(custSvat)}</CustomerSVAT>
      <IsSVAT>${isSvat ? 'true' : 'false'}</IsSVAT>
      <TaxableAmount>${item.taxableAmount.toFixed(2)}</TaxableAmount>
      <VATRate>18.00</VATRate>
      <VATAmount>${item.vatAmount.toFixed(2)}</VATAmount>
      <SVATAmount>${svatVal.toFixed(2)}</SVATAmount>
      <TotalAmount>${total.toFixed(2)}</TotalAmount>
    </Item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<RAMISDeclaration type="VAT" schedule="01">
  <Header>
    <DeclarantName>${escapeXml(info.companyName)}</DeclarantName>
    <DeclarantTIN>${escapeXml(info.tin)}</DeclarantTIN>
    <VATRegistrationNo>${escapeXml(info.vatNumber)}</VATRegistrationNo>
    <SVATRegistrationNo>${escapeXml(info.svatNumber || 'N/A')}</SVATRegistrationNo>
    <TaxPeriodStart>${info.taxPeriodStart}</TaxPeriodStart>
    <TaxPeriodEnd>${info.taxPeriodEnd}</TaxPeriodEnd>
    <ScheduleType>SCHEDULE_01_SALES_SUPPLIES</ScheduleType>
    <StandardVATRate>18.00</StandardVATRate>
    <TotalRecords>${sales.length}</TotalRecords>
  </Header>
  <Schedule01Items>
${itemsXml}
  </Schedule01Items>
  <Summary>
    <TotalTaxableSupplies>${totalTaxable.toFixed(2)}</TotalTaxableSupplies>
    <TotalOutputVATCollected>${totalVat.toFixed(2)}</TotalOutputVATCollected>
    <TotalSVATSuspended>${totalSvat.toFixed(2)}</TotalSVATSuspended>
    <TotalGrossRevenue>${(totalTaxable + totalVat).toFixed(2)}</TotalGrossRevenue>
  </Summary>
</RAMISDeclaration>`;
  }

  /**
   * Generates RAMIS Schedule 02 (Purchases & Input Supplies) CSV export.
   * Format conforms to Inland Revenue Department (IRD) Sri Lanka RAMIS specification.
   */
  generateSchedule02Csv(
    purchases: VatPurchaseTransaction[],
    declarant: Partial<RamisDeclarantInfo> = {}
  ): string {
    const info = { ...DEFAULT_DECLARANT, ...declarant };
    const rows: string[] = [];

    rows.push('# RAMIS STATUTORY VAT SCHEDULE 02 - PURCHASES & INPUT SUPPLIES');
    rows.push(`# DECLARANT: ${info.companyName}`);
    rows.push(`# DECLARANT TIN: ${info.tin} | VAT REG: ${info.vatNumber} | SVAT: ${info.svatNumber || 'N/A'}`);
    rows.push(`# TAX PERIOD: ${info.taxPeriodStart} to ${info.taxPeriodEnd}`);
    rows.push('');

    rows.push(
      [
        'SeqNo',
        'BillDate',
        'BillReferenceNumber',
        'SupplierName',
        'SupplierTIN',
        'SupplierSVAT',
        'IsSVAT',
        'TaxablePurchasesLKR',
        'InputVATRate',
        'InputVATClaimedLKR',
        'SuspendedInputVATLKR',
        'TotalPurchaseAmountLKR',
      ].join(',')
    );

    let seq = 1;
    let totalTaxable = 0;
    let totalVat = 0;
    let totalSvat = 0;
    let totalGross = 0;

    for (const item of purchases) {
      const isSvat = item.isSvat || false;
      const svatVal = item.svatAmount || (isSvat ? item.vatAmount : 0);
      const gross = item.taxableAmount + item.vatAmount;

      totalTaxable += item.taxableAmount;
      totalVat += item.vatAmount;
      totalSvat += svatVal;
      totalGross += gross;

      const escapedSuppName = `"${String(item.supplierName || '').replace(/"/g, '""')}"`;
      const suppTin = item.supplierTin || 'VAT-102938475';
      const suppSvat = item.supplierSvat || (isSvat ? 'SVAT-00441' : 'N/A');

      rows.push(
        [
          seq++,
          item.date,
          item.billNumber,
          escapedSuppName,
          suppTin,
          suppSvat,
          isSvat ? 'YES' : 'NO',
          item.taxableAmount.toFixed(2),
          '18.00%',
          item.vatAmount.toFixed(2),
          svatVal.toFixed(2),
          gross.toFixed(2),
        ].join(',')
      );
    }

    rows.push('');
    rows.push(
      [
        'TOTALS',
        '',
        '',
        `"Count: ${purchases.length}"`,
        '',
        '',
        '',
        totalTaxable.toFixed(2),
        '',
        totalVat.toFixed(2),
        totalSvat.toFixed(2),
        totalGross.toFixed(2),
      ].join(',')
    );

    return rows.join('\r\n');
  }

  /**
   * Generates RAMIS Schedule 02 (Purchases & Input Supplies) XML export.
   */
  generateSchedule02Xml(
    purchases: VatPurchaseTransaction[],
    declarant: Partial<RamisDeclarantInfo> = {}
  ): string {
    const info = { ...DEFAULT_DECLARANT, ...declarant };
    let totalTaxable = 0;
    let totalVat = 0;
    let totalSvat = 0;

    const itemsXml = purchases
      .map((item, idx) => {
        const isSvat = item.isSvat || false;
        const svatVal = item.svatAmount || (isSvat ? item.vatAmount : 0);
        totalTaxable += item.taxableAmount;
        totalVat += item.vatAmount;
        totalSvat += svatVal;
        const total = item.taxableAmount + item.vatAmount;

        const suppTin = item.supplierTin || 'VAT-102938475';
        const suppSvat = item.supplierSvat || (isSvat ? 'SVAT-00441' : 'N/A');

        return `    <Item>
      <SeqNo>${idx + 1}</SeqNo>
      <BillDate>${item.date}</BillDate>
      <BillReferenceNumber>${escapeXml(item.billNumber)}</BillReferenceNumber>
      <SupplierName>${escapeXml(item.supplierName)}</SupplierName>
      <SupplierTIN>${escapeXml(suppTin)}</SupplierTIN>
      <SupplierSVAT>${escapeXml(suppSvat)}</SupplierSVAT>
      <IsSVAT>${isSvat ? 'true' : 'false'}</IsSVAT>
      <TaxablePurchases>${item.taxableAmount.toFixed(2)}</TaxablePurchases>
      <InputVATRate>18.00</InputVATRate>
      <InputVATClaimed>${item.vatAmount.toFixed(2)}</InputVATClaimed>
      <SuspendedInputVAT>${svatVal.toFixed(2)}</SuspendedInputVAT>
      <TotalPurchaseAmount>${total.toFixed(2)}</TotalPurchaseAmount>
    </Item>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<RAMISDeclaration type="VAT" schedule="02">
  <Header>
    <DeclarantName>${escapeXml(info.companyName)}</DeclarantName>
    <DeclarantTIN>${escapeXml(info.tin)}</DeclarantTIN>
    <VATRegistrationNo>${escapeXml(info.vatNumber)}</VATRegistrationNo>
    <SVATRegistrationNo>${escapeXml(info.svatNumber || 'N/A')}</SVATRegistrationNo>
    <TaxPeriodStart>${info.taxPeriodStart}</TaxPeriodStart>
    <TaxPeriodEnd>${info.taxPeriodEnd}</TaxPeriodEnd>
    <ScheduleType>SCHEDULE_02_PURCHASES_INPUT_VAT</ScheduleType>
    <StandardVATRate>18.00</StandardVATRate>
    <TotalRecords>${purchases.length}</TotalRecords>
  </Header>
  <Schedule02Items>
${itemsXml}
  </Schedule02Items>
  <Summary>
    <TotalTaxablePurchases>${totalTaxable.toFixed(2)}</TotalTaxablePurchases>
    <TotalInputVATClaimed>${totalVat.toFixed(2)}</TotalInputVATClaimed>
    <TotalSVATSuspendedPurchases>${totalSvat.toFixed(2)}</TotalSVATSuspendedPurchases>
    <TotalGrossPurchases>${(totalTaxable + totalVat).toFixed(2)}</TotalGrossPurchases>
  </Summary>
</RAMISDeclaration>`;
  }

  /**
   * Helper to initiate client-side download of exported statutory files.
   */
  downloadFile(filename: string, content: string, mimeType: string): void {
    if (typeof window === 'undefined' || !window.document) return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

function escapeXml(unsafe?: string | number | null): string {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const ramisExportService = new RamisExportService();
