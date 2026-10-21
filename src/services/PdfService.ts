import { Quotation } from '../types/quotation';
import { Invoice } from '../types/invoice';
import { Payment } from '../types/payment';

export interface IPdfService {
  downloadQuotationPdf(quotation: Quotation): Promise<void>;
  generateQuotationHtml(quotation: Quotation): string;
  downloadInvoicePdf(invoice: Invoice): Promise<void>;
  generateInvoiceHtml(invoice: Invoice): string;
  downloadReceiptPdf(payment: Payment): Promise<void>;
  generateReceiptHtml(payment: Payment): string;
}

export class PdfService implements IPdfService {
  generateQuotationHtml(quotation: Quotation): string {
    const itemRows = quotation.items
      .map(
        (it, idx) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #0f172a;">${it.productNameSnapshot}</strong><br/>
            <span style="font-size: 11px; color: #64748b; font-family: monospace;">SKU: ${it.skuSnapshot}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.quantity} ${it.uomSnapshot || 'pcs'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">LKR ${it.unitPriceSnapshot.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${it.discountPercentage}%</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">LKR ${it.lineTotal.toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Quotation_${quotation.quotationNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 24px;
              background-color: #ffffff;
              font-size: 13px;
              line-height: 1.5;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .company-brand { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
            .doc-title { font-size: 26px; font-weight: 800; color: #0f172a; text-align: right; }
            .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background: #e0e7ff; color: #3730a3; }
            .meta-box { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
            .meta-box td { padding: 14px 16px; vertical-align: top; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .items-table th { background: #f1f5f9; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #475569; }
            .totals-table { width: 340px; margin-left: auto; border-collapse: collapse; margin-bottom: 30px; }
            .totals-table td { padding: 8px 12px; }
            .grand-total-row { font-size: 16px; font-weight: 800; color: #1e3a8a; border-top: 2px solid #1e3a8a; }
            .terms-box { border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; }
            .signatures { display: flex; justify-content: space-between; margin-top: 48px; }
            .signature-box { border-top: 1px dashed #94a3b8; width: 200px; text-align: center; padding-top: 8px; font-size: 11px; color: #475569; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="company-brand">DNS DISTRIBUTION (PVT) LTD</div>
                <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Authorized Electrical, Automation & Industrial Wholesale Distributor</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">142 First Cross Street, Colombo 11, Sri Lanka</div>
                <div style="font-size: 11px; color: #64748b;">Tel: +94 11 234 5678 | VAT Reg No: 109847291-7000</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="doc-title">QUOTATION</div>
                <div style="font-family: monospace; font-size: 16px; font-weight: 700; color: #4338ca; margin-top: 2px;">${quotation.quotationNumber}</div>
                <div style="margin-top: 4px;"><span class="badge">${quotation.status}</span></div>
                <div style="margin-top: 8px; font-size: 11px; color: #64748b;">Issue Date: ${new Date(quotation.createdAt).toLocaleDateString()}</div>
                <div style="font-size: 11px; color: #b91c1c; font-weight: 700;">Valid Until: ${quotation.validUntil}</div>
              </td>
            </tr>
          </table>

          <table class="meta-box">
            <tr>
              <td style="width: 50%;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Quoted Customer:</div>
                <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${quotation.customerNameSnapshot}</div>
                <div style="font-size: 11px; color: #64748b;">Dealer Code: ${quotation.customerCodeSnapshot}</div>
                ${quotation.customerAddressSnapshot ? `<div style="font-size: 12px; color: #334155; margin-top: 4px;">${quotation.customerAddressSnapshot}</div>` : ''}
                <div style="font-size: 12px; color: #334155;">Contact: ${quotation.customerPhoneSnapshot}</div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Prepared By:</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${quotation.salesRepNameSnapshot}</div>
                <div style="font-size: 11px; color: #64748b;">Sales & Distribution Executive</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">DNS Distribution Commercial Division</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Item & Description</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 120px; text-align: right;">List Price (LKR)</th>
                <th style="width: 80px; text-align: right;">Disc %</th>
                <th style="width: 130px; text-align: right;">Line Total (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Gross Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">LKR ${quotation.subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Total Applied Discount:</td>
              <td style="text-align: right; color: #16a34a; font-weight: 600;">- LKR ${quotation.discountAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">${quotation.taxEnabled !== false && quotation.taxAmount > 0 ? `VAT (${quotation.taxRatePercentage ?? 18}% Included):` : 'Tax:'}</td>
              <td style="text-align: right; font-weight: 600;">LKR ${quotation.taxAmount.toLocaleString()}</td>
            </tr>
            <tr class="grand-total-row">
              <td>Total Amount:</td>
              <td style="text-align: right;">LKR ${quotation.totalAmount.toLocaleString()}</td>
            </tr>
          </table>

          <div class="terms-box">
            <strong>Standard Terms & Commercial Conditions:</strong>
            <p style="margin: 4px 0;">${quotation.termsAndConditions || 'Payment within agreed credit period. Prices valid until specified validity date.'}</p>
            ${quotation.notes ? `<p style="margin: 4px 0;"><strong>Special Notes:</strong> ${quotation.notes}</p>` : ''}
          </div>

          <div class="signatures">
            <div class="signature-box">Commercial Officer / Sales Rep</div>
            <div class="signature-box">Commercial Division Authorized Signatory</div>
            <div class="signature-box">Customer Purchase Acceptance</div>
          </div>
        </body>
      </html>
    `;
  }

  generateInvoiceHtml(invoice: Invoice): string {
    const itemRows = invoice.items
      .map(
        (it, idx) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #0f172a;">${it.productNameSnapshot}</strong><br/>
            <span style="font-size: 11px; color: #64748b; font-family: monospace;">SKU: ${it.skuSnapshot}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.quantity} ${it.uomSnapshot || 'pcs'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">LKR ${it.unitPriceSnapshot.toLocaleString()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${it.discountPercentage}%</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">LKR ${it.lineTotal.toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice_${invoice.invoiceNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 24px;
              background-color: #ffffff;
              font-size: 13px;
              line-height: 1.5;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .company-brand { font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
            .doc-title { font-size: 26px; font-weight: 800; color: #0f172a; text-align: right; }
            .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background: #e0e7ff; color: #3730a3; }
            .meta-box { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
            .meta-box td { padding: 14px 16px; vertical-align: top; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .items-table th { background: #f1f5f9; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #475569; }
            .totals-table { width: 340px; margin-left: auto; border-collapse: collapse; margin-bottom: 30px; }
            .totals-table td { padding: 8px 12px; }
            .grand-total-row { font-size: 16px; font-weight: 800; color: #1e3a8a; border-top: 2px solid #1e3a8a; }
            .balance-row { font-size: 16px; font-weight: 800; color: #b91c1c; border-top: 1px dashed #cbd5e1; }
            .terms-box { border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; }
            .signatures { display: flex; justify-content: space-between; margin-top: 48px; }
            .signature-box { border-top: 1px dashed #94a3b8; width: 200px; text-align: center; padding-top: 8px; font-size: 11px; color: #475569; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="company-brand">DNS DISTRIBUTION (PVT) LTD</div>
                <div style="color: #64748b; font-size: 12px; margin-top: 2px;">Authorized Electrical & Automation Wholesale Distributor</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">142 First Cross Street, Colombo 11, Sri Lanka</div>
                <div style="font-size: 11px; color: #64748b;">Tel: +94 11 234 5678 | VAT Reg No: 109847291-7000</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="doc-title">TAX INVOICE</div>
                <div style="font-family: monospace; font-size: 16px; font-weight: 700; color: #4338ca; margin-top: 2px;">${invoice.invoiceNumber}</div>
                <div style="margin-top: 4px;"><span class="badge">${invoice.status}</span></div>
                <div style="margin-top: 8px; font-size: 11px; color: #64748b;">Order Ref: <strong>${invoice.orderNumber}</strong></div>
                <div style="font-size: 11px; color: #64748b;">Issue Date: ${invoice.issueDate}</div>
                <div style="font-size: 11px; color: #b91c1c; font-weight: 700;">Due Date: ${invoice.dueDate}</div>
              </td>
            </tr>
          </table>

          <table class="meta-box">
            <tr>
              <td style="width: 50%;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Billed Customer:</div>
                <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${invoice.customerName}</div>
                <div style="font-size: 11px; color: #64748b;">Dealer Code: ${invoice.customerCode}</div>
                ${invoice.customerVatNumber ? `<div style="font-size: 11px; color: #64748b;">VAT: ${invoice.customerVatNumber}</div>` : ''}
                ${invoice.customerAddress ? `<div style="font-size: 12px; color: #334155; margin-top: 4px;">${invoice.customerAddress}</div>` : ''}
                <div style="font-size: 12px; color: #334155;">Contact: ${invoice.customerPhone || ''}</div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Commercial Terms:</div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${invoice.paymentTerms || 'Standard Credit'}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Sales Rep: <strong>${invoice.salesRepName}</strong></div>
                <div style="font-size: 11px; color: #64748b;">DNS Commercial Division</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Item & Description</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 120px; text-align: right;">List Price (LKR)</th>
                <th style="width: 80px; text-align: right;">Disc %</th>
                <th style="width: 130px; text-align: right;">Line Total (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Gross Subtotal:</td>
              <td style="text-align: right; font-weight: 600;">LKR ${invoice.subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Total Applied Discount:</td>
              <td style="text-align: right; color: #16a34a; font-weight: 600;">- LKR ${invoice.discountTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">${invoice.taxEnabled !== false && invoice.taxTotal > 0 ? `VAT (${invoice.taxRatePercentage ?? 18}% Included):` : 'Tax:'}</td>
              <td style="text-align: right; font-weight: 600;">LKR ${invoice.taxTotal.toLocaleString()}</td>
            </tr>
            <tr class="grand-total-row">
              <td>Total Amount:</td>
              <td style="text-align: right;">LKR ${invoice.totalAmount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Paid to Date:</td>
              <td style="text-align: right; font-weight: 600;">LKR ${invoice.paidAmount.toLocaleString()}</td>
            </tr>
            <tr class="balance-row">
              <td>Balance Due:</td>
              <td style="text-align: right;">LKR ${invoice.balanceAmount.toLocaleString()}</td>
            </tr>
          </table>

          <div class="terms-box">
            <strong>Payment Information & Remittance Advice:</strong>
            <p style="margin: 4px 0;">DNS Distribution (Pvt) Ltd | Commercial Bank of Ceylon | Account No: 1000984721 | City Office</p>
            <p style="margin: 4px 0;">Please indicate invoice number <strong>${invoice.invoiceNumber}</strong> upon remitting funds.</p>
            ${invoice.notes ? `<p style="margin: 4px 0;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
          </div>

          <div class="signatures">
            <div class="signature-box">Authorized Signatory</div>
            <div class="signature-box">Accountant / Cashier</div>
            <div class="signature-box">Customer Acceptance</div>
          </div>
        </body>
      </html>
    `;
  }

  generateReceiptHtml(payment: Payment): string {
    const allocRows = payment.invoiceAllocations
      .map(
        (a) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${a.invoiceNumber}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">LKR ${a.allocatedAmount.toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt_${payment.receiptNumber}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 13px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px; }
            .company { font-size: 20px; font-weight: bold; color: #1e3a8a; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
            .meta-table td { padding: 12px 16px; vertical-align: top; }
            .alloc-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .alloc-table th { background: #f1f5f9; padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 11px; text-transform: uppercase; }
            .total-box { background: #eef2ff; border: 1px solid #c7d2fe; padding: 16px; border-radius: 8px; text-align: right; margin-bottom: 24px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature-box { border-top: 1px dashed #94a3b8; width: 180px; text-align: center; padding-top: 8px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">DNS DISTRIBUTION (PVT) LTD</div>
              <div style="font-size: 12px; color: #64748b;">Wholesale Electrical & Industrial Switchgear Solutions</div>
              <div style="font-size: 11px; color: #64748b;">142 First Cross Street, Colombo 11 | VAT: 109847291-7000</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; color: #0f172a; font-size: 22px;">PAYMENT RECEIPT</h2>
              <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #4338ca;">${payment.receiptNumber}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${new Date(payment.collectedAt).toLocaleDateString()}</div>
              <div style="font-size: 11px; font-weight: bold; color: ${payment.status === 'APPROVED' ? '#16a34a' : '#d97706'};">Status: ${payment.status}</div>
            </div>
          </div>

          <table class="meta-table">
            <tr>
              <td style="width: 50%;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Received From:</div>
                <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${payment.customerName}</div>
                <div style="font-size: 11px; color: #64748b;">Customer Code: ${payment.customerCode || 'N/A'}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Collected By: <strong>${payment.salesRepName}</strong></div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Payment Method:</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${payment.paymentMethod}</div>
                ${payment.chequeNumber ? `<div style="font-size: 11px; color: #334155;">Cheque No: <strong>${payment.chequeNumber}</strong> (${payment.bankName || ''})</div>` : ''}
                ${payment.chequeDate ? `<div style="font-size: 11px; color: #334155;">Cheque Date: ${payment.chequeDate}</div>` : ''}
                ${payment.approvedByName ? `<div style="font-size: 11px; color: #16a34a; margin-top: 4px;">Approved By: ${payment.approvedByName}</div>` : ''}
              </td>
            </tr>
          </table>

          <div style="font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">Settled Invoice Allocations:</div>
          <table class="alloc-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th style="text-align: right;">Allocated Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${allocRows}
            </tbody>
          </table>

          <div class="total-box">
            <div style="font-size: 12px; color: #4338ca; font-weight: 600;">TOTAL AMOUNT COLLECTED</div>
            <div style="font-size: 24px; font-weight: 800; color: #1e3a8a;">LKR ${payment.amount.toLocaleString()}</div>
          </div>

          <div class="signatures">
            <div class="signature-box">Collecting Officer / Cashier</div>
            <div class="signature-box">Finance Approval Signatory</div>
            <div class="signature-box">Customer Acceptance</div>
          </div>
        </body>
      </html>
    `;
  }

  async downloadQuotationPdf(quotation: Quotation): Promise<void> {
    const htmlContent = this.generateQuotationHtml(quotation);
    this.triggerDownloadOrPrint(htmlContent, `Quotation_${quotation.quotationNumber}.html`);
  }

  async downloadInvoicePdf(invoice: Invoice): Promise<void> {
    const htmlContent = this.generateInvoiceHtml(invoice);
    this.triggerDownloadOrPrint(htmlContent, `Invoice_${invoice.invoiceNumber}.html`);
  }

  async downloadReceiptPdf(payment: Payment): Promise<void> {
    const htmlContent = this.generateReceiptHtml(payment);
    this.triggerDownloadOrPrint(htmlContent, `Receipt_${payment.receiptNumber}.html`);
  }

  private triggerDownloadOrPrint(htmlContent: string, filename: string): void {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

export const pdfService = new PdfService();
