import { Quotation } from '../types/quotation';

export interface ThermalReceiptData {
  title: string;
  receiptNumber: string;
  dateTime: string;
  customerName: string;
  amountPaid: number;
  paymentMethod: string;
  chequeNumber?: string;
  cashierOrRepName: string;
  balanceDueRemaining?: number;
}

export interface IPrinterService {
  printThermalReceipt(data: ThermalReceiptData): Promise<boolean>;
  printQuotation(quotation: Quotation): Promise<boolean>;
  isPrinterConnected(): Promise<boolean>;
}

export class ThermalPrinterService implements IPrinterService {
  async isPrinterConnected(): Promise<boolean> {
    return true; // Virtual / browser print driver available
  }

  async printThermalReceipt(data: ThermalReceiptData): Promise<boolean> {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return false;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${data.receiptNumber}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 280px;
              margin: 0 auto;
              padding: 10px;
              font-size: 12px;
            }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center bold">DNS DISTRIBUTION (PVT) LTD</div>
          <div class="center">Colombo 11, Sri Lanka</div>
          <div class="center">Tel: +94 11 234 5678</div>
          <div class="divider"></div>
          <div class="center bold">${data.title}</div>
          <div class="row"><span>Rcpt No:</span><span>${data.receiptNumber}</span></div>
          <div class="row"><span>Date:</span><span>${data.dateTime}</span></div>
          <div class="row"><span>Customer:</span><span>${data.customerName}</span></div>
          <div class="row"><span>Officer:</span><span>${data.cashierOrRepName}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>Payment Method:</span><span>${data.paymentMethod}</span></div>
          ${data.chequeNumber ? `<div class="row"><span>Cheque No:</span><span>${data.chequeNumber}</span></div>` : ''}
          <div class="row bold" style="font-size: 14px;">
            <span>AMOUNT PAID:</span>
            <span>LKR ${data.amountPaid.toLocaleString()}</span>
          </div>
          ${data.balanceDueRemaining !== undefined ? `
            <div class="row"><span>Remaining Balance:</span><span>LKR ${data.balanceDueRemaining.toLocaleString()}</span></div>
          ` : ''}
          <div class="divider"></div>
          <div class="center" style="font-size: 10px;">Subject to Finance Department Realization</div>
          <div class="center" style="font-size: 10px;">Thank you for your business!</div>
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
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 32px;
              background-color: #fff;
              font-size: 13px;
              line-height: 1.5;
            }
            .header-table { width: 100%; margin-bottom: 24px; border-collapse: collapse; }
            .company-name { font-size: 22px; font-weight: 800; color: #1e3a8a; }
            .doc-title { font-size: 24px; font-weight: 700; color: #0f172a; text-align: right; }
            .badge { display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: 700; border-radius: 4px; background: #e0e7ff; color: #3730a3; }
            .details-box { display: flex; justify-content: space-between; margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            .items-table th { background: #f1f5f9; padding: 10px 8px; border: 1px solid #cbd5e1; text-align: left; font-weight: 600; }
            .totals-table { width: 320px; margin-left: auto; border-collapse: collapse; margin-bottom: 30px; }
            .totals-table td { padding: 6px 12px; }
            .grand-total { font-size: 16px; font-weight: 800; color: #1e3a8a; border-top: 2px solid #1e3a8a; }
            .footer-notes { border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; }
            .signature-row { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature-line { border-top: 1px dashed #94a3b8; width: 200px; text-align: center; padding-top: 6px; font-size: 11px; color: #475569; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="company-name">DNS DISTRIBUTION (PVT) LTD</div>
                <div style="color: #64748b; font-size: 12px;">Enterprise Electrical & Industrial Supplies</div>
                <div style="font-size: 11px; color: #64748b;">142 First Cross Street, Colombo 11, Sri Lanka</div>
                <div style="font-size: 11px; color: #64748b;">Tel: +94 11 234 5678 | Email: sales@dnserp.com | VAT: 109847291-7000</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="doc-title">QUOTATION</div>
                <div style="font-family: monospace; font-size: 15px; font-weight: bold; color: #4338ca;">${quotation.quotationNumber}</div>
                <div style="margin-top: 4px;"><span class="badge">${quotation.status}</span></div>
                <div style="margin-top: 6px; font-size: 11px; color: #64748b;">Date: ${new Date(quotation.createdAt).toLocaleDateString()}</div>
                <div style="font-size: 11px; color: #dc2626; font-weight: bold;">Valid Until: ${quotation.validUntil}</div>
              </td>
            </tr>
          </table>

          <div class="details-box">
            <div style="flex: 1;">
              <strong style="color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Quoted To:</strong>
              <div style="font-weight: 700; font-size: 14px; margin-top: 2px;">${quotation.customerNameSnapshot}</div>
              <div style="color: #64748b; font-size: 11px;">Customer Code: ${quotation.customerCodeSnapshot}</div>
              ${quotation.customerAddressSnapshot ? `<div style="color: #475569; font-size: 12px;">${quotation.customerAddressSnapshot}</div>` : ''}
              <div style="color: #475569; font-size: 12px;">Tel: ${quotation.customerPhoneSnapshot}</div>
            </div>
            <div style="flex: 1; text-align: right;">
              <strong style="color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Sales Representative:</strong>
              <div style="font-weight: 700; font-size: 14px; margin-top: 2px;">${quotation.salesRepNameSnapshot}</div>
              <div style="color: #64748b; font-size: 11px;">Ref: DNS Distribution Sales Team</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Item & Description</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 110px; text-align: right;">Unit Price</th>
                <th style="width: 80px; text-align: right;">Disc %</th>
                <th style="width: 120px; text-align: right;">Net Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">LKR ${quotation.subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Total Discount:</td>
              <td style="text-align: right; color: #16a34a; font-weight: 600;">- LKR ${quotation.discountAmount.toLocaleString()}</td>
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
}

export const printerService = new ThermalPrinterService();
