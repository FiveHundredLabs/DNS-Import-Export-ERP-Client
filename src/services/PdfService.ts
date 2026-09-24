import { Quotation } from '../types/quotation';
import { printerService } from './PrinterService';

export interface IPdfService {
  downloadQuotationPdf(quotation: Quotation): Promise<void>;
  generateQuotationHtml(quotation: Quotation): string;
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
              <td style="color: #64748b;">VAT (18% Included):</td>
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

  async downloadQuotationPdf(quotation: Quotation): Promise<void> {
    const htmlContent = this.generateQuotationHtml(quotation);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Open print preview dialog formatted for Save as PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } else {
      // Fallback: direct download file
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation_${quotation.quotationNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

export const pdfService = new PdfService();
