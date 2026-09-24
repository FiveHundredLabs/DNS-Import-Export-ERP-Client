import { Quotation } from '../types/quotation';
import { Invoice } from '../types/invoice';
import { Payment } from '../types/payment';

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
}

export interface IPrinterService {
  printThermalReceipt(data: ThermalReceiptData): Promise<boolean>;
  printQuotation(quotation: Quotation): Promise<boolean>;
  printInvoice(invoice: Invoice): Promise<boolean>;
  printPaymentReceipt(payment: Payment, remainingBalance?: number): Promise<boolean>;
  isPrinterConnected(): Promise<boolean>;
}

export class ThermalPrinterService implements IPrinterService {
  async isPrinterConnected(): Promise<boolean> {
    return true; // Virtual / browser print driver available
  }

  async printThermalReceipt(data: ThermalReceiptData): Promise<boolean> {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return false;

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

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${data.receiptNumber}</title>
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
  }

  async printPaymentReceipt(payment: Payment, remainingBalance?: number): Promise<boolean> {
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
    });
  }

  async printQuotation(quotation: Quotation): Promise<boolean> {
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) return false;

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
              <td style="color: #64748b;">VAT (18%):</td>
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
  }

  async printInvoice(invoice: Invoice): Promise<boolean> {
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) return false;

    const itemRows = invoice.items
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

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Commercial Invoice - ${invoice.invoiceNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 13px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
            .company { font-size: 22px; font-weight: bold; color: #0f172a; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .meta-table td { vertical-align: top; padding: 6px 10px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #334155; }
            .totals { width: 340px; margin-left: auto; border-collapse: collapse; }
            .totals td { padding: 6px 12px; }
            .grand-total { font-weight: bold; font-size: 15px; border-top: 2px solid #0f172a; color: #0f172a; }
            .balance-due { font-weight: bold; font-size: 15px; color: #b91c1c; border-top: 1px dashed #cbd5e1; }
            .footer-notes { margin-top: 30px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            .signature-row { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature-line { width: 180px; border-top: 1px dashed #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">DNS DISTRIBUTION (PVT) LTD</div>
              <div style="font-size: 12px; color: #64748b;">Wholesale Electrical, Automation & Switchgear Solutions</div>
              <div style="font-size: 11px; color: #64748b;">142 First Cross Street, Colombo 11, Sri Lanka</div>
              <div style="font-size: 11px; color: #64748b;">Tel: +94 11 234 5678 | VAT Reg No: 109847291-7000</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #0f172a; font-size: 24px; letter-spacing: -0.5px;">TAX INVOICE</h2>
              <div style="font-family: monospace; font-weight: bold; color: #1e3a8a; font-size: 16px;">${invoice.invoiceNumber}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Order Ref: <strong>${invoice.orderNumber}</strong></div>
              <div style="font-size: 11px; color: #64748b;">Issue Date: ${invoice.issueDate}</div>
              <div style="font-size: 11px; color: #b91c1c; font-weight: bold;">Due Date: ${invoice.dueDate}</div>
            </div>
          </div>

          <table class="meta-table" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <tr>
              <td style="width: 50%;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Billed To:</div>
                <div style="font-size: 14px; font-weight: bold; color: #0f172a;">${invoice.customerName}</div>
                <div style="font-size: 11px; color: #64748b;">Dealer Code: ${invoice.customerCode}</div>
                ${invoice.customerVatNumber ? `<div style="font-size: 11px; color: #64748b;">Customer VAT: ${invoice.customerVatNumber}</div>` : ''}
                <div>${invoice.customerAddress || ''}</div>
                <div>Contact: ${invoice.customerPhone || ''}</div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Commercial Terms:</div>
                <div style="font-size: 12px; font-weight: bold;">${invoice.paymentTerms || 'Standard Credit'}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Sales Rep: <strong>${invoice.salesRepName}</strong></div>
                <div style="font-size: 11px; color: #64748b;">Status: <strong>${invoice.status}</strong></div>
              </td>
            </tr>
          </table>

          <table class="items-table" style="margin-top: 16px;">
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
              <td style="text-align: right; font-weight: 600;">LKR ${invoice.subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Total Discount:</td>
              <td style="text-align: right; color: #16a34a; font-weight: 600;">- LKR ${invoice.discountTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">VAT (18% Included):</td>
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
            <p style="margin: 4px 0;">Account Name: DNS Distribution (Pvt) Ltd | Bank: Commercial Bank of Ceylon | Account No: 1000984721 | City Office Branch</p>
            <p style="margin: 4px 0;">Please reference Invoice Number <strong>${invoice.invoiceNumber}</strong> upon remitting payment.</p>
            ${invoice.notes ? `<p style="margin: 4px 0;"><strong>Special Notes:</strong> ${invoice.notes}</p>` : ''}
          </div>

          <div class="signature-row">
            <div class="signature-line">Authorized Signatory</div>
            <div class="signature-line">Accountant / Cashier</div>
            <div class="signature-line">Customer Acknowledgement</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    return true;
  }
}

export const printerService = new ThermalPrinterService();
