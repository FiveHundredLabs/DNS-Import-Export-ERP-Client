import { Quotation } from '../types/quotation';
import { Invoice } from '../types/invoice';
import { Payment } from '../types/payment';
import { PurchaseOrder } from '../types/purchasing';
import { PaymentVoucher } from '../types/cashbook';
import { SalesOrder } from '../types/order';
import { GRN } from '../types/inventory';
import { DeliveryNote } from '../types/deliveryNote';
import { paginatePurchaseOrder } from '../features/purchasing/utils/purchaseOrderPaginator';
import { numberToWordsLKR, formatDate, formatCurrency } from '../utils/formatters';

export interface CostedPriceItemInfo {
  productId: string;
  unitCost: number;
  sellingPrice: number;
}

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
  downloadPaymentVoucherPdf(voucher: PaymentVoucher, forceDownload?: boolean): Promise<void>;
  generatePaymentVoucherHtml(voucher: PaymentVoucher): string;
  downloadSalesOrderPdf(order: SalesOrder): Promise<void>;
  generateSalesOrderHtml(order: SalesOrder): string;
  printSalesOrder(order: SalesOrder): Promise<void>;
  downloadGrnPdf(grn: GRN, pricingData?: CostedPriceItemInfo[]): Promise<void>;
  generateGrnHtml(grn: GRN, pricingData?: CostedPriceItemInfo[]): string;
  printGrn(grn: GRN, pricingData?: CostedPriceItemInfo[]): Promise<void>;
  downloadDeliveryNotePdf(note: DeliveryNote): Promise<void>;
  generateDeliveryNoteHtml(note: DeliveryNote): string;
  printDeliveryNote(note: DeliveryNote): Promise<void>;
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

  async downloadPaymentVoucherPdf(voucher: PaymentVoucher, forceDownload: boolean = false): Promise<void> {
    const htmlContent = this.generatePaymentVoucherHtml(voucher);
    const filename = `${voucher.voucherType === 'PAYMENT' ? 'Payment_Voucher' : 'Receipt_Voucher'}_${voucher.voucherNumber}.html`;

    if (forceDownload) {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      this.triggerDownloadOrPrint(htmlContent, filename);
    }
  }

  generatePaymentVoucherHtml(voucher: PaymentVoucher): string {
    const isPayment = voucher.voucherType === 'PAYMENT';
    const amountInWords = numberToWordsLKR(voucher.amount);
    const displayDate = formatDate(voucher.date);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${isPayment ? 'Payment_Voucher' : 'Receipt_Voucher'}_${voucher.voucherNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 24px;
              background-color: #ffffff;
              font-size: 12px;
              line-height: 1.5;
            }
            .voucher-card {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 32px;
              background: #ffffff;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
            .brand-name { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; }
            .brand-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .doc-badge {
              display: inline-block;
              padding: 4px 12px;
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-radius: 4px;
              background: ${isPayment ? '#fee2e2' : '#dcfce7'};
              color: ${isPayment ? '#991b1b' : '#166534'};
              border: 1px solid ${isPayment ? '#f87171' : '#86efac'};
            }
            .voucher-no { font-family: monospace; font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 4px; }
            .grid-table { width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
            .grid-table td { padding: 10px 14px; vertical-align: top; }
            .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 2px; }
            .field-value { font-size: 13px; font-weight: 700; color: #0f172a; }
            .field-sub { font-size: 11px; color: #475569; }
            .narrative-box {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-left: 4px solid #1e3a8a;
              border-radius: 4px;
              padding: 12px 14px;
              margin: 16px 0;
            }
            .table-ledger { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 12px; }
            .table-ledger th {
              background: #f1f5f9;
              padding: 8px 10px;
              border-bottom: 2px solid #cbd5e1;
              text-align: left;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #475569;
            }
            .table-ledger td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            .table-ledger .num { text-align: right; font-family: monospace; font-weight: 600; }
            .total-banner {
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 14px 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 20px 0;
            }
            .amount-val { font-size: 22px; font-weight: 800; font-family: monospace; color: #0f172a; }
            .amount-words { font-size: 12px; font-weight: 600; color: #1e3a8a; margin-top: 4px; font-style: italic; }
            .sig-grid { width: 100%; border-collapse: collapse; margin-top: 36px; border-top: 1px solid #cbd5e1; padding-top: 14px; }
            .sig-cell { width: 25%; padding: 12px 8px; vertical-align: top; text-align: center; }
            .sig-line { height: 44px; border-bottom: 1px dashed #94a3b8; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; }
            .sig-title { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 6px; }
            .sig-subtitle { font-size: 10px; color: #64748b; }
            .audit-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 10px; color: #94a3b8; text-align: center; }
            @media print {
              body { padding: 0; background: #ffffff; }
              .voucher-card { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="voucher-card">
            <!-- Header -->
            <table class="header-table">
              <tr>
                <td>
                  <div class="brand-name">DNS IMPORT & EXPORT (PVT) LTD</div>
                  <div class="brand-sub">Wholesale Electrical, Power Distribution & Industrial Hardware</div>
                  <div class="brand-sub">104 Nawam Mawatha, Colombo 02, Sri Lanka • Tel: +94 11 234 5678</div>
                  <div class="brand-sub">VAT Reg: VAT-102938475 • SVAT: SVAT-009988 • Reg No: PV 0029384</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                  <span class="doc-badge">${isPayment ? 'OFFICIAL PAYMENT VOUCHER' : 'OFFICIAL RECEIPT VOUCHER'}</span>
                  <div class="voucher-no">${voucher.voucherNumber}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: <strong>${displayDate}</strong></div>
                  <div style="font-size: 11px; color: #64748b;">Status: <strong>${voucher.status}</strong></div>
                </td>
              </tr>
            </table>

            <!-- Meta Grid -->
            <table class="grid-table">
              <tr>
                <td style="width: 50%;">
                  <div class="field-label">${isPayment ? 'Paid To (Payee / Recipient):' : 'Received From (Payer):'}</div>
                  <div class="field-value">${voucher.payeeOrPayer}</div>
                  <div class="field-sub">Category: <strong>${voucher.category.replace(/_/g, ' ')}</strong></div>
                </td>
                <td style="width: 50%; text-align: right;">
                  <div class="field-label">Disbursement Mode & Float:</div>
                  <div class="field-value">${voucher.paymentMethod || 'CASH'}${voucher.chequeNumber ? ` (Cheque #${voucher.chequeNumber})` : ''}</div>
                  <div class="field-sub font-mono">Account: ${voucher.cashAccountCode} - ${voucher.cashAccountName}</div>
                  ${voucher.bankName ? `<div class="field-sub">Bank: ${voucher.bankName}</div>` : ''}
                </td>
              </tr>
            </table>

            <!-- Description / Particulars -->
            <div class="field-label" style="margin-top: 14px;">Particulars / Narrative of Disbursement:</div>
            <div class="narrative-box">
              <div style="font-size: 12px; color: #1e293b; font-weight: 500; line-height: 1.6;">
                ${voucher.description}
              </div>
            </div>

            <!-- Double Entry Table -->
            <div class="field-label" style="margin-top: 14px;">Statutory Double-Entry General Ledger Impact:</div>
            <table class="table-ledger">
              <thead>
                <tr>
                  <th style="width: 45%;">Account Title & Code</th>
                  <th style="width: 25%;">Classification</th>
                  <th class="num" style="width: 15%;">Debit (LKR)</th>
                  <th class="num" style="width: 15%;">Credit (LKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${voucher.offsetAccountCode}</strong> - ${voucher.offsetAccountName}</td>
                  <td style="color: #64748b;">Expense / Offset Account</td>
                  <td class="num">${isPayment ? formatCurrency(voucher.amount) : '-'}</td>
                  <td class="num">${!isPayment ? formatCurrency(voucher.amount) : '-'}</td>
                </tr>
                <tr>
                  <td><strong>${voucher.cashAccountCode}</strong> - ${voucher.cashAccountName}</td>
                  <td style="color: #64748b;">Cash & Bank Float</td>
                  <td class="num">${!isPayment ? formatCurrency(voucher.amount) : '-'}</td>
                  <td class="num">${isPayment ? formatCurrency(voucher.amount) : '-'}</td>
                </tr>
                <tr style="font-weight: 700; background: #f8fafc; border-top: 2px solid #cbd5e1;">
                  <td colspan="2">TOTAL POSTED IMPACT</td>
                  <td class="num">${formatCurrency(voucher.amount)}</td>
                  <td class="num">${formatCurrency(voucher.amount)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Total Box -->
            <div class="total-banner">
              <div>
                <div class="field-label">Total Authorized Sum:</div>
                <div class="amount-words">Sri Lankan Rupees: ${amountInWords}</div>
              </div>
              <div class="amount-val">
                ${formatCurrency(voucher.amount)}
              </div>
            </div>

            <!-- 4 Signatures -->
            <table class="sig-grid">
              <tr>
                <td class="sig-cell">
                  <div class="sig-line">
                    <span style="font-size: 11px; color: #334155;">${voucher.createdByName || 'Accounts Clerk'}</span>
                  </div>
                  <div class="sig-title">Prepared By</div>
                  <div class="sig-subtitle">Accounts Clerk</div>
                </td>
                <td class="sig-cell">
                  <div class="sig-line">
                    <span style="font-size: 11px; color: #166534; font-weight: 600;">✓ Verified Internal Audit</span>
                  </div>
                  <div class="sig-title">Checked By</div>
                  <div class="sig-subtitle">Chief Accountant</div>
                </td>
                <td class="sig-cell">
                  <div class="sig-line">
                    ${voucher.approvedByName ? `
                      <span style="font-size: 11px; color: #166534; font-weight: 700;">★ ${voucher.approvedByName}</span>
                    ` : `
                      <span style="font-size: 10px; color: #d97706; font-style: italic;">Pending MG-02 Approval</span>
                    `}
                  </div>
                  <div class="sig-title">Approved By</div>
                  <div class="sig-subtitle">Finance Manager / Director</div>
                </td>
                <td class="sig-cell">
                  <div class="sig-line"></div>
                  <div class="sig-title">Received By</div>
                  <div class="sig-subtitle">Payee Signature & NIC</div>
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <div class="audit-footer">
              DNS ERP Finance Engine • Reference: ${voucher.glJournalId || voucher.voucherNumber} • Timestamp: ${voucher.createdAt} • System Authenticated
            </div>
          </div>
        </body>
      </html>
    `;
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
                <div style="font-size: 20px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a; text-transform: uppercase;">PURCHASE ORDER</div>
                <div style="font-family: monospace; font-size: 13px; font-weight: 700; color: #475569; margin-top: 2px;">${purchaseOrder.poNumber}</div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 6px; line-height: 1.4;">
                  PO Date: <strong>${formatDate(purchaseOrder.orderDate)}</strong><br/>
                  Delivery Due: <strong>${formatDate(purchaseOrder.expectedDeliveryDate)}</strong><br/>
                  Payment Terms: <strong>${purchaseOrder.paymentTerms}</strong>
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

  // ==========================================
  // SALES ORDER PDF & PRINT SPECIFICATIONS
  // ==========================================
  generateSalesOrderHtml(order: SalesOrder): string {
    const itemRows = (order.items || [])
      .map(
        (it, idx) => `
        <tr style="page-break-inside: avoid; break-inside: avoid;">
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${it.productNameSnapshot || it.productId}</div>
            <div style="font-size: 10px; color: #64748b; font-family: monospace; margin-top: 2px;">SKU: ${it.skuSnapshot || '—'}</div>
          </td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">
            ${it.orderedQuantity} <span style="font-size: 10px; color: #64748b;">${it.uomSnapshot || 'pcs'}</span>
          </td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">
            LKR ${(it.unitPriceSnapshot || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: ${it.discountPercentage > 0 ? '#16a34a' : '#64748b'}; font-weight: ${it.discountPercentage > 0 ? '700' : '400'};">
            ${it.discountPercentage ? `${it.discountPercentage}%` : '0%'}
          </td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">
            LKR ${(it.lineTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `
      )
      .join('');

    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const reqDelivery = order.requestedDeliveryDate ? new Date(order.requestedDeliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Standard Dispatch Schedule';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>SalesOrder_${order.orderNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-size: 11.5px;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
            .brand-name { font-size: 21px; font-weight: 900; color: #0f172a; letter-spacing: -0.4px; }
            .doc-title-badge { display: inline-block; background: #0f172a; color: #ffffff; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
            .meta-grid td { padding: 10px 14px; vertical-align: top; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
            .items-table th { background: #f1f5f9; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; text-align: left; font-weight: 700; font-size: 10.5px; text-transform: uppercase; color: #475569; }
            .totals-table { width: 320px; margin-left: auto; border-collapse: collapse; margin-bottom: 24px; }
            .totals-table td { padding: 5px 8px; font-size: 11px; }
            .grand-total-row { font-size: 14px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; }
            .signatures { display: flex; justify-content: space-between; margin-top: 36px; page-break-inside: avoid; break-inside: avoid; }
            .signature-box { border-top: 1px dashed #94a3b8; width: 190px; text-align: center; padding-top: 6px; font-size: 10px; color: #475569; }
            .footer-statutory { margin-top: 28px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <div class="brand-name">DNS DISTRIBUTION (PVT) LTD</div>
                <div style="color: #475569; font-size: 11px; margin-top: 2px; font-weight: 600;">Authorized Electrical, Industrial Switchgear & Automation Importers</div>
                <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">142 First Cross Street, Colombo 11, Sri Lanka</div>
                <div style="font-size: 10px; color: #64748b;">Hotline: +94 11 234 5678 | Email: sales@dnsdistribution.lk | VAT Reg: 109847291-7000</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="doc-title-badge">Sales Order Confirmation</div>
                <div style="font-family: monospace; font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 6px;">${order.orderNumber}</div>
                <div style="margin-top: 4px;"><span style="display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 700; border-radius: 9999px; background: #e2e8f0; color: #1e293b;">${order.status}</span></div>
                <div style="margin-top: 6px; font-size: 10.5px; color: #64748b;">Order Date: <strong style="color: #0f172a;">${formattedDate}</strong></div>
              </td>
            </tr>
          </table>

          <table class="meta-grid">
            <tr>
              <td style="width: 50%; border-right: 1px solid #e2e8f0;">
                <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Customer / Buyer Details:</div>
                <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; margin-top: 2px;">${order.customerNameSnapshot || 'Valued Customer'}</div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">Dealer Code: <span style="font-family: monospace; font-weight: 700;">${order.customerCodeSnapshot || '—'}</span></div>
                ${order.customerAddressSnapshot ? `<div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">Address: ${order.customerAddressSnapshot}</div>` : ''}
                ${order.deliveryAddress && order.deliveryAddress !== order.customerAddressSnapshot ? `<div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">Delivery To: ${order.deliveryAddress}</div>` : ''}
                ${order.customerPhoneSnapshot ? `<div style="font-size: 10.5px; color: #64748b;">Phone: ${order.customerPhoneSnapshot}</div>` : ''}
              </td>
              <td style="width: 50%;">
                <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Order & Dispatch Details:</div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 11px;">
                  <tr>
                    <td style="padding: 2px 0; color: #64748b; width: 130px;">Payment Terms:</td>
                    <td style="padding: 2px 0; font-weight: 700; color: #0f172a;">${order.paymentTerms || 'Standard Credit'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #64748b;">Sales Representative:</td>
                    <td style="padding: 2px 0; font-weight: 600; color: #0f172a;">${order.salesRepNameSnapshot || 'Internal Sales Desk'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #64748b;">Customer PO Ref:</td>
                    <td style="padding: 2px 0; font-family: monospace; font-weight: 600; color: #0f172a;">${order.customerPoNumber || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2px 0; color: #64748b;">Requested Delivery:</td>
                    <td style="padding: 2px 0; font-weight: 600; color: #0f172a;">${reqDelivery}</td>
                  </tr>
                  ${order.quotationNumber ? `
                  <tr>
                    <td style="padding: 2px 0; color: #64748b;">Quotation Ref:</td>
                    <td style="padding: 2px 0; font-family: monospace; color: #4338ca;">${order.quotationNumber}</td>
                  </tr>` : ''}
                </table>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">#</th>
                <th>Item Description & Specification</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 110px; text-align: right;">Unit Price</th>
                <th style="width: 70px; text-align: right;">Disc %</th>
                <th style="width: 120px; text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td style="text-align: right; font-weight: 600; font-family: monospace;">LKR ${(order.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${order.discountAmount > 0 ? `
            <tr>
              <td style="color: #16a34a;">Commercial Discount:</td>
              <td style="text-align: right; color: #16a34a; font-weight: 600; font-family: monospace;">- LKR ${order.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>` : ''}
            ${order.taxEnabled !== false && order.taxAmount > 0 ? `
            <tr>
              <td style="color: #64748b;">VAT (${order.taxRatePercentage ?? 18}% Included):</td>
              <td style="text-align: right; font-weight: 600; font-family: monospace;">LKR ${order.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>` : ''}
            <tr class="grand-total-row">
              <td style="padding-top: 8px; font-weight: 800;">Total Order Value:</td>
              <td style="padding-top: 8px; text-align: right; font-size: 15px; font-weight: 900; font-family: monospace; color: #0f172a;">
                LKR ${(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </table>

          ${order.notes ? `
          <div style="margin-bottom: 24px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10.5px; page-break-inside: avoid; break-inside: avoid;">
            <strong style="color: #475569; text-transform: uppercase; font-size: 9.5px; display: block; margin-bottom: 2px;">Order Remarks / Special Delivery Instructions:</strong>
            <p style="margin: 0; color: #334155; font-style: italic;">${order.notes}</p>
          </div>` : ''}

          <div class="signatures">
            <div class="signature-box">
              <strong>Prepared By</strong>
              <div style="margin-top: 28px; font-size: 9.5px; color: #64748b;">${order.salesRepNameSnapshot || 'Sales Representative'}</div>
            </div>
            <div class="signature-box">
              <strong>Authorized Approval</strong>
              <div style="margin-top: 28px; font-size: 9.5px; color: #64748b;">${order.approvedByName || 'Sales Operations Manager'}</div>
            </div>
            <div class="signature-box">
              <strong>Customer Acceptance</strong>
              <div style="margin-top: 28px; font-size: 9.5px; color: #64748b;">Authorized Signatory & Stamp</div>
            </div>
          </div>

          <div class="footer-statutory">
            This Sales Order Confirmation is generated via DNS Distribution ERP. Goods remain property of DNS Distribution (Pvt) Ltd until full settlement.
            <br/>Printed: ${new Date().toLocaleString()} • Form ERP-SO-01 Rev 2
          </div>
        </body>
      </html>
    `;
  }

  async downloadSalesOrderPdf(order: SalesOrder): Promise<void> {
    const htmlContent = this.generateSalesOrderHtml(order);
    this.triggerDownloadOrPrint(htmlContent, `SalesOrder_${order.orderNumber}.html`);
  }

  async printSalesOrder(order: SalesOrder): Promise<void> {
    const htmlContent = this.generateSalesOrderHtml(order);
    this.triggerDownloadOrPrint(htmlContent, `SalesOrder_${order.orderNumber}.html`);
  }

  // ==========================================
  // GOODS RECEIVED NOTE (GRN) PDF & PRINT
  // ==========================================
  generateGrnHtml(grn: GRN, pricingData?: CostedPriceItemInfo[]): string {
    const totalExpected = grn.items?.reduce((sum, i) => sum + (i.expectedQuantity || 0), 0) || 0;
    const totalReceived = grn.items?.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0) || 0;
    const totalDamaged = grn.items?.reduce((sum, i) => sum + (i.damagedQuantity || 0), 0) || 0;
    const totalAccepted = totalReceived - totalDamaged;

    const totalValue =
      grn.totalValue ||
      grn.items?.reduce(
        (sum, i) => sum + (i.receivedQuantity - (i.damagedQuantity || 0)) * (i.unitCostSnapshot || 0),
        0
      ) ||
      0;

    const formattedReceivedDate = grn.receivedDate || grn.submittedAt
      ? formatDate(grn.receivedDate || grn.submittedAt || new Date().toISOString())
      : formatDate(new Date().toISOString());

    const itemRows = (grn.items || [])
      .map((item, idx) => {
        const netQty = Math.max(0, item.receivedQuantity - (item.damagedQuantity || 0));
        const pricing = pricingData?.find((p) => p.productId === item.productId);
        const unitCost = pricing ? pricing.unitCost : (item.unitCostSnapshot || 0);
        const sellingPrice = pricing ? pricing.sellingPrice : 0;
        const lineTotal = netQty * unitCost;

        if (pricingData) {
          return `
            <tr style="page-break-inside: avoid; break-inside: avoid;">
              <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1;">
                <div style="font-weight: 700; color: #0f172a;">${item.productNameSnapshot || item.productId}</div>
                <div style="font-size: 10px; color: #64748b; font-family: monospace;">${item.skuSnapshot || '—'}</div>
              </td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 700; font-family: monospace;">
                ${item.receivedQuantity} <span style="font-size: 10px; color: #64748b;">${item.uom || 'units'}</span>
              </td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace;">
                LKR ${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: #047857; font-family: monospace;">
                LKR ${sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          `;
        }

        return `
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1; text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1;">
              <div style="font-weight: 700; color: #0f172a; font-size: 11.5px;">${item.productNameSnapshot || item.productId}</div>
              <div style="font-size: 10px; color: #64748b; font-family: monospace;">${item.skuSnapshot || '—'}</div>
            </td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${item.expectedQuantity}</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 700; font-family: monospace;">${item.receivedQuantity}</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: ${item.damagedQuantity > 0 ? '#b91c1c' : '#64748b'}; font-weight: ${item.damagedQuantity > 0 ? '700' : '400'};">
              ${item.damagedQuantity || 0}
            </td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 800; color: #047857; font-family: monospace; background: #f0fdf4;">
              ${netQty}
            </td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10px; color: #475569;">${item.uom || 'PCS'}</td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace;">
              ${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 7px 8px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 700; font-family: monospace; color: #0f172a;">
              ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>GRN_${grn.grnNumber || grn.id}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-size: 11px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
            .brand-name { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.4px; }
            .doc-title-badge { display: inline-block; background: #0f172a; color: #ffffff; font-weight: 900; font-size: 12px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-box { width: 100%; border-collapse: collapse; margin-bottom: 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; }
            .meta-box td { padding: 9px 12px; vertical-align: top; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; }
            .items-table th { background: #f1f5f9; padding: 8px 6px; border-bottom: 2px solid #94a3b8; border-right: 1px solid #cbd5e1; text-align: left; font-weight: 800; font-size: 10px; text-transform: uppercase; color: #334155; }
            .items-table td { border-right: 1px solid #e2e8f0; }
            .totals-row { background: #f8fafc; font-weight: 800; border-top: 2px solid #94a3b8; }
            .signatures-grid { width: 100%; border-collapse: collapse; margin-top: 24px; page-break-inside: avoid; break-inside: avoid; }
            .signatures-grid td { width: 33.33%; padding: 0 8px; vertical-align: top; }
            .sig-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #ffffff; }
            .sig-line { height: 36px; border-bottom: 1px dashed #94a3b8; margin: 10px 0 6px 0; }
            .footer-cert { margin-top: 20px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <div class="brand-name">DNS IMPORT & EXPORT (PVT) LTD</div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">Central Logistics & Distribution Operations • Bay 1, Colombo Port Road, Colombo 13</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Tel: +94 11 234 5678 | Email: warehouse@dns-group.lk | VAT Reg: 109847291-7000</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="doc-title-badge">Goods Received Note</div>
                <div style="font-family: monospace; font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 5px;">${grn.grnNumber || grn.id}</div>
                <div style="margin-top: 4px;"><span style="display: inline-block; padding: 2px 8px; font-size: 9.5px; font-weight: 700; border-radius: 9999px; background: #e2e8f0; color: #1e293b;">${grn.status}</span></div>
              </td>
            </tr>
          </table>

          <table class="meta-box">
            <tr>
              <td style="width: 50%; border-right: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  <tr>
                    <td style="padding: 2.5px 0; color: #64748b; width: 115px; font-weight: 600;">Supplier Name:</td>
                    <td style="padding: 2.5px 0; font-weight: 800; color: #0f172a;">${grn.supplierName || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Linked PO #:</td>
                    <td style="padding: 2.5px 0; font-family: monospace; font-weight: 800; color: #0284c7;">${grn.purchaseOrderNumber || grn.poNumber || grn.poId || '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Vendor Inv / DN:</td>
                    <td style="padding: 2.5px 0; font-family: monospace; color: #334155;">${grn.supplierInvoiceNumber || '—'}</td>
                  </tr>
                </table>
              </td>
              <td style="width: 50%;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  <tr>
                    <td style="padding: 2.5px 0; color: #64748b; width: 120px; font-weight: 600;">Received Date:</td>
                    <td style="padding: 2.5px 0; font-weight: 700; color: #0f172a;">${formattedReceivedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Destination Bay:</td>
                    <td style="padding: 2.5px 0; font-weight: 700; color: #0f172a;">${grn.warehouseId || 'WH-MAIN'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 2.5px 0; color: #64748b; font-weight: 600;">Intake Officer:</td>
                    <td style="padding: 2.5px 0; color: #334155;">${grn.receivedById || 'Warehouse Intake Officer'}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; letter-spacing: 0.5px;">
            ${pricingData ? 'Costed & Priced Inventory Line Items' : 'Received Line Items & Physical Verification Record'}
          </div>

          <table class="items-table">
            <thead>
              ${pricingData ? `
              <tr>
                <th style="width: 32px; text-align: center;">#</th>
                <th>Product Description</th>
                <th style="width: 90px; text-align: right;">Quantity</th>
                <th style="width: 120px; text-align: right;">Unit Cost (LKR)</th>
                <th style="width: 120px; text-align: right; color: #047857;">Selling Price (LKR)</th>
              </tr>` : `
              <tr>
                <th style="width: 28px; text-align: center;">#</th>
                <th>Product / SKU Description</th>
                <th style="width: 55px; text-align: right;">Expected</th>
                <th style="width: 55px; text-align: right;">Received</th>
                <th style="width: 55px; text-align: right; color: #b91c1c;">Damaged</th>
                <th style="width: 65px; text-align: right; color: #047857;">Net Accepted</th>
                <th style="width: 40px; text-align: center;">UOM</th>
                <th style="width: 85px; text-align: right;">Unit Cost</th>
                <th style="width: 95px; text-align: right;">Total (LKR)</th>
              </tr>`}
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
            <tfoot>
              ${!pricingData ? `
              <tr class="totals-row">
                <td colspan="2" style="padding: 8px 10px; border-right: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; color: #475569;">
                  Summary Totals:
                </td>
                <td style="padding: 8px; border-right: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${totalExpected}</td>
                <td style="padding: 8px; border-right: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${totalReceived}</td>
                <td style="padding: 8px; border-right: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #b91c1c;">${totalDamaged}</td>
                <td style="padding: 8px; border-right: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #047857; font-size: 12px; background: #dcfce7;">${totalAccepted}</td>
                <td style="padding: 8px; border-right: 1px solid #cbd5e1;"></td>
                <td style="padding: 8px; border-right: 1px solid #cbd5e1; text-align: right; text-transform: uppercase; font-size: 10px; color: #64748b;">Grand Net:</td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 12px; color: #0f172a;">LKR ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>` : ''}
            </tfoot>
          </table>

          ${grn.notes ? `
          <div style="margin-bottom: 20px; padding: 9px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 10.5px; page-break-inside: avoid; break-inside: avoid;">
            <strong style="color: #475569; text-transform: uppercase; font-size: 9.5px; display: block; margin-bottom: 2px;">Receiving Remarks / Notes:</strong>
            <p style="margin: 0; color: #334155; font-style: italic;">${grn.notes}</p>
          </div>` : ''}

          <table class="signatures-grid">
            <tr>
              <td>
                <div class="sig-card">
                  <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #475569;">Received & Counted By</div>
                  <div class="sig-line"></div>
                  <div style="font-size: 10.5px; font-weight: 700; color: #0f172a;">Stock Keeper: ${grn.receivedById || 'Warehouse Officer'}</div>
                  <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">Date: _______________</div>
                </div>
              </td>
              <td>
                <div class="sig-card">
                  <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #475569;">Verified & Approved By</div>
                  <div class="sig-line"></div>
                  <div style="font-size: 10.5px; font-weight: 700; color: #0f172a;">Stock Manager: ${grn.approvedById || 'Pending Sign-off'}</div>
                  <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">Date: _______________</div>
                </div>
              </td>
              <td>
                <div class="sig-card">
                  <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #475569;">Accounts Payable Entry</div>
                  <div class="sig-line"></div>
                  <div style="font-size: 10.5px; font-weight: 700; color: #0f172a;">Finance AP Sign-off</div>
                  <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">Bill Ref: _______________</div>
                </div>
              </td>
            </tr>
          </table>

          <div class="footer-cert">
            Certified Goods Intake Record for DNS Import & Export (Pvt) Ltd • Generated via DNS Enterprise Resource Planning System
            <br/>Printed: ${new Date().toLocaleString()} • Form GRN-CERT-01
          </div>
        </body>
      </html>
    `;
  }

  async downloadGrnPdf(grn: GRN, pricingData?: CostedPriceItemInfo[]): Promise<void> {
    const htmlContent = this.generateGrnHtml(grn, pricingData);
    this.triggerDownloadOrPrint(htmlContent, `GRN_${grn.grnNumber || grn.id}.html`);
  }

  async printGrn(grn: GRN, pricingData?: CostedPriceItemInfo[]): Promise<void> {
    const htmlContent = this.generateGrnHtml(grn, pricingData);
    this.triggerDownloadOrPrint(htmlContent, `GRN_${grn.grnNumber || grn.id}.html`);
  }

  // ==========================================
  // DELIVERY NOTE PDF & PRINT SPECIFICATIONS
  // ==========================================
  generateDeliveryNoteHtml(note: DeliveryNote): string {
    const itemRows = (note.items || [])
      .map((item, idx) => {
        const barcodesHtml = (item.unitBarcodes && item.unitBarcodes.length > 0)
          ? `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px;">
              ${item.unitBarcodes.map(b => {
                const isRejected = item.rejectedUnitBarcodes && item.rejectedUnitBarcodes.includes(b);
                return `<span style="font-family: monospace; font-size: 9px; padding: 1px 5px; border-radius: 3px; border: 1px solid ${isRejected ? '#fca5a5' : '#cbd5e1'}; background: ${isRejected ? '#fef2f2' : '#f8fafc'}; color: ${isRejected ? '#b91c1c' : '#334155'}; ${isRejected ? 'text-decoration: line-through;' : ''}">${b}${isRejected ? ' [REJECTED]' : ''}</span>`;
              }).join('')}
            </div>`
          : '';

        return `
          <tr style="page-break-inside: avoid; break-inside: avoid;">
            <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1;">
              <div style="font-weight: 700; color: #0f172a; font-size: 11.5px;">${item.productName}</div>
              <div style="font-size: 10px; color: #64748b; font-family: monospace;">SKU: ${item.sku}</div>
              ${barcodesHtml}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: center; font-size: 10.5px; color: #475569;">${item.uom || 'PCS'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${item.invoicedQuantity || '—'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 800; font-family: monospace; font-size: 12px; color: #0f172a; background: #f8fafc;">
              ${item.dispatchedQuantity}
            </td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #cbd5e1; text-align: center;">
              <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #94a3b8; border-radius: 2px;"></span>
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>DeliveryNote_${note.deliveryNoteNumber}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-size: 11px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
            .brand-name { font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.4px; }
            .doc-title-badge { display: inline-block; background: #0f172a; color: #ffffff; font-weight: 900; font-size: 12px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-grid { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .meta-grid td { width: 50%; vertical-align: top; padding: 0 6px; }
            .meta-grid td:first-child { padding-left: 0; }
            .meta-grid td:last-child { padding-right: 0; }
            .info-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; font-size: 11px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; }
            .items-table th { background: #f1f5f9; padding: 8px 8px; border-bottom: 2px solid #94a3b8; border-right: 1px solid #cbd5e1; text-align: left; font-weight: 800; font-size: 10px; text-transform: uppercase; color: #334155; }
            .items-table td { border-right: 1px solid #e2e8f0; }
            .totals-row { background: #f8fafc; font-weight: 800; border-top: 2px solid #94a3b8; }
            .signatures-grid { width: 100%; border-collapse: collapse; margin-top: 20px; page-break-inside: avoid; break-inside: avoid; }
            .signatures-grid td { width: 33.33%; padding: 0 6px; vertical-align: top; }
            .sig-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #ffffff; }
            .sig-line { height: 36px; border-bottom: 1px dashed #94a3b8; margin: 10px 0 6px 0; }
            .triplicate-notice { margin-top: 18px; text-align: center; font-size: 9.5px; font-weight: 700; color: #475569; letter-spacing: 0.3px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <div class="brand-name">DNS ENGINEERING & ELECTRICALS (PVT) LTD</div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">Industrial Switchgear, Distribution Boards & Automation Importers</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Central Logistics Warehouse • Bay 4, Industrial Zone, Orugodawatta, Sri Lanka</div>
                <div style="font-size: 10px; color: #64748b;">Hotline: +94 11 234 5600 | Dispatch Desk: +94 11 234 5609 | Email: dispatch@dns.lk</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="doc-title-badge">Delivery Note / Dispatch Receipt</div>
                <div style="font-family: monospace; font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 5px;">${note.deliveryNoteNumber}</div>
                <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">Dispatch Date: <strong style="color: #0f172a;">${note.dispatchDate}</strong></div>
                ${note.invoiceNumber ? `<div style="font-size: 10px; color: #64748b;">Invoice Ref: <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${note.invoiceNumber}</span></div>` : ''}
                ${note.orderNumber ? `<div style="font-size: 10px; color: #64748b;">Sales Order: <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${note.orderNumber}</span></div>` : ''}
              </td>
            </tr>
          </table>

          <table class="meta-grid">
            <tr>
              <td>
                <div class="info-card">
                  <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Consignee / Deliver To:</div>
                  <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${note.customerName}</div>
                  <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">Code: <span style="font-family: monospace; font-weight: 700;">${note.customerCode}</span></div>
                  ${note.customerAddress ? `<div style="font-size: 10.5px; color: #64748b; margin-top: 2px;">${note.customerAddress}</div>` : ''}
                  ${note.customerPhone ? `<div style="font-size: 10px; color: #64748b;">Tel: ${note.customerPhone}</div>` : ''}
                  ${note.customerVatNumber ? `<div style="font-size: 10px; color: #64748b;">VAT: ${note.customerVatNumber}</div>` : ''}
                </div>
              </td>
              <td>
                <div class="info-card">
                  <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Transport & Dispatch Logistics:</div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                    <tr>
                      <td style="padding: 2px 0; color: #64748b; width: 110px;">Driver Name:</td>
                      <td style="padding: 2px 0; font-weight: 700; color: #0f172a;">${note.driverName || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 0; color: #64748b;">Vehicle / Lorry No:</td>
                      <td style="padding: 2px 0; font-family: monospace; font-weight: 800; color: #0f172a;">${note.vehicleNumber || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 0; color: #64748b;">Driver Contact:</td>
                      <td style="padding: 2px 0; color: #334155;">${note.driverPhone || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 2px 0; color: #64748b;">Delivery Route:</td>
                      <td style="padding: 2px 0; color: #334155;">${note.deliveryRoute || 'Direct Delivery'}</td>
                    </tr>
                  </table>
                  ${note.notes ? `<div style="margin-top: 4px; font-size: 10px; color: #475569; font-style: italic;">Note: ${note.notes}</div>` : ''}
                </div>
              </td>
            </tr>
          </table>

          <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 6px; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
            <span>Schedule of Goods Dispatched & Physical Unit Allocation</span>
            <span style="font-family: monospace; font-weight: 700;">Total Dispatched: ${note.totalDispatchedUnits || note.items?.reduce((s, i) => s + (i.dispatchedQuantity || 0), 0) || 0} Units</span>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">#</th>
                <th>Product Description & Serial / Barcode Allocation</th>
                <th style="width: 45px; text-align: center;">UOM</th>
                <th style="width: 65px; text-align: right;">Invoiced</th>
                <th style="width: 75px; text-align: right;">Dispatched</th>
                <th style="width: 60px; text-align: center;">Checked</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
            <tfoot>
              <tr class="totals-row">
                <td colspan="4" style="padding: 8px 10px; border-right: 1px solid #cbd5e1; text-transform: uppercase; font-size: 10px; color: #475569;">
                  Total Physical Units Dispatched:
                </td>
                <td style="padding: 8px 10px; border-right: 1px solid #cbd5e1; text-align: right; font-family: monospace; font-size: 13px; font-weight: 900; color: #0f172a;">
                  ${note.totalDispatchedUnits || note.items?.reduce((s, i) => s + (i.dispatchedQuantity || 0), 0) || 0}
                </td>
                <td style="padding: 8px 10px; text-align: center;"></td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-bottom: 16px; padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 10px; color: #475569; page-break-inside: avoid; break-inside: avoid;">
            <strong>Statutory Consignee Acknowledgment:</strong> "Received the above mentioned equipment/goods in sound merchantable condition, strictly according to specifications and free from transit damage."
          </div>

          <table class="signatures-grid">
            <tr>
              <td>
                <div class="sig-card">
                  <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #475569;">Consignee / Customer Acceptance</div>
                  <div class="sig-line"></div>
                  <div style="font-size: 10px; font-weight: 700; color: #0f172a;">Customer Signature & Rubber Stamp</div>
                  <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Date: _______________ Time: ________</div>
                </div>
              </td>
              <td>
                <div class="sig-card">
                  <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #475569;">Driver / Dispatch Carrier</div>
                  <div class="sig-line"></div>
                  <div style="font-size: 10px; font-weight: 700; color: #0f172a;">Driver: ${note.driverName || 'Authorized Carrier'}</div>
                  <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Lorry No: ${note.vehicleNumber || '_____________'}</div>
                </div>
              </td>
              <td>
                <div class="sig-card">
                  <div style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #475569;">Warehouse Logistics Officer</div>
                  <div class="sig-line"></div>
                  <div style="font-size: 10px; font-weight: 700; color: #0f172a;">Central Logistics Dispatch Desk</div>
                  <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">Gate Pass Ref: _______________</div>
                </div>
              </td>
            </tr>
          </table>

          <div class="triplicate-notice">
            White: Customer Copy &nbsp;|&nbsp; Pink: Finance & Accounts Copy &nbsp;|&nbsp; Green: Logistics & Security Gate Pass
          </div>
        </body>
      </html>
    `;
  }

  async downloadDeliveryNotePdf(note: DeliveryNote): Promise<void> {
    const htmlContent = this.generateDeliveryNoteHtml(note);
    this.triggerDownloadOrPrint(htmlContent, `DeliveryNote_${note.deliveryNoteNumber}.html`);
  }

  async printDeliveryNote(note: DeliveryNote): Promise<void> {
    const htmlContent = this.generateDeliveryNoteHtml(note);
    this.triggerDownloadOrPrint(htmlContent, `DeliveryNote_${note.deliveryNoteNumber}.html`);
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
