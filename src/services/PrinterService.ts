import { Quotation } from '../types/quotation';
import { Invoice } from '../types/invoice';
import { Payment } from '../types/payment';
import { POSTransaction } from '../types/pos';
import { PurchaseOrder } from '../types/purchasing';
import { pdfService } from './PdfService';

export interface ThermalReceiptData {
  title: string;
  receiptNumber: string;
  dateTime: string;
  customerName: string;
  amountPaid: number;
  paymentMethod: string;
  chequeNumber?: string;
  bankName?: string;
  cashierOrRepName: string;
  balanceDueRemaining?: number;
  invoiceAllocations?: Array<{ invoiceNumber: string; allocatedAmount: number }>;
  paperWidth?: '80mm' | '58mm';
}

export interface IPrinterService {
  printThermalReceipt(data: ThermalReceiptData): Promise<boolean>;
  printPOSTransactionReceipt(tx: POSTransaction): Promise<boolean>;
  printQuotation(quotation: Quotation): Promise<boolean>;
  printInvoice(invoice: Invoice, format?: 'STANDARD' | 'IRD_TAX'): Promise<boolean>;
  printPaymentReceipt(payment: Payment, remainingBalance?: number, paperWidth?: '80mm' | '58mm'): Promise<boolean>;
  printPurchaseOrder(purchaseOrder: PurchaseOrder): Promise<boolean>;
  isPrinterConnected(): Promise<boolean>;
}

export class ThermalPrinterService implements IPrinterService {
  async isPrinterConnected(): Promise<boolean> {
    return true; // Virtual / browser print driver available
  }

