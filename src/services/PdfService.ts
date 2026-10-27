import { Quotation } from '../types/quotation';
import { Invoice } from '../types/invoice';
import { Payment } from '../types/payment';
import { PurchaseOrder } from '../types/purchasing';
import { paginatePurchaseOrder } from '../features/purchasing/utils/purchaseOrderPaginator';
import { numberToWordsLKR, formatDate, formatCurrency } from '../utils/formatters';

export interface IPdfService {
  downloadQuotationPdf(quotation: Quotation): Promise<void>;
  generateQuotationHtml(quotation: Quotation): string;
  downloadInvoicePdf(invoice: Invoice, format?: 'STANDARD' | 'IRD_TAX'): Promise<void>;
  generateInvoiceHtml(invoice: Invoice, format?: 'STANDARD' | 'IRD_TAX'): string;
  generateIrdTaxInvoiceHtml(invoice: Invoice): string;
  downloadReceiptPdf(payment: Payment): Promise<void>;
  generateReceiptHtml(payment: Payment): string;
  downloadPurchaseOrderPdf(purchaseOrder: PurchaseOrder): Promise<void>;
  generatePurchaseOrderHtml(purchaseOrder: PurchaseOrder): string;
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

  generateInvoiceHtml(invoice: Invoice, format: 'STANDARD' | 'IRD_TAX' = 'STANDARD'): string {
    if (format === 'IRD_TAX') {
      return this.generateIrdTaxInvoiceHtml(invoice);
    }

    const itemRows = invoice.items
      .map(
        (it, idx) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; font-size: 12px;">${it.productNameSnapshot}</strong><br/>
            <span style="font-size: 10px; color: #64748b; font-family: monospace;">SKU: ${it.skuSnapshot}</span>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${it.quantity} ${it.uomSnapshot || 'pcs'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px;">LKR ${it.unitPriceSnapshot.toLocaleString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px;">${it.discountPercentage}%</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a; font-size: 11px;">LKR ${it.lineTotal.toLocaleString()}</td>
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
            @page { size: A4 portrait; margin: 12mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
              font-size: 12px;
              line-height: 1.4;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
            .company-brand { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
            .doc-title { font-size: 22px; font-weight: 800; color: #0f172a; text-align: right; }
            .badge { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; border-radius: 9999px; background: #e0e7ff; color: #3730a3; }
            .meta-box { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
            .meta-box td { padding: 10px 14px; vertical-align: top; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { background: #f1f5f9; padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: left; font-weight: 700; font-size: 10.5px; text-transform: uppercase; color: #475569; }
            .totals-table { width: 340px; margin-left: auto; border-collapse: collapse; margin-bottom: 24px; }
            .totals-table td { padding: 5px 10px; font-size: 11px; }
            .grand-total-row { font-size: 14px; font-weight: 800; color: #1e3a8a; border-top: 2px solid #1e3a8a; }
            .balance-row { font-size: 14px; font-weight: 800; color: #b91c1c; border-top: 1px dashed #cbd5e1; }
            .terms-box { border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 10.5px; color: #64748b; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .signature-box { border-top: 1px dashed #94a3b8; width: 180px; text-align: center; padding-top: 6px; font-size: 10px; color: #475569; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="company-brand">DNS DISTRIBUTION (PVT) LTD</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Authorized Electrical & Automation Wholesale Distributor</div>
                <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">142 First Cross Street, Colombo 11, Sri Lanka</div>
                <div style="font-size: 10.5px; color: #64748b;">Tel: +94 11 234 5678 | VAT Reg No: 109847291-7000</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="doc-title">COMMERCIAL TAX INVOICE</div>
                <div style="font-family: monospace; font-size: 15px; font-weight: 700; color: #4338ca; margin-top: 2px;">${invoice.invoiceNumber}</div>
                <div style="margin-top: 3px;"><span class="badge">${invoice.status}</span></div>
                <div style="margin-top: 6px; font-size: 10.5px; color: #64748b;">Order Ref: <strong>${invoice.orderNumber}</strong></div>
                <div style="font-size: 10.5px; color: #64748b;">Issue Date: ${invoice.issueDate}</div>
                <div style="font-size: 10.5px; color: #b91c1c; font-weight: 700;">Due Date: ${invoice.dueDate}</div>
              </td>
            </tr>
          </table>

          <table class="meta-box">
            <tr>
              <td style="width: 50%;">
                <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Billed Customer:</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${invoice.customerName}</div>
                <div style="font-size: 10.5px; color: #64748b;">Dealer Code: ${invoice.customerCode}</div>
                ${invoice.customerVatNumber ? `<div style="font-size: 10.5px; color: #64748b;">VAT: ${invoice.customerVatNumber}</div>` : ''}
                ${invoice.customerAddress ? `<div style="font-size: 11px; color: #334155; margin-top: 3px;">${invoice.customerAddress}</div>` : ''}
                <div style="font-size: 11px; color: #334155;">Contact: ${invoice.customerPhone || ''}</div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Commercial Terms:</div>
                <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${invoice.paymentTerms || 'Standard Credit'}</div>
                <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">Sales Rep: <strong>${invoice.salesRepName}</strong></div>
                <div style="font-size: 10.5px; color: #64748b;">DNS Commercial Division</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Item & Description</th>
                <th style="width: 70px; text-align: center;">Qty</th>
                <th style="width: 110px; text-align: right;">List Price (LKR)</th>
                <th style="width: 70px; text-align: right;">Disc %</th>
                <th style="width: 120px; text-align: right;">Line Total (LKR)</th>
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
            <p style="margin: 3px 0;">DNS Distribution (Pvt) Ltd | Commercial Bank of Ceylon | Account No: 1000984721 | City Office</p>
            <p style="margin: 3px 0;">Please indicate invoice number <strong>${invoice.invoiceNumber}</strong> upon remitting funds.</p>
            ${invoice.notes ? `<p style="margin: 3px 0;"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
          </div>

          <div class="signatures">
            <div class="signature-box">Commercial Officer</div>
            <div class="signature-box">Accountant / Cashier</div>
            <div class="signature-box">Customer Acceptance</div>
          </div>
        </body>
      </html>
    `;
  }

  generateIrdTaxInvoiceHtml(invoice: Invoice): string {
    const taxableBase = Math.max(0, invoice.subtotal - invoice.discountTotal);
    const vatAmount = invoice.taxTotal;
    const vatRate = invoice.taxRatePercentage ?? 18;
    const isVatRegistered = Boolean(invoice.customerVatNumber);
    const amountInWords = numberToWordsLKR(invoice.totalAmount);

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

    return `
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
                <div style="margin-bottom: 8px; padding: 8px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px;">
                  <strong style="font-size: 9.5px; text-transform: uppercase; color: #475569;">Total Consideration in Words:</strong>
                  <p style="margin: 2px 0; font-family: Georgia, serif; font-style: italic; font-weight: bold; color: #0f172a; font-size: 11px;">${amountInWords}</p>
                </div>
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

  async downloadInvoicePdf(invoice: Invoice, format: 'STANDARD' | 'IRD_TAX' = 'STANDARD'): Promise<void> {
    const htmlContent = this.generateInvoiceHtml(invoice, format);
    const suffix = format === 'IRD_TAX' ? '_IRD_Tax' : '';
    this.triggerDownloadOrPrint(htmlContent, `Invoice_${invoice.invoiceNumber}${suffix}.html`);
  }

  async downloadReceiptPdf(payment: Payment): Promise<void> {
    const htmlContent = this.generateReceiptHtml(payment);
    this.triggerDownloadOrPrint(htmlContent, `Receipt_${payment.receiptNumber}.html`);
  }

  async downloadPurchaseOrderPdf(purchaseOrder: PurchaseOrder): Promise<void> {
    const htmlContent = this.generatePurchaseOrderHtml(purchaseOrder);
    this.triggerDownloadOrPrint(htmlContent, `PurchaseOrder_${purchaseOrder.poNumber}.html`);
  }

  generatePurchaseOrderHtml(purchaseOrder: PurchaseOrder): string {
    const pages = paginatePurchaseOrder(purchaseOrder);
    const isApproved =
      Boolean(purchaseOrder.approvedByName) ||
      purchaseOrder.status === 'APPROVED' ||
      purchaseOrder.status === 'SENT_TO_SUPPLIER';

    const renderedPagesHtml = pages
      .map((p) => {
        const itemRowsHtml = p.items
          .map(
            (pi) => `
            <tr>
              <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-size: 11px;">${pi.itemNumber}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">
                <strong style="color: #0f172a; font-size: 11px;">${pi.item.productName}</strong><br/>
                <span style="font-size: 10px; color: #64748b; font-family: monospace;">${pi.item.productCode}</span>
                ${pi.item.notes ? `<div style="font-size: 10px; color: #64748b; font-style: italic;">${pi.item.notes}</div>` : ''}
              </td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 11px;">${pi.item.quantity}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 11px; white-space: nowrap;">${formatCurrency(pi.item.unitPrice)}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 11px;">${pi.item.discountPercent > 0 ? `${pi.item.discountPercent}%` : '-'}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 11px;">${pi.item.taxRate > 0 ? `${pi.item.taxRate}%` : '-'}</td>
              <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; font-size: 11px; white-space: nowrap;">${formatCurrency(pi.item.total)}</td>
            </tr>
          `
          )
          .join('');

        const headerHtml = p.isFirstPage
          ? `
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="background: #0f172a; color: #fff; width: 32px; height: 32px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px;">DNS</div>
                  <div>
                    <div style="font-size: 17px; font-weight: 800; color: #0f172a; line-height: 1;">DNS DISTRIBUTION (PVT) LTD</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 3px;">Authorized Wholesale Electrical, Automation & Industrial Solutions</div>
                  </div>
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 6px; line-height: 1.4;">
                  142 First Cross Street, Colombo 11, Sri Lanka<br/>
                  Tel: +94 11 234 5678 | Email: procurement@dnsdistribution.lk<br/>
                  <strong>VAT Registration No: 109847291-7000</strong>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
                  <span style="background: #0f172a; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: monospace;">PURCHASE ORDER</span>
                  <span style="font-size: 10px; font-weight: 600; color: #475569; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">Page ${p.pageNumber} of ${p.totalPages}</span>
                </div>
                <div style="font-family: monospace; font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;">${purchaseOrder.poNumber}</div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 4px; line-height: 1.4;">
                  PO Date: <strong>${formatDate(purchaseOrder.orderDate)}</strong><br/>
                  Delivery Due: <strong>${formatDate(purchaseOrder.expectedDeliveryDate)}</strong><br/>
                  Terms: <strong>${purchaseOrder.paymentTerms}</strong>
                </div>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              <tr>
                <td style="width: 50%; padding: 10px 12px; vertical-align: top; font-size: 11px;">
                  <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Vendor / Supplier</span>
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 2px;">${purchaseOrder.supplierName}</div>
                  <div style="font-family: monospace; font-size: 10px; color: #64748b;">Code: ${purchaseOrder.supplierCode}</div>
                  ${purchaseOrder.supplierContactPerson ? `<div style="color: #475569;">Attn: ${purchaseOrder.supplierContactPerson}</div>` : ''}
                  ${purchaseOrder.supplierAddress ? `<div style="color: #475569;">${purchaseOrder.supplierAddress}</div>` : ''}
                  ${purchaseOrder.supplierPhone ? `<div style="color: #475569;">Phone: ${purchaseOrder.supplierPhone}</div>` : ''}
                  ${purchaseOrder.supplierVatNumber ? `<div style="color: #475569; font-weight: 600;">VAT: ${purchaseOrder.supplierVatNumber}</div>` : ''}
                </td>
                <td style="width: 50%; padding: 10px 12px; vertical-align: top; font-size: 11px;">
                  <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Delivery Destination</span>
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-top: 2px;">Central Warehouse (DNS Central Hub)</div>
                  <div style="color: #475569;">18 Bloemendhal Road, Kotahena, Colombo 13</div>
                  <div style="color: #475569;">Receiving Hours: Mon-Fri 08:30 - 16:30</div>
                  <div style="color: #475569;">Storekeeper Desk: +94 11 245 8899</div>
                  <div style="margin-top: 4px; font-weight: 600;">Currency: ${purchaseOrder.currency || 'LKR'}</div>
                </td>
              </tr>
            </table>
          `
          : `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="background: #0f172a; color: #fff; width: 22px; height: 22px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 10px;">DNS</div>
                <span style="font-weight: 700; font-size: 12px; color: #0f172a;">DNS DISTRIBUTION (PVT) LTD</span>
                <span style="font-size: 10px; color: #64748b; margin-left: 6px;">VAT: 109847291-7000</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-weight: 700; font-size: 11px; color: #0f172a;">PURCHASE ORDER: ${purchaseOrder.poNumber}</span>
                <span style="font-size: 10px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;">Page ${p.pageNumber} of ${p.totalPages}</span>
              </div>
            </div>
          `;

        const tableHtml = p.items.length > 0
          ? `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; table-layout: fixed;">
              <thead>
                <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                  <th style="width: 32px; padding: 8px; font-size: 10.5px; font-weight: 700; text-align: center; color: #334155;">#</th>
                  <th style="padding: 8px; font-size: 10.5px; font-weight: 700; text-align: left; color: #334155;">Product / SKU & Description</th>
                  <th style="width: 50px; padding: 8px; font-size: 10.5px; font-weight: 700; text-align: right; color: #334155;">Qty</th>
                  <th style="width: 105px; padding: 8px; font-size: 10.5px; font-weight: 700; text-align: right; color: #334155; white-space: nowrap;">Unit Price (${purchaseOrder.currency})</th>
                  <th style="width: 55px; padding: 8px; font-size: 10.5px; font-weight: 700; text-align: right; color: #334155;">Disc %</th>
                  <th style="width: 55px; padding: 8px; font-size: 10.5px; font-weight: 700; text-align: right; color: #334155;">Tax %</th>
                  <th style="width: 115px; padding: 8px; font-size: 10.5px; font-weight: 700; text-align: right; color: #334155; white-space: nowrap;">Line Total (${purchaseOrder.currency})</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
              </tbody>
            </table>
          `
          : '';

        const summaryHtml = p.showSummaryAndTerms
          ? `
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 14px;">
              <tr>
                <td style="width: 55%; vertical-align: top; padding-right: 14px; font-size: 10px; color: #475569;">
                  ${purchaseOrder.notes ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; margin-bottom: 8px;"><strong>Order Notes:</strong> ${purchaseOrder.notes}</div>` : ''}
                  ${purchaseOrder.deliveryInstructions ? `<div style="background: #fffbeb; border: 1px solid #fde68a; padding: 8px; border-radius: 6px; margin-bottom: 8px; color: #92400e;"><strong>Delivery Instructions:</strong> ${purchaseOrder.deliveryInstructions}</div>` : ''}
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px; border-radius: 6px; color: #166534; line-height: 1.4;">
                    <strong>General Terms & Policy:</strong><br/>
                    1. Reference PO number on all commercial correspondence.<br/>
                    2. Inward goods subject to verification against specifications.<br/>
                    3. Disbursement matched to authorized Goods Received Notes (GRN).
                  </div>
                </td>
                <td style="width: 45%; vertical-align: top;">
                  <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11px;">
                    <tr><td style="padding: 5px 10px; color: #64748b;">Subtotal:</td><td style="padding: 5px 10px; text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(purchaseOrder.subtotal)}</td></tr>
                    ${purchaseOrder.totalDiscount > 0 ? `<tr><td style="padding: 5px 10px; color: #16a34a;">Discounts Applied:</td><td style="padding: 5px 10px; text-align: right; font-family: monospace; color: #16a34a; font-weight: 600;">-${formatCurrency(purchaseOrder.totalDiscount)}</td></tr>` : ''}
                    <tr><td style="padding: 5px 10px; color: #64748b;">Applicable Taxes:</td><td style="padding: 5px 10px; text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(purchaseOrder.taxTotal)}</td></tr>
                    ${purchaseOrder.shippingCharges > 0 ? `<tr><td style="padding: 5px 10px; color: #64748b;">Shipping Charges:</td><td style="padding: 5px 10px; text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(purchaseOrder.shippingCharges)}</td></tr>` : ''}
                    ${purchaseOrder.otherCharges > 0 ? `<tr><td style="padding: 5px 10px; color: #64748b;">Handling Charges:</td><td style="padding: 5px 10px; text-align: right; font-family: monospace; font-weight: 600;">${formatCurrency(purchaseOrder.otherCharges)}</td></tr>` : ''}
                    <tr style="border-top: 2px solid #0f172a; font-weight: 800; font-size: 13px;">
                      <td style="padding: 8px 10px;">Grand Total:</td>
                      <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${formatCurrency(purchaseOrder.grandTotal)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `
          : '';

        const signaturesHtml = p.showSignatures
          ? `
            <table style="width: 100%; border-collapse: collapse; margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #475569;">
              <tr>
                <td style="width: 33%; vertical-align: top; padding-right: 10px;">
                  <strong>Prepared By:</strong><br/>
                  <span style="font-weight: 700; color: #0f172a; font-size: 11px;">${purchaseOrder.createdByName || 'Purchasing Officer'}</span><br/>
                  <span style="color: #94a3b8; font-size: 9.5px;">Date: ${formatDate(purchaseOrder.createdAt)}</span>
                  <div style="height: 35px; border-bottom: 1px dashed #cbd5e1; margin-top: 4px;"></div>
                  <div style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 3px;">Procurement Department</div>
                </td>
                <td style="width: 33%; vertical-align: top; padding-right: 10px;">
                  <strong>Manager / Director Authorization:</strong><br/>
                  <span style="font-weight: 700; color: #0f172a; font-size: 11px;">${isApproved ? purchaseOrder.approvedByName || 'Authorized Executive Signatory' : 'Pending Authorization'}</span><br/>
                  <span style="color: #94a3b8; font-size: 9.5px;">Date: ${purchaseOrder.approvedAt ? formatDate(purchaseOrder.approvedAt) : 'Pending'}</span>
                  <div style="height: 35px; border-bottom: 1px dashed #cbd5e1; margin-top: 4px; display: flex; align-items: center; justify-content: center;">
                    ${isApproved ? '<span style="color: #16a34a; font-weight: 800; font-size: 9px; letter-spacing: 0.5px; text-transform: uppercase;">✓ Digitally Signed & Approved</span>' : ''}
                  </div>
                  <div style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 3px;">Authorized Executive Signatory</div>
                </td>
                <td style="width: 33%; vertical-align: top;">
                  <strong>Supplier Acceptance:</strong><br/>
                  <span style="font-weight: 700; color: #0f172a; font-size: 11px;">${purchaseOrder.supplierName}</span><br/>
                  <span style="color: #94a3b8; font-size: 9.5px;">Acknowledged Date: ____________</span>
                  <div style="height: 35px; border-bottom: 1px dashed #cbd5e1; margin-top: 4px;"></div>
                  <div style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 3px;">Authorized Vendor Stamp & Signature</div>
                </td>
              </tr>
            </table>
          `
          : '';

        const footerHtml = `
          <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
            <span>DNS Distribution (Pvt) Ltd • Official Purchase Order • Non-Transferable</span>
            <span style="font-weight: 700; font-family: monospace;">Page ${p.pageNumber} of ${p.totalPages}</span>
          </div>
        `;

        return `
          <div class="po-page" style="page-break-after: ${p.isLastPage ? 'auto' : 'always'}; break-after: ${p.isLastPage ? 'auto' : 'page'}; min-height: 270mm; display: flex; flex-direction: column; justify-content: space-between; margin-bottom: 24px;">
            <div>
              ${headerHtml}
              ${tableHtml}
              ${summaryHtml}
              ${signaturesHtml}
            </div>
            ${footerHtml}
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>PO_${purchaseOrder.poNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 15mm 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-size: 12px;
              line-height: 1.4;
            }
            .po-page {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            @media print {
              .po-page {
                page-break-after: always;
                break-after: page;
              }
              .po-page:last-child {
                page-break-after: auto;
                break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          ${renderedPagesHtml}
        </body>
      </html>
    `;
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
