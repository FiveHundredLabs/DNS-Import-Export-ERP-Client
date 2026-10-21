import { Quotation } from '../types/quotation';
import { Invoice } from '../types/invoice';
import { Payment } from '../types/payment';

export class WhatsAppService {
  /**
   * Generates a direct WhatsApp Web or App link with prefilled document text.
   * Section 14: Do NOT require WhatsApp API integration; open WhatsApp sending flow with customer context/link.
   */
  generateShareUrl(phoneNumber: string, message: string): string {
    // Sanitize phone number to international format without + or spaces
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }

  shareDocument(params: {
    phoneNumber: string;
    customerName: string;
    documentType: 'QUOTATION' | 'INVOICE' | 'RECEIPT';
    documentNumber: string;
    totalAmount: number;
    downloadUrl: string;
  }): void {
    const text = `Dear ${params.customerName},\n\nPlease find your official ${params.documentType} (${params.documentNumber}) amounting to LKR ${params.totalAmount.toLocaleString()} from DNS Distribution.\n\nYou can view and download your document here:\n${params.downloadUrl}\n\nThank you for choosing DNS Distribution.`;
    const url = this.generateShareUrl(params.phoneNumber, text);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  shareQuotation(quotation: Quotation, customPhone?: string): void {
    const phone = customPhone || quotation.customerPhoneSnapshot || '';
    const itemList = quotation.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.productNameSnapshot} x ${it.quantity} ${it.uomSnapshot || 'pcs'} - LKR ${it.lineTotal.toLocaleString()}`
      )
      .join('\n');

    const message =
      `*DNS DISTRIBUTION (PVT) LTD*\n` +
      `*Official Quotation: ${quotation.quotationNumber}*\n\n` +
      `*Customer:* ${quotation.customerNameSnapshot} (${quotation.customerCodeSnapshot})\n` +
      `*Date:* ${new Date(quotation.createdAt).toLocaleDateString()}\n` +
      `*Valid Until:* ${quotation.validUntil}\n` +
      `*Sales Rep:* ${quotation.salesRepNameSnapshot}\n\n` +
      `*Items:*\n${itemList}\n\n` +
      `*Subtotal:* LKR ${quotation.subtotal.toLocaleString()}\n` +
      `*Discount:* LKR ${quotation.discountAmount.toLocaleString()}\n` +
      (quotation.taxEnabled !== false && quotation.taxAmount > 0
        ? `*VAT (${quotation.taxRatePercentage ?? 18}%):* LKR ${quotation.taxAmount.toLocaleString()}\n`
        : `*Tax:* LKR 0\n`) +
      `*GRAND TOTAL:* LKR ${quotation.totalAmount.toLocaleString()}\n\n` +
      `View or download your quotation:\n` +
      `https://portal.dnserp.com/quotations/${quotation.quotationNumber}\n\n` +
      `Thank you for choosing DNS Distribution!`;

    const url = this.generateShareUrl(phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  shareInvoice(invoice: Invoice, customPhone?: string): void {
    const phone = customPhone || invoice.customerPhone || '';
    const itemList = invoice.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.productNameSnapshot} x ${it.quantity} ${it.uomSnapshot || 'pcs'} - LKR ${it.lineTotal.toLocaleString()}`
      )
      .join('\n');

    const message =
      `*DNS DISTRIBUTION (PVT) LTD*\n` +
      `*Commercial Tax Invoice: ${invoice.invoiceNumber}*\n\n` +
      `*Customer:* ${invoice.customerName} (${invoice.customerCode})\n` +
      `*Order Ref:* ${invoice.orderNumber}\n` +
      `*Issue Date:* ${invoice.issueDate}\n` +
      `*Due Date:* ${invoice.dueDate}\n` +
      `*Sales Rep:* ${invoice.salesRepName}\n\n` +
      `*Items:*\n${itemList}\n\n` +
      `*Subtotal:* LKR ${invoice.subtotal.toLocaleString()}\n` +
      `*Discount:* LKR ${invoice.discountTotal.toLocaleString()}\n` +
      (invoice.taxEnabled !== false && invoice.taxTotal > 0
        ? `*Tax (${invoice.taxRatePercentage ?? 18}% VAT):* LKR ${invoice.taxTotal.toLocaleString()}\n`
        : `*Tax:* LKR 0\n`) +
      `*Total Amount:* LKR ${invoice.totalAmount.toLocaleString()}\n` +
      `*Paid to Date:* LKR ${invoice.paidAmount.toLocaleString()}\n` +
      `*BALANCE DUE:* LKR ${invoice.balanceAmount.toLocaleString()}\n\n` +
      `View and pay your invoice:\n` +
      `https://portal.dnserp.com/invoices/${invoice.invoiceNumber}\n\n` +
      `Thank you for your business!`;

    const url = this.generateShareUrl(phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  sharePaymentReceipt(payment: Payment, customPhone?: string): void {
    const phone = customPhone || '';
    const allocList = payment.invoiceAllocations
      .map((a) => `• Invoice ${a.invoiceNumber}: LKR ${a.allocatedAmount.toLocaleString()}`)
      .join('\n');

    const message =
      `*DNS DISTRIBUTION (PVT) LTD*\n` +
      `*Payment Collection Receipt: ${payment.receiptNumber}*\n\n` +
      `*Customer:* ${payment.customerName}\n` +
      `*Date:* ${new Date(payment.collectedAt).toLocaleDateString()}\n` +
      `*Payment Method:* ${payment.paymentMethod}\n` +
      `${payment.chequeNumber ? `*Cheque No:* ${payment.chequeNumber} (${payment.bankName || ''})\n` : ''}` +
      `*AMOUNT COLLECTED:* LKR ${payment.amount.toLocaleString()}\n` +
      `*Status:* ${payment.status === 'APPROVED' ? 'Approved & Reconciled' : 'Pending Finance Verification'}\n\n` +
      `${allocList ? `*Invoice Allocations:*\n${allocList}\n\n` : ''}` +
      `Thank you for your prompt payment!`;

    const url = this.generateShareUrl(phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export const whatsAppService = new WhatsAppService();