  async printThermalReceipt(data: ThermalReceiptData): Promise<boolean> {
    if (typeof window === 'undefined' || !window.open) return false;
    try {
      const printWindow = window.open('', '_blank', 'width=350,height=600');
      if (!printWindow || !printWindow.document) return false;

      const allocHtml =
        data.invoiceAllocations && data.invoiceAllocations.length > 0
          ? `
          <div class="divider"></div>
          <div class="bold" style="font-size: 11px;">INVOICE SETTLEMENTS:</div>
          ${data.invoiceAllocations
            .map(
              (a) =>
                `<div class="row" style="font-size: 11px;"><span>${a.invoiceNumber}</span><span>LKR ${a.allocatedAmount.toLocaleString()}</span></div>`
            )
            .join('')}
        `
          : '';

      const is58mm = data.paperWidth === '58mm';
      const receiptHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${data.receiptNumber}</title>
            <style>
              @page { margin: 0; size: ${is58mm ? '58mm' : '80mm'} auto; }
              body {
                font-family: 'Courier New', Courier, monospace;
                width: ${is58mm ? '200px' : '280px'};
                margin: 0 auto;
                padding: ${is58mm ? '6px' : '10px'};
                font-size: ${is58mm ? '10px' : '12px'};
                color: #000;
                word-break: break-word;
              }
              .center { text-align: center; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .row { display: flex; justify-content: space-between; margin: 2px 0; gap: 4px; }
              .bold { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size: 14px;">DNS DISTRIBUTION (PVT) LTD</div>
            <div class="center">Colombo 11, Sri Lanka</div>
            <div class="center">Tel: +94 11 234 5678</div>
            <div class="center" style="font-size: 10px;">VAT Reg: 109847291-7000</div>
            <div class="divider"></div>
            <div class="center bold">${data.title}</div>
            <div class="row"><span>Rcpt No:</span><span>${data.receiptNumber}</span></div>
            <div class="row"><span>Date:</span><span>${data.dateTime}</span></div>
            <div class="row"><span>Customer:</span><span>${data.customerName}</span></div>
            <div class="row"><span>Officer:</span><span>${data.cashierOrRepName}</span></div>
            <div class="divider"></div>
            <div class="row bold"><span>Payment Method:</span><span>${data.paymentMethod}</span></div>
            ${data.chequeNumber ? `<div class="row"><span>Cheque No:</span><span>${data.chequeNumber}</span></div>` : ''}
            ${data.bankName ? `<div class="row"><span>Bank:</span><span>${data.bankName}</span></div>` : ''}
            <div class="row bold" style="font-size: 14px; margin-top: 6px;">
              <span>AMOUNT PAID:</span>
              <span>LKR ${data.amountPaid.toLocaleString()}</span>
            </div>
            ${allocHtml}
            ${
              data.balanceDueRemaining !== undefined
                ? `
              <div class="divider"></div>
              <div class="row bold"><span>Remaining Balance:</span><span>LKR ${data.balanceDueRemaining.toLocaleString()}</span></div>
            `
                : ''
            }
            <div class="divider"></div>
            <div class="center" style="font-size: 10px;">Subject to Realization / Finance Approval</div>
            <div class="center" style="font-size: 10px; margin-top: 4px;">Thank you for your business!</div>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      return true;
    } catch {
      return false;
    }
  }

  async printPaymentReceipt(payment: Payment, remainingBalance?: number, paperWidth: '80mm' | '58mm' = '80mm'): Promise<boolean> {
    return this.printThermalReceipt({
      title: payment.status === 'APPROVED' ? 'OFFICIAL RECEIPT' : 'COLLECTION ACKNOWLEDGEMENT',
      receiptNumber: payment.receiptNumber,
      dateTime: new Date(payment.collectedAt).toLocaleString(),
      customerName: payment.customerName,
      amountPaid: payment.amount,
      paymentMethod: payment.paymentMethod,
      chequeNumber: payment.chequeNumber,
      bankName: payment.bankName,
      cashierOrRepName: payment.salesRepName,
      balanceDueRemaining: remainingBalance,
      invoiceAllocations: payment.invoiceAllocations,
      paperWidth,
    });
  }

  async printPOSTransactionReceipt(tx: POSTransaction): Promise<boolean> {
    if (typeof window === 'undefined' || !window.open) return false;
    try {
      const printWindow = window.open('', '_blank', 'width=350,height=600');
      if (!printWindow || !printWindow.document) return false;

      const itemRows = tx.items
        .map(
          (it) => `
          <div style="margin-bottom: 4px;">
            <div class="row bold">
              <span>${it.productNameSnapshot}</span>
            </div>
            <div class="row" style="font-size: 11px; color: #333;">
              <span>${it.quantity} x LKR ${it.unitPriceSnapshot.toLocaleString()}${it.discountPercentage > 0 ? ` (-${it.discountPercentage}%)` : ''}</span>
              <span>LKR ${it.lineTotal.toLocaleString()}</span>
            </div>
          </div>
        `
        )
        .join('');

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>POS Receipt - ${tx.receiptNumber}</title>
            <style>
              @page { margin: 0; size: 80mm auto; }
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 280px;
                margin: 0 auto;
                padding: 10px;
                font-size: 12px;
                color: #000;
              }
              .center { text-align: center; }
              .divider { border-top: 1px dashed #000; margin: 8px 0; }
              .row { display: flex; justify-content: space-between; margin: 3px 0; }
              .bold { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size: 14px;">DNS DISTRIBUTION (PVT) LTD</div>
            <div class="center">Showroom Sales Outlet</div>
            <div class="center">142 First Cross Street, Colombo 11</div>
            <div class="center">Tel: +94 11 234 5678</div>
            <div class="center" style="font-size: 10px;">VAT Reg: 109847291-7000</div>
            <div class="divider"></div>
            <div class="center bold">SHOWROOM SALES RECEIPT</div>
            <div class="row"><span>Receipt No:</span><span>${tx.receiptNumber}</span></div>
            <div class="row"><span>Date:</span><span>${new Date(tx.createdAt).toLocaleString()}</span></div>
            <div class="row"><span>Cashier:</span><span>${tx.cashierName}</span></div>
            <div class="row"><span>Customer:</span><span>${tx.customerName || 'Walk-in Retail Customer'}</span></div>
            <div class="divider"></div>
            <div class="bold" style="margin-bottom: 4px;">ITEMS:</div>
            ${itemRows}
            <div class="divider"></div>
            <div class="row"><span>Subtotal:</span><span>LKR ${tx.subtotal.toLocaleString()}</span></div>
            ${tx.discountTotal > 0 ? `<div class="row"><span>Discount:</span><span>- LKR ${tx.discountTotal.toLocaleString()}</span></div>` : ''}
            ${tx.taxTotal > 0 ? `<div class="row"><span>VAT (18%):</span><span>LKR ${tx.taxTotal.toLocaleString()}</span></div>` : ''}
            <div class="row bold" style="font-size: 14px; margin-top: 4px;">
              <span>TOTAL:</span>
              <span>LKR ${tx.totalAmount.toLocaleString()}</span>
            </div>
            <div class="divider"></div>
            <div class="row"><span>Payment Method:</span><span class="bold">${tx.paymentMethod}</span></div>
            ${tx.cashTendered !== undefined ? `<div class="row"><span>Cash Tendered:</span><span>LKR ${tx.cashTendered.toLocaleString()}</span></div>` : ''}
            ${tx.changeGiven !== undefined ? `<div class="row bold"><span>Change Given:</span><span>LKR ${tx.changeGiven.toLocaleString()}</span></div>` : ''}
            ${tx.chequeDetails ? `<div class="row"><span>Cheque No:</span><span>${tx.chequeDetails.chequeNumber} (${tx.chequeDetails.bankName})</span></div>` : ''}
            <div class="divider"></div>
            <div class="center" style="font-size: 11px;">Warranty valid with this receipt.</div>
            <div class="center" style="font-size: 11px; margin-top: 2px;">Thank you for shopping at DNS!</div>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      return true;
    } catch {
      return false;
    }
  }

  async printQuotation(quotation: Quotation): Promise<boolean> {
    if (typeof window === 'undefined' || !window.open) return false;
    try {
      const printWindow = window.open('', '_blank', 'width=850,height=1100');
      if (!printWindow || !printWindow.document) return false;

    const itemRows = quotation.items
      .map(
        (it, idx) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">
            <strong>${it.productNameSnapshot}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">SKU: ${it.skuSnapshot}</span>
          </td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${it.quantity} ${it.uomSnapshot || 'pcs'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">LKR ${it.unitPriceSnapshot.toLocaleString()}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${it.discountPercentage}%</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">LKR ${it.lineTotal.toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    const quotationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation - ${quotation.quotationNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 13px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px; }
            .company { font-size: 20px; font-weight: bold; color: #1e3a8a; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .meta-table td { vertical-align: top; padding: 4px 8px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
            .totals { width: 320px; margin-left: auto; border-collapse: collapse; }
            .totals td { padding: 6px 12px; }
            .grand-total { font-weight: bold; font-size: 15px; border-top: 2px solid #1e3a8a; color: #1e3a8a; }
            .footer-notes { margin-top: 30px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            .signature-row { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature-line { width: 180px; border-top: 1px dashed #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">DNS DISTRIBUTION (PVT) LTD</div>
              <div style="font-size: 12px; color: #64748b;">Authorized Electrical & Automation Distributor</div>
              <div style="font-size: 11px; color: #64748b;">Colombo 11, Sri Lanka | VAT: 109847291-7000</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #0f172a; font-size: 22px;">QUOTATION</h2>
              <div style="font-family: monospace; font-weight: bold; color: #4338ca; font-size: 15px;">${quotation.quotationNumber}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Valid Until: ${quotation.validUntil}</div>
            </div>
          </div>

          <table class="meta-table">
            <tr>
              <td style="width: 50%;">
                <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Customer:</div>
                <div style="font-size: 14px; font-weight: bold;">${quotation.customerNameSnapshot}</div>
                <div style="font-size: 11px; color: #64748b;">Code: ${quotation.customerCodeSnapshot}</div>
                <div>${quotation.customerAddressSnapshot || ''}</div>
                <div>Tel: ${quotation.customerPhoneSnapshot}</div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Sales Representative:</div>
                <div style="font-size: 13px; font-weight: bold;">${quotation.salesRepNameSnapshot}</div>
                <div style="font-size: 11px; color: #64748b;">DNS Commercial Division</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Date: ${new Date(quotation.createdAt).toLocaleDateString()}</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Item & Description</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 110px; text-align: right;">Unit Price</th>
                <th style="width: 80px; text-align: right;">Disc %</th>
                <th style="width: 120px; text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <table class="totals">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td style="text-align: right;">LKR ${quotation.subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Discount:</td>
              <td style="text-align: right; color: #16a34a;">- LKR ${quotation.discountAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">${quotation.taxEnabled !== false && quotation.taxAmount > 0 ? `VAT (${quotation.taxRatePercentage ?? 18}%):` : 'Tax:'}</td>
              <td style="text-align: right; font-weight: 600;">LKR ${quotation.taxAmount.toLocaleString()}</td>
            </tr>
            <tr class="grand-total">
              <td>Grand Total:</td>
              <td style="text-align: right;">LKR ${quotation.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

          <div class="footer-notes">
            <strong>Terms & Conditions:</strong>
            <p style="margin: 4px 0;">${quotation.termsAndConditions || 'Payment within agreed credit period. Prices valid until specified validity date.'}</p>
            ${quotation.notes ? `<p style="margin: 4px 0;"><strong>Remarks:</strong> ${quotation.notes}</p>` : ''}
          </div>

          <div class="signature-row">
            <div class="signature-line">Prepared By (Sales Rep)</div>
            <div class="signature-line">Authorized Signature</div>
            <div class="signature-line">Customer Acceptance</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(quotationHtml);
    printWindow.document.close();
    return true;
  } catch {
    return false;
  }
}

  async printInvoice(invoice: Invoice, format: 'STANDARD' | 'IRD_TAX' = 'STANDARD'): Promise<boolean> {
    if (typeof window === 'undefined' || !window.open) return false;
    try {
      const printWindow = window.open('', '_blank', 'width=850,height=1100');
      if (!printWindow || !printWindow.document) return false;

      let invoiceHtml = '';

      if (format === 'IRD_TAX') {
        const taxableBase = Math.max(0, invoice.subtotal - invoice.discountTotal);
        const vatAmount = invoice.taxTotal;
        const vatRate = invoice.taxRatePercentage ?? 18;
        const isVatRegistered = Boolean(invoice.customerVatNumber);

        const itemRows = invoice.items
          .map((it, idx) => {
            const itemBase = it.lineTotal / (1 + (it.taxPercentage || vatRate) / 100);
            const itemVat = it.lineTotal - itemBase;

            return `
            <tr>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${idx + 1}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">
                <strong>${it.productNameSnapshot}</strong><br/>
                <span style="font-size: 10px; color: #64748b; font-family: monospace;">SKU: ${it.skuSnapshot}</span>
              </td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${it.quantity} ${it.uomSnapshot || 'pcs'}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">LKR ${it.unitPriceSnapshot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">LKR ${itemBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace;">${it.taxPercentage || vatRate}%</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">LKR ${itemVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-weight: bold;">LKR ${it.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
          })
          .join('');

        invoiceHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Tax_Invoice_${invoice.invoiceNumber}</title>
              <style>
                @page { size: A4 portrait; margin: 10mm; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                  color: #0f172a;
                  font-size: 11px;
                  line-height: 1.4;
                  padding: 12px;
                  background: #fff;
                }
                .ird-banner { display: flex; justify-content: space-between; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }
                .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
                .tax-badge { display: inline-block; border: 2px solid #0f172a; padding: 4px 12px; font-weight: 900; font-size: 16px; text-transform: uppercase; background: #f8fafc; }
                .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; }
                .meta-table td { padding: 8px 10px; vertical-align: top; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
                .items-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; font-size: 10px; text-transform: uppercase; color: #0f172a; font-weight: bold; }
                .summary-table { width: 100%; border-collapse: collapse; }
                .tax-ledger { width: 100%; border: 1px solid #cbd5e1; border-collapse: collapse; background: #f8fafc; }
                .tax-ledger td { padding: 4px 8px; font-size: 10.5px; }
                .grand-total { font-size: 13px; font-weight: 900; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
                .statutory-box { border: 1px dashed #94a3b8; padding: 8px; background: #fff; font-size: 9.5px; color: #475569; }
                .signatures { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 8px; border-top: 1px solid #0f172a; text-align: center; }
                .sig-box { width: 180px; }
                .sig-line { border-top: 1px dashed #64748b; margin-top: 28px; padding-top: 4px; font-size: 9.5px; font-weight: bold; text-transform: uppercase; }
              </style>
            </head>
            <body>
              <div class="ird-banner">
                <span>Inland Revenue Department — Sri Lanka</span>
                <span>Value Added Tax (VAT) Act No. 14 of 2002 (Section 20)</span>
                <span>Original for Buyer</span>
              </div>

              <table class="header-table">
                <tr>
                  <td style="vertical-align: top; width: 60%;">
                    <div style="font-size: 18px; font-weight: 900; color: #0f172a;">DNS DISTRIBUTION (PVT) LTD</div>
                    <div style="font-size: 10.5px; color: #475569;">142 First Cross Street, Colombo 11, Sri Lanka</div>
                    <div style="font-size: 10px; color: #334155; margin-top: 4px;">
                      <strong>TIN:</strong> 109847291 &nbsp;|&nbsp; <strong>VAT Reg No:</strong> 109847291-7000 &nbsp;|&nbsp; <strong>SVAT:</strong> SVAT-004219
                    </div>
                    <div style="font-size: 10px; color: #64748b;">Tel: +94 11 234 5678 | Email: tax@dnsdistribution.lk</div>
                  </td>
                  <td style="vertical-align: top; text-align: right; width: 40%;">
                    <div class="tax-badge">TAX INVOICE</div>
                    <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #1e3a8a; margin-top: 4px;">${invoice.invoiceNumber}</div>
                    <div style="font-size: 10px; color: #475569; margin-top: 2px;">Date of Issue: <strong>${invoice.issueDate}</strong></div>
                    <div style="font-size: 10px; color: #475569;">Due Date: <strong>${invoice.dueDate}</strong></div>
                    <div style="font-size: 10px; color: #64748b;">Order Ref: ${invoice.orderNumber}</div>
                  </td>
                </tr>
              </table>

              <table class="meta-table">
                <tr>
                  <td style="width: 55%;">
                    <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #64748b;">Purchaser / Recipient Details:</div>
                    <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;">${invoice.customerName}</div>
                    <div style="font-size: 10.5px; color: #334155;">${invoice.customerAddress || 'Colombo, Sri Lanka'}</div>
                    <div style="font-size: 10px; color: #64748b;">Contact: ${invoice.customerPhone || 'N/A'} | Code: ${invoice.customerCode}</div>
                  </td>
                  <td style="width: 45%; text-align: right;">
                    <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #64748b;">Buyer Tax Registration:</div>
                    <div style="font-size: 11px; margin-top: 2px;"><strong>Buyer TIN:</strong> <span style="font-family: monospace;">${invoice.customerVatNumber ? invoice.customerVatNumber.split('-')[0] : 'Unregistered'}</span></div>
                    <div style="font-size: 11px;"><strong>Buyer VAT Reg No:</strong> <span style="font-family: monospace;">${invoice.customerVatNumber || 'Unregistered Person (Sec. 20)'}</span></div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Category: ${isVatRegistered ? 'Registered Taxable Entity' : 'Non-VAT Registered / Retail Buyer'}</div>
                  </td>
                </tr>
              </table>

              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 25px; text-align: center;">#</th>
                    <th>Description of Supplies</th>
                    <th style="width: 50px; text-align: center;">Qty</th>
                    <th style="width: 80px; text-align: right;">Unit Price</th>
                    <th style="width: 85px; text-align: right;">Taxable Value</th>
                    <th style="width: 45px; text-align: center;">VAT %</th>
                    <th style="width: 75px; text-align: right;">VAT (LKR)</th>
                    <th style="width: 95px; text-align: right;">Total (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>

              <table class="summary-table">
                <tr>
                  <td style="vertical-align: top; width: 55%; padding-right: 12px;">
                    <div class="statutory-box">
                      <strong>IRD Statutory Certification under VAT Act No. 14 of 2002:</strong>
                      <p style="margin: 3px 0;">"I/We hereby certify that the particulars given in this Tax Invoice are true and correct and that the value of supply and the tax charged herein comply with Section 20 of the Value Added Tax Act No. 14 of 2002."</p>
                      <p style="margin: 2px 0; font-size: 9px; color: #64748b;">This is an approved computer-generated Tax Invoice. Title to goods remains with DNS Distribution (Pvt) Ltd until full settlement.</p>
                    </div>
                  </td>
                  <td style="vertical-align: top; width: 45%;">
                    <table class="tax-ledger">
                      <tr>
                        <td>Standard Rated Supplies (18%):</td>
                        <td style="text-align: right; font-family: monospace;">LKR ${taxableBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td>Zero-Rated / Exempt Supplies:</td>
                        <td style="text-align: right; font-family: monospace;">LKR 0.00</td>
                      </tr>
                      <tr style="border-top: 1px solid #cbd5e1; font-weight: bold;">
                        <td>Total Taxable Value of Supply:</td>
                        <td style="text-align: right; font-family: monospace;">LKR ${taxableBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr style="font-weight: bold;">
                        <td>Value Added Tax (VAT 18%):</td>
                        <td style="text-align: right; font-family: monospace;">LKR ${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr class="grand-total">
                        <td>TOTAL INVOICE CONSIDERATION:</td>
                        <td style="text-align: right; font-family: monospace;">LKR ${invoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div class="signatures">
                <div class="sig-box">
                  <div class="sig-line">Authorized Signatory</div>
                  <div style="font-size: 9px; color: #64748b;">DNS Distribution (Pvt) Ltd</div>
                </div>
                <div class="sig-box">
                  <div class="sig-line">Tax Rubber Seal</div>
                  <div style="font-size: 9px; color: #64748b;">Registered Taxable Entity</div>
                </div>
                <div class="sig-box">
                  <div class="sig-line">Recipient Acceptance</div>
                  <div style="font-size: 9px; color: #64748b;">Signature & Date</div>
                </div>
              </div>

              <script>
                window.onload = function() { window.print(); };
              </script>
            </body>
          </html>
        `;
      } else {
        const itemRows = invoice.items
          .map(
            (it, idx) => `
            <tr>
              <td style="padding: 7px; border: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
              <td style="padding: 7px; border: 1px solid #e2e8f0;">
                <strong>${it.productNameSnapshot}</strong><br/>
                <span style="font-size: 10.5px; color: #64748b;">SKU: ${it.skuSnapshot}</span>
              </td>
              <td style="padding: 7px; border: 1px solid #e2e8f0; text-align: center;">${it.quantity} ${it.uomSnapshot || 'pcs'}</td>
              <td style="padding: 7px; border: 1px solid #e2e8f0; text-align: right;">LKR ${it.unitPriceSnapshot.toLocaleString()}</td>
              <td style="padding: 7px; border: 1px solid #e2e8f0; text-align: right;">${it.discountPercentage}%</td>
              <td style="padding: 7px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">LKR ${it.lineTotal.toLocaleString()}</td>
            </tr>
          `
          )
          .join('');

        invoiceHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Commercial Invoice - ${invoice.invoiceNumber}</title>
              <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 16px; color: #1e293b; font-size: 12px; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                .company { font-size: 20px; font-weight: bold; color: #0f172a; }
                .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
                .meta-table td { vertical-align: top; padding: 8px 12px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                .items-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 7px; text-align: left; font-size: 11px; text-transform: uppercase; color: #334155; }
                .totals { width: 340px; margin-left: auto; border-collapse: collapse; }
                .totals td { padding: 4px 10px; font-size: 11.5px; }
                .grand-total { font-weight: bold; font-size: 14px; border-top: 2px solid #0f172a; color: #0f172a; }
                .balance-due { font-weight: bold; font-size: 14px; color: #b91c1c; border-top: 1px dashed #cbd5e1; }
                .footer-notes { margin-top: 24px; font-size: 10.5px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
                .signature-row { display: flex; justify-content: space-between; margin-top: 40px; }
                .signature-line { width: 160px; border-top: 1px dashed #94a3b8; text-align: center; padding-top: 4px; font-size: 10px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="company">DNS DISTRIBUTION (PVT) LTD</div>
                  <div style="font-size: 11px; color: #64748b;">Wholesale Electrical, Automation & Switchgear Solutions</div>
                  <div style="font-size: 10.5px; color: #64748b;">142 First Cross Street, Colombo 11, Sri Lanka</div>
                  <div style="font-size: 10.5px; color: #64748b;">Tel: +94 11 234 5678 | VAT Reg No: 109847291-7000</div>
                </div>
                <div style="text-align: right;">
                  <h2 style="margin: 0; color: #0f172a; font-size: 20px; letter-spacing: -0.5px;">COMMERCIAL TAX INVOICE</h2>
                  <div style="font-family: monospace; font-weight: bold; color: #1e3a8a; font-size: 15px;">${invoice.invoiceNumber}</div>
                  <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">Order Ref: <strong>${invoice.orderNumber}</strong></div>
                  <div style="font-size: 10.5px; color: #64748b;">Issue Date: ${invoice.issueDate}</div>
                  <div style="font-size: 10.5px; color: #b91c1c; font-weight: bold;">Due Date: ${invoice.dueDate}</div>
                </div>
              </div>

              <table class="meta-table">
                <tr>
                  <td style="width: 50%;">
                    <div style="font-size: 9.5px; color: #64748b; font-weight: bold; text-transform: uppercase;">Billed To:</div>
                    <div style="font-size: 13px; font-weight: bold; color: #0f172a;">${invoice.customerName}</div>
                    <div style="font-size: 10.5px; color: #64748b;">Dealer Code: ${invoice.customerCode}</div>
                    ${invoice.customerVatNumber ? `<div style="font-size: 10.5px; color: #64748b;">Customer VAT: ${invoice.customerVatNumber}</div>` : ''}
                    <div style="font-size: 10.5px;">${invoice.customerAddress || ''}</div>
                    <div style="font-size: 10.5px;">Contact: ${invoice.customerPhone || ''}</div>
                  </td>
                  <td style="width: 50%; text-align: right;">
                    <div style="font-size: 9.5px; color: #64748b; font-weight: bold; text-transform: uppercase;">Commercial Terms:</div>
                    <div style="font-size: 11.5px; font-weight: bold;">${invoice.paymentTerms || 'Standard Credit'}</div>
                    <div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">Sales Rep: <strong>${invoice.salesRepName}</strong></div>
                    <div style="font-size: 10.5px; color: #64748b;">Status: <strong>${invoice.status}</strong></div>
                  </td>
                </tr>
              </table>

              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 35px; text-align: center;">#</th>
                    <th>Item & Description</th>
                    <th style="width: 70px; text-align: center;">Qty</th>
                    <th style="width: 100px; text-align: right;">Unit Price</th>
                    <th style="width: 70px; text-align: right;">Disc %</th>
                    <th style="width: 110px; text-align: right;">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>

              <table class="totals">
                <tr>
                  <td style="color: #64748b;">Subtotal:</td>
                  <td style="text-align: right; font-weight: 600;">LKR ${invoice.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Total Discount:</td>
                  <td style="text-align: right; color: #16a34a; font-weight: 600;">- LKR ${invoice.discountTotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">${invoice.taxEnabled !== false && invoice.taxTotal > 0 ? `VAT (${invoice.taxRatePercentage ?? 18}% Included):` : 'Tax:'}</td>
                  <td style="text-align: right; font-weight: 600;">LKR ${invoice.taxTotal.toLocaleString()}</td>
                </tr>
                <tr class="grand-total">
                  <td>Total Amount:</td>
                  <td style="text-align: right;">LKR ${invoice.totalAmount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Paid to Date:</td>
                  <td style="text-align: right; font-weight: 600;">LKR ${invoice.paidAmount.toLocaleString()}</td>
                </tr>
                <tr class="balance-due">
                  <td>Balance Due:</td>
                  <td style="text-align: right;">LKR ${invoice.balanceAmount.toLocaleString()}</td>
                </tr>
              </table>

              <div class="footer-notes">
                <strong>Payment Terms & Banking Information:</strong>
                <p style="margin: 2px 0;">Account Name: DNS Distribution (Pvt) Ltd | Bank: Commercial Bank of Ceylon | Account No: 1000984721 | City Office Branch</p>
                <p style="margin: 2px 0;">Please reference Invoice Number <strong>${invoice.invoiceNumber}</strong> upon remitting payment.</p>
                ${invoice.notes ? `<p style="margin: 2px 0;"><strong>Special Notes:</strong> ${invoice.notes}</p>` : ''}
              </div>

              <div class="signature-row">
                <div class="signature-line">Commercial Officer</div>
                <div class="signature-line">Accountant / Cashier</div>
                <div class="signature-line">Customer Acceptance</div>
              </div>

              <script>
                window.onload = function() { window.print(); };
              </script>
            </body>
          </html>
        `;
      }

      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      return true;
    } catch {
      return false;
    }
  }

  async printPurchaseOrder(purchaseOrder: PurchaseOrder): Promise<boolean> {
    if (typeof window === 'undefined' || !window.open) return false;
    try {
      const html = pdfService.generatePurchaseOrderHtml(purchaseOrder);
      const printWindow = window.open('', '_blank', 'width=850,height=1100');
      if (!printWindow || !printWindow.document) return false;
      printWindow.document.write(html);
      printWindow.document.close();
      return true;
    } catch {
      return false;
    }
  }
}

export const printerService = new ThermalPrinterService();
